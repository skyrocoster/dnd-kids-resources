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
describe('PropMarker bounded badge (M2)', () => {
  it('renders one status disc with its own icon for a single active flag', () => {
    const { container } = renderMarker(prop({ locked: true }))

    expect(container.querySelectorAll('.maplab-badge-ring .maplab-badge')).toHaveLength(1)
    expect(container.querySelector('[data-badge="locked"] svg')).toHaveStyle({ color: 'var(--md-on-passage-locked)' })
  })

  it('renders Layers icon disc for multiple active flags', () => {
    const { container } = renderMarker(prop({ locked: true, trapped: true }))
    const badges = container.querySelectorAll('.maplab-badge-ring .maplab-badge')

    expect(badges).toHaveLength(1)
    expect(container.querySelector('[data-badge="multiple-statuses"] svg')).toHaveStyle({ color: 'var(--md-on-surface)' })
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
    const unlockedIcon = unlocked.querySelector('.maplab-prop-icon')
    const lockedIcon = locked.querySelector('.maplab-prop-icon')

    expect(unlockedStroke).toHaveStyle({ stroke: 'var(--md-loot)' })
    expect(lockedStroke).toHaveStyle({ stroke: 'var(--md-loot)' })
    expect(unlockedIcon).toHaveStyle({ color: 'var(--md-loot)' })
    expect(lockedIcon).toHaveStyle({ color: 'var(--md-loot)' })
  })

  it('keeps hidden state as dashed outline', () => {
    const { container } = renderMarker(prop({ hidden: true, locked: true }))
    expect(container.querySelector('.maplab-prop-marker')).toHaveAttribute('stroke-dasharray')
  })

  it('names the Layers disc and narrates every active status in the ARIA label', () => {
    const { getByRole } = renderMarker(prop({ locked: true, trapped: true }))
    expect(getByRole('button').getAttribute('aria-label')).toMatch(/Multiple statuses: Trapped, Locked/)
  })
  it('uses encounter identity for encounter props regardless of status', () => {
    const { container } = renderMarker(prop({ kind: 'encounter', trapped: true }))

    expect(container.querySelector('.maplab-prop-marker')).toHaveStyle({ stroke: 'var(--md-tertiary)' })
    expect(container.querySelector('.maplab-prop-icon')).toHaveStyle({ color: 'var(--md-tertiary)' })
  })

  it('renders one collapsed disc and narrates every active badge', () => {
    const { container, getByRole } = renderMarker(prop({ locked: true, trapped: true, loot: { bundle_id: 1 } }))

    expect(container.querySelectorAll('.maplab-badge')).toHaveLength(1)
    expect(container.querySelector('.maplab-badge')).toHaveAttribute('data-badge', 'multiple-statuses')
    expect(getByRole('button', { name: 'Treasure chest — Multiple statuses: Trapped, Locked, Loot assigned' })).toBeTruthy()
  })

  it('does not render legacy corner or loot badges when BadgeRing is active', () => {
    const { container } = renderMarker(prop({ locked: true, loot: { bundle_id: 1 } }))

    expect(container.querySelector('.maplab-prop-state-badge')).toBeNull()
    expect(container.querySelector('.maplab-loot-badge')).toBeNull()
  })
})
