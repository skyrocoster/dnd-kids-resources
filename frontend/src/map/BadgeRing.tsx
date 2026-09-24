import type { MarkerBadge } from "./markerBadges";
import { boundedBadgeLayout, collapsedStatusDescriptor } from "./markerBadges";
import { BadgeDisc } from "./BadgeDisc";

interface BadgeRingProps {
  badges: MarkerBadge[];
  cx: number;
  cy: number;
  cellX: number;
  cellY: number;
  cellSize: number;
  markerRadius: number;
  badgeRadius: number;
}

/** Renders the one collapsed on-square status disc. The parent marker's `aria-label`
 * still narrates the full independent badge list. */
export function BadgeRing({
  badges,
  cx,
  cy,
  cellX,
  cellY,
  cellSize,
  markerRadius,
  badgeRadius,
}: BadgeRingProps) {
  const badge = collapsedStatusDescriptor(badges);
  if (!badge) return null;

  const position = boundedBadgeLayout(cellX, cellY, cellSize, cx, cy, markerRadius, badgeRadius);
  return (
    <g className="maplab-badge-ring" aria-hidden="true">
      <BadgeDisc badge={badge} cx={position.cx} cy={position.cy} radius={position.radius} />
    </g>
  );
}
