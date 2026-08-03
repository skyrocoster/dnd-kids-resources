import type { MarkerBadge } from './markerBadges'
import { boundedBadgeLayout, collapsedStatusDescriptor } from './markerBadges'

interface BadgeRingProps {
  badges: MarkerBadge[]
  cx: number
  cy: number
  cellX: number
  cellY: number
  cellSize: number
  markerRadius: number
  badgeRadius: number
}

/** Renders the one collapsed on-square status disc. The parent marker's `aria-label`
 * still narrates the full independent badge list. */
export function BadgeRing({ badges, cx, cy, cellX, cellY, cellSize, markerRadius, badgeRadius }: BadgeRingProps) {
  const badge = collapsedStatusDescriptor(badges)
  if (!badge) return null

  const position = boundedBadgeLayout(cellX, cellY, cellSize, cx, cy, markerRadius, badgeRadius)
  const Icon = badge.icon
  const iconSize = badgeRadius * 1.4

  return (
    <g className="maplab-badge-ring" aria-hidden="true">
      <g className="maplab-badge" data-badge={badge.key} transform={`translate(${position.cx}, ${position.cy})`}>
        <circle r={position.radius} fill={`var(${badge.token})`} />
        <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
          <Icon width={iconSize} height={iconSize} style={{ color: `var(${badge.onToken})` }} />
        </g>
      </g>
    </g>
  )
}
