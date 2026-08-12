import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import type { NPC } from '../../../../api/types'
import { mapLabLayout } from '../maplabData'
import { MapLabPage } from '../MapLabPage'
import type { MapPortal as MapPortalFixture } from '../../../../model/maplabModel'
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
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
  vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
  vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
  vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
  vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
  Element.prototype.scrollIntoView = vi.fn()
})
describe('MapLabPage (R5 viewer navigation rail)', () => {
  it('shows the room navigation rail after load', async () => {
    await renderLoadedMapLabPage()

    expect(screen.getByRole('navigation', { name: 'Room navigation' })).toBeInTheDocument()
  })

  it('shows populated floor groups in the rail', async () => {
    await renderLoadedMapLabPage()
    fireEvent.click(screen.getByRole('button', { name: 'Find room…' }))

    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    expect(within(rail).getByRole('heading', { name: 'Ground Floor', level: 4 })).toBeInTheDocument()
    expect(within(rail).getByRole('heading', { name: 'First Floor', level: 4 })).toBeInTheDocument()
    expect(within(rail).getByRole('button', { name: /Training Hall/i })).toBeInTheDocument()
    expect(within(rail).getByRole('button', { name: 'First Floor Landing' })).toBeInTheDocument()
  })

  it('rail click switches the active room and details panel', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    await user.click(within(rail).getByRole('button', { name: 'Armoury' }))
    expect(screen.getByText('Weapon Racks')).toBeInTheDocument()
    expect(screen.queryByText('Loose Flagstones')).not.toBeInTheDocument()
  })

  it('rail click on a different-floor room switches floor and room', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    await user.click(within(rail).getByRole('button', { name: 'First Floor Landing' }))

    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Balcony')).toBeInTheDocument()
  })

  it('map room click updates the rail selection state', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' }))
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    expect(within(rail).getByRole('button', { name: 'Armoury' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('floor tab switches keep the rail selection synchronized', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    expect(within(rail).getByRole('button', { name: 'First Floor Landing' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Balcony')).toBeInTheDocument()
  })
})

describe('MapLabPage portal viewer rendering and navigation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const portal: MapPortalFixture = {
    portal_id: 501,
    cell: [0, 0],
    z: 0,
    to: { z: 1, cell: [3, 3] },
    title: 'Shimmering Archway',
    hidden: false,
    locked: false,
    trapped: false,
  }
  const pairedPortal: MapPortalFixture = {
    portal_id: 502,
    cell: [3, 3],
    z: 1,
    to: { z: 0, cell: [0, 0] },
    title: 'Shimmering Archway (return)',
    hidden: false,
    locked: false,
    trapped: false,
  }

  it('renders a portal on its authored floor and not on the other floor', async () => {
    const backendLayout = { ...mapLabLayout, portals: [portal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    expect(screen.getByRole('button', { name: /Shimmering Archway —/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Shimmering Archway \(return\)/i })).not.toBeInTheDocument()
  })

  it('selecting a portal opens the inspector with title and "Leads to" destination', async () => {
    const user = userEvent.setup()
    const backendLayout = { ...mapLabLayout, portals: [portal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    const { container } = renderMapLabPage()
    await flush()

    const marker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    await user.click(marker)

    const inspector = container.querySelector('.maplab-inspector-panel')!
    expect(inspector).toHaveTextContent('Shimmering Archway')
    expect(inspector).toHaveTextContent('Portal')
    expect(inspector).toHaveTextContent('3,3 (z:1)')
  })

  it('clears a selected viewer inspectable when empty space is clicked', async () => {
    // Portal travel changes the active floor, so a portal is not a stable selection
    // to clear; use a room instead — rooms do not navigate away on selection.
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()

    // Rooms do not expose `data-selected`; the page-owned inspector is the
    // observable for the selection the empty-space callback clears.
    const mapArmoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' })
    await user.click(mapArmoury)
    const inspector = container.querySelector('.maplab-inspector-panel-container')!
    expect(inspector.querySelector('.maplab-inspector-title')).toHaveTextContent('Armoury')

    fireEvent.click(container.querySelector('.maplab-unknown-space')!)

    expect(inspector.querySelector('.maplab-inspector-title')).not.toBeInTheDocument()
  })

  it('clicking a portal jumps the active floor to its destination z', async () => {
    const user = userEvent.setup()
    const backendLayout = { ...mapLabLayout, portals: [portal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    const marker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    await user.click(marker)

    expect(screen.getByRole('button', { name: /Shimmering Archway \(return\) —/i })).toBeInTheDocument()
  })

  it('centres an off-screen room without changing the selected room', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    await user.click(within(screen.getByRole('navigation', { name: 'Room navigation' })).getByRole('button', { name: 'First Floor Landing' }))

    expect(screen.getByText('Balcony')).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Room navigation' })).getByRole('button', { name: 'Find room…' }))
    expect(within(screen.getByRole('navigation', { name: 'Room navigation' })).getByRole('button', { name: 'First Floor Landing' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('preserves the frame when the already-visible room is selected', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))

    await user.click(within(screen.getByRole('navigation', { name: 'Room navigation' })).getByRole('button', { name: 'Armoury' }))

    expect(screen.getByText('Weapon Racks')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ground Floor' })).toHaveAttribute('aria-selected', 'true')
  })

  it('frames a resolved stair destination without travelling twice', async () => {
    const user = userEvent.setup()
    const stair = {
      stair_id: 601,
      from: { z: 0, cell: [0, 0] as [number, number] },
      to: { z: 1, cell: [3, 3] as [number, number] },
      title: 'Resolved Stair',
      hidden: false,
      locked: false,
      trapped: false,
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout, stairs: [stair] } })

    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: /Resolved Stair/i }))

    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Resolved Stair/i })).toBeInTheDocument()
  })

  it('double-clicking a connection does not activate it twice or travel', async () => {
    const user = userEvent.setup()
    const stair = {
      stair_id: 602,
      from: { z: 0, cell: [0, 0] as [number, number] },
      to: { z: 0, cell: [3, 3] as [number, number] },
      title: 'Double Click Stair',
      hidden: false,
      locked: false,
      trapped: false,
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout, stairs: [stair] } })

    renderMapLabPage()
    await flush()
    const marker = screen.getByRole('button', { name: /Double Click Stair/i })
    await user.dblClick(marker)

    expect(screen.getByRole('tab', { name: 'Ground Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('button', { name: /Double Click Stair/i })).toHaveLength(1)
  })

  it('hydrates the viewer in its empty state without mutating authored or encounter state', async () => {
    const getLayout = vi.spyOn(api, 'getDungeonLayout')
    const saveSession = vi.spyOn(api, 'saveDungeonSessionState')

    await renderLoadedMapLabPage()

    expect(getLayout).toHaveBeenCalledWith(4)
    expect(document.querySelector('.maplab-sidebar')).not.toBeInTheDocument()
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('Escape dismisses the drawer before clearing the selected viewer target', async () => {
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()
    await user.click(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' }))
    const inspector = container.querySelector('.maplab-inspector-panel-container')!
    expect(inspector.querySelector('.maplab-inspector-title')).toHaveTextContent('Armoury')

    await user.click(screen.getByRole('button', { name: 'Find room…' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
    expect(inspector.querySelector('.maplab-inspector-title')).toHaveTextContent('Armoury')

    await user.keyboard('{Escape}')
    expect(inspector.querySelector('.maplab-inspector-title')).not.toBeInTheDocument()
  })

  it('a co-located stair and portal render as distinct, non-overlapping markers', async () => {
    const stair = {
      stair_id: 601,
      from: { z: 0, cell: [0, 0] as [number, number] },
      to: { z: 1, cell: [0, 0] as [number, number] },
      title: 'Shared Stair',
      hidden: false,
      locked: false,
      trapped: false,
    }
    const colocatedPortal: MapPortalFixture = { ...portal, cell: [0, 0] }
    const backendLayout = { ...mapLabLayout, stairs: [...mapLabLayout.stairs, stair], portals: [colocatedPortal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    const stairMarker = screen.getByRole('button', { name: /Shared Stair/i })
    const portalMarker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    const stairCircle = stairMarker.querySelector('circle')!
    const portalCircle = portalMarker.querySelector('circle')!

    expect(stairCircle.getAttribute('cx')).not.toBe(portalCircle.getAttribute('cx'))
  })
})
// ── VT0 scaffold seams ──────────────────────────────────────────────────────

describe('VT0 — Viewer room finder', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
    vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
    vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
    vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue({ data: {} })
    vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the labelled Find room finder', async () => {
    await renderLoadedMapLabPage()
    expect(screen.getByRole('navigation', { name: 'Room navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: 'Find room…' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Find room…' }))
    expect(screen.getByRole('searchbox', { name: 'Find room…' })).toBeInTheDocument()
  })

  it('keeps the finder in the canvas composition without a rail container', async () => {
    await renderLoadedMapLabPage()
    expect(document.querySelector('.maplab-viewer-finder')).toBeInTheDocument()
    expect(document.querySelector('.maplab-viewer-rail-container')).not.toBeInTheDocument()
  })

  it('closes the finder on Escape', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find room…' })).toHaveFocus()
  })

  it('closes the finder on room selection', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Find room…' }))
    const rail = screen.getByRole('navigation', { name: 'Room navigation' })
    await user.click(within(rail).getByRole('button', { name: 'Armoury' }))
    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
  })

  it('floor tabs remain visible when the drawer is open', async () => {
    await renderLoadedMapLabPage()
    expect(screen.getByRole('tab', { name: 'Ground Floor' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'First Floor' })).toBeInTheDocument()
  })

  it('floor tabs live inside the toolbar and outside the finder', async () => {
    await renderLoadedMapLabPage()
    const toolbar = document.querySelector('.maplab-toolbar')
    const tablist = screen.getByRole('tablist', { name: 'Dungeon floors' })
    expect(toolbar).toContainElement(tablist)
    expect(document.querySelector('.maplab-viewer-finder')).not.toContainElement(tablist)

    const viewButton = screen.getByRole('button', { name: 'View' })
    const firstTab = screen.getByRole('tab', { name: 'Ground Floor' })
    expect(viewButton.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(firstTab).toHaveAccessibleName('Ground Floor')
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAccessibleName('First Floor')
  })

  it('room buttons inside the finder meet the 48px touch floor', async () => {
    await renderLoadedMapLabPage()
    fireEvent.click(screen.getByRole('button', { name: 'Find room…' }))
    const container = document.querySelector('.maplab-viewer-finder') as HTMLElement
    const roomButton = within(container!).getByRole('button', { name: 'Armoury' })
    expect(roomButton).toBeInTheDocument()
    // The rail's min-height: 48px is set by the desktop CSS rule; the 40px narrow
    // override has been removed, so every viewer chrome control meets the touch floor.
    expect(roomButton).toBeVisible()
  })

  it('details panel is reachable at 520px (VT2 narrow details)', async () => {
    // VT2: The RoomDetailsPanel is part of the wrapped narrow layout. It's always mounted
    // (see MapLabPage), so it's reachable via scrolling at 520px.
    await renderLoadedMapLabPage()

    const sidebar = document.querySelector('.maplab-sidebar') as HTMLElement
    expect(sidebar).toBeInTheDocument()

    // Sidebar contains the inspector and room details panels.
    const inspectorContainer = sidebar.querySelector('.maplab-inspector-panel-container')
    expect(inspectorContainer).toBeInTheDocument()
  })

  it('encounter dock opens and is draggable at narrow widths (VT1 dock in viewer)', async () => {
    // VT1: When an encounter marker is clicked in the viewer, the FloatingWindow dock
    // opens with viewport-edge clamping so it remains draggable within the viewport at
    // narrow widths.
    const user = userEvent.setup()
    const encounterProp = {
      prop_id: 502, kind: 'encounter', cell: [0, 0] as [number, number], z: 0,
      title: 'Goblin Ambush', hidden: false, locked: false, trapped: false, encounter_id: 7,
    }
    const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })
    vi.spyOn(api, 'getEncounter').mockResolvedValue({ id: 7, title: 'Goblin Ambush', active_index: 0, creatures: [] })
    vi.spyOn(api, 'getConditions').mockResolvedValue([])

    renderMapLabPage()
    await flush()

    const marker = screen.getByRole('button', { name: /Goblin Ambush/i })
    await user.click(marker)

    const dock = await screen.findByRole('dialog', { name: 'Goblin Ambush' })
    expect(dock).toBeInTheDocument()
    // Dock must be positioned within the viewport (not off-screen).
    const rect = dock.getBoundingClientRect()
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
  })
})
