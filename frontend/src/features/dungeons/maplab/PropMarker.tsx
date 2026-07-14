import { CoinsIcon, HiddenIcon, LockIcon, TrapIcon, ItemIcon, type LucideIcon } from '../../../components/icons'
import { PROP_KIND_ICONS } from './fixtureTypes'
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  WALL_PROP_ICON_SCALE,
  WALL_PROP_RADIUS_FRACTION,
  doorWallSegment,
  passagePresentation,
  type MapProp,
  type PassageState,
} from './maplabModel'

const BADGE_ICONS: Partial<Record<PassageState, LucideIcon>> = {
  hidden: HiddenIcon,
  locked: LockIcon,
  trapped: TrapIcon,
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
 * the dominant passage state (from `passagePresentation`) drives the token color, a dashed outline
 * when hidden, and a small corner badge when locked/trapped/hidden — never hue-alone. */
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
  // Encounter markers default to the encounter/monster tertiary (teal) role rather than the
  // generic neutral "unlocked" token — trapped/locked/hidden states still take precedence.
  const token =
    prop.kind === 'encounter' && presentation.state === 'unlocked' ? '--md-tertiary' : presentation.token
  const Icon = PROP_KIND_ICONS[prop.kind] ?? ItemIcon
  const BadgeIcon = BADGE_ICONS[presentation.state]
  const dasharray = presentation.state === 'hidden' ? '4 3' : undefined
  const label = `${prop.title ?? prop.kind} — ${presentation.label}${prop.loot ? ' — loot assigned' : ''}`

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
      {BadgeIcon && (
        <g transform={`translate(${cx + iconSize / 4}, ${cy + iconSize / 4})`}>
          <BadgeIcon
            width={14}
            height={14}
            className="maplab-prop-state-badge"
            aria-hidden="true"
            style={{ color: `var(${presentation.token})` }}
          />
        </g>
      )}
      {prop.loot && (
        <g className="maplab-loot-badge" transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
          <circle cx={7} cy={7} r={8} fill="var(--md-loot)" />
          <CoinsIcon
            width={14}
            height={14}
            aria-hidden="true"
            style={{ color: 'var(--md-on-loot)' }}
          />
        </g>
      )}
    </g>
  )
}
