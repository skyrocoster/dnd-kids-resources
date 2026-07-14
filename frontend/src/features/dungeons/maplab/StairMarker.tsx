import { BadgeRing } from './BadgeRing'
import { collapsedStatusLabel, markerBadges } from './markerBadges'
import {
  effectivePassageState,
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  stairPresentation,
  type MapCell,
  type MapStair,
  type PassageSessionState,
} from './maplabModel'

const STAIR_IDENTITY_TOKEN = '--md-tertiary'

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
  /** Viewer-only destination appended after the complete status narration. */
  destinationLabel?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

/** Stair marker — the stair glyph and ring carry stable fixture identity; one collapsed
 * status disc carries passage state, and hidden remains dashed as a non-color cue. */
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
  destinationLabel,
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

  const effective = effectivePassageState(stair, session)
  const presentation = stairPresentation(stair, activeZ, session)
  const Icon = presentation.icon
  // Keep the authored trap badge after disarming so the confirmation badge can communicate both facts.
  const badges = markerBadges({ ...stair, locked: effective.locked }, trapDisarmed ?? effective.trapDisarmed)
  const dasharray = effective.hidden ? '4 3' : undefined
  const resolvedLabel = `${stair.title ?? `Stair ${stair.stair_id}`} — ${collapsedStatusLabel(badges, presentation.label)}${destinationLabel ? ` — ${destinationLabel}` : ''}`

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
        style={{ stroke: `var(${STAIR_IDENTITY_TOKEN})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <Icon width={iconSize} height={iconSize} className="maplab-stair-icon" style={{ color: `var(${STAIR_IDENTITY_TOKEN})` }} />
      </g>
      <BadgeRing
        badges={badges}
        cx={cx}
        cy={cy}
        cellX={cell[0] * cellSize}
        cellY={cell[1] * cellSize}
        cellSize={cellSize}
        markerRadius={radius}
        badgeRadius={8}
      />
    </g>
  )
}
