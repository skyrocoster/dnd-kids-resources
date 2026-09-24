import type { MarkerBadge } from "./markerBadges";

export interface BadgeDiscProps {
  badge: MarkerBadge;
  cx: number;
  cy: number;
  radius: number;
  className?: string;
  discClassName?: string;
  dataBadge?: string;
}

/** One shared status disc: DM and player surfaces must render the same icon and token pair. */
export function BadgeDisc({
  badge,
  cx,
  cy,
  radius,
  className,
  discClassName,
  dataBadge,
}: BadgeDiscProps) {
  const Icon = badge.icon;
  const iconSize = radius * 1.4;
  return (
    <g
      className={className}
      data-badge={dataBadge}
      transform={`translate(${cx}, ${cy})`}
      aria-label={badge.label}
    >
      <circle className={discClassName} r={radius} fill={`var(${badge.token})`} />
      <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
        <Icon width={iconSize} height={iconSize} style={{ color: `var(${badge.onToken})` }} />
      </g>
    </g>
  );
}
