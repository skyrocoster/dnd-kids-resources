import { CoinsIcon, MultipleStatusesIcon, TrapDisarmedIcon, type LucideIcon } from '../../../components/icons'
import { PASSAGE_STATE_TOKENS, passageStateChips, type MapDoor, type MapPortal, type MapProp, type MapStair } from './maplabModel'

/** A single badge descriptor — one flag → one badge, fed into either a radial ring (on-square
 * markers) or a linear layout (door leaf). The `key` is stable across renders so badges keep
 * their clock position as unrelated flags toggle. */
export interface MarkerBadge {
  key: string
  icon: LucideIcon
  token: string
  onToken: string
  label: string
}

type BadgeSource = MapDoor | MapStair | MapPortal | MapProp

// ─── M0 / M1: Collapsed status descriptor ───────────────────────────────────

/** A collapsed on-canvas status descriptor. Consumers that need full detail
 * (inspector labels, accessible descriptions) should still use the complete
 * `MarkerBadge[]` from `markerBadges()`. */
export type CollapsedStatusDescriptor = MarkerBadge | null

export const MULTIPLE_STATUSES_BADGE: MarkerBadge = {
  key: 'multiple-statuses',
  icon: MultipleStatusesIcon,
  token: '--md-surface',
  onToken: '--md-on-surface',
  label: 'Multiple statuses',
}

/** Collapse an ordered badge list to the single on-canvas disc M1 displays. */
export function collapsedStatusDescriptor(badges: MarkerBadge[]): CollapsedStatusDescriptor {
  if (badges.length === 0) return null
  if (badges.length === 1) return badges[0]
  return MULTIPLE_STATUSES_BADGE
}

// ─── M2: Bounded on-square placement ────────────────────────────────────────

/** A single badge disc position and radius that is geometrically bounded to stay
 * within its owning cell. The full disc (center + radius) must lie inside the
 * cell `[cellX, cellX + cellSize) × [cellY, cellY + cellSize)`. */
export interface BoundedBadgePlacement {
  cx: number
  cy: number
  radius: number
}

/** M2 stub — returns a bounded badge position for a standalone or grouped on-square
 * marker whose disc stays inside its owning cell and does not intersect other
 * co-located fixture discs. */
export function boundedBadgeLayout(
  _cellX: number,
  _cellY: number,
  _cellSize: number,
  markerCenterX: number,
  markerCenterY: number,
  _markerRadius: number,
  _badgeRadius: number,
): BoundedBadgePlacement {
  return { cx: markerCenterX, cy: markerCenterY, radius: 8 }
}

/** Derive the ordered badge descriptor list from a marker's passage flags and session state.
 * Composed from, in fixed precedence: trapped ▸ locked ▸ hidden (from `passageStateChips`),
 * then loot (when present), then trap-disarmed. Stable ordering so a badge keeps its clock
 * position as unrelated flags toggle. */
export function markerBadges(source: BadgeSource, trapDisarmed = false): MarkerBadge[] {
  const badges: MarkerBadge[] = passageStateChips(source).map(({ state, icon, label }) => ({
    key: state,
    icon,
    token: PASSAGE_STATE_TOKENS[state],
    onToken: `--md-on-${PASSAGE_STATE_TOKENS[state].slice('--md-'.length)}`,
    label,
  }))

  if ('loot' in source && source.loot) {
    badges.push({ key: 'loot', icon: CoinsIcon, token: '--md-loot', onToken: '--md-on-loot', label: 'Loot assigned' })
  }
  if (trapDisarmed) {
    badges.push({ key: 'trap-disarmed', icon: TrapDisarmedIcon, token: '--md-tertiary', onToken: '--md-on-tertiary', label: 'Trap disarmed' })
  }

  return badges
}

/** Radial layout for on-square markers (props, stairs, portals). First badge at −90° (12 o'clock),
 * step = 360/count, sweeping clockwise. Each badge center is at distance `markerRadius + gap +
 * badgeRadius` from the marker center. Returns center-relative {x, y} offsets. */
export function radialBadgeLayout(
  count: number,
  markerRadius: number,
  badgeRadius: number,
): { x: number; y: number }[] {
  if (count <= 0) return []

  const distance = markerRadius + 2 + badgeRadius
  return Array.from({ length: count }, (_, index) => {
    // SVG's y axis increases downward, so increasing angles sweep clockwise.
    const angle = (-90 + (360 / count) * index) * (Math.PI / 180)
    return { x: distance * Math.cos(angle), y: distance * Math.sin(angle) }
  })
}

/** Linear layout for door badges along the leaf. Badges at evenly spaced interior params
 * t_i = (i+1)/(count+1) along `segment`, each pushed off the leaf by `normal` so they float
 * just above the line. Returns absolute {x, y} positions. */
export function linearBadgeLayout(
  count: number,
  segment: { x1: number; y1: number; x2: number; y2: number },
  normal: { x: number; y: number },
  badgeRadius: number,
  clearance = badgeRadius + 2,
): { x: number; y: number }[] {
  if (count <= 0) return []

  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1)
    return {
      x: segment.x1 + (segment.x2 - segment.x1) * t + normal.x * clearance,
      y: segment.y1 + (segment.y2 - segment.y1) * t + normal.y * clearance,
    }
  })
}
