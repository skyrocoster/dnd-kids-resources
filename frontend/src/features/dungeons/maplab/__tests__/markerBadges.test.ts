/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Layers } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { MultipleStatusesIcon } from '../../../../components/icons'
import {
  collapsedStatusDescriptor,
  linearBadgeLayout,
  markerBadges,
  MULTIPLE_STATUSES_BADGE,
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

const themeCss = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')

const expectThemeToken = (token: string): void => {
  expect(themeCss).toContain(`${token}:`)
}

// ─── M1 — Collapsed Status Model ────────────────────────────────────────────
describe('collapsedStatusDescriptor (M1)', () => {
  it('returns null for an empty badge list', () => {
    expect(collapsedStatusDescriptor([])).toBeNull()
  })

  it.each([
    ['trapped', prop({ trapped: true })],
    ['locked', prop({ locked: true })],
    ['hidden', prop({ hidden: true })],
    ['loot', prop({ loot: { bundle_id: 1 } })],
    ['trap-disarmed', prop()],
  ] as const)('returns the sole existing badge for %s', (key, source) => {
    const badges = markerBadges(source, key === 'trap-disarmed')
    const result = collapsedStatusDescriptor(badges)

    expect(badges).toHaveLength(1)
    expect(result).toBe(badges[0])
    expect(result?.key).toBe(key)
  })

  it.each([
    ['trapped + locked', prop({ locked: true, trapped: true }), false, ['trapped', 'locked']],
    ['locked + hidden + loot', prop({ hidden: true, locked: true, loot: { bundle_id: 1 } }), false, ['locked', 'hidden', 'loot']],
    ['loot + trap-disarmed', prop({ loot: { bundle_id: 1 } }), true, ['loot', 'trap-disarmed']],
    ['all states', prop({ hidden: true, locked: true, trapped: true, loot: { bundle_id: 1 } }), true, [
      'trapped',
      'locked',
      'hidden',
      'loot',
      'trap-disarmed',
    ]],
  ] as const)('returns one synthetic descriptor for %s', (_name, source, trapDisarmed, expectedKeys) => {
    const badges = markerBadges(source, trapDisarmed)
    const result = collapsedStatusDescriptor(badges)

    expect(badges.map((badge) => badge.key)).toEqual(expectedKeys)
    expect(result).toBe(MULTIPLE_STATUSES_BADGE)
    expect(result).toMatchObject({
      key: 'multiple-statuses',
      icon: MultipleStatusesIcon,
      token: '--md-surface',
      onToken: '--md-on-surface',
      label: 'Multiple statuses',
    })
  })

  it('uses the semantically named Layers alias for multiple statuses', () => {
    expect(MultipleStatusesIcon).toBe(Layers)
    expect(MULTIPLE_STATUSES_BADGE.icon).toBe(Layers)
  })

  it('preserves the full MarkerBadge list for inspector and accessible-label consumers', () => {
    const badges = markerBadges(prop({ hidden: true, locked: true, trapped: true, loot: { bundle_id: 1 } }), true)
    const result = collapsedStatusDescriptor(badges)

    expect(result?.key).toBe('multiple-statuses')
    expect(badges).toHaveLength(5)
    expect(badges.map((badge) => badge.label)).toEqual(['Trapped', 'Locked', 'Hidden', 'Loot assigned', 'Trap disarmed'])
    expect(badges.map((badge) => badge.key)).toEqual(['trapped', 'locked', 'hidden', 'loot', 'trap-disarmed'])
  })

  it('uses token and foreground pairs that exist in the theme', () => {
    const badges = [
      ...markerBadges(prop({ hidden: true, locked: true, trapped: true, loot: { bundle_id: 1 } }), true),
      MULTIPLE_STATUSES_BADGE,
    ]

    for (const badge of badges) {
      expectThemeToken(badge.token)
      expectThemeToken(badge.onToken)
    }
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
