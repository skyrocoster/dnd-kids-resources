import { ItemIcon } from '../../../components/icons'
import { BadgeDisc } from '../../../map/BadgeDisc'
import { PROP_KIND_ICONS } from './fixtureTypes'
import { boundedBadgeLayout, collapsedStatusDescriptor, collapsedStatusLabel, fixtureMarkerBadges } from '../../../map/markerBadges'
import { fixturePresentation } from './maplabPresentation'
import {
  effectiveFixtureState,
  fixtureStateFromFlags,
  type MapProp,
  type SessionFixtureState,
} from '../../../model/maplabModel'
import {
  MarkerHitArea,
  MarkerGlyph,
  onSquareMarkerGeometry,
  wallAttachedMarkerGeometry,
} from '../../../map/markerShape'

const PROP_IDENTITY_TOKENS: Record<string, string> = {
  chest: '--md-loot',
  encounter: '--md-tertiary',
  npc: '--md-npc',
}

interface PropMarkerProps {
  prop: MapProp
  cellSize: number
  selected?: boolean
  /** Live session state — the viewer merges this over the authored state; the editor omits it
   * and gets the authored state as-is. */
  session?: SessionFixtureState
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
  simplified?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
  onContextMenu?: () => void
}

/** Shared prop-marker render for both the viewer and editor pages — an on-square prop centers on
 * its cell (stair-marker pattern); a wall-attached prop (`side` present) anchors at the wall
 * segment's midpoint (door pattern) with a smaller marker. The kind icon is the primary glyph;
 * on-square marker color is stable fixture identity, while the status disc carries state. */
export function PropMarker({
  prop,
  cellSize,
  selected,
  session,
  interactive = true,
  offset,
  grouped,
  simplified,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
  onContextMenu,
}: PropMarkerProps) {
  const onWall = prop.side !== undefined
  const { cx, cy, radius, iconSize } = onWall
    ? wallAttachedMarkerGeometry(prop.cell, prop.side!, cellSize)
    : onSquareMarkerGeometry(prop.cell, cellSize, { offset, grouped })

  const effective = effectiveFixtureState(prop.state ?? fixtureStateFromFlags(prop), session)
  const presentation = fixturePresentation(effective)
  const token = onWall ? presentation.token : (PROP_IDENTITY_TOKENS[prop.kind] ?? '--md-on-surface-variant')
  const Icon = PROP_KIND_ICONS[prop.kind] ?? ItemIcon
  const badges = fixtureMarkerBadges(prop, session)
  const badge = collapsedStatusDescriptor(badges)
  const badgePosition = badge ? boundedBadgeLayout(prop.cell[0] * cellSize, prop.cell[1] * cellSize, cellSize, cx, cy, radius, 8) : null
  const dasharray = presentation.state === 'concealed' ? '4 3' : undefined
  const label = `${prop.title ?? prop.kind} — ${collapsedStatusLabel(badges, presentation.label)}`

  return (
    <MarkerHitArea
      className="maplab-prop"
      dataState={presentation.state}
      selected={selected}
      label={interactive ? label : undefined}
      title={prop.title ?? prop.kind}
      interactive={interactive}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onContextMenu={interactive ? onContextMenu : undefined}
    >
      <circle
        className="maplab-prop-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${token})` }}
        strokeDasharray={dasharray}
      />
      <MarkerGlyph
        icon={Icon}
        cx={cx}
        cy={cy}
        size={iconSize}
        colorToken={token}
        className="maplab-prop-icon"
        simplified={simplified}
      />
      {badge && badgePosition ? (
        <BadgeDisc
          badge={badge}
          cx={badgePosition.cx}
          cy={badgePosition.cy}
          radius={badgePosition.radius}
          className="maplab-badge"
          dataBadge={badge.key}
        />
      ) : null}
    </MarkerHitArea>
  )
}
