/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Layers } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { MultipleStatusesIcon } from '../../../../components/icons'
import {
  boundedBadgeLayout,
  collapsedStatusLabel,
  collapsedStatusDescriptor,
  linearBadgeLayout,
  markerBadges,
  MULTIPLE_STATUSES_BADGE,
} from '../markerBadges'
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  gridMarkerOffset,
  MARKER_RADIUS_FRACTION,
  markersAtCell,
  type MapLayout,
  type MapProp,
} from '../maplabModel'

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

  it('names the Layers disc as multiple statuses while preserving every flag', () => {
    expect(collapsedStatusLabel(markerBadges(prop({ locked: true, trapped: true })), 'Clear')).toBe(
      'Multiple statuses: Trapped, Locked',
    )
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

describe('boundedBadgeLayout (M2)', () => {
  const cellSize = 40
  const badgeRadius = 8

  function placementFor(count: number, index: number) {
    const offset = gridMarkerOffset(count, index)
    const markerRadius = cellSize * (count > 1 ? GROUPED_MARKER_RADIUS_FRACTION : MARKER_RADIUS_FRACTION)
    const cx = (1.5 + offset.dx) * cellSize
    const cy = (1.5 + offset.dy) * cellSize
    return boundedBadgeLayout(40, 40, cellSize, cx, cy, markerRadius, badgeRadius)
  }

  function expectWithinCell(placement: { cx: number; cy: number; radius: number }) {
    expect(placement.cx - placement.radius).toBeGreaterThanOrEqual(40)
    expect(placement.cx + placement.radius).toBeLessThanOrEqual(80)
    expect(placement.cy - placement.radius).toBeGreaterThanOrEqual(40)
    expect(placement.cy + placement.radius).toBeLessThanOrEqual(80)
  }

  it.each([1, 2, 3, 4])('keeps all %s supported marker slots inside the owning cell', (count) => {
    for (let index = 0; index < count; index += 1) {
      expectWithinCell(placementFor(count, index))
    }
  })

  it.each([2, 3, 4])('does not overlap pairwise disc bounds for %s co-located markers', (count) => {
    const placements = Array.from({ length: count }, (_, index) => placementFor(count, index))

    for (let a = 0; a < placements.length; a += 1) {
      for (let b = a + 1; b < placements.length; b += 1) {
        const distance = Math.hypot(placements[a].cx - placements[b].cx, placements[a].cy - placements[b].cy)
        expect(distance).toBeGreaterThanOrEqual(placements[a].radius + placements[b].radius)
      }
    }
  })

  it('clamps edge-biased marker centers to keep the full disc inside the cell', () => {
    expect(boundedBadgeLayout(40, 40, cellSize, 39, 81, 12, badgeRadius)).toEqual({ cx: 48, cy: 72, radius: 8 })
  })

  it('uses deterministic type/id ordering before assigning grouped slots', () => {
    const layout: MapLayout = {
      meta: { cellSizeFt: 5, padding: 1 },
      rooms: [{ room_id: 1, z: 1, origin: [1, 1], cells: [[0, 0]] }],
      floors: [{ z: 1 }],
      doors: [],
      stairs: [
        { stair_id: 2, from: { z: 1, cell: [1, 1] }, to: { z: 2, cell: [1, 1] }, hidden: false, locked: false, trapped: false },
        { stair_id: 1, from: { z: 1, cell: [1, 1] }, to: { z: 2, cell: [1, 1] }, hidden: false, locked: false, trapped: false },
      ],
      portals: [{ portal_id: 4, z: 1, cell: [1, 1], to: { z: 2, cell: [1, 1] }, hidden: false, locked: false, trapped: false }],
      props: [{ prop_id: 3, kind: 'chest', z: 1, cell: [1, 1], hidden: false, locked: false, trapped: false }],
    }

    expect(markersAtCell(layout, 1, [1, 1])).toEqual([
      { type: 'stair', id: 1 },
      { type: 'stair', id: 2 },
      { type: 'portal', id: 4 },
      { type: 'prop', id: 3 },
    ])
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
