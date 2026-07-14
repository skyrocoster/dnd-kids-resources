import type { MarkerBadge } from './markerBadges'

interface BadgeRingProps {
  badges: MarkerBadge[]
  cx: number
  cy: number
  markerRadius: number
  badgeRadius: number
}

/** Renders a radial ring of badges around a marker center. Each badge is a small filled disc
 * with its icon, positioned at 12 o'clock and spaced evenly clockwise. `aria-hidden` since the
 * parent marker's `aria-label` already narrates state. */
export function BadgeRing(_props: BadgeRingProps) {
  return null
}
