import type { MarkerBadge } from './markerBadges'
import { radialBadgeLayout } from './markerBadges'

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
export function BadgeRing({ badges, cx, cy, markerRadius, badgeRadius }: BadgeRingProps) {
  const positions = radialBadgeLayout(badges.length, markerRadius, badgeRadius)

  return (
    <g className="maplab-badge-ring" aria-hidden="true">
      {badges.map((badge, index) => {
        const { x, y } = positions[index]
        const Icon = badge.icon
        const iconSize = badgeRadius * 1.4
        return (
          <g key={badge.key} className="maplab-badge" data-badge={badge.key} transform={`translate(${cx + x}, ${cy + y})`}>
            <circle r={badgeRadius} fill={`var(${badge.token})`} />
            <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
              <Icon width={iconSize} height={iconSize} style={{ color: `var(${badge.onToken})` }} />
            </g>
          </g>
        )
      })}
    </g>
  )
}
