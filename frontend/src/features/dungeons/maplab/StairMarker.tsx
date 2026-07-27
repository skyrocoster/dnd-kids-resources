import { BadgeRing } from './BadgeRing'
import { collapsedStatusLabel, markerBadges } from './markerBadges'
import { stairPresentation } from './maplabPresentation'
import {
  effectivePassageState,
  type MapCell,
  type MapStair,
  type PassageSessionState,
} from '../../../model/maplabModel'
import { onSquareMarkerGeometry, MarkerHitArea, MarkerGlyph } from '../../../map/markerShape'

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
  simplified?: boolean
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
  simplified,
  destinationLabel,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: StairMarkerProps) {
  const { cx, cy, radius, iconSize } = onSquareMarkerGeometry(cell, cellSize, { offset, grouped })

  const effective = effectivePassageState(stair, session)
  const presentation = stairPresentation(stair, activeZ, session)
  const Icon = presentation.icon
  // Keep the authored trap badge after disarming so the confirmation badge can communicate both facts.
  const badges = markerBadges({ ...stair, locked: effective.locked }, trapDisarmed ?? effective.trapDisarmed)
  const dasharray = effective.hidden ? '4 3' : undefined
  const resolvedLabel = `${stair.title ?? `Stair ${stair.stair_id}`} — ${collapsedStatusLabel(badges, presentation.label)}${destinationLabel ? ` — ${destinationLabel}` : ''}`

  return (
    <MarkerHitArea
      className="maplab-stair"
      dataState={presentation.state}
      selected={selected}
      ariaPressed={selected}
      label={resolvedLabel}
      title={stair.title ?? `Stair ${stair.stair_id}`}
      stopPropagation
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
    >
      <circle
        className="maplab-stair-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${STAIR_IDENTITY_TOKEN})` }}
        strokeDasharray={dasharray}
      />
      <MarkerGlyph
        icon={Icon}
        cx={cx}
        cy={cy}
        size={iconSize}
        colorToken={STAIR_IDENTITY_TOKEN}
        className="maplab-stair-icon"
        simplified={simplified}
      />
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
    </MarkerHitArea>
  )
}
