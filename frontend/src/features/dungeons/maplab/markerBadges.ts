import type { LucideIcon } from 'lucide-react'
import type { MapDoor, MapPortal, MapProp, MapStair } from './maplabModel'

/** A single badge descriptor — one flag → one badge, fed into either a radial ring (on-square
 * markers) or a linear layout (door leaf). The `key` is stable across renders so badges keep
 * their clock position as unrelated flags toggle. */
export interface MarkerBadge {
  key: string
  icon: LucideIcon
  token: string
  label: string
}

type BadgeSource = MapDoor | MapStair | MapPortal | MapProp

/** Derive the ordered badge descriptor list from a marker's passage flags and session state.
 * Composed from, in fixed precedence: trapped ▸ locked ▸ hidden (from `passageStateChips`),
 * then loot (when present), then trap-disarmed. Stable ordering so a badge keeps its clock
 * position as unrelated flags toggle. */
export function markerBadges(_source: BadgeSource, _trapDisarmed?: boolean): MarkerBadge[] {
  return []
}

/** Radial layout for on-square markers (props, stairs, portals). First badge at −90° (12 o'clock),
 * step = 360/count, sweeping clockwise. Each badge center is at distance `markerRadius + gap +
 * badgeRadius` from the marker center. Returns center-relative {x, y} offsets. */
export function radialBadgeLayout(
  _count: number,
  _markerRadius: number,
  _badgeRadius: number,
): { x: number; y: number }[] {
  throw new Error('NotImplemented')
}

/** Linear layout for door badges along the leaf. Badges at evenly spaced interior params
 * t_i = (i+1)/(count+1) along `segment`, each pushed off the leaf by `normal` so they float
 * just above the line. Returns absolute {x, y} positions. */
export function linearBadgeLayout(
  _count: number,
  _segment: { x1: number; y1: number; x2: number; y2: number },
  _normal: { x: number; y: number },
  _badgeRadius: number,
): { x: number; y: number }[] {
  throw new Error('NotImplemented')
}
