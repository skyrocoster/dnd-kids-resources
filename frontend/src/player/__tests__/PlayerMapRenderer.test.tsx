import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('renders every cell in the room geometry', () => {
    const { container } = render(<PlayerMapRenderer layout={roomLayout()} />)
    expect(container.querySelectorAll('[data-room-id="12"] [data-room-cell]')).toHaveLength(3)
    expect(container.querySelector('[data-room-cell="2,3"]')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
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
})
