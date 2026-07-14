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
describe('DoorBadgeLayer collapsed status (M3)', () => {
  it('renders exactly one badge disc for multiple active flags', () => {
    const { container } = renderDoor(door({ locked: true, trapped: true }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })

  it('renders the specific icon for one active status', () => {
    const { container } = renderDoor(door({ locked: true }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'locked')
  })

  it('renders hidden doors with the hidden badge and dotted leaf cue', () => {
    const { container } = renderDoor(door({ hidden: true }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'hidden')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('stroke-dasharray', '1 9')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('pathLength', '61')
  })

  it('keeps hidden doors dotted even when another status controls the badge', () => {
    const { container } = renderDoor(door({ hidden: true, locked: true, trapped: true }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('stroke-dasharray', '1 9')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('pathLength', '61')
  })

  it('renders no badge disc when no flags are active', () => {
    const { container } = renderDoor(door())
    expect(container.querySelector('.maplab-door-badge')).toBeNull()
  })

  it('keeps the door leaf in fixed --md-door regardless of status', () => {
    const { container } = renderDoor(door({ locked: true, trapped: true, hidden: true }))
    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(container.querySelector('.maplab-door-icon')).not.toBeInTheDocument()
  })

  it('names the Layers disc and narrates every individual status in the interactive door label', () => {
    const { getByRole } = renderDoor(door({ locked: true, trapped: true }))
    expect(getByRole('button').getAttribute('aria-label')).toMatch(/Multiple statuses: Trapped, Locked/)
  })
})

describe('DoorMarker', () => {
  it('renders the leaf in --md-door and no repeated door-state icon', () => {
    const { container } = renderDoor(door({ hidden: true, locked: true, trapped: true }))

    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-icon')).not.toBeInTheDocument()
  })

  it('places badges along the open leaf', () => {
    const { container } = renderDoor(door({ locked: true }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(40, 60)')
  })

  it('places badges along the closed wall segment', () => {
    const { container } = renderDoor(door({ locked: true }), false)

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(60, 40)')
  })

  it('keeps non-hidden closed doors on the full wall segment', () => {
    const { container } = renderDoor(door({ locked: true }), false)
    const leaf = container.querySelector('.maplab-door-leaf-closed')

    expect(leaf).toHaveAttribute('x1', '40')
    expect(leaf).toHaveAttribute('x2', '80')
    expect(leaf).not.toHaveAttribute('stroke-dasharray')
    expect(leaf).not.toHaveAttribute('pathLength')
  })

  it('keeps closed hidden doors dotted across the full wall gap', () => {
    const { container } = renderDoor(door({ hidden: true, locked: true }), false)
    const leaf = container.querySelector('.maplab-door-leaf-closed')

    expect(leaf).toHaveAttribute('x1', '43')
    expect(leaf).toHaveAttribute('x2', '77')
    expect(leaf).toHaveAttribute('stroke-dasharray', '1 9')
    expect(leaf).toHaveAttribute('pathLength', '61')
    expect(leaf).toHaveStyle({ strokeLinecap: 'round' })
  })

  it('uses the badge role foreground and places the status disc on the leaf', () => {
    const { container } = renderDoor(door({ locked: true }))

    expect(container.querySelector('.maplab-door-badge svg')).toHaveStyle({ color: 'var(--md-on-passage-locked)' })
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(40, 60)')
  })

  it('renders badges in the trailing door-badge-layer', () => {
    const { container } = renderDoor(door({ locked: true }))
    const marker = container.querySelector('.maplab-door') as Element
    const layer = container.querySelector('.maplab-door-badge-layer') as Element

    expect(marker.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(layer.querySelector('.maplab-door-badge')).toBeTruthy()
  })

  it.each(['N', 'S', 'E', 'W'] as const)('keeps a collapsed badge on the %s side', (side) => {
    const { container } = renderDoor(door({ side, locked: true, trapped: true }))

    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })
})
