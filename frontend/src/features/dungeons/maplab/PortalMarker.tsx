import { GatewayPortalIcon, PortalIcon } from '../../../components/icons'
import { BadgeRing } from '../../../map/BadgeRing'
import { collapsedStatusLabel, fixtureMarkerBadges } from '../../../map/markerBadges'
import { fixturePresentation } from './maplabPresentation'
import {
  defaultFixtureState,
  effectiveFixtureState,
  type MapPortal,
  type SessionFixtureState,
} from '../../../model/maplabModel'
import { onSquareMarkerGeometry, MarkerHitArea, MarkerGlyph } from '../../../map/markerShape'

const PORTAL_IDENTITY_TOKEN = '--md-primary'

interface PortalMarkerProps {
  portal: MapPortal
  cellSize: number
  selected?: boolean
  /** Live session state — the viewer merges this over the authored state; the editor omits it
   * and gets the authored state as-is. */
  session?: SessionFixtureState
  /** Fractional-cell nudge (from `gridMarkerOffset`) when this portal shares its cell with other
   * markers (stairs/other portals/props). */
  offset?: { dx: number; dy: number }
  /** True when 2+ markers share this cell — shrinks the marker to `GROUPED_MARKER_RADIUS_FRACTION`
   * so `gridMarkerOffset`'s spacing actually separates same-cell markers instead of stacking
   * full-size circles a few px apart. */
  grouped?: boolean
  simplified?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

/** Portal marker — stable portal identity color on the ring/icon; one collapsed status
 * disc carries passage state, and hidden remains dashed as a non-color cue. */
export function PortalMarker({
  portal,
  cellSize,
  selected,
  session,
  offset,
  grouped,
  simplified,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: PortalMarkerProps) {
  const { cx, cy, radius, iconSize } = onSquareMarkerGeometry(portal.cell, cellSize, { offset, grouped })

  const effective = effectiveFixtureState(portal.state ?? defaultFixtureState(), session)
  const presentation = fixturePresentation(effective)
  const isGateway = portal.to?.dungeon_id !== undefined
  const Icon = isGateway ? GatewayPortalIcon : PortalIcon
  const badges = fixtureMarkerBadges(portal, session)
  const dasharray = presentation.state === 'concealed' ? '4 3' : undefined
  const label = `${portal.title ?? `Portal ${portal.portal_id}`} — ${collapsedStatusLabel(badges, presentation.label)}`

  return (
    <MarkerHitArea
      className="maplab-portal"
      dataState={presentation.state}
      selected={selected}
      ariaPressed={selected}
      label={label}
      title={portal.title ?? `Portal ${portal.portal_id}`}
      stopPropagation
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
    >
      <circle
        className="maplab-portal-marker"
        data-gateway={isGateway || undefined}
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${PORTAL_IDENTITY_TOKEN})` }}
        strokeDasharray={dasharray}
      />
      <MarkerGlyph
        icon={Icon}
        cx={cx}
        cy={cy}
        size={iconSize}
        colorToken={PORTAL_IDENTITY_TOKEN}
        className="maplab-portal-icon"
        simplified={simplified}
      />
      <BadgeRing
        badges={badges}
        cx={cx}
        cy={cy}
        cellX={portal.cell[0] * cellSize}
        cellY={portal.cell[1] * cellSize}
        cellSize={cellSize}
        markerRadius={radius}
        badgeRadius={8}
      />
    </MarkerHitArea>
  )
}
