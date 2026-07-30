import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalMarker } from '../PortalMarker'
import { StairMarker } from '../StairMarker'
import type { FixtureState, MapPortal, MapStair, SessionFixtureState } from '../../../../model/maplabModel'

const stair = (overrides: Partial<MapStair> = {}): MapStair => ({
  stair_id: 1,
  from: { z: 1, cell: [1, 1] },
  to: { z: 2, cell: [1, 1] },
  hidden: false,
  locked: false,
  trapped: false,
  ...overrides,
})

const portal = (overrides: Partial<MapPortal> = {}): MapPortal => ({
  portal_id: 1,
  cell: [1, 1],
  z: 1,
  to: { z: 2, cell: [1, 1] },
  hidden: false,
  locked: false,
  trapped: false,
  ...overrides,
})

const lockedFixture: FixtureState = {
  open: false,
  obstacles: { concealment: { armed: false }, lock: { armed: true, shown: false }, trap: { armed: false, shown: false } },
}

const lockedTrappedFixture: FixtureState = {
  open: false,
  obstacles: { concealment: { armed: false }, lock: { armed: true, shown: false }, trap: { armed: true, shown: false } },
}

const concealedLockedFixture: FixtureState = {
  open: false,
  obstacles: { concealment: { armed: true }, lock: { armed: true, shown: true }, trap: { armed: false, shown: false } },
}

// ─── M2 — Bounded On-Square Markers ─────────────────────────────────────────
describe('StairMarker bounded badge (M2)', () => {
  it('renders one disc for a single flag, Layers for multiple flags', () => {
    const { container: single } = render(<svg><StairMarker stair={stair({ state: lockedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    const { container: multi } = render(<svg><StairMarker stair={stair({ state: lockedTrappedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)

    expect(single.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(single.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'locked')
    expect(multi.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(multi.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })

  it('renders no disc when no flags are active', () => {
    const { container } = render(<svg><StairMarker stair={stair()} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    expect(container.querySelector('.maplab-badge')).toBeNull()
  })

  it('keeps identity stroke stable regardless of status', () => {
    const { container: unlocked } = render(<svg><StairMarker stair={stair()} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    const { container: locked } = render(<svg><StairMarker stair={stair({ state: lockedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    expect(unlocked.querySelector('.maplab-stair-marker')).toHaveStyle({ stroke: 'var(--md-tertiary)' })
    expect(locked.querySelector('.maplab-stair-marker')).toHaveStyle({ stroke: 'var(--md-tertiary)' })
    expect(unlocked.querySelector('.maplab-stair-icon')).toHaveStyle({ color: 'var(--md-tertiary)' })
    expect(locked.querySelector('.maplab-stair-icon')).toHaveStyle({ color: 'var(--md-tertiary)' })
  })

  it('keeps concealment dashed outline', () => {
    const { container } = render(<svg><StairMarker stair={stair({ state: concealedLockedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    expect(container.querySelector('.maplab-stair-marker')).toHaveAttribute('stroke-dasharray')
  })

  it('proves independent sparse overrides — session disarms trap, lock badge remains, no positive-state badge', () => {
    const { getByRole } = render(
      <svg>
        <StairMarker
          stair={stair({ state: lockedTrappedFixture })}
          cellSize={40}
          cell={[1, 1]}
          activeZ={1}
          session={{ obstacles: { trap: { armed: false } } } as SessionFixtureState}
        />
      </svg>,
    )
    // Single badge: collapsedStatusLabel emits bare label, not "Multiple statuses:"
    expect(getByRole('button').getAttribute('aria-label')).toBe('Stair 1 \u2014 Locked')
  })

  it('stays within its owning cell', () => {
    const { container } = render(<svg width={200} height={200}><StairMarker stair={stair({ state: lockedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} /></svg>)
    const badge = container.querySelector('.maplab-badge')
    const transform = badge?.getAttribute('transform')
    expect(transform).toBe('translate(60, 60)')
  })
})

describe('PortalMarker bounded badge (M2)', () => {
  it('renders one disc for a single flag, Layers for multiple flags', () => {
    const { container: single } = render(<svg><PortalMarker portal={portal({ state: lockedFixture })} cellSize={40} /></svg>)
    const { container: multi } = render(<svg><PortalMarker portal={portal({ state: lockedTrappedFixture })} cellSize={40} /></svg>)

    expect(single.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(single.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'locked')
    expect(multi.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(multi.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
  })

  it('renders no disc when no flags are active', () => {
    const { container } = render(<svg><PortalMarker portal={portal()} cellSize={40} /></svg>)
    expect(container.querySelector('.maplab-badge')).toBeNull()
  })

  it('keeps identity stroke stable regardless of status', () => {
    const { container: unlocked } = render(<svg><PortalMarker portal={portal()} cellSize={40} /></svg>)
    const { container: locked } = render(<svg><PortalMarker portal={portal({ state: lockedFixture })} cellSize={40} /></svg>)
    expect(unlocked.querySelector('.maplab-portal-marker')).toHaveStyle({ stroke: 'var(--md-primary)' })
    expect(locked.querySelector('.maplab-portal-marker')).toHaveStyle({ stroke: 'var(--md-primary)' })
    expect(unlocked.querySelector('.maplab-portal-icon')).toHaveStyle({ color: 'var(--md-primary)' })
    expect(locked.querySelector('.maplab-portal-icon')).toHaveStyle({ color: 'var(--md-primary)' })
  })

  it('keeps concealment dashed outline', () => {
    const { container } = render(<svg><PortalMarker portal={portal({ state: concealedLockedFixture })} cellSize={40} /></svg>)
    expect(container.querySelector('.maplab-portal-marker')).toHaveAttribute('stroke-dasharray')
  })

  it('proves independent sparse overrides — session disarms trap, lock badge remains, no positive-state badge', () => {
    const { getByRole } = render(
      <svg>
        <PortalMarker
          portal={portal({ state: lockedTrappedFixture })}
          cellSize={40}
          session={{ obstacles: { trap: { armed: false } } } as SessionFixtureState}
        />
      </svg>,
    )
    // Single badge: collapsedStatusLabel emits bare label, not "Multiple statuses:"
    expect(getByRole('button').getAttribute('aria-label')).toBe('Portal 1 \u2014 Locked')
  })

  it('stays within its owning cell', () => {
    const { container } = render(<svg width={200} height={200}><PortalMarker portal={portal({ state: lockedFixture })} cellSize={40} /></svg>)
    const badge = container.querySelector('.maplab-badge')
    const transform = badge?.getAttribute('transform')
    expect(transform).toBe('translate(60, 60)')
  })
})

describe('StairMarker', () => {
  it('renders one collapsed badge; session-only disarms trap so lock alone remains, no positive-state badge', () => {
    const { container, getByRole } = render(
      <svg>
        <StairMarker
          stair={stair({ state: lockedTrappedFixture })}
          cellSize={40}
          cell={[1, 1]}
          activeZ={1}
          session={{ obstacles: { trap: { armed: false } } } as SessionFixtureState}
        />
      </svg>,
    )

    const badges = container.querySelectorAll('.maplab-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveAttribute('data-badge', 'locked')
    expect(getByRole('button', { name: 'Stair 1 \u2014 Locked' })).toBeTruthy()
  })

  it('keeps the collapsed badge in the grouped marker sub-slot', () => {
    const { container } = render(
      <svg>
        <StairMarker stair={stair({ state: lockedFixture })} cellSize={40} cell={[1, 1]} activeZ={1} offset={{ dx: 0.2, dy: -0.1 }} grouped />
      </svg>,
    )

    expect(container.querySelector('.maplab-badge')).toHaveAttribute('transform', 'translate(68, 56)')
  })

  it('omits the kind icon when simplified is true, keeps the marker circle', () => {
    const { container } = render(
      <svg>
        <StairMarker stair={stair()} cellSize={40} cell={[1, 1]} activeZ={1} simplified />
      </svg>,
    )

    expect(container.querySelector('.maplab-stair-marker')).toBeTruthy()
    expect(container.querySelector('.maplab-stair-icon')).toBeNull()
  })
})

describe('PortalMarker', () => {
  it('renders one collapsed badge; session-only disarms trap so lock alone remains, no positive-state badge', () => {
    const { container, getByRole } = render(
      <svg>
        <PortalMarker
          portal={portal({ state: lockedTrappedFixture })}
          cellSize={40}
          session={{ obstacles: { trap: { armed: false } } } as SessionFixtureState}
        />
      </svg>,
    )

    expect(container.querySelector('.maplab-badge-ring')).toBeTruthy()
    expect(container.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'locked')
    expect(getByRole('button', { name: 'Portal 1 \u2014 Locked' })).toBeTruthy()
  })

  it('keeps the collapsed badge in the grouped marker sub-slot', () => {
    const { container } = render(
      <svg>
        <PortalMarker portal={portal({ state: lockedFixture })} cellSize={40} offset={{ dx: 0.2, dy: -0.1 }} grouped />
      </svg>,
    )

    expect(container.querySelector('.maplab-badge')).toHaveAttribute('transform', 'translate(68, 56)')
  })

  it('omits the kind icon when simplified is true, keeps the marker circle', () => {
    const { container } = render(
      <svg>
        <PortalMarker portal={portal()} cellSize={40} simplified />
      </svg>,
    )

    expect(container.querySelector('.maplab-portal-marker')).toBeTruthy()
    expect(container.querySelector('.maplab-portal-icon')).toBeNull()
  })
})
