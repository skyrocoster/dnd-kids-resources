import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { PlayerMapRenderer } from '../PlayerMapRenderer'

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
  layout.features.push({
    feature_id: 4,
    z: 0,
    kind: 'trees',
    title: 'Grove',
    cells: [[0, 0]],
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

  it('renders the floor, outside feature, and separate wall geometry', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)

    expect(container.querySelector('[data-floor="0"] .player-map-floor')).toBeInTheDocument()
    expect(container.querySelector('[data-feature-kind="trees"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.player-map-wall')).not.toHaveLength(0)
    expect(container.querySelector('.player-map-door')).toBeInTheDocument()
  })

  it('provides a keyboard-focusable canvas surface', () => {
    render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(screen.getByRole('region', { name: 'Dungeon map' })).toHaveAttribute('tabindex', '0')
  })

  it('renders the label at a constant on-screen font size', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 512 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 512 })
    const { container, unmount } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize).toBe('22px')

    unmount()

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 64 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 64 })
    const { container: smallContainer } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(smallContainer.querySelector<SVGTextElement>('.player-map-room-title')!.style.fontSize).toBe('176px')
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
})
