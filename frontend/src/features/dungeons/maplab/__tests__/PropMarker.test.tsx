import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PropMarker } from '../PropMarker'
import type { MapProp } from '../maplabModel'

const prop = (overrides: Partial<MapProp> = {}): MapProp => ({
  prop_id: 1,
  kind: 'chest',
  cell: [1, 1],
  title: 'Treasure chest',
  hidden: false,
  locked: false,
  trapped: false,
  ...overrides,
})

function renderMarker(marker: MapProp) {
  return render(
    <svg>
      <PropMarker prop={marker} cellSize={40} />
    </svg>,
  )
}

// ─── M2 — Bounded On-Square Markers ─────────────────────────────────────────
describe.skip('PropMarker bounded badge (M2)', () => {
  it('renders one status disc with its own icon for a single active flag', () => {
    const { container } = renderMarker(prop({ locked: true }))
    expect(container.querySelector('.maplab-badge-ring .maplab-badge')).toBeTruthy()
  })

  it('renders Layers icon disc for multiple active flags', () => {
    const { container } = renderMarker(prop({ locked: true, trapped: true }))
    const badges = container.querySelectorAll('.maplab-badge-ring .maplab-badge')
    expect(badges).toHaveLength(1)
  })

  it('renders no disc when no flags are active', () => {
    const { container } = renderMarker(prop())
    expect(container.querySelector('.maplab-badge-ring .maplab-badge')).toBeNull()
  })

  it('does not change identity stroke/icon token when status changes', () => {
    const { container: unlocked } = renderMarker(prop())
    const { container: locked } = renderMarker(prop({ locked: true }))
    const unlockedStroke = unlocked.querySelector('.maplab-prop-marker')
    const lockedStroke = locked.querySelector('.maplab-prop-marker')
    // Identity token is stable; only the badge disc changes
    expect(unlockedStroke).toBeTruthy()
    expect(lockedStroke).toBeTruthy()
  })

  it('keeps hidden state as dashed outline', () => {
    const { container } = renderMarker(prop({ hidden: true }))
    expect(container.querySelector('.maplab-prop-marker')).toHaveAttribute('stroke-dasharray')
  })

  it('narrates every active status in the ARIA label', () => {
    const { getByRole } = renderMarker(prop({ locked: true, trapped: true }))
    expect(getByRole('button').getAttribute('aria-label')).toMatch(/Trapped.*Locked/)
  })
})

describe('PropMarker', () => {
  it('renders BadgeRing badges instead of corner-stacked badges', () => {
    const { container } = renderMarker(prop({ locked: true, trapped: true }))

    expect(container.querySelector('.maplab-badge-ring')).toBeTruthy()
    expect(container.querySelectorAll('.maplab-badge')).toHaveLength(2)
  })

  it('renders the full radial badge count and narrates every active badge', () => {
    const { container, getByRole } = renderMarker(prop({ locked: true, trapped: true, loot: { bundle_id: 1 } }))

    expect(container.querySelectorAll('.maplab-badge')).toHaveLength(3)
    expect(getByRole('button', { name: 'Treasure chest — Trapped, Locked, Loot assigned' })).toBeTruthy()
  })

  it("uses each badge token's matching foreground for icon contrast", () => {
    const { container } = renderMarker(prop({ locked: true, loot: { bundle_id: 1 } }))

    expect(container.querySelector('[data-badge="locked"] svg')).toHaveStyle({ color: 'var(--md-on-passage-locked)' })
    expect(container.querySelector('[data-badge="loot"] svg')).toHaveStyle({ color: 'var(--md-on-loot)' })
  })

  it('does not render legacy corner or loot badges when BadgeRing is active', () => {
    const { container } = renderMarker(prop({ locked: true, loot: { bundle_id: 1 } }))

    expect(container.querySelector('.maplab-prop-state-badge')).toBeNull()
    expect(container.querySelector('.maplab-loot-badge')).toBeNull()
  })
})
