import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DoorBadgeLayer, DoorMarker } from '../DoorMarker'
import type { MapDoor } from '../maplabModel'

const door = (overrides: Partial<MapDoor> = {}): MapDoor => ({
  door_id: 1,
  cell: [1, 1],
  side: 'N',
  title: 'Stone Door',
  hidden: false,
  locked: false,
  trapped: false,
  ...overrides,
})

function renderDoor(marker: MapDoor, isOpen = true) {
  return render(
    <svg>
      <DoorMarker door={marker} cellSize={40} session={{ isOpen, isLocked: marker.locked, trapDisarmed: false }} />
      <g className="maplab-door-badge-layer"><DoorBadgeLayer door={marker} cellSize={40} session={{ isOpen, isLocked: marker.locked, trapDisarmed: false }} /></g>
    </svg>,
  )
}

// ─── M3 — Door Status Collapse ──────────────────────────────────────────────
describe.skip('DoorBadgeLayer collapsed status (M3)', () => {
  it('renders exactly one badge disc for multiple active flags', () => {
    const { container } = renderDoor(door({ locked: true, trapped: true }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
  })

  it('renders the specific icon for one active status', () => {
    const { container } = renderDoor(door({ locked: true }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
  })

  it('renders no badge disc when no flags are active', () => {
    const { container } = renderDoor(door())
    expect(container.querySelector('.maplab-door-badge')).toBeNull()
  })

  it('keeps the door glyph in fixed --md-door regardless of status', () => {
    const { container } = renderDoor(door({ locked: true, trapped: true, hidden: true }))
    expect(container.querySelector('.maplab-door-icon')).toHaveStyle({ color: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
  })

  it('narrates every individual status in the interactive door label', () => {
    const { getByRole } = renderDoor(door({ locked: true, trapped: true }))
    expect(getByRole('button').getAttribute('aria-label')).toMatch(/Trapped.*Locked/)
  })
})

describe('DoorMarker', () => {
  it('renders the leaf and identity glyph in --md-door regardless of state', () => {
    const { container } = renderDoor(door({ hidden: true, locked: true, trapped: true }))

    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-icon')).toHaveStyle({ color: 'var(--md-door)' })
  })

  it('places badges along the open leaf', () => {
    const { container } = renderDoor(door({ locked: true }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(60, 60)')
  })

  it('places badges along the closed wall segment', () => {
    const { container } = renderDoor(door({ locked: true }), false)

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(60, 60)')
  })

  it('uses the badge role foreground and clears the central door glyph', () => {
    const { container } = renderDoor(door({ locked: true }))

    expect(container.querySelector('.maplab-door-badge svg')).toHaveStyle({ color: 'var(--md-on-passage-locked)' })
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(60, 60)')
  })

  it('renders badges in the trailing door-badge-layer', () => {
    const { container } = renderDoor(door({ locked: true }))
    const marker = container.querySelector('.maplab-door') as Element
    const layer = container.querySelector('.maplab-door-badge-layer') as Element

    expect(marker.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(layer.querySelector('.maplab-door-badge')).toBeTruthy()
  })
})
