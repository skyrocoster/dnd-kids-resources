import { fixtureDoorPresentation } from './maplabPresentation'
import { doorSwingGeometry, doorWallSegment, type MapDoor, type SessionFixtureState } from '../../../model/maplabModel'
import { collapsedStatusDescriptor, collapsedStatusLabel, fixtureMarkerBadges } from '../../../map/markerBadges'
import { BadgeDisc } from '../../../map/BadgeDisc'

const DOOR_BADGE_RADIUS = 8
const DOOR_LEAF_STROKE_WIDTH = 6
const HIDDEN_DOOR_DASHARRAY = '1 9'
const HIDDEN_DOOR_PATH_LENGTH = 61
const DOOR_BADGE_T = 0.5
const HIDDEN_DOT_ENDPOINT_INSET = DOOR_LEAF_STROKE_WIDTH / 2

function pointOnSegment(
  segment: { x1: number; y1: number; x2: number; y2: number },
  t: number,
): { x: number; y: number } {
  return {
    x: segment.x1 + (segment.x2 - segment.x1) * t,
    y: segment.y1 + (segment.y2 - segment.y1) * t,
  }
}

function insetSegment(
  segment: { x1: number; y1: number; x2: number; y2: number },
  inset: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1)
  if (length === 0 || inset <= 0) return segment
  const unitX = (segment.x2 - segment.x1) / length
  const unitY = (segment.y2 - segment.y1) / length
  return {
    x1: segment.x1 + unitX * inset,
    y1: segment.y1 + unitY * inset,
    x2: segment.x2 - unitX * inset,
    y2: segment.y2 - unitY * inset,
  }
}

interface DoorMarkerProps {
  door: MapDoor
  cellSize: number
  /** Live session state — the viewer merges this over the authored flags; the editor omits it. */
  session?: SessionFixtureState
  selected?: boolean
  /** Editor-only: whether this door is selected for editing. */
  interactive?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
  onContextMenu?: () => void
}

interface DoorBadgeLayerProps {
  door: MapDoor
  cellSize: number
  session?: SessionFixtureState
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
  onContextMenu,
}: DoorMarkerProps) {
  const segment = doorWallSegment(door, cellSize)
  const swing = doorSwingGeometry(door, cellSize)
  const presentation = fixtureDoorPresentation(door, session)
  const badges = fixtureMarkerBadges(door, session)
  const stateLabel = collapsedStatusLabel(badges, presentation.label)
  const label = `${door.title ?? `Door ${door.door_id}`} — ${stateLabel}, ${presentation.isOpen ? 'open' : 'closed'}`
  const isConcealed = presentation.state === 'concealed'
  const dasharray = isConcealed ? HIDDEN_DOOR_DASHARRAY : undefined
  const pathLength = isConcealed ? HIDDEN_DOOR_PATH_LENGTH : undefined
  const openLeafSegment = { x1: swing.hinge.x, y1: swing.hinge.y, x2: swing.leafTip.x, y2: swing.leafTip.y }
  const renderedOpenLeafSegment = isConcealed ? insetSegment(openLeafSegment, HIDDEN_DOT_ENDPOINT_INSET) : openLeafSegment
  const renderedClosedLeafSegment = isConcealed ? insetSegment(segment, HIDDEN_DOT_ENDPOINT_INSET) : segment

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
        if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault()
          onContextMenu?.()
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      } : undefined}
      onContextMenu={interactive ? (event) => { event.preventDefault(); onContextMenu?.() } : undefined}
    >
      <title>{door.title ?? `Door ${door.door_id}`}</title>
      {presentation.isOpen ? (
        <>
          <line
            className="maplab-door-leaf"
            x1={renderedOpenLeafSegment.x1}
            y1={renderedOpenLeafSegment.y1}
            x2={renderedOpenLeafSegment.x2}
            y2={renderedOpenLeafSegment.y2}
            style={{ stroke: 'var(--md-door)' }}
            strokeDasharray={dasharray}
            pathLength={pathLength}
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
          x1={renderedClosedLeafSegment.x1}
          y1={renderedClosedLeafSegment.y1}
          x2={renderedClosedLeafSegment.x2}
          y2={renderedClosedLeafSegment.y2}
          style={{ stroke: 'var(--md-door)', strokeLinecap: isConcealed ? 'round' : undefined }}
          strokeDasharray={dasharray}
          pathLength={pathLength}
        />
      )}
    </g>
  )
}

/** Door badges intentionally render in a trailing page-level layer so no later door leaf or swing
 * can overpaint them. The open leaf supplies the badge segment; a closed door uses its wall segment. */
export function DoorBadgeLayer({ door, cellSize, session }: DoorBadgeLayerProps) {
  const badges = fixtureMarkerBadges(door, session)
  const badge = collapsedStatusDescriptor(badges)
  if (!badge) return null

  const presentation = fixtureDoorPresentation(door, session)
  const wallSegment = doorWallSegment(door, cellSize)
  const swing = doorSwingGeometry(door, cellSize)
  const segment = presentation.isOpen
    ? { x1: swing.hinge.x, y1: swing.hinge.y, x2: swing.leafTip.x, y2: swing.leafTip.y }
    : wallSegment
  const position = pointOnSegment(segment, DOOR_BADGE_T)
  return (
    <BadgeDisc
      badge={badge}
      cx={position.x}
      cy={position.y}
      radius={DOOR_BADGE_RADIUS}
      className="maplab-door-badge maplab-badge"
      dataBadge={badge.key}
    />
  )
}
