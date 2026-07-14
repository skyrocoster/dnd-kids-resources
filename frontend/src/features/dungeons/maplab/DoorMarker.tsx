import { CARDINAL_DELTAS, doorPresentation, doorSwingGeometry, doorWallSegment, effectivePassageState, type MapDoor, type PassageSessionState } from './maplabModel'
import { linearBadgeLayout, markerBadges } from './markerBadges'

const DOOR_BADGE_RADIUS = 8
// The central door glyph is 22px wide. This clearance keeps badges distinct from it while
// retaining the badge's attachment to the current door segment.
const DOOR_BADGE_CLEARANCE = 20

interface DoorMarkerProps {
  door: MapDoor
  cellSize: number
  /** Live session state — the viewer merges this over the authored flags; the editor omits it. */
  session?: PassageSessionState
  selected?: boolean
  /** Editor-only: whether this door is selected for editing. */
  interactive?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

interface DoorBadgeLayerProps {
  door: MapDoor
  cellSize: number
  session?: PassageSessionState
}

/** Shared door marker for both the viewer and editor pages. Replaces the inline door renders
 * previously duplicated in MapLabPage.tsx and MapLabEditorPage.tsx. Renders the leaf in a
 * fixed `--md-door` color with badges along the leaf for status. */
export function DoorMarker({
  door,
  cellSize,
  session,
  selected,
  interactive = true,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: DoorMarkerProps) {
  const segment = doorWallSegment(door, cellSize)
  const swing = doorSwingGeometry(door, cellSize)
  const presentation = doorPresentation(door, session)
  const Icon = presentation.icon
  const midX = (segment.x1 + segment.x2) / 2
  const midY = (segment.y1 + segment.y2) / 2
  const effective = effectivePassageState(door, session)
  const badges = markerBadges({ ...door, locked: effective.locked }, effective.trapDisarmed)
  const stateLabel = badges.length ? badges.map((badge) => badge.label).join(', ') : presentation.label
  const label = `${door.title ?? `Door ${door.door_id}`} — ${stateLabel}, ${presentation.isOpen ? 'open' : 'closed'}`
  const dasharray = presentation.state === 'hidden' ? '6 4' : undefined

  return (
    <g
      className="maplab-door"
      data-state={presentation.state}
      data-selected={selected || undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={interactive ? label : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      onFocus={interactive ? onFocus : undefined}
      onBlur={interactive ? onBlur : undefined}
      onClick={interactive ? (event) => {
        event.stopPropagation()
        onClick?.()
      } : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      } : undefined}
    >
      <title>{door.title ?? `Door ${door.door_id}`}</title>
      {presentation.isOpen ? (
        <>
          <line
            className="maplab-door-leaf"
            x1={swing.hinge.x}
            y1={swing.hinge.y}
            x2={swing.leafTip.x}
            y2={swing.leafTip.y}
            style={{ stroke: 'var(--md-door)' }}
            strokeDasharray={dasharray}
          />
          <path
            className="maplab-door-swing"
            d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
            style={{ stroke: 'var(--md-door)' }}
          />
        </>
      ) : (
        <line
          className="maplab-door-leaf-closed"
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          style={{ stroke: 'var(--md-door)' }}
          strokeDasharray={dasharray}
        />
      )}
      <g transform={`translate(${midX - 11}, ${midY - 11})`}>
        <Icon width={22} height={22} className="maplab-door-icon" style={{ color: 'var(--md-door)' }} />
      </g>
    </g>
  )
}

/** Door badges intentionally render in a trailing page-level layer so no later door leaf or swing
 * can overpaint them. The open leaf supplies the badge segment; a closed door uses its wall segment. */
export function DoorBadgeLayer({ door, cellSize, session }: DoorBadgeLayerProps) {
  const effective = effectivePassageState(door, session)
  const badges = markerBadges({ ...door, locked: effective.locked }, effective.trapDisarmed)
  if (!badges.length) return null

  const presentation = doorPresentation(door, session)
  const wallSegment = doorWallSegment(door, cellSize)
  const swing = doorSwingGeometry(door, cellSize)
  const segment = presentation.isOpen
    ? { x1: swing.hinge.x, y1: swing.hinge.y, x2: swing.leafTip.x, y2: swing.leafTip.y }
    : wallSegment
  const [dx, dy] = CARDINAL_DELTAS[door.side]
  // A closed badge moves into its owning cell. An open badge sits beside the leaf, using the wall
  // tangent so it neither covers the central glyph nor escapes through the outer wall.
  const normal = presentation.isOpen ? { x: Math.abs(dy), y: Math.abs(dx) } : { x: -dx, y: -dy }
  const positions = linearBadgeLayout(badges.length, segment, normal, DOOR_BADGE_RADIUS, DOOR_BADGE_CLEARANCE)

  return (
    <>
      {badges.map((badge, index) => {
        const Icon = badge.icon
        const position = positions[index]
        return (
          <g key={`${door.door_id}-${badge.key}`} className="maplab-door-badge maplab-badge" data-badge={badge.key} transform={`translate(${position.x}, ${position.y})`}>
            <circle r={DOOR_BADGE_RADIUS} fill={`var(${badge.token})`} />
            <g transform="translate(-5.6, -5.6)">
              <Icon width={11.2} height={11.2} style={{ color: `var(${badge.onToken})` }} />
            </g>
          </g>
        )
      })}
    </>
  )
}
