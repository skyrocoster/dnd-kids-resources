import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DoorBadgeLayer, DoorMarker } from '../DoorMarker'
import type { MapDoor } from '../../../../model/maplabModel'

const door = (overrides: Partial<MapDoor> = {}): MapDoor => ({
  door_id: 1,
  cell: [1, 1],
  side: 'N',
  title: 'Stone Door',
  hidden: false,
  locked: false,
  trapped: false,
  state: {
    open: false,
    obstacles: {
      concealment: { armed: false },
      lock: { armed: false, shown: false },
      trap: { armed: false, shown: false },
    },
  },
  ...overrides,
})

function renderDoor(marker: MapDoor, isOpen = true) {
  return render(
    <svg>
      <DoorMarker door={marker} cellSize={40} session={{ open: isOpen }} />
      <g className="maplab-door-badge-layer"><DoorBadgeLayer door={marker} cellSize={40} session={{ open: isOpen }} /></g>
    </svg>,
  )
}

// ─── M3 — Door Status Collapse ──────────────────────────────────────────────
describe('DoorBadgeLayer collapsed status (M3)', () => {
  it('renders exactly one badge disc for multiple active flags', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })

  it('renders the specific icon for one active status', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }))
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'locked')
  })

  it('renders concealed doors with the concealed badge and dotted leaf cue', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: false, shown: false },
          trap: { armed: false, shown: false },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'concealed')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('stroke-dasharray', '1 9')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('pathLength', '61')
  })

  it('keeps concealed doors dotted even when another status controls the badge', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('stroke-dasharray', '1 9')
    expect(container.querySelector('.maplab-door-leaf')).toHaveAttribute('pathLength', '61')
  })

  it('renders no badge disc when no flags are active', () => {
    const { container } = renderDoor(door())
    expect(container.querySelector('.maplab-door-badge')).toBeNull()
  })

  it('shows armed statuses even when their player-facing Shown flags are false', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: false },
          trap: { armed: true, shown: false },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(container.querySelector('[aria-label]')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Multiple statuses: Concealed, Trapped, Locked'),
    )
  })

  it('does not render badges for disarmed obstacles', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: false, shown: true },
          trap: { armed: false, shown: true },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge')).toBeNull()
  })

  it('keeps the door leaf in fixed --md-door regardless of status', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))
    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(container.querySelector('.maplab-door-icon')).not.toBeInTheDocument()
  })

  it('names the Layers disc and narrates every individual status in the interactive door label', () => {
    const { getByRole } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))
    expect(getByRole('button').getAttribute('aria-label')).toMatch(/Multiple statuses: Trapped, Locked/)
  })
})

describe('DoorMarker', () => {
  it('renders the leaf in --md-door and no repeated door-state icon', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-leaf')).toHaveStyle({ stroke: 'var(--md-door)' })
    expect(container.querySelector('.maplab-door-icon')).not.toBeInTheDocument()
  })

  it('places badges along the open leaf', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(40, 60)')
  })

  it('places badges along the closed wall segment', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }), false)

    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(60, 40)')
  })

  it('keeps non-concealed closed doors on the full wall segment', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }), false)
    const leaf = container.querySelector('.maplab-door-leaf-closed')

    expect(leaf).toHaveAttribute('x1', '40')
    expect(leaf).toHaveAttribute('x2', '80')
    expect(leaf).not.toHaveAttribute('stroke-dasharray')
    expect(leaf).not.toHaveAttribute('pathLength')
  })

  it('keeps closed concealed doors dotted across the full wall gap', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }), false)
    const leaf = container.querySelector('.maplab-door-leaf-closed')

    expect(leaf).toHaveAttribute('x1', '43')
    expect(leaf).toHaveAttribute('x2', '77')
    expect(leaf).toHaveAttribute('stroke-dasharray', '1 9')
    expect(leaf).toHaveAttribute('pathLength', '61')
    expect(leaf).toHaveStyle({ strokeLinecap: 'round' })
  })

  it('uses the badge role foreground and places the status disc on the leaf', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }))

    expect(container.querySelector('.maplab-door-badge svg')).toHaveStyle({ color: 'var(--md-on-passage-locked)' })
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('transform', 'translate(40, 60)')
  })

  it('renders badges in the trailing door-badge-layer', () => {
    const { container } = renderDoor(door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    }))
    const marker = container.querySelector('.maplab-door') as Element
    const layer = container.querySelector('.maplab-door-badge-layer') as Element

    expect(marker.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(layer.querySelector('.maplab-door-badge')).toBeTruthy()
  })

  it.each(['N', 'S', 'E', 'W'] as const)('keeps a collapsed badge on the %s side', (side) => {
    const { container } = renderDoor(door({
      side,
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    }))

    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })

  it('sparse explicit-false session override changes only its addressed leaf while open remains independent', () => {
    const marker = door({
      state: {
        open: false,
        obstacles: {
          concealment: { armed: false },
          lock: { armed: true, shown: true },
          trap: { armed: true, shown: true },
        },
      },
    })
    const { container } = render(
      <svg>
        <DoorMarker door={marker} cellSize={40} session={{ obstacles: { trap: { armed: false } }, open: true }} />
        <g className="maplab-door-badge-layer"><DoorBadgeLayer door={marker} cellSize={40} session={{ obstacles: { trap: { armed: false } }, open: true }} /></g>
      </svg>,
    )
    // Trap badge removed by session override; lock badge remains
    expect(container.querySelector('.maplab-door-badge')).toHaveAttribute('data-badge', 'locked')
    expect(container.querySelectorAll('.maplab-door-badge')).toHaveLength(1)
    // Door is open from session, independent of the badge change
    expect(container.querySelector('.maplab-door-leaf')).toBeTruthy()
    expect(container.querySelector('.maplab-door-swing')).toBeTruthy()
  })
})
