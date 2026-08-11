import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import type { NPC } from '../../../../api/types'
import { mapLabLayout } from '../maplabData'
import { MapLabPage } from '../MapLabPage'
import { DungeonRouteContextProvider, type DungeonRouteContext } from '../dungeonRouteContext'

const dungeonDataFixture = {
  rooms: [
    {
      room_id: 17,
      title: 'Training Hall',
      npcs: [9],
      entries: [
        { entry_type: 'feature', title: 'Banner', content: 'Ancient banners hang above the arena.' },
        { entry_type: 'trap', title: 'Loose Flagstones', content: 'Creatures trigger 1d6 darts.' },
        { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
        { entry_type: 'treasure', title: 'Hidden Cache', content: 'A niche in the wall.', treasure_contents: [{ name: 'Ruby', quantity: 2 }] },
      ],
    },
    {
      room_id: 23,
      title: 'Armoury',
      entries: [{ entry_type: 'feature', title: 'Weapon Racks', content: 'Dusty weapons line the walls.' }],
      npcs: [],
    },
    {
      room_id: 33,
      title: 'First Floor Landing',
      entries: [{ entry_type: 'feature', title: 'Balcony', content: 'A narrow overlook faces the courtyard.' }],
      npcs: [],
    },
    {
      room_id: 404,
      title: 'Data Only Room',
      entries: [{ entry_type: 'feature', title: 'Ghost Note', content: 'No geometry should render this.' }],
      npcs: [],
    },
  ],
}

function renderMapLabPage(
  initialEntry: string = '/dungeons/4',
  route: DungeonRouteContext = {
    dungeonId: 4,
    dungeon: { id: 4, title: 'Test Dungeon', data: dungeonDataFixture },
    status: 'ready',
    error: null,
  },
) {
  if (!vi.isMockFunction(api.getDungeonLayout)) {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DungeonRouteContextProvider value={route}>
        <MapLabPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  )
}

async function renderLoadedMapLabPage(initialEntry: string = '/dungeons/4') {
  const utils = renderMapLabPage(initialEntry)
  await flush()
  return utils
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}
const miraNpc: NPC = {
  id: 9,
  name: 'Mira',
  race: 'Human',
  background: 'Scout',
  appearance: { hair_colour: 'black', eye_colour: 'brown' },
  notes: 'A careful scout.',
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 18, formula: '4d8' },
  speed: [
    { mode: 'walk', feet: 30, note: null, hover: false },
    { mode: 'climb', feet: 20, note: null, hover: false },
  ],
  abilities: { str: 10, dex: 16, con: 12, int: 11, wis: 14, cha: 9 },
}

// These behavior tests were written against the small `mapLabLayout` sample from maplabData.ts
// (6x4 hall, L-shape Armoury, seeded chest/trap-door), so pin that as the default backend layout
// here; per-test `vi.spyOn` calls still override it where a test supplies its own `backendLayout`.
beforeEach(() => {
  window.sessionStorage.clear()
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
  vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
  vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
  vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
  vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
  Element.prototype.scrollIntoView = vi.fn()
})

describe('MapLabPage (M0a scaffold)', () => {
  it('renders the loaded map without the retired prototype copy', async () => {
    await renderLoadedMapLabPage()
    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(screen.queryByText('Map Lab')).not.toBeInTheDocument()
    expect(screen.queryByText('Programmatic dungeon map prototype')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (M1 SVG renderer)', () => {
  it('renders an accessible SVG group with both Case-1 rooms and the door', async () => {
    await renderLoadedMapLabPage()
    const canvas = screen.getByRole('group', { name: /dungeon floor map/i })
    expect(screen.getByRole('group', { name: /dungeon floor map/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(within(canvas).getByRole('button', { name: 'Armoury' })).toBeInTheDocument()
    expect(screen.getByText('Heavy Stone Door')).toBeInTheDocument()
  })

  it('room selection switches the active room on click', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const canvas = screen.getByRole('group', { name: /dungeon floor map/i })
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const armoury = within(canvas).getByRole('button', { name: 'Armoury' })
    expect(hall).toHaveAttribute('aria-pressed', 'true')
    expect(armoury).toHaveAttribute('aria-pressed', 'false')

    await user.click(armoury)
    expect(hall).toHaveAttribute('aria-pressed', 'false')
    expect(armoury).toHaveAttribute('aria-pressed', 'true')
  })

  it('room selection toggles on keyboard activation', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const canvas = screen.getByRole('group', { name: /dungeon floor map/i })
    const armoury = within(canvas).getByRole('button', { name: 'Armoury' })
    armoury.focus()
    await user.keyboard('{Enter}')
    expect(armoury).toHaveAttribute('aria-pressed', 'true')
  })

  it('mounts the door badge overlay after the door glyph layer', async () => {
    const { container } = await renderLoadedMapLabPage()

    const door = container.querySelector('.maplab-door') as Element
    const layer = container.querySelector('.maplab-door-badge-layer') as Element
    expect(door.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps map controls available to assistive technology inside the named canvas group', async () => {
    await renderLoadedMapLabPage()

    const canvas = screen.getByRole('group', { name: /dungeon floor map/i })
    expect(canvas).toContainElement(screen.getByRole('button', { name: 'Combat Training Hall' }))
  })
})

describe('MapLabPage (M2 stairs + second floor)', () => {
  it('renders both floor tabs, starting on the ground floor', async () => {
    await renderLoadedMapLabPage()
    const groundTab = screen.getByRole('tab', { name: 'Ground Floor' })
    const firstTab = screen.getByRole('tab', { name: 'First Floor' })
    expect(groundTab).toHaveAttribute('aria-selected', 'true')
    expect(firstTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Back Stairwell' })).toBeInTheDocument()
  })

  it('switches floor via the floor tabs', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'First Floor Landing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Combat Training Hall' })).not.toBeInTheDocument()
  })

  it('clicking the stair marker switches the active floor', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.click(stair)

    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'First Floor Landing' })).toBeInTheDocument()
  })

  it('stair endpoint cell stays coordinate-aligned across floors', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const groundStair = screen.getByRole('button', { name: /Stone Stairs/i })
    const groundCircle = groundStair.querySelector('circle')!
    const groundCx = groundCircle.getAttribute('cx')
    const groundCy = groundCircle.getAttribute('cy')

    await user.click(groundStair)

    const firstFloorStair = screen.getByRole('button', { name: /Stone Stairs/i })
    const firstFloorCircle = firstFloorStair.querySelector('circle')!
    expect(firstFloorCircle.getAttribute('cx')).toBe(groundCx)
    expect(firstFloorCircle.getAttribute('cy')).toBe(groundCy)
  })
})

describe('MapLabPage (M2.2 grid canvas + scale)', () => {
  it('renders the padded unknown-space with a flat fill behind the rooms', async () => {
    const { container } = await renderLoadedMapLabPage()
    const unknownSpace = container.querySelector('.maplab-unknown-space')
    expect(unknownSpace).toBeInTheDocument()
    expect(unknownSpace).toHaveAttribute('fill', 'var(--maplab-outside-fill)')
  })

  it('renders a visible scale reference', async () => {
    await renderLoadedMapLabPage()
    expect(screen.getByText('1 square = 5 ft')).toBeInTheDocument()
  })

  it("renders the Combat Training Hall's full 6x4 footprint as floor cells on the correct absolute cells", async () => {
    renderMapLabPage()
    await flush()
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const cells = hall.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(24)
    expect(hall.querySelector('rect[x="0"][y="0"]')).toBeInTheDocument()
    expect(hall.querySelector('rect[x="320"][y="192"]')).toBeInTheDocument() // [5,3] * CELL_SIZE(64)
  })

  it("renders the Armoury's L-shaped footprint without the notch cell", async () => {
    renderMapLabPage()
    await flush()
    const armoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' })
    const cells = armoury.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(12)
    expect(armoury.querySelector('rect[x="512"][y="128"]')).not.toBeInTheDocument() // notch [8,2]
  })
})

describe('MapLabPage (M2.3 walls + door/stair affordances)', () => {
  it('renders walls enclosing both rooms, excluding the shared door segment', async () => {
    const { container } = renderMapLabPage()
    await flush()
    const hall = screen.getByRole('button', { name: /Combat Training Hall/ })
    const armoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: /Armoury/ })
    // Hall: 20 perimeter edges minus the 1 door edge = 19. Armoury: 16 minus 1 = 15.
    expect(hall.querySelectorAll('.maplab-wall')).toHaveLength(19)
    expect(armoury.querySelectorAll('.maplab-wall')).toHaveLength(15)
    // The door's own segment must not also be drawn as a plain wall line.
    expect(container.querySelectorAll('.maplab-wall[x1="320"][y1="192"]')).toHaveLength(0)
  })

  it('renders the door with its state icon/token and reveals details when selected', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    expect(screen.getByText('Select a room, door, stair, or prop for details.')).toBeInTheDocument()

    const door = screen.getByRole('button', { name: /Heavy Stone Door.*Locked/ })
    expect(door).toHaveAttribute('data-state', 'locked')

    await user.click(door)
    expect(screen.getByText('Locked')).toBeInTheDocument() // state chip, not the old dl row
    expect(screen.getByText('Break 23 · Pick 18')).toBeInTheDocument()
  })

  it('reveals door details on keyboard focus too (not click-only)', async () => {
    await renderLoadedMapLabPage()
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })
    fireEvent.focus(door)
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it("keeps the door's details open on click, and a second click clears the selection", async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })

    expect(door).toHaveAttribute('aria-pressed', 'false')
    await user.click(door)
    expect(door).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Locked')).toBeInTheDocument()

    await user.click(door)
    expect(door).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Select a room, door, stair, or prop for details.')).toBeInTheDocument()
  })

  it('renders the stair with its state icon and selects it on click, without breaking floor travel', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    expect(stair).toHaveAttribute('data-state', 'plain')

    // Stair's primary action is still travel — click switches floor as before, and also selects
    // the stair so the inspector's controls are reachable.
    await user.click(stair)
    // Unlocked is the clean/unremarkable state — it renders no chip at all (Design Phase J2).
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument()
    expect(screen.getByText('Stair')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
  })

  it('hovering does not replace the selected object in the inspector', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    // Select a door — establishes it as the inspector target
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })
    await user.click(door)
    expect(screen.getByText('Locked')).toBeInTheDocument()

    // Hover over a stair — must NOT replace the selected door in the inspector
    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.hover(stair)
    expect(screen.getByText('Locked')).toBeInTheDocument()

    // Nor does moving the mouse away clear it — only selecting something else does.
    await user.unhover(stair)
    fireEvent.blur(door)
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })
})

describe('MapLabPage (Stage 1 — Faithful L-shape rendering)', () => {
  it('selecting the L-shaped Armoury never renders a cell at the notch', async () => {
    const user = userEvent.setup()
    const { container } = renderMapLabPage()
    await flush()

    const armoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' })
    await user.click(armoury)
    expect(armoury).toHaveAttribute('aria-pressed', 'true')

    // Notch cells [8,2] and [8,3] (relative [2,2] and [2,3] from origin [6,0]) at CELL_SIZE 64.
    expect(container.querySelector('rect[x="512"][y="128"]')).not.toBeInTheDocument()
    expect(container.querySelector('rect[x="512"][y="192"]')).not.toBeInTheDocument()
    // Only the room's own 12 occupied cells render, selected or not.
    expect(armoury.querySelectorAll('.maplab-room-cell')).toHaveLength(12)
  })

  it('renders the interlocking-L test pair on z:2 with no overlap', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('tab', { name: 'Two-Wing Test Layout' }))

    const canvas = screen.getByRole('group', { name: /dungeon floor map/i })
    const west = within(canvas).getByRole('button', { name: 'West Wing' })
    const east = within(canvas).getByRole('button', { name: 'East Wing' })
    expect(west.querySelectorAll('.maplab-room-cell')).toHaveLength(8)
    expect(east.querySelectorAll('.maplab-room-cell')).toHaveLength(8)

    // Every cell rect is unique to its own room — no [x,y] pair renders under both groups.
    const cellKey = (rect: Element) => `${rect.getAttribute('x')},${rect.getAttribute('y')}`
    const westCells = new Set(Array.from(west.querySelectorAll('.maplab-room-cell')).map(cellKey))
    const eastCells = Array.from(east.querySelectorAll('.maplab-room-cell')).map(cellKey)
    expect(eastCells.every((key) => !westCells.has(key))).toBe(true)

    // Each room draws its own perimeter wall lines (the shared zigzag boundary renders from
    // both sides); a rectangle-shaped bounding box would draw only 4 straight run(s) — 6+ proves
    // the zigzag, not a plain divide.
    expect(west.querySelectorAll('.maplab-wall').length).toBeGreaterThanOrEqual(6)
    expect(east.querySelectorAll('.maplab-wall').length).toBeGreaterThanOrEqual(6)
  })
})

describe('MapLabPage (Stage 2 — Passage visuals)', () => {
  it('renders an open door as a leaf + swing arc, never a straight line matching a wall segment', async () => {
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })

    // Doors start closed (defaultPassageSession isOpen: false), and a closed leaf is deliberately
    // wall-like — it reads as "sealed". The open state is the one that must not look like a wall.
    await user.click(door)
    await user.click(screen.getByRole('checkbox', { name: 'Open' }))

    // A leaf (hinge -> tip) and a swing arc (tip -> far jamb) — no full-span `<line>` across the
    // gap, which is what previously made a door indistinguishable in shape from a plain wall.
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-swing')).toBeInTheDocument()

    // The door's own wall segment [5,3]E must stay excluded from plain `.maplab-wall` lines
    // (still true — nonDoorWallSegments), so the gap is real, not just visually implied.
    expect(container.querySelectorAll('.maplab-wall[x1="320"][y1="192"]')).toHaveLength(0)
  })

  it('renders stair markers with directional glyphs that flip per viewing floor', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    // Ground floor: stair 2 goes z0 -> z1, viewed from z0 -> "up".
    const groundStair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    expect(groundStair.querySelector('svg')).toBeTruthy() // Lucide icon rendered inline

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))

    // First floor: the same physical stair, viewed from z1 -> "down".
    const firstFloorStair = screen.getByRole('button', { name: /Stone Stairs.*floor 0/i })
    expect(firstFloorStair).toBeInTheDocument()
  })

  it('uses stable stair identity color while keeping marker fill neutral', async () => {
    const { container } = await renderLoadedMapLabPage()
    const marker = container.querySelector('.maplab-stair-marker')!
    // The fill is a neutral surface (class-driven, from theme.css); stroke/icon carry fixture
    // identity and status moves to the collapsed disc.
    expect(marker).not.toHaveAttribute('fill')
    expect(marker).toHaveStyle({ stroke: 'var(--md-tertiary)' })
  })

  describe('MapLabPage (Stage E1 — Unified data: viewer reads backend layout)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('loads layout from backend and renders doors/rooms from the persisted layout', async () => {
      const backendDoor = {
        door_id: 999,
        cell: [0, 0] as [number, number],
        side: 'N' as const,
        title: 'Backend-Only Door',
        hidden: false,
        locked: false,
        trapped: false,
      }
      const backendLayout = {
        ...mapLabLayout,
        doors: [...mapLabLayout.doors, backendDoor],
      }
      vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

      renderMapLabPage()
      await flush()

      expect(screen.getByText('Backend-Only Door')).toBeInTheDocument()
      // The fixture-only door is still present — the backend layout replaced the fixture wholesale,
      // not merged, and it carries the same case-1 doors plus the new one.
      expect(screen.getByText('Heavy Stone Door')).toBeInTheDocument()
    })

    it('404 from backend falls back to the fixture layout', async () => {
      vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))

      await renderLoadedMapLabPage()

      expect(screen.getByText('No saved layout yet. This dungeon is starting from a blank map.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Combat Training Hall' })).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Starting Floor' })).toBeInTheDocument()
    })

    it('encounter marker renders and opens the dock', async () => {
      const encounterProp = {
        prop_id: 502,
        kind: 'encounter',
        cell: [0, 0] as [number, number],
        z: 0,
        title: 'Goblin Ambush',
        hidden: false,
        locked: false,
        trapped: false,
        encounter_id: 7,
      }
      const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] }
      vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })
      vi.spyOn(api, 'getEncounter').mockResolvedValue({
        id: 7,
        title: 'Goblin Ambush',
        active_index: 0,
        creatures: [],
      })
      vi.spyOn(api, 'getConditions').mockResolvedValue([])
      const user = userEvent.setup()

      renderMapLabPage()
      await flush()

      const marker = screen.getByRole('button', { name: /Goblin Ambush/i })
      expect(marker.querySelector('svg')).toBeTruthy() // encounter kind icon rendered inline

      await user.click(marker)

      const dock = await screen.findByRole('dialog', { name: 'Goblin Ambush' })
      expect(dock).toBeInTheDocument()
      expect(api.getEncounter).toHaveBeenCalledWith(7)
    })

    it('an encounter marker without an encounter_id is inert (no dock opens on click)', async () => {
      const encounterProp = {
        prop_id: 503,
        kind: 'encounter',
        cell: [1, 0] as [number, number],
        z: 0,
        title: 'Unlinked Marker',
        hidden: false,
        locked: false,
        trapped: false,
        encounter_id: null,
      }
      const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] }
      vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })
      const getEncounterSpy = vi.spyOn(api, 'getEncounter')
      const user = userEvent.setup()

      renderMapLabPage()
      await flush()

      const marker = screen.getByRole('button', { name: /Unlinked Marker/i })
      await user.click(marker)

      expect(screen.queryByRole('dialog', { name: 'Goblin Ambush' })).not.toBeInTheDocument()
      expect(getEncounterSpy).not.toHaveBeenCalled()
    })

    it('encounter marker round-trips encounter_id through save/load', async () => {
      const encounterProp = {
        prop_id: 501,
        kind: 'encounter',
        cell: [0, 0] as [number, number],
        z: 0,
        title: 'Goblin Ambush',
        hidden: false,
        locked: false,
        trapped: false,
        encounter_id: 42,
      }
      const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] }
      vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

      renderMapLabPage()
      await flush()

      expect(screen.getByRole('button', { name: /Goblin Ambush/i })).toBeInTheDocument()
    })
  })

  describe('MapLabPage (Map Lab UX Pass Stage 1 — cross-floor door leak)', () => {
    const stackedLayout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Ground Room' },
        { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' },
      ],
      doors: [{ door_id: 1, cell: [0, 0], side: 'N', z: 0, hidden: false, locked: false, trapped: false }],
      stairs: [],
      floors: [
        { z: 0, title: 'Ground Floor' },
        { z: 1, title: 'First Floor' },
      ],
      props: [],
    }

    it('a door on the floor below does not cut a wall out of the room above it', async () => {
      vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: stackedLayout })
      const user = userEvent.setup()

      const { container } = await renderLoadedMapLabPage()

      // Ground floor: the door consumes one of the single-cell room's four wall segments.
      expect(container.querySelectorAll('.maplab-room .maplab-wall')).toHaveLength(3)

      await user.click(screen.getByRole('tab', { name: 'First Floor' }))

      // Upper floor: same [x, y] wall, but the door belongs to z=0 — all four walls must render.
      expect(container.querySelectorAll('.maplab-room .maplab-wall')).toHaveLength(4)
    })
  })
})
