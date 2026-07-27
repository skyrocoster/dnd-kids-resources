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

  it('renders the label at a constant on-screen font size', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container, unmount } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize).toBe('16px')

    unmount()

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 64 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 64 })
    const { container: smallContainer } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(smallContainer.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize).toBe('64px')
  })

  it('sets data-label-fits on the room title', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container, unmount } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelector('.player-map-room-title')).toHaveAttribute('data-label-fits', 'true')

    unmount()

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 64 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 64 })
    const { container: container2 } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container2.querySelector('.player-map-room-title')).toHaveAttribute('data-label-fits', 'false')
  })

  it('renders a closed door with disc, no leaf, and data-door-open false', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const door = container.querySelector('.player-map-door')
    expect(door).toBeInTheDocument()
    expect(door).toHaveAttribute('data-door-open', 'false')
    expect(door?.querySelector('.player-map-door-disc')).toBeInTheDocument()
    expect(door?.querySelector('.player-map-door-leaf')).not.toBeInTheDocument()
  })

  it('renders an open door with disc, swing-path leaf, and data-door-open true', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} openDoorIds={new Set([3])} />)
    const door = container.querySelector('.player-map-door')
    expect(door).toBeInTheDocument()
    expect(door).toHaveAttribute('data-door-open', 'true')
    expect(door?.querySelector('.player-map-door-disc')).toBeInTheDocument()
    expect(door?.querySelector('.player-map-door-leaf')).toBeInTheDocument()
  })

  it('renders door disc and leaf geometry correctly for open vs closed', () => {
    // Closed door: disc present, no leaf
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const closedDoor = container.querySelector('.player-map-door')
    expect(closedDoor?.querySelector('.player-map-door-disc')).toBeInTheDocument()
    expect(closedDoor?.querySelector('.player-map-door-leaf')).not.toBeInTheDocument()

    // Open door: disc and leaf both present
    const { container: openContainer } = render(<PlayerMapRenderer layout={roomLayout()} openDoorIds={new Set([3])} />)
    const openDoor = openContainer.querySelector('.player-map-door')
    expect(openDoor?.querySelector('.player-map-door-disc')).toBeInTheDocument()
    expect(openDoor?.querySelector('.player-map-door-leaf')).toBeInTheDocument()
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

  it('uses density-driven label visibility', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container, unmount } = render(<PlayerMapRenderer layout={roomLayout()} />)

    // At comfortable zoom the label fits
    expect(container.querySelector('.player-map-room-title')).toHaveAttribute('data-label-fits', 'true')

    unmount()

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 32 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 32 })
    const { container: smallContainer } = render(<PlayerMapRenderer layout={roomLayout()} />)
    // At very small viewport the label does not fit (density signal returns 'simple')
    expect(smallContainer.querySelector('.player-map-room-title')).toHaveAttribute('data-label-fits', 'false')
  })

  it('has no per-cell grid stroke on room cells', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    const cell = container.querySelector('.player-map-room-cell')
    expect(cell).toBeInTheDocument()
    // CSS sets stroke:none; no inline stroke attribute should be present
    expect(cell?.getAttribute('stroke')).toBeNull()
  })
})
