import { PortalIcon } from '../../../components/icons'
import { BadgeRing } from './BadgeRing'
import { markerBadges } from './markerBadges'
import {
  effectivePassageState,
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  passagePresentation,
  type MapPortal,
  type PassageSessionState,
} from './maplabModel'

interface PortalMarkerProps {
  portal: MapPortal
  cellSize: number
  selected?: boolean
  /** Live session state (locked/trapDisarmed) — the viewer merges this over the authored flags;
   * the editor omits it and gets the authored state as-is. */
  session?: PassageSessionState
  /** Fractional-cell nudge (from `gridMarkerOffset`) when this portal shares its cell with other
   * markers (stairs/other portals/props). */
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

/** Portal marker — always on-square (never wall-attached), so it only needs the cell-centered half
 * of `PropMarker.tsx`'s geometry. Same visual language as stair/prop markers: a neutral-fill ring
 * whose stroke carries the passage-state token, the portal glyph as the primary icon, and a small
 * state badge when locked/trapped/hidden — never hue-alone. */
export function PortalMarker({
  portal,
  cellSize,
  selected,
  session,
  offset,
  grouped,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: PortalMarkerProps) {
  const cx = (portal.cell[0] + 0.5 + (offset?.dx ?? 0)) * cellSize
  const cy = (portal.cell[1] + 0.5 + (offset?.dy ?? 0)) * cellSize
  const radius = grouped ? cellSize * GROUPED_MARKER_RADIUS_FRACTION : cellSize * MARKER_RADIUS_FRACTION
  const iconSize = grouped ? cellSize * GROUPED_MARKER_RADIUS_FRACTION * 1.1 : cellSize * 0.34

  const effective = effectivePassageState(portal, session)
  const presentation = passagePresentation(effective)
  // Keep the authored trap badge after disarming so the confirmation badge can communicate both facts.
  const badges = markerBadges({ ...portal, locked: effective.locked }, effective.trapDisarmed)
  const dasharray = presentation.state === 'hidden' ? '4 3' : undefined
  const label = `${portal.title ?? `Portal ${portal.portal_id}`} — ${badges.length ? badges.map((badge) => badge.label).join(', ') : presentation.label}`

  return (
    <g
      className="maplab-portal"
      data-state={presentation.state}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
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
      <title>{portal.title ?? `Portal ${portal.portal_id}`}</title>
      <circle
        className="maplab-portal-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${presentation.token})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <PortalIcon width={iconSize} height={iconSize} className="maplab-portal-icon" style={{ color: `var(${presentation.token})` }} />
      </g>
       <BadgeRing badges={badges} cx={cx} cy={cy} markerRadius={radius} badgeRadius={8} />
    </g>
  )
}
