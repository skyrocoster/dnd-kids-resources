import { describe, expect, it } from 'vitest'
import {
  collapsedStatusDescriptor,
  linearBadgeLayout,
  markerBadges,
  radialBadgeLayout,
} from '../markerBadges'
import type { MapProp } from '../maplabModel'

const prop = (overrides: Partial<MapProp> = {}): MapProp => ({
  prop_id: 1,
  kind: 'chest',
  cell: [0, 0],
  hidden: false,
  locked: false,
  trapped: false,
  ...overrides,
})

describe('markerBadges', () => {
  it('returns chips from passageStateChips in precedence order', () => {
    expect(markerBadges(prop({ hidden: true, locked: true, trapped: true })).map((badge) => badge.key)).toEqual([
      'trapped',
      'locked',
      'hidden',
    ])
  })

  it('adds loot and trapDisarmed after passage-state badges', () => {
    expect(markerBadges(prop({ locked: true, trapped: true, loot: { bundle_id: 1 } }), true).map((badge) => badge.key)).toEqual([
      'trapped',
      'locked',
      'loot',
      'trap-disarmed',
    ])
  })

  it('returns empty array for unlocked with no loot', () => {
    expect(markerBadges(prop())).toEqual([])
  })
})

// ─── M1 — Collapsed Status Model ────────────────────────────────────────────
describe.skip('collapsedStatusDescriptor (M1)', () => {
  it('returns none for an empty badge list', () => {
    expect(collapsedStatusDescriptor([])).toEqual({ kind: 'none' })
  })

  it('returns single with the sole badge for a one-element list', () => {
    const [badge] = markerBadges(prop({ locked: true }))
    const result = collapsedStatusDescriptor([badge])
    expect(result).toHaveProperty('kind', 'single')
    if (result.kind === 'single') {
      expect(result.badge.key).toBe('locked')
    }
  })

  it('returns multiple with Layers icon for two or more badges', () => {
    const badges = markerBadges(prop({ locked: true, trapped: true }))
    const result = collapsedStatusDescriptor(badges)
    expect(result).toHaveProperty('kind', 'multiple')
    if (result.kind === 'multiple') {
      expect(result.label).toBe('Multiple statuses')
    }
  })

  it('returns multiple for loot + trap-disarmed without passage flags', () => {
    const badges = markerBadges(prop({ loot: { bundle_id: 1 } }), true)
    const result = collapsedStatusDescriptor(badges)
    expect(result).toHaveProperty('kind', 'multiple')
  })

  it('preserves full MarkerBadge list for inspector label consumers', () => {
    const badges = markerBadges(prop({ locked: true, trapped: true, loot: { bundle_id: 1 } }))
    expect(badges.map((b) => b.key)).toEqual(['trapped', 'locked', 'loot'])
    expect(badges).toHaveLength(3)
  })
})

describe('radialBadgeLayout', () => {
  const layout = (count: number) => radialBadgeLayout(count, 10, 8)

  it('starts at 12 o\'clock (-90°)', () => {
    const [first] = layout(1)
    expect(first.x).toBeCloseTo(0)
    expect(first.y).toBeCloseTo(-20)
  })

  it('uses even 180° spacing for 2 badges', () => {
    const [first, second] = layout(2)
    expect(first.y).toBeCloseTo(-20)
    expect(second.y).toBeCloseTo(20)
  })

  it('uses even 120° clockwise spacing for 3 badges in SVG y-down space', () => {
    const [first, second, third] = layout(3)
    expect(first.y).toBeCloseTo(-20)
    expect(second.x).toBeCloseTo(Math.sqrt(3) * 10)
    expect(second.y).toBeCloseTo(10)
    expect(third.x).toBeCloseTo(-Math.sqrt(3) * 10)
    expect(third.y).toBeCloseTo(10)
  })

  it('uses even 90° spacing for 4 badges', () => {
    const [first, second, third, fourth] = layout(4)
    expect(first.x).toBeCloseTo(0)
    expect(first.y).toBeCloseTo(-20)
    expect(second.x).toBeCloseTo(20)
    expect(second.y).toBeCloseTo(0)
    expect(third.x).toBeCloseTo(0)
    expect(third.y).toBeCloseTo(20)
    expect(fourth.x).toBeCloseTo(-20)
    expect(fourth.y).toBeCloseTo(0)
  })

  it('places badges outside the marker radius', () => {
    for (const position of layout(4)) {
      expect(Math.hypot(position.x, position.y) - 8).toBeGreaterThan(10)
    }
  })
})

describe('linearBadgeLayout', () => {
  it('uses evenly spaced interior points along a vertical segment', () => {
    expect(linearBadgeLayout(2, { x1: 20, y1: 10, x2: 20, y2: 70 }, { x: 1, y: 0 }, 8)).toEqual([
      { x: 30, y: 30 },
      { x: 30, y: 50 },
    ])
  })

  it('uses evenly spaced interior points along a horizontal segment', () => {
    expect(linearBadgeLayout(3, { x1: 10, y1: 20, x2: 70, y2: 20 }, { x: 0, y: 1 }, 8)).toEqual([
      { x: 25, y: 30 },
      { x: 40, y: 30 },
      { x: 55, y: 30 },
    ])
  })

  it('pushes badges off the segment in the supplied normal direction', () => {
    expect(linearBadgeLayout(1, { x1: 0, y1: 0, x2: 40, y2: 0 }, { x: 0, y: -1 }, 8)).toEqual([
      { x: 20, y: -10 },
    ])
  })
})
