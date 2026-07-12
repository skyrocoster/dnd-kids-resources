import { HiddenIcon, LockIcon, TrapIcon, ItemIcon, type LucideIcon } from '../../../components/icons'
import { PROP_KIND_ICONS } from './fixtureTypes'
import { doorWallSegment, passagePresentation, type MapProp, type PassageState } from './maplabModel'

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
    cx = (prop.cell[0] + 0.5) * cellSize
    cy = (prop.cell[1] + 0.5) * cellSize
  }
  const radius = onWall ? cellSize * 0.22 : cellSize * 0.32
  const iconSize = onWall ? cellSize * 0.28 : cellSize * 0.34

  const presentation = passagePresentation(prop)
  const Icon = PROP_KIND_ICONS[prop.kind] ?? ItemIcon
  const BadgeIcon = BADGE_ICONS[presentation.state]
  const dasharray = presentation.state === 'hidden' ? '4 3' : undefined
  const label = `${prop.title ?? prop.kind} — ${presentation.label}`

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
        style={{ stroke: `var(${presentation.token})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <Icon width={iconSize} height={iconSize} className="maplab-prop-icon" style={{ color: `var(${presentation.token})` }} />
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
    </g>
  )
}
