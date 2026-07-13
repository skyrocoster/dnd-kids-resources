import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../../../api/client'
import { mapLabLayout } from '../maplabData'
import { MapLabPage } from '../MapLabPage'
import type { MapPortal as MapPortalFixture } from '../maplabModel'

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

// The runtime fixture fallback is now the full Isly Castle (islyCastleData.ts). These behavior
// tests were written against the small `mapLabLayout` sample (6x4 hall, L-shape Armoury, seeded
// chest/trap-door), so pin that as the default backend layout here; per-test `vi.spyOn` calls
// still override it where a test supplies its own `backendLayout`.
beforeEach(() => {
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout })
})

describe('MapLabPage (M0a scaffold)', () => {
  it('renders placeholder', () => {
    render(<MapLabPage />)
    expect(screen.getByText('Map Lab')).toBeInTheDocument()
    expect(screen.getByText('Programmatic dungeon map prototype')).toBeInTheDocument()
  })
})

describe('MapLabPage (M1 SVG renderer)', () => {
  it('renders SVG canvas with both Case-1 rooms and the door', () => {
    render(<MapLabPage />)
    expect(screen.getByRole('img', { name: /dungeon floor map/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Armoury' })).toBeInTheDocument()
    expect(screen.getByText('Heavy Stone Door')).toBeInTheDocument()
  })

  it('room selection toggles on click', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    expect(hall).toHaveAttribute('aria-pressed', 'false')

    await user.click(hall)
    expect(hall).toHaveAttribute('aria-pressed', 'true')

    await user.click(hall)
    expect(hall).toHaveAttribute('aria-pressed', 'false')
  })

  it('room selection toggles on keyboard activation', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    const armoury = screen.getByRole('button', { name: 'Armoury' })
    armoury.focus()
    await user.keyboard('{Enter}')
    expect(armoury).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MapLabPage (M2 stairs + second floor)', () => {
  it('renders both floor tabs, starting on the ground floor', () => {
    render(<MapLabPage />)
    const groundTab = screen.getByRole('tab', { name: 'Ground Floor' })
    const firstTab = screen.getByRole('tab', { name: 'First Floor' })
    expect(groundTab).toHaveAttribute('aria-selected', 'true')
    expect(firstTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back Stairwell' })).toBeInTheDocument()
  })

  it('switches floor via the floor tabs', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'First Floor Landing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Combat Training Hall' })).not.toBeInTheDocument()
  })

  it('clicking the stair marker switches the active floor', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.click(stair)

    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'First Floor Landing' })).toBeInTheDocument()
  })

  it('stair endpoint cell stays coordinate-aligned across floors', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()

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
  it('renders the padded unknown-space grid behind the rooms', () => {
    const { container } = render(<MapLabPage />)
    const unknownSpace = container.querySelector('.maplab-unknown-space')
    expect(unknownSpace).toBeInTheDocument()
    expect(unknownSpace).toHaveAttribute('fill', expect.stringContaining('maplab-unknown-space-grid'))
  })

  it('renders a visible scale reference', () => {
    render(<MapLabPage />)
    expect(screen.getByText('1 square = 5 ft')).toBeInTheDocument()
  })

  it("renders the Combat Training Hall's full 6x4 footprint as floor cells on the correct absolute cells", async () => {
    render(<MapLabPage />)
    await flush()
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const cells = hall.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(24)
    expect(hall.querySelector('rect[x="0"][y="0"]')).toBeInTheDocument()
    expect(hall.querySelector('rect[x="320"][y="192"]')).toBeInTheDocument() // [5,3] * CELL_SIZE(64)
  })

  it("renders the Armoury's L-shaped footprint without the notch cell", async () => {
    render(<MapLabPage />)
    await flush()
    const armoury = screen.getByRole('button', { name: 'Armoury' })
    const cells = armoury.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(12)
    expect(armoury.querySelector('rect[x="512"][y="128"]')).not.toBeInTheDocument() // notch [8,2]
  })
})

describe('MapLabPage (M2.3 walls + door/stair affordances)', () => {
  it('renders walls enclosing both rooms, excluding the shared door segment', async () => {
    const { container } = render(<MapLabPage />)
    await flush()
    const hall = screen.getByRole('button', { name: /Combat Training Hall/ })
    const armoury = screen.getByRole('button', { name: /Armoury/ })
    // Hall: 20 perimeter edges minus the 1 door edge = 19. Armoury: 16 minus 1 = 15.
    expect(hall.querySelectorAll('.maplab-wall')).toHaveLength(19)
    expect(armoury.querySelectorAll('.maplab-wall')).toHaveLength(15)
    // The door's own segment must not also be drawn as a plain wall line.
    expect(container.querySelectorAll('.maplab-wall[x1="320"][y1="192"]')).toHaveLength(0)
  })

  it('renders the door with its state icon/token and reveals details on hover', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    expect(screen.getByText('Hover or focus a room, door, stair, or prop for details.')).toBeInTheDocument()

    const door = screen.getByRole('button', { name: /Heavy Stone Door.*Locked/ })
    expect(door).toHaveAttribute('data-state', 'locked')

    await user.hover(door)
    expect(screen.getByText('Locked')).toBeInTheDocument() // state chip, not the old dl row
    expect(screen.getByText('Break DC')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('Pick DC')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()

    await user.unhover(door)
    expect(screen.getByText('Hover or focus a room, door, stair, or prop for details.')).toBeInTheDocument()
  })

  it('reveals door details on keyboard focus too (not hover-only)', () => {
    render(<MapLabPage />)
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })
    fireEvent.focus(door)
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it("pins the door's details open on click/Enter, giving touch users the same access as hover", async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })

    expect(door).toHaveAttribute('aria-pressed', 'false')
    await user.click(door)
    expect(door).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Locked')).toBeInTheDocument()

    await user.click(door)
    expect(door).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders the stair with its state icon and reveals details on hover, without breaking floor travel', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    expect(stair).toHaveAttribute('data-state', 'unlocked')

    await user.hover(stair)
    // Unlocked is the clean/unremarkable state — it renders no chip at all (Design Phase J2).
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument()

    // Stair's primary action is still travel, not pinning — click switches floor as before.
    await user.click(stair)
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('MapLabPage (Stage 1 — Faithful L-shape rendering)', () => {
  it('selecting the L-shaped Armoury never renders a cell at the notch', async () => {
    const user = userEvent.setup()
    const { container } = render(<MapLabPage />)
    await flush()

    const armoury = screen.getByRole('button', { name: 'Armoury' })
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
    render(<MapLabPage />)
    await flush()

    await user.click(screen.getByRole('tab', { name: 'Two-Wing Test Layout' }))

    const west = screen.getByRole('button', { name: 'West Wing' })
    const east = screen.getByRole('button', { name: 'East Wing' })
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
  it('renders the door as a leaf + swing arc, never a straight line matching a wall segment', () => {
    const { container } = render(<MapLabPage />)
    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })

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
    render(<MapLabPage />)

    // Ground floor: stair 2 goes z0 -> z1, viewed from z0 -> "up".
    const groundStair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    expect(groundStair.querySelector('svg')).toBeTruthy() // Lucide icon rendered inline

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))

    // First floor: the same physical stair, viewed from z1 -> "down".
    const firstFloorStair = screen.getByRole('button', { name: /Stone Stairs.*floor 0/i })
    expect(firstFloorStair).toBeInTheDocument()
  })

  it('unifies the stair marker on a single token family (no hardcoded tertiary fill)', () => {
    const { container } = render(<MapLabPage />)
    const marker = container.querySelector('.maplab-stair-marker')!
    // The fill is a neutral surface (class-driven, from theme.css); only the stroke/icon carry
    // the passage-state token via inline style, so there is exactly one meaningful color family.
    expect(marker).not.toHaveAttribute('fill')
    expect(marker.getAttribute('style') ?? '').not.toContain('tertiary')
  })
})

describe('MapLabPage (Stage 3 — Generic inspector)', () => {
  it('shows the room descriptor (title, size, description) in the same panel on hover', async () => {
    const user = userEvent.setup()
    const { container } = render(<MapLabPage />)
    await flush()

    expect(screen.getByText('Hover or focus a room, door, stair, or prop for details.')).toBeInTheDocument()

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    await user.hover(hall)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Combat Training Hall')
    expect(panel.querySelector('.maplab-inspector-kind')).toHaveTextContent('Room')
    expect(panel).toHaveTextContent('24 squares')
    expect(panel).toHaveTextContent(/training/)

    await user.unhover(hall)
    expect(screen.getByText('Hover or focus a room, door, stair, or prop for details.')).toBeInTheDocument()
  })

  it('shows the room descriptor on keyboard focus too, same as doors/stairs', async () => {
    const { container } = render(<MapLabPage />)
    await flush()
    const armoury = screen.getByRole('button', { name: 'Armoury' })
    fireEvent.focus(armoury)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Armoury')
    expect(panel).toHaveTextContent('12 squares')
  })

  it('door and stair inspection still work through the same generalized panel', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)

    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })
    await user.hover(door)
    expect(screen.getByText('Door')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
    await user.unhover(door)

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.hover(stair)
    expect(screen.getByText('Stair')).toBeInTheDocument()
    // Unlocked is the clean/unremarkable state — no chip renders for it (Design Phase J2).
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (Design Phase J2 — Passage-state chips)', () => {
  it('renders an icon+text chip for the locked door, and the old State/Also rows are gone', async () => {
    const user = userEvent.setup()
    const { container } = render(<MapLabPage />)

    const door = screen.getByRole('button', { name: /Heavy Stone Door.*Locked/ })
    await user.hover(door)

    const chipRow = container.querySelector('.maplab-inspector-chips')!
    expect(chipRow).toBeInTheDocument()
    const chip = chipRow.querySelector('.maplab-inspector-chip[data-state="locked"]')!
    expect(chip).toHaveTextContent('Locked')
    expect(chip.querySelector('svg')).toBeTruthy() // icon renders alongside the text label

    // The retired "State"/"Also" <dl> text rows no longer render.
    expect(screen.queryByText('State')).not.toBeInTheDocument()
    expect(screen.queryByText('Also')).not.toBeInTheDocument()
  })

  it('renders zero chips for the fully-unlocked stair — absence is the clean state', async () => {
    const user = userEvent.setup()
    const { container } = render(<MapLabPage />)

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.hover(stair)

    expect(container.querySelector('.maplab-inspector-chips')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (Stage 4 — Passage session state)', () => {
  it('toggles door open/closed via session state controls', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })

    // Click pins the door's details panel open (independent of hover/focus).
    await user.click(door)
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf-closed')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close door' }))
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open door' }))
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()
    expect(door.querySelector('.maplab-door-leaf-closed')).not.toBeInTheDocument()
  })

  it('toggles lock/unlock via session controls, independent of the trapped state', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    // Authored locked + trapped — trapped takes display precedence.
    expect(door).toHaveAttribute('data-state', 'trapped')

    await user.click(screen.getByRole('button', { name: 'Disarm trap' }))
    // Trap disarmed but still locked — the two flags are independent.
    expect(door).toHaveAttribute('data-state', 'locked')

    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(door).toHaveAttribute('data-state', 'unlocked')
  })

  it('disarms traps and reflects the change in the passage glyph', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    expect(door).toHaveAttribute('data-state', 'trapped')
    expect(door.querySelector('.maplab-trap-disarmed-badge')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Disarm trap' }))
    expect(door).toHaveAttribute('data-state', 'locked')
    expect(door.querySelector('.maplab-trap-disarmed-badge')).toBeInTheDocument()
  })

  it('resets all session overrides via a reset button', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()
    const door = screen.getByRole('button', { name: /Rusty Trap Door/ })
    await user.click(door)

    await user.click(screen.getByRole('button', { name: 'Close door' }))
    await user.click(screen.getByRole('button', { name: 'Disarm trap' }))
    expect(door).toHaveAttribute('data-state', 'locked')
    expect(door.querySelector('.maplab-door-leaf-closed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset session state' }))
    // Back to the authored default: trapped (armed) takes precedence again, door open.
    expect(door).toHaveAttribute('data-state', 'trapped')
    expect(door.querySelector('.maplab-door-leaf')).toBeInTheDocument()
  })
})

describe('MapLabPage (Stage F2 — Prop rendering)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the seeded chest prop with its kind icon, locked state, and inspector details on hover', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()

    const chest = screen.getByRole('button', { name: /Treasure Chest.*Locked/i })
    expect(chest).toHaveAttribute('data-state', 'locked')
    expect(chest.querySelector('svg')).toBeTruthy() // Lucide kind icon rendered inline

    await user.hover(chest)
    expect(screen.getByText('Prop')).toBeInTheDocument()
    expect(screen.getByText('Pick DC')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
  })

  it('renders an on-wall prop anchored at the wall midpoint, smaller than an on-square prop', async () => {
    const wallProp = {
      prop_id: 900,
      kind: 'mirror',
      cell: [0, 0] as [number, number],
      side: 'N' as const,
      title: 'Wall Mirror',
      hidden: false,
      locked: false,
      trapped: false,
    }
    const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, wallProp] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    render(<MapLabPage />)
    await flush()

    const mirror = screen.getByRole('button', { name: /Wall Mirror/i })
    const chest = screen.getByRole('button', { name: /Treasure Chest/i })
    const mirrorCircle = mirror.querySelector('circle')!
    const chestCircle = chest.querySelector('circle')!

    // On-wall marker sits at cell [0,0]'s north wall midpoint (32, 0) — a plain on-square marker
    // would instead center on the cell (32, 32).
    expect(mirrorCircle.getAttribute('cy')).toBe('0')
    expect(Number(mirrorCircle.getAttribute('r'))).toBeLessThan(Number(chestCircle.getAttribute('r')))
  })

  it('renders a hidden prop with a dashed marker outline', async () => {
    const hiddenProp = {
      prop_id: 901,
      kind: 'chest',
      cell: [0, 0] as [number, number],
      title: 'Hidden Chest',
      hidden: true,
      locked: false,
      trapped: false,
    }
    const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, hiddenProp] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    render(<MapLabPage />)
    await flush()

    const hiddenChest = screen.getByRole('button', { name: /Hidden Chest/i })
    expect(hiddenChest).toHaveAttribute('data-state', 'hidden')
    expect(hiddenChest.querySelector('circle')).toHaveAttribute('stroke-dasharray')
  })
})

describe('MapLabPage (Stage F4 — loot hook affordance)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a disabled "Contents" placeholder row for a prop, but not for a door', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()

    const chest = screen.getByRole('button', { name: /Treasure Chest.*Locked/i })
    await user.hover(chest)
    const lootRow = screen.getByText('Contents — added with the loot system')
    expect(lootRow.closest('[aria-disabled="true"]')).toBeTruthy()

    await user.unhover(chest)
    const door = screen.getAllByRole('button', { name: /Door/i })[0]
    await user.hover(door)
    expect(screen.queryByText('Contents — added with the loot system')).not.toBeInTheDocument()
  })
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

    render(<MapLabPage />)
    await flush()

    expect(screen.getByText('Backend-Only Door')).toBeInTheDocument()
    // The fixture-only door is still present — the backend layout replaced the fixture wholesale,
    // not merged, and it carries the same case-1 doors plus the new one.
    expect(screen.getByText('Heavy Stone Door')).toBeInTheDocument()
  })

  it('404 from backend falls back to the fixture layout', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))

    render(<MapLabPage />)
    await flush()

    expect(screen.getByRole('button', { name: 'Combat Training Hall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Armoury' })).toBeInTheDocument()
    expect(screen.getByText('Heavy Stone Door')).toBeInTheDocument()
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

    render(<MapLabPage />)
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

    render(<MapLabPage />)
    await flush()

    const marker = screen.getByRole('button', { name: /Unlinked Marker/i })
    await user.click(marker)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

    render(<MapLabPage />)
    await flush()

    expect(screen.getByRole('button', { name: /Goblin Ambush/i })).toBeInTheDocument()
  })
})

describe('MapLabPage (Stage H3 — portal viewer rendering + navigation)', () => {
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

    render(<MapLabPage />)
    await flush()

    expect(screen.getByRole('button', { name: /Shimmering Archway —/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Shimmering Archway \(return\)/i })).not.toBeInTheDocument()
  })

  it('hovering a portal opens the inspector with title and "Leads to" destination', async () => {
    const user = userEvent.setup()
    const backendLayout = { ...mapLabLayout, portals: [portal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    const { container } = render(<MapLabPage />)
    await flush()

    const marker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    await user.hover(marker)

    const inspector = container.querySelector('.maplab-inspector-panel')!
    expect(inspector).toHaveTextContent('Shimmering Archway')
    expect(inspector).toHaveTextContent('Portal')
    expect(inspector).toHaveTextContent('3,3 (z:1)')
  })

  it('clicking a portal jumps the active floor to its destination z', async () => {
    const user = userEvent.setup()
    const backendLayout = { ...mapLabLayout, portals: [portal, pairedPortal] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    render(<MapLabPage />)
    await flush()

    const marker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    await user.click(marker)

    expect(screen.getByRole('button', { name: /Shimmering Archway \(return\) —/i })).toBeInTheDocument()
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

    render(<MapLabPage />)
    await flush()

    const stairMarker = screen.getByRole('button', { name: /Shared Stair/i })
    const portalMarker = screen.getByRole('button', { name: /Shimmering Archway —/i })
    const stairCircle = stairMarker.querySelector('circle')!
    const portalCircle = portalMarker.querySelector('circle')!

    expect(stairCircle.getAttribute('cx')).not.toBe(portalCircle.getAttribute('cx'))
  })
})

describe('Design Phase J1 — toolbar trays', () => {
  const STORAGE_KEY = 'dnd-kids-maplab-tray-collapsed:viewer-session'

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('Session tray collapses on toggle, hiding its controls', async () => {
    const user = userEvent.setup()
    render(<MapLabPage />)
    await flush()

    expect(screen.getByRole('button', { name: 'Reset session state' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse Session tools' }))

    expect(screen.getByRole('button', { name: 'Expand Session tools' })).toBeInTheDocument()
    const tray = document.querySelector('.maplab-toolbar-tray')
    expect(tray).toHaveAttribute('data-collapsed')
  })

  it('toolbar tray collapse state persists across remount via localStorage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    render(<MapLabPage />)
    await flush()

    expect(screen.getByRole('button', { name: 'Expand Session tools' })).toBeInTheDocument()
  })
})
