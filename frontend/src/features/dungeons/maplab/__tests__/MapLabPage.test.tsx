import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapLabPage } from '../MapLabPage'

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

  it("renders the Combat Training Hall's full 6x4 footprint as floor cells on the correct absolute cells", () => {
    render(<MapLabPage />)
    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const cells = hall.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(24)
    expect(hall.querySelector('rect[x="0"][y="0"]')).toBeInTheDocument()
    expect(hall.querySelector('rect[x="320"][y="192"]')).toBeInTheDocument() // [5,3] * CELL_SIZE(64)
  })

  it("renders the Armoury's L-shaped footprint without the notch cell", () => {
    render(<MapLabPage />)
    const armoury = screen.getByRole('button', { name: 'Armoury' })
    const cells = armoury.querySelectorAll('.maplab-room-cell')
    expect(cells).toHaveLength(12)
    expect(armoury.querySelector('rect[x="512"][y="128"]')).not.toBeInTheDocument() // notch [8,2]
  })
})

describe('MapLabPage (M2.3 walls + door/stair affordances)', () => {
  it('renders walls enclosing both rooms, excluding the shared door segment', () => {
    const { container } = render(<MapLabPage />)
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

    expect(screen.getByText('Hover or focus a door or stair for details.')).toBeInTheDocument()

    const door = screen.getByRole('button', { name: /Heavy Stone Door.*Locked/ })
    expect(door).toHaveAttribute('data-state', 'locked')

    await user.hover(door)
    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(screen.getByText('Break DC')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('Pick DC')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()

    await user.unhover(door)
    expect(screen.getByText('Hover or focus a door or stair for details.')).toBeInTheDocument()
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
    expect(screen.getByText('Unlocked')).toBeInTheDocument()

    // Stair's primary action is still travel, not pinning — click switches floor as before.
    await user.click(stair)
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('MapLabPage (Stage 1 — Faithful L-shape rendering)', () => {
  it.skip('highlights only occupied cells in an L-shaped room, not the notch', () => {
    // Stage 1: Verify that the Armoury's notch [8,2] and [8,3] are never highlighted
    // when the room is hovered or selected.
  })

  it.skip('renders the interlocking-L test pair on z:2 with no overlap', () => {
    // Stage 1: Rooms 99a and 99b are 8-cell L-shapes tiling a 4×4 square.
    // Verify each highlights only its 8 cells, the shared wall renders from both sides,
    // and no cell is highlighted for both rooms.
  })
})

describe('MapLabPage (Stage 2 — Passage visuals)', () => {
  it.skip('renders unlocked and locked doors with distinct visual treatment', () => {
    // Stage 2: Door glyphs must be visually distinct from plain walls.
    // Unlocked and locked doors have separate styling per the MD3 semantic roles.
  })

  it.skip('renders stair markers with directional glyphs (up/down)', () => {
    // Stage 2: Stairs display directional iconography: StairsUp for z0→z1,
    // StairsDown for z1→z0, using a single coherent MD3 token family.
  })
})

describe('MapLabPage (Stage 3 — Generic inspector)', () => {
  it.skip('shows room descriptor (title, kind, description, size) on hover/focus', () => {
    // Stage 3: Hovering/focusing a room reveals its descriptor in the affordance panel.
    // The inspector generalizes door/stair affordances to any element (room, door, stair, item).
  })

  it.skip('shows item placeholder without rendering actual item content', () => {
    // Stage 3: MapItem entries (kind:'item') have descriptors but no rendered content in the sandbox.
    // Item rendering is explicitly deferred — geometry and type are proven; content is future work.
  })
})

describe('MapLabPage (Stage 4 — Passage session state)', () => {
  it.skip('toggles door open/closed via session state controls', () => {
    // Stage 4: In-memory open/closed toggles reflected in door glyph without mutating seed data.
    // Closing a door swaps the glyph; opening restores the authored default.
  })

  it.skip('toggles lock/unlock via session controls, independent of the trapped state', () => {
    // Stage 4: A locked+trapped door can be unlocked while keeping the trap active,
    // or disarmed independently. Session overrides are independent booleans.
  })

  it.skip('disarms traps and reflects the change in the passage glyph', () => {
    // Stage 4: Clicking "disarm" sets trapDisarmed in session state,
    // causing passagePresentation to step through to the next flag (locked/hidden/unlocked).
  })

  it.skip('resets all session overrides via a reset button', () => {
    // Stage 4: A reset action clears all session state, returning all passages
    // to their authored defaults (no persistence; sandbox only).
  })
})
