import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { PlayerMapRenderer } from '../PlayerMapRenderer'

function stairLayout() {
  const layout = roomLayout()
  layout.stairs.push({ stair_id: 7, from: { z: 0, cell: [2, 3] }, to: { z: 1, cell: [2, 3] }, hidden: false, locked: false, trapped: false })
  return layout
}

function roomLayout() {
  const layout = createEmptyMapLayout('School')
  layout.rooms.push({
    room_id: 12,
    z: 0,
    origin: [2, 3],
    cells: [[0, 0], [1, 0], [0, 1]],
    title: 'Library',
  })
  layout.doors.push({
    door_id: 3,
    cell: [2, 3],
    side: 'N',
    z: 0,
    hidden: false,
    locked: false,
    trapped: false,
  })
  return layout
}

describe('PlayerMapRenderer', () => {
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
  })

  it('renders every cell in the room geometry', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelectorAll('[data-room-id="12"] [data-room-cell]')).toHaveLength(3)
    expect(container.querySelector('[data-room-cell="2,3"]')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
  })

  it('renders nothing for rooms with no cells', () => {
    const layout = roomLayout()
    layout.rooms.push({ room_id: 99, z: 0, origin: [5, 5], cells: [], title: 'Empty Room' })
    const { container } = render(<PlayerMapRenderer layout={layout} />)
    expect(container.querySelector('[data-room-id="99"]')).not.toBeInTheDocument()
    expect(screen.queryByText('Empty Room')).not.toBeInTheDocument()
  })

  it('renders the floor, walls, and doors', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)

    expect(container.querySelector('[data-floor="0"] .player-map-floor')).toBeInTheDocument()
    expect(container.querySelectorAll('.player-map-wall')).not.toHaveLength(0)
    expect(container.querySelector('.player-map-door')).toBeInTheDocument()
  })

  it('provides a keyboard-focusable canvas surface', () => {
    render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(screen.getByLabelText('Map canvas')).toHaveAttribute('tabindex', '0')
  })

  it('sizes the room label in map units so it scales with the plate', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container, unmount } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const large = container.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize

    unmount()

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 64 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 64 })
    const { container: smallContainer } = render(<PlayerMapRenderer layout={roomLayout()} />)
    // The font size is a map-unit constant now, not a screen-pixel one divided by the scale, so it
    // shrinks and grows with the map instead of the label being hidden at low zoom.
    expect(smallContainer.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize)
      .toBe(large)
  })

  it('shrinks a long room name to fit inside its own room box', () => {
    const layout = roomLayout()
    layout.rooms.push({ room_id: 13, z: 0, origin: [8, 8], cells: [[0, 0]], title: 'The Enormously Long Hall of Echoes' })
    const { container } = render(<PlayerMapRenderer layout={layout} />)
    const wide = container.querySelector<SVGTextElement>('[data-room-id="12"] .player-map-room-title')!
    const cramped = container.querySelector<SVGTextElement>('[data-room-id="13"] .player-map-room-title')!
    expect(parseFloat(cramped.style.fontSize)).toBeLessThan(parseFloat(wide.style.fontSize))
    // ...but never below the legibility floor.
    expect(parseFloat(cramped.style.fontSize)).toBeGreaterThanOrEqual(0.2 * 64)
  })

  it('renders a closed door with disc, no leaf, and data-door-open false', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const door = container.querySelector('.player-map-door')
    expect(door).toBeInTheDocument()
    expect(door).toHaveAttribute('data-door-open', 'false')
    expect(door?.querySelector('.player-map-door-disc')).toBeInTheDocument()
    expect(door?.querySelector('.player-map-door-leaf')).not.toBeInTheDocument()
  })

  it('drops the token entirely for an open door, leaving the leaf and swing', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} openDoorIds={new Set([3])} />)
    const door = container.querySelector('.player-map-door')
    expect(door).toBeInTheDocument()
    expect(door).toHaveAttribute('data-door-open', 'true')
    expect(door?.querySelector('.player-map-door-disc')).not.toBeInTheDocument()
    expect(door?.querySelector('.player-map-door-leaf')).toBeInTheDocument()
    expect(door?.querySelector('.player-map-door-swing')).toBeInTheDocument()
  })

  it('leaves a gap in the wall where an open door sits', () => {
    const { container: closed } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const closedWalls = closed.querySelectorAll('.player-map-wall').length

    const { container: open } = render(<PlayerMapRenderer layout={roomLayout()} openDoorIds={new Set([3])} />)
    // The door at cell [2,3] side N is one perimeter edge, and opening it removes that wall line.
    expect(open.querySelectorAll('.player-map-wall')).toHaveLength(closedWalls - 1)
  })

  it('renders the open door leaf at a constant on-screen stroke width', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} openDoorIds={new Set([3])} />)
    expect(container.querySelector<SVGPathElement>('.player-map-door-leaf')!.style.strokeWidth).toBe('8')
  })

  it('renders stair discs on the active floor with no numeral', () => {
    const layout = stairLayout()
    layout.floors.push({ z: 1, title: 'Upstairs' })
    const { container } = render(<PlayerMapRenderer layout={layout} />)

    // Only the active (lowest) floor renders stairs
    const floor0Stairs = container.querySelectorAll('[data-floor="0"] .player-map-stair')
    expect(floor0Stairs).toHaveLength(1)
    expect(floor0Stairs[0]).toHaveAttribute('data-stair-id', '7')
    expect(floor0Stairs[0]).toHaveAttribute('data-stair-direction', 'up')
    // Disc present; no numeral badge
    expect(floor0Stairs[0].querySelector('.player-map-stair-disc')).toBeInTheDocument()
    expect(floor0Stairs[0].querySelector('.player-map-stair-badge-label')).not.toBeInTheDocument()

    // Non-active floor stairs are not rendered
    expect(container.querySelectorAll('[data-floor="1"] .player-map-stair')).toHaveLength(0)
  })

  it('renders the stair disc at a constant on-screen size', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container } = render(<PlayerMapRenderer layout={stairLayout()} />)
    const badge = container.querySelector('[data-floor="0"] .player-map-stair-disc')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('r', '14')
  })

  it('fans out co-located on-square markers and switches floor on stair click', () => {
    // Create a layout with a stair and a portal sharing the same cell on floor 0
    const layout = stairLayout()
    layout.floors.push({ z: 1, title: 'Upstairs' })
    // Add a portal co-located with the stair at cell [2,3]
    ;(layout as any).portals = [{ cell: [2, 3] as [number, number], z: 0 }]
    ;(layout as any).props = []

    const { container } = render(<PlayerMapRenderer layout={layout} />)

    // Both the stair and the portal should be rendered (fan-out)
    expect(container.querySelector('.player-map-stair')).toBeInTheDocument()
    expect(container.querySelector('.kid-on-square-marker')).toBeInTheDocument()

    // Stair has a disc, not a numeral
    const stair = container.querySelector('.player-map-stair')
    expect(stair?.querySelector('.player-map-stair-disc')).toBeInTheDocument()
    expect(stair?.querySelector('.player-map-stair-badge-label')).not.toBeInTheDocument()

    // Stair is interactive — click switches floor
    fireEvent.click(stair!)
    expect(container.querySelector('[data-floor="1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-floor="0"]')).not.toBeInTheDocument()
  })

  it('renders only one floor (the lowest)', () => {
    const layout = stairLayout()
    layout.floors.push({ z: 1, title: 'Upstairs' })
    layout.rooms.push({ room_id: 20, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' })
    const { container } = render(<PlayerMapRenderer layout={layout} />)

    // Only floor 0 appears (lowest)
    expect(container.querySelector('[data-floor="0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-floor="1"]')).not.toBeInTheDocument()
    expect(screen.queryByText('Upper Room')).not.toBeInTheDocument()
  })

  it('renders floor picker slabs and switches the active floor on click', () => {
    const layout = createEmptyMapLayout('Tower')
    layout.floors = [{ z: -1, title: 'Basement' }, { z: 0, title: 'Ground' }, { z: 1, title: 'Top' }]
    layout.rooms.push(
      { room_id: 1, z: -1, origin: [0, 0], cells: [[0, 0]], title: 'B1' },
      { room_id: 2, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'G1' },
      { room_id: 3, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'T1' },
    )
    const { container } = render(<PlayerMapRenderer layout={layout} />)

    // All three slabs are visible
    const slabs = container.querySelectorAll('.player-floor-slab')
    expect(slabs).toHaveLength(3)
    expect(slabs[0]).toHaveTextContent('-1')
    expect(slabs[1]).toHaveTextContent('0')
    expect(slabs[2]).toHaveTextContent('1')

    // Lowest floor (-1) is the default selection
    expect(slabs[0]).toHaveAttribute('aria-pressed', 'true')
    expect(slabs[1]).toHaveAttribute('aria-pressed', 'false')
    expect(slabs[2]).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('[data-floor="-1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-floor="0"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-floor="1"]')).not.toBeInTheDocument()

    // Click the top slab (z=1)
    fireEvent.click(slabs[2])
    expect(container.querySelector('[data-floor="1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-floor="0"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-floor="-1"]')).not.toBeInTheDocument()

    // No second floor rendered — only one <g data-floor> exists
    expect(container.querySelectorAll('[data-testfloor="true"]')).toHaveLength(1)
  })

  it('keeps room names on screen at any viewport size', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 32 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 32 })
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    // Names are never hidden by zoom now — they scale instead.
    const title = container.querySelector('.player-map-room-title')
    expect(title).toBeInTheDocument()
    expect(title).not.toHaveAttribute('data-label-fits')
  })

  it('has no per-cell grid stroke on room cells', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const cell = container.querySelector('.player-map-room-cell')
    expect(cell).toBeInTheDocument()
    // CSS sets stroke:none; no inline stroke attribute should be present
    expect(cell?.getAttribute('stroke')).toBeNull()
  })

  // --- Party room highlight and return control ---

  it('renders party room cells with the highlight class', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} partyRoomId={12} />)
    const partyCells = container.querySelectorAll('.player-map-room-cell--party')
    expect(partyCells.length).toBeGreaterThan(0)
    // All party room cells have the party class
    partyCells.forEach((cell) => {
      expect(cell.closest('[data-room-id="12"]')).toBeInTheDocument()
    })
  })

  it('keeps the party room name visible at low density', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 32 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 32 })
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} partyRoomId={12} />)
    const partyTitle = container.querySelector<SVGTextElement>('[data-room-id="12"] .player-map-room-title')
    expect(partyTitle).toBeInTheDocument()
    expect(partyTitle).toHaveTextContent('Library')
  })

  it('renders the return-to-party button when partyRoomId is set', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} partyRoomId={12} />)
    expect(container.querySelector('.player-map-return-btn')).toBeInTheDocument()
  })

  it('does not render the return button without a partyRoomId', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelector('.player-map-return-btn')).not.toBeInTheDocument()
  })

  it('returns to the party room and re-arms following on return button click', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} partyRoomId={12} />)
    const btn = container.querySelector<HTMLButtonElement>('.player-map-return-btn')!
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-label', 'Return to party room')
    // The button has a 64px touch floor
    expect(btn.className).toBe('player-map-return-btn')
  })

  it('selects the party room floor when party room is on another floor', () => {
    const layout = roomLayout()
    // Add a second floor with no party room
    layout.floors.push({ z: 1, title: 'Upstairs' })
    layout.rooms.push({ room_id: 20, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' })

    // Party room is on floor 0; renderer should show floor 0
    const { container } = render(<PlayerMapRenderer layout={layout} partyRoomId={12} />)
    expect(container.querySelector('[data-floor="0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-room-id="12"] .player-map-room-cell--party')).toBeInTheDocument()
  })

  it('switches to the party room floor when it is on a different floor', () => {
    const layout = roomLayout()
    // Party room (room_id=12) is on z=0; add the party room on z=1 instead
    layout.floors.push({ z: 1, title: 'Upstairs' })
    // Move room 12 to floor 1
    const room12 = layout.rooms.find(r => r.room_id === 12)!
    room12.z = 1

    const { container } = render(<PlayerMapRenderer layout={layout} partyRoomId={12} />)
    // Should prefer the party room's floor (z=1)
    expect(container.querySelector('[data-floor="1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-floor="0"]')).not.toBeInTheDocument()
    // Party cells should be on the correct floor
    expect(container.querySelector('[data-floor="1"] .player-map-room-cell--party')).toBeInTheDocument()
  })
})
