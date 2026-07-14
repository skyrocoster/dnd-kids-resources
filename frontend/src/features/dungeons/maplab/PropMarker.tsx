import { ItemIcon } from '../../../components/icons'
import { BadgeRing } from './BadgeRing'
import { PROP_KIND_ICONS } from './fixtureTypes'
import { markerBadges } from './markerBadges'
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  WALL_PROP_ICON_SCALE,
  WALL_PROP_RADIUS_FRACTION,
  doorWallSegment,
  passagePresentation,
  type MapProp,
} from './maplabModel'

const PROP_IDENTITY_TOKENS: Record<string, string> = {
  chest: '--md-loot',
  encounter: '--md-tertiary',
}

interface PropMarkerProps {
  prop: MapProp
  cellSize: number
  selected?: boolean
  /** Whether this marker responds to pointer/keyboard — off for the read-only editor render
   * (Stage F2); Stage F3 turns it on for authoring select/click. */
  interactive?: boolean
  /** Fractional-cell nudge (from `gridMarkerOffset`) when this on-square prop shares its cell with
   * other markers (stairs/portals/props). Ignored for wall-attached props, which anchor to their
   * wall segment instead. */
  offset?: { dx: number; dy: number }
  /** True when 2+ markers share this cell — shrinks the marker to `GROUPED_MARKER_RADIUS_FRACTION`
   * so `gridMarkerOffset`'s spacing actually separates same-cell markers instead of stacking
   * full-size circles a few px apart. */
  grouped?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

/** Shared prop-marker render for both the viewer and editor pages — an on-square prop centers on
 * its cell (stair-marker pattern); a wall-attached prop (`side` present) anchors at the wall
 * segment's midpoint (door pattern) with a smaller marker. The kind icon is the primary glyph;
 * on-square marker color is stable fixture identity, while the status disc carries state. */
export function PropMarker({
  prop,
  cellSize,
  selected,
  interactive = true,
  offset,
  grouped,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: PropMarkerProps) {
  const onWall = prop.side !== undefined
  let cx: number
  let cy: number
  if (onWall) {
    const segment = doorWallSegment({ cell: prop.cell, side: prop.side! }, cellSize)
    cx = (segment.x1 + segment.x2) / 2
    cy = (segment.y1 + segment.y2) / 2
  } else {
    cx = (prop.cell[0] + 0.5 + (offset?.dx ?? 0)) * cellSize
    cy = (prop.cell[1] + 0.5 + (offset?.dy ?? 0)) * cellSize
  }
  const radius = onWall
    ? cellSize * WALL_PROP_RADIUS_FRACTION
    : grouped
      ? cellSize * GROUPED_MARKER_RADIUS_FRACTION
      : cellSize * MARKER_RADIUS_FRACTION
  const iconSize = onWall
    ? cellSize * WALL_PROP_ICON_SCALE
    : grouped
      ? cellSize * GROUPED_MARKER_RADIUS_FRACTION * 1.1
      : cellSize * 0.34

  const presentation = passagePresentation(prop)
  const token = onWall ? presentation.token : (PROP_IDENTITY_TOKENS[prop.kind] ?? '--md-on-surface-variant')
  const Icon = PROP_KIND_ICONS[prop.kind] ?? ItemIcon
  const badges = markerBadges(prop)
  const dasharray = prop.hidden ? '4 3' : undefined
  const label = `${prop.title ?? prop.kind} — ${badges.length ? badges.map((badge) => badge.label).join(', ') : presentation.label}`

  return (
    <g
      className="maplab-prop"
      data-state={presentation.state}
      data-selected={selected || undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      onFocus={interactive ? onFocus : undefined}
      onBlur={interactive ? onBlur : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <title>{prop.title ?? prop.kind}</title>
      <circle
        className="maplab-prop-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${token})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <Icon width={iconSize} height={iconSize} className="maplab-prop-icon" style={{ color: `var(${token})` }} />
      </g>
      <BadgeRing
        badges={badges}
        cx={cx}
        cy={cy}
        cellX={prop.cell[0] * cellSize}
        cellY={prop.cell[1] * cellSize}
        cellSize={cellSize}
        markerRadius={radius}
        badgeRadius={8}
      />
    </g>
  )
}
