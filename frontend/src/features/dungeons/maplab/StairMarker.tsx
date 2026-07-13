import { HiddenIcon, LockIcon, TrapIcon, TrapDisarmedIcon, type LucideIcon } from '../../../components/icons'
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  stairPresentation,
  type MapCell,
  type MapStair,
  type PassageSessionState,
  type PassageState,
} from './maplabModel'

const BADGE_ICONS: Partial<Record<PassageState, LucideIcon>> = {
  hidden: HiddenIcon,
  locked: LockIcon,
  trapped: TrapIcon,
}

interface StairMarkerProps {
  stair: MapStair
  cellSize: number
  cell: MapCell
  activeZ: number
  selected?: boolean
  /** Live session state (locked/trapDisarmed) — the viewer merges this over the authored flags;
   * the editor omits it and gets the authored state as-is. */
  session?: PassageSessionState
  /** Viewer-only: shows a confirmation badge once a trapped stair's trap has been disarmed, in
   * addition to (and independent of) the state-driven `BADGE_ICONS` badge above. */
  trapDisarmed?: boolean
  /** Fractional-cell nudge (from `gridMarkerOffset`) when this stair shares its cell with other
   * markers (portals/other stairs/props). */
  offset?: { dx: number; dy: number }
  /** True when 2+ markers share this cell — shrinks the marker to `GROUPED_MARKER_RADIUS_FRACTION`
   * so `gridMarkerOffset`'s spacing actually separates same-cell markers instead of stacking
   * full-size circles a few px apart. */
  grouped?: boolean
  /** Overrides the default `title — state` label (the viewer appends the floor-jump target and a
   * disarmed suffix). */
  label?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

/** Stair marker — same visual language as portal/prop markers: a neutral-fill ring whose stroke
 * carries the passage-state token, the stair glyph as the primary icon, a small state badge when
 * locked/trapped/hidden, and a dashed outline when hidden — never hue-alone. */
export function StairMarker({
  stair,
  cellSize,
  cell,
  activeZ,
  selected,
  session,
  trapDisarmed,
  offset,
  grouped,
  label,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: StairMarkerProps) {
  const cx = (cell[0] + 0.5 + (offset?.dx ?? 0)) * cellSize
  const cy = (cell[1] + 0.5 + (offset?.dy ?? 0)) * cellSize
  const radius = grouped ? cellSize * GROUPED_MARKER_RADIUS_FRACTION : cellSize * MARKER_RADIUS_FRACTION
  const iconSize = grouped ? cellSize * GROUPED_MARKER_RADIUS_FRACTION * 1.1 : cellSize * 0.34

  const presentation = stairPresentation(stair, activeZ, session)
  const Icon = presentation.icon
  const BadgeIcon = BADGE_ICONS[presentation.state]
  const dasharray = presentation.state === 'hidden' ? '4 3' : undefined
  const resolvedLabel = label ?? `${stair.title ?? `Stair ${stair.stair_id}`} — ${presentation.label}`

  return (
    <g
      className="maplab-stair"
      data-state={presentation.state}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={resolvedLabel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <title>{stair.title ?? `Stair ${stair.stair_id}`}</title>
      <circle
        className="maplab-stair-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${presentation.token})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <Icon width={iconSize} height={iconSize} className="maplab-stair-icon" style={{ color: `var(${presentation.token})` }} />
      </g>
      {BadgeIcon && (
        <g transform={`translate(${cx + iconSize / 4}, ${cy + iconSize / 4})`}>
          <BadgeIcon
            width={14}
            height={14}
            className="maplab-stair-state-badge"
            aria-hidden="true"
            style={{ color: `var(${presentation.token})` }}
          />
        </g>
      )}
      {trapDisarmed && (
        <g transform={`translate(${cx + iconSize / 4}, ${cy + iconSize / 4})`}>
          <TrapDisarmedIcon
            width={14}
            height={14}
            className="maplab-trap-disarmed-badge"
            aria-hidden="true"
            style={{ color: 'var(--md-tertiary)' }}
          />
        </g>
      )}
    </g>
  )
}
