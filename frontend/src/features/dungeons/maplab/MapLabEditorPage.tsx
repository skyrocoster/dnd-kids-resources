import { useCallback, useMemo, useState } from 'react'
import './MapLabPage.css'
import './MapLabEditor.css'
import { MAP_LAB_DUNGEON_ID } from '../../../api/client'
import { useMapLabEditor } from './useMapLabEditor'
import { useMapCanvasZoom, type ViewportSize } from './useMapCanvasZoom'
import { MapCanvas } from './MapCanvas'
import {
  CloseIcon,
  DoorClosedIcon,
  FitIcon,
  MinusIcon,
  PlusIcon,
  PortalIcon,
  PropIcon,
  SaveIcon,
  StairsIcon,
  TrashIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../../../components/icons'
import { InspectorPanel } from './InspectorPanel'
import { FixturePropertiesForm } from './FixturePropertiesForm'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { GhostFloorLayer } from './GhostFloorLayer'
import { FIXTURE_TYPES } from './fixtureTypes'
import {
  absoluteCells,
  canPaintCell,
  doorPresentation,
  doorSwingGeometry,
  doorWallSegment,
  doorsOnFloor,
  GROUPED_MARKER_RADIUS_FRACTION,
  MAX_MARKERS_PER_CELL,
  ghostFloorZ,
  gridMarkerOffset,
  markersAtCell,
  neighborCell,
  nonDoorWallSegments,
  oppositeSide,
  paddedBounds,
  propsOnFloor,
  roomOfCell,
  roomsOnZ,
  stairCellForZ,
  stairEndpointsForZ,
  stairPresentation,
  type CardinalSide,
  type MapCell,
  type MapLayout,
  type MapRoom,
  type WallEdge,
} from './maplabModel'

const CELL_SIZE = 64
const MARKER_SIZE = 20
const ICON_SIZE = 24
const GRID_PATTERN_ID = 'maplab-editor-unknown-space-grid'

function edgeKey(edge: WallEdge): string {
  return `${edge.cell[0]},${edge.cell[1]},${edge.side}`
}

function mirrorEdgeKey(edge: WallEdge): string {
  const neighbor = neighborCell(edge.cell, edge.side)
  return `${neighbor[0]},${neighbor[1]},${oppositeSide(edge.side)}`
}

/** Grid-layout offset (plus whether this marker is sharing its cell) for one marker among any
 * others (stair/portal/on-square-prop) at its exact `(z, cell)` — the I3 replacement for the
 * stair-only `stairMarkerOffset`. `grouped` drives the shrink-to-fit sizing that keeps 2+ markers
 * visually distinct instead of full-size circles overlapping at `gridMarkerOffset`'s spacing. */
function markerOffset(
  layout: MapLayout,
  z: number,
  cell: MapCell,
  type: 'stair' | 'portal' | 'prop',
  id: number,
): { dx: number; dy: number; grouped: boolean } {
  const group = markersAtCell(layout, z, cell)
  const index = group.findIndex((marker) => marker.type === type && marker.id === id)
  return { ...gridMarkerOffset(group.length, index), grouped: group.length > 1 }
}

/** Whether `cell` already holds as many markers as `gridMarkerOffset` can lay out (a 2x2 block) —
 * placement handlers check this before dispatching so a 5th stair/portal/prop is refused with a
 * visible message instead of silently landing off-grid. */
function cellIsFull(layout: MapLayout, z: number, cell: MapCell): boolean {
  return markersAtCell(layout, z, cell).length >= MAX_MARKERS_PER_CELL
}

/** Clickable wall edges for door placement, deduped across a shared wall — a shared wall between
 * two rooms produces mirrored `{cell, side}` pairs (each room's own perspective) that resolve to
 * the identical physical segment, so only one clickable edge should render there. */
function doorPlacementEdges(rooms: MapRoom[], doors: MapLayout['doors']): WallEdge[] {
  const seen = new Set<string>()
  const edges: WallEdge[] = []
  for (const room of rooms) {
    for (const edge of nonDoorWallSegments(room, doors)) {
      const key = edgeKey(edge)
      if (seen.has(key) || seen.has(mirrorEdgeKey(edge))) continue
      seen.add(key)
      edges.push(edge)
    }
  }
  return edges
}

type PaintState = 'ownedSelected' | 'ownedOther' | 'paintable' | 'invalid'

/** A free cell's paint state considers only rooms on the *same floor* — different z planes may
 * legitimately share [x,y] (e.g. a stair landing directly above a stairwell). */
function paintStateForCell(layout: MapLayout, selectedRoomId: number, activeZ: number, cell: MapCell): PaintState {
  const sameFloorRooms = layout.rooms.filter((room) => room.z === activeZ)
  const owner = roomOfCell(cell, sameFloorRooms)
  if (owner) return owner.room_id === selectedRoomId ? 'ownedSelected' : 'ownedOther'
  return canPaintCell(layout, selectedRoomId, cell) ? 'paintable' : 'invalid'
}

function roomCenter(room: MapRoom): { x: number; y: number } {
  const cells = absoluteCells(room)
  if (cells.length === 0) return { x: (room.origin[0] + 0.5) * CELL_SIZE, y: (room.origin[1] + 0.5) * CELL_SIZE }
  const sum = cells.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 })
  return {
    x: ((sum.x / cells.length) + 0.5) * CELL_SIZE,
    y: ((sum.y / cells.length) + 0.5) * CELL_SIZE,
  }
}

function syncStatusLabel(status: 'idle' | 'saving' | 'saved' | 'error'): string {
  switch (status) {
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
    default:
      return ''
  }
}

export function MapLabEditorPage() {
  const {
    state,
    loading,
    syncStatus,
    addRoom,
    selectRoom,
    deleteRoom,
    toggleCell,
    setActiveZ,
    resetToFixture,
    addDoor,
    selectDoor,
    updateFixtureFlags,
    deleteDoor,
    addProp,
    selectProp,
    deleteProp,
    addStair,
    selectStair,
    deleteStair,
    setStairDirection,
    addPortal,
    selectPortal,
    deletePortal,
  } = useMapLabEditor(MAP_LAB_DUNGEON_ID)
  const [hoveredCell, setHoveredCell] = useState<MapCell | null>(null)
  const [placeDoorMode, setPlaceDoorMode] = useState(false)
  const [placePropMode, setPlacePropMode] = useState(false)
  const [placeStairMode, setPlaceStairMode] = useState(false)
  const [placePortalMode, setPlacePortalMode] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [showGhostFloor, setShowGhostFloor] = useState(false)
  const zoomApi = useMapCanvasZoom()
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), [])

  const floors = useMemo(
    () => [...new Set(state.layout.rooms.map((room) => room.z))].sort((a, b) => a - b),
    [state.layout.rooms]
  )
  const roomsOnActiveFloor = useMemo(() => roomsOnZ(state.layout, state.activeZ), [state.layout, state.activeZ])
  const doorsOnActiveFloor = useMemo(
    () => doorsOnFloor(state.layout, state.activeZ),
    [state.layout, state.activeZ]
  )
  const propsOnActiveFloor = useMemo(
    () => propsOnFloor(state.layout, state.activeZ),
    [state.layout, state.activeZ]
  )
  const stairsOnActiveFloor = useMemo(
    () => stairEndpointsForZ(state.layout, state.activeZ),
    [state.layout, state.activeZ]
  )
  const portalsOnActiveFloor = useMemo(
    () => state.layout.portals.filter((portal) => portal.z === state.activeZ),
    [state.layout, state.activeZ]
  )

  const ghostZ = useMemo(() => ghostFloorZ(state.layout, state.activeZ), [state.layout, state.activeZ])
  const ghostRooms = useMemo(
    () => (showGhostFloor && ghostZ !== null ? roomsOnZ(state.layout, ghostZ) : []),
    [showGhostFloor, ghostZ, state.layout]
  )
  const ghostDoors = useMemo(
    () => (showGhostFloor && ghostZ !== null ? doorsOnFloor(state.layout, ghostZ) : []),
    [showGhostFloor, ghostZ, state.layout]
  )
  const ghostProps = useMemo(
    () => (showGhostFloor && ghostZ !== null ? propsOnFloor(state.layout, ghostZ) : []),
    [showGhostFloor, ghostZ, state.layout]
  )

  const bounds = useMemo(() => paddedBounds(state.layout), [state.layout])
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${
    (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  } ${(bounds.maxY - bounds.minY + 1) * CELL_SIZE}`

  const placementEdges = useMemo(
    () => (placeDoorMode ? doorPlacementEdges(roomsOnActiveFloor, state.layout.doors) : []),
    [placeDoorMode, roomsOnActiveFloor, state.layout.doors]
  )
  const selectedDoor = useMemo(
    () => state.layout.doors.find((door) => door.door_id === state.selectedDoorId) ?? null,
    [state.layout.doors, state.selectedDoorId]
  )
  const selectedRoom = useMemo(
    () => state.layout.rooms.find((room) => room.room_id === state.selectedRoomId) ?? null,
    [state.layout.rooms, state.selectedRoomId]
  )
  const selectedProp = useMemo(
    () => state.layout.props.find((prop) => prop.prop_id === state.selectedPropId) ?? null,
    [state.layout.props, state.selectedPropId]
  )
  const selectedStair = useMemo(
    () => state.layout.stairs.find((stair) => stair.stair_id === state.selectedStairId) ?? null,
    [state.layout.stairs, state.selectedStairId]
  )
  // Stairs always cross to the adjacent floor at the same [x, y] — the inspector surfaces this as
  // two independent up/down checkboxes rather than a free cell picker (a cell can have 0, 1, or 2
  // stair records: one per direction).
  const selectedStairCell = useMemo(
    () => (selectedStair ? stairCellForZ(selectedStair, state.activeZ) : null),
    [selectedStair, state.activeZ]
  )
  const hasStairInDirection = useCallback(
    (direction: 'up' | 'down') => {
      if (!selectedStairCell) return false
      const targetZ = direction === 'up' ? state.activeZ + 1 : state.activeZ - 1
      // A stair record is undirected (from/to just name its two endpoints), so match regardless
      // of which endpoint happens to be stored as `from` vs `to`.
      return state.layout.stairs.some((stair) => {
        const endpoints: Array<[{ z: number; cell: MapCell }, { z: number; cell: MapCell }]> = [
          [stair.from, stair.to],
          [stair.to, stair.from],
        ]
        return endpoints.some(
          ([a, b]) =>
            a.z === state.activeZ &&
            a.cell[0] === selectedStairCell[0] &&
            a.cell[1] === selectedStairCell[1] &&
            b.z === targetZ &&
            b.cell[0] === selectedStairCell[0] &&
            b.cell[1] === selectedStairCell[1],
        )
      })
    },
    [state.layout.stairs, state.activeZ, selectedStairCell]
  )
  const stairUpFloor = floors.includes(state.activeZ + 1) ? state.activeZ + 1 : null
  const stairDownFloor = floors.includes(state.activeZ - 1) ? state.activeZ - 1 : null
  const selectedPortal = useMemo(
    () => state.layout.portals.find((portal) => portal.portal_id === state.selectedPortalId) ?? null,
    [state.layout.portals, state.selectedPortalId]
  )

  if (loading) {
    return (
      <div className="maplab-editor">
        <p className="maplab-subtitle">Loading layout…</p>
      </div>
    )
  }

  return (
    <div className="maplab-editor">
      <h1 className="maplab-title">Map Lab Editor</h1>
      <p className="maplab-subtitle">Create rooms, paint their footprint, and place doors and props.</p>

      <div className="maplab-toolbar">
        <div className="maplab-toolbar-group">
          <span className="maplab-toolbar-group-label">Create</span>
          <button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={addRoom}>
            <PlusIcon width={18} height={18} aria-hidden="true" />
            Add room
          </button>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-pressed={placeDoorMode}
            data-active={placeDoorMode || undefined}
            onClick={() =>
              setPlaceDoorMode((active) => {
                if (!active) {
                  setPlacePropMode(false)
                  setPlaceStairMode(false)
                  setPlacePortalMode(false)
                }
                setPlacementError(null)
                return !active
              })
            }
          >
            <DoorClosedIcon width={18} height={18} aria-hidden="true" />
            {placeDoorMode ? 'Cancel door placement' : 'Place door'}
          </button>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-pressed={placePropMode}
            data-active={placePropMode || undefined}
            onClick={() =>
              setPlacePropMode((active) => {
                if (!active) {
                  setPlaceDoorMode(false)
                  setPlaceStairMode(false)
                  setPlacePortalMode(false)
                }
                setPlacementError(null)
                return !active
              })
            }
          >
            <PropIcon width={18} height={18} aria-hidden="true" />
            {placePropMode ? 'Cancel prop placement' : 'Place prop'}
          </button>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-pressed={placeStairMode}
            data-active={placeStairMode || undefined}
            onClick={() =>
              setPlaceStairMode((active) => {
                if (!active) {
                  setPlaceDoorMode(false)
                  setPlacePropMode(false)
                  setPlacePortalMode(false)
                }
                setPlacementError(null)
                return !active
              })
            }
          >
            <StairsIcon width={18} height={18} aria-hidden="true" />
            {placeStairMode ? 'Cancel stair placement' : 'Place stair'}
          </button>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-pressed={placePortalMode}
            data-active={placePortalMode || undefined}
            onClick={() =>
              setPlacePortalMode((active) => {
                if (!active) {
                  setPlaceDoorMode(false)
                  setPlacePropMode(false)
                  setPlaceStairMode(false)
                }
                setPlacementError(null)
                return !active
              })
            }
          >
            <PortalIcon width={18} height={18} aria-hidden="true" />
            {placePortalMode ? 'Cancel portal placement' : 'Place portal'}
          </button>
        </div>
        <div className="maplab-toolbar-group">
          <span className="maplab-toolbar-group-label">Session</span>
          <button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={resetToFixture}>
            Reset to fixture
          </button>
        </div>
        <div className="maplab-toolbar-group">
          <span className="maplab-toolbar-group-label">View</span>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-pressed={showGhostFloor}
            data-active={showGhostFloor || undefined}
            disabled={ghostZ === null}
            onClick={() => setShowGhostFloor((active) => !active)}
          >
            Ghost lower floor
          </button>
        </div>
        <div className="maplab-toolbar-group maplab-toolbar-group-status">
          <span className="maplab-editor-save-status" data-status={syncStatus.status} aria-live="polite">
            <SaveIcon width={16} height={16} aria-hidden="true" />
            {syncStatusLabel(syncStatus.status)}
          </span>
        </div>
      </div>

      {placementError && (
        <p className="maplab-placement-error" role="alert">
          {placementError}
        </p>
      )}

      <div className="maplab-editor-layout">
        <div className="maplab-editor-nav-rail">
          <div className="maplab-floor-tabs" role="tablist" aria-label="Dungeon floors">
            {floors.map((z) => (
              <button
                key={z}
                type="button"
                role="tab"
                className="maplab-pill-button maplab-floor-tab"
                aria-selected={z === state.activeZ}
                onClick={() => setActiveZ(z)}
              >
                Floor {z}
              </button>
            ))}
          </div>

          <ul className="maplab-editor-room-list" aria-label="Rooms on this floor">
            {roomsOnActiveFloor.map((room) => (
              <li
                key={room.room_id}
                className="maplab-editor-room-item"
                data-selected={room.room_id === state.selectedRoomId || undefined}
              >
                <button
                  type="button"
                  className="maplab-editor-room-item-select"
                  aria-pressed={room.room_id === state.selectedRoomId}
                  onClick={() => selectRoom(room.room_id === state.selectedRoomId ? null : room.room_id)}
                >
                  {room.title ?? `Room ${room.room_id}`}
                </button>
                <button
                  type="button"
                  className="maplab-editor-room-item-delete"
                  aria-label={`Delete ${room.title ?? `Room ${room.room_id}`}`}
                  onClick={() => deleteRoom(room.room_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                </button>
              </li>
            ))}
            {roomsOnActiveFloor.length === 0 && <li className="maplab-editor-room-list-empty">No rooms on this floor yet.</li>}
          </ul>
        </div>

        <MapCanvas
          viewBox={viewBox}
          bounds={bounds}
          zoom={zoomApi.zoom}
          ariaLabel={`Editor floor map — Floor ${state.activeZ}`}
          variant="neutral"
          onWheelZoom={zoomApi.handleWheel}
          onPanStart={zoomApi.handlePointerDown}
          onPanMove={zoomApi.handlePointerMove}
          onPanEnd={zoomApi.handlePointerUp}
          onViewportResize={handleViewportResize}
          controlsSlot={
            <>
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label="Zoom out"
                onClick={zoomApi.zoomOut}
              >
                <ZoomOutIcon width={20} height={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label="Zoom in"
                onClick={zoomApi.zoomIn}
              >
                <ZoomInIcon width={20} height={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label="Reset zoom"
                onClick={() => zoomApi.fitToBounds(bounds, viewportSize)}
              >
                <FitIcon width={20} height={20} aria-hidden="true" />
              </button>
            </>
          }
        >
          <defs>
            <pattern
              id={GRID_PATTERN_ID}
              width={CELL_SIZE}
              height={CELL_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <rect className="maplab-grid-cell" width={CELL_SIZE} height={CELL_SIZE} />
            </pattern>
          </defs>

          <rect
            className="maplab-unknown-space"
            x={bounds.minX * CELL_SIZE}
            y={bounds.minY * CELL_SIZE}
            width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE}
            height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE}
            fill={`url(#${GRID_PATTERN_ID})`}
          />

          {showGhostFloor && ghostZ !== null && (
            <GhostFloorLayer rooms={ghostRooms} doors={ghostDoors} props={ghostProps} cellSize={CELL_SIZE} />
          )}

          {roomsOnActiveFloor.map((room) => (
            <g
              key={room.room_id}
              className="maplab-room"
              data-selected={room.room_id === state.selectedRoomId || undefined}
              role="button"
              tabIndex={0}
              aria-pressed={room.room_id === state.selectedRoomId}
              aria-label={room.title ?? `Room ${room.room_id}`}
              onClick={() => selectRoom(room.room_id === state.selectedRoomId ? null : room.room_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  selectRoom(room.room_id === state.selectedRoomId ? null : room.room_id)
                }
              }}
            >
              {absoluteCells(room).map(([x, y]) => (
                <rect
                  key={`${x}-${y}`}
                  className="maplab-room-cell"
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                />
              ))}
              {nonDoorWallSegments(room, state.layout.doors).map((edge) => {
                const segment = doorWallSegment(edge, CELL_SIZE)
                return (
                  <line
                    key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`}
                    className="maplab-wall"
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                  />
                )
              })}
              <text className="maplab-room-title" x={roomCenter(room).x} y={roomCenter(room).y}>
                {room.title ?? `Room ${room.room_id}`}
              </text>
            </g>
          ))}

          {doorsOnActiveFloor.map((door) => {
            const segment = doorWallSegment(door, CELL_SIZE)
            const swing = doorSwingGeometry(door, CELL_SIZE)
            const presentation = doorPresentation(door)
            const Icon = presentation.icon
            const midX = (segment.x1 + segment.x2) / 2
            const midY = (segment.y1 + segment.y2) / 2
            const isSelected = door.door_id === state.selectedDoorId
            const label = `${door.title ?? `Door ${door.door_id}`} — ${presentation.label}`
            return (
              <g
                key={door.door_id}
                className="maplab-door"
                data-state={presentation.state}
                data-selected={isSelected || undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={label}
                onClick={(event) => {
                  event.stopPropagation()
                  selectDoor(isSelected ? null : door.door_id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectDoor(isSelected ? null : door.door_id)
                  }
                }}
              >
                <line
                  className="maplab-door-leaf"
                  x1={swing.hinge.x}
                  y1={swing.hinge.y}
                  x2={swing.leafTip.x}
                  y2={swing.leafTip.y}
                  style={{ stroke: `var(${presentation.token})` }}
                />
                <path
                  className="maplab-door-swing"
                  d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
                  style={{ stroke: `var(${presentation.token})` }}
                />
                <g transform={`translate(${midX - ICON_SIZE / 2}, ${midY - ICON_SIZE / 2})`}>
                  <Icon width={ICON_SIZE} height={ICON_SIZE} className="maplab-door-icon" style={{ color: `var(${presentation.token})` }} />
                </g>
              </g>
            )
          })}

          {stairsOnActiveFloor.map((stair) => {
            const cell = stairCellForZ(stair, state.activeZ)
            if (!cell) return null
            const { dx, dy, grouped } = markerOffset(state.layout, state.activeZ, cell, 'stair', stair.stair_id)
            const [x, y] = cell
            const cx = (x + 0.5 + dx) * CELL_SIZE
            const cy = (y + 0.5 + dy) * CELL_SIZE
            const markerRadius = grouped ? CELL_SIZE * GROUPED_MARKER_RADIUS_FRACTION : CELL_SIZE * 0.32
            const markerIconSize = grouped ? CELL_SIZE * GROUPED_MARKER_RADIUS_FRACTION * 1.1 : ICON_SIZE
            const isSelected = stair.stair_id === state.selectedStairId
            const presentation = stairPresentation(stair, state.activeZ)
            const Icon = presentation.icon
            const label = `${stair.title ?? `Stair ${stair.stair_id}`} — ${presentation.label}`
            return (
              <g
                key={stair.stair_id}
                className="maplab-stair"
                data-state={presentation.state}
                data-selected={isSelected || undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={label}
                onClick={(event) => {
                  event.stopPropagation()
                  selectStair(isSelected ? null : stair.stair_id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectStair(isSelected ? null : stair.stair_id)
                  }
                }}
              >
                <title>{stair.title ?? `Stair ${stair.stair_id}`}</title>
                <circle className="maplab-stair-marker" cx={cx} cy={cy} r={markerRadius} style={{ stroke: `var(${presentation.token})` }} />
                <g transform={`translate(${cx - markerIconSize / 2}, ${cy - markerIconSize / 2})`}>
                  <Icon width={markerIconSize} height={markerIconSize} className="maplab-stair-icon" style={{ color: `var(${presentation.token})` }} />
                </g>
              </g>
            )
          })}

          {portalsOnActiveFloor.map((portal) => {
            const { grouped, ...offset } = markerOffset(state.layout, state.activeZ, portal.cell, 'portal', portal.portal_id)
            return (
              <PortalMarker
                key={portal.portal_id}
                portal={portal}
                cellSize={CELL_SIZE}
                selected={portal.portal_id === state.selectedPortalId}
                offset={offset}
                grouped={grouped}
                onClick={() => selectPortal(portal.portal_id === state.selectedPortalId ? null : portal.portal_id)}
              />
            )
          })}

          {placePropMode && (
            <g className="maplab-prop-placement-overlay">
              {roomsOnActiveFloor.flatMap((room) =>
                absoluteCells(room).map(([x, y]) => (
                  <rect
                    key={`${room.room_id}-${x}-${y}`}
                    className="maplab-prop-placement-cell"
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    role="button"
                    aria-label={`Place prop at ${x}, ${y}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (cellIsFull(state.layout, state.activeZ, [x, y])) {
                        setPlacementError(`That square already has ${MAX_MARKERS_PER_CELL} markers — pick a different square.`)
                        return
                      }
                      setPlacementError(null)
                      addProp([x, y])
                      setPlacePropMode(false)
                    }}
                  />
                ))
              )}
            </g>
          )}

          {placeDoorMode && (
            <g className="maplab-door-placement-overlay">
              {placementEdges.map((edge) => {
                const segment = doorWallSegment(edge, CELL_SIZE)
                return (
                  <line
                    key={edgeKey(edge)}
                    className="maplab-door-placement-edge"
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    role="button"
                    aria-label={`Place door at ${edge.cell[0]}, ${edge.cell[1]} ${edge.side}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      addDoor(edge.cell, edge.side as CardinalSide)
                      setPlaceDoorMode(false)
                    }}
                  />
                )
              })}
            </g>
          )}

          {placeStairMode && (
            <g className="maplab-stair-placement-overlay">
              {roomsOnActiveFloor.flatMap((room) =>
                absoluteCells(room).map(([x, y]) => (
                  <rect
                    key={`${room.room_id}-${x}-${y}`}
                    className="maplab-stair-placement-cell"
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    role="button"
                    aria-label={`Place stair at ${x}, ${y}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (cellIsFull(state.layout, state.activeZ, [x, y])) {
                        setPlacementError(`That square already has ${MAX_MARKERS_PER_CELL} markers — pick a different square.`)
                        return
                      }
                      setPlacementError(null)
                      addStair({ z: state.activeZ, cell: [x, y] })
                      setPlaceStairMode(false)
                    }}
                  />
                ))
              )}
            </g>
          )}

          {placePortalMode && (
            <g className="maplab-portal-placement-overlay">
              {roomsOnActiveFloor.flatMap((room) =>
                absoluteCells(room).map(([x, y]) => (
                  <rect
                    key={`${room.room_id}-${x}-${y}`}
                    className="maplab-portal-placement-cell"
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    role="button"
                    aria-label={`Place portal at ${x}, ${y}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (cellIsFull(state.layout, state.activeZ, [x, y])) {
                        setPlacementError(`That square already has ${MAX_MARKERS_PER_CELL} markers — pick a different square.`)
                        return
                      }
                      setPlacementError(null)
                      addPortal([x, y])
                      setPlacePortalMode(false)
                    }}
                  />
                ))
              )}
            </g>
          )}

          {!placeDoorMode && !placePropMode && !placeStairMode && !placePortalMode && state.selectedRoomId !== null && (
            <g className="maplab-paint-overlay" onMouseLeave={() => setHoveredCell(null)}>
              {Array.from({ length: bounds.maxY - bounds.minY + 1 }, (_, rowIndex) => bounds.minY + rowIndex).map((y) =>
                Array.from({ length: bounds.maxX - bounds.minX + 1 }, (_, colIndex) => bounds.minX + colIndex).map(
                  (x) => {
                    const cell: MapCell = [x, y]
                    const paintState = paintStateForCell(state.layout, state.selectedRoomId as number, state.activeZ, cell)
                    const isHovered = hoveredCell?.[0] === x && hoveredCell?.[1] === y
                    const interactive = paintState === 'paintable' || paintState === 'ownedSelected'
                    const markerX = x * CELL_SIZE + CELL_SIZE / 2 - MARKER_SIZE / 2
                    const markerY = y * CELL_SIZE + CELL_SIZE / 2 - MARKER_SIZE / 2
                    return (
                      <g key={`${x}-${y}`}>
                        <rect
                          className="maplab-paint-cell"
                          data-paint-state={paintState}
                          x={x * CELL_SIZE}
                          y={y * CELL_SIZE}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          role={interactive ? 'button' : undefined}
                          aria-label={
                            paintState === 'paintable'
                              ? `Add cell ${x}, ${y}`
                              : paintState === 'ownedSelected'
                                ? `Remove cell ${x}, ${y}`
                                : undefined
                          }
                          onMouseEnter={() => setHoveredCell(cell)}
                          onClick={() => {
                            if (interactive) toggleCell(state.selectedRoomId as number, cell)
                          }}
                        />
                        {isHovered && paintState === 'paintable' && (
                          <g transform={`translate(${markerX}, ${markerY})`} className="maplab-paint-marker" aria-hidden="true">
                            <PlusIcon width={MARKER_SIZE} height={MARKER_SIZE} />
                          </g>
                        )}
                        {isHovered && paintState === 'ownedSelected' && (
                          <g
                            transform={`translate(${markerX}, ${markerY})`}
                            className="maplab-paint-marker maplab-paint-marker-remove"
                            aria-hidden="true"
                          >
                            <MinusIcon width={MARKER_SIZE} height={MARKER_SIZE} />
                          </g>
                        )}
                        {isHovered && paintState === 'invalid' && (
                          <g
                            transform={`translate(${markerX}, ${markerY})`}
                            className="maplab-paint-marker maplab-paint-marker-invalid"
                            aria-hidden="true"
                          >
                            <CloseIcon width={MARKER_SIZE} height={MARKER_SIZE} />
                          </g>
                        )}
                      </g>
                    )
                  }
                )
              )}
            </g>
          )}

          {/* Rendered after the paint/placement overlays so a prop marker always stays on top and
           * clickable — the paint overlay in particular covers every cell of the selected room
           * (including ones a prop sits on), and would otherwise swallow the prop's click/hover. */}
          {propsOnActiveFloor.map((prop) => {
            const propOffset =
              prop.side === undefined ? markerOffset(state.layout, state.activeZ, prop.cell, 'prop', prop.prop_id) : undefined
            return (
              <PropMarker
                key={prop.prop_id}
                prop={prop}
                cellSize={CELL_SIZE}
                selected={prop.prop_id === state.selectedPropId}
                offset={propOffset}
                grouped={propOffset?.grouped}
                onClick={() => selectProp(prop.prop_id === state.selectedPropId ? null : prop.prop_id)}
              />
            )
          })}
        </MapCanvas>

        <div className="maplab-inspector-rail">
          {selectedDoor ? (
            <>
              <InspectorPanel target={{ kind: 'door', door: selectedDoor }} />
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.door}
                values={selectedDoor as unknown as Record<string, unknown>}
                onChange={(key, value) => updateFixtureFlags(selectedDoor.door_id, 'door', { [key]: value })}
              />
              <div className="maplab-editor-inspector-actions">
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => deleteDoor(selectedDoor.door_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                  Delete door
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => selectDoor(null)}
                >
                  Close
                </button>
              </div>
            </>
          ) : selectedRoom ? (
            <>
              <InspectorPanel target={{ kind: 'room', room: selectedRoom }} />
              <div className="maplab-editor-inspector-actions">
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => deleteRoom(selectedRoom.room_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                  Delete room
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => selectRoom(null)}
                >
                  Close
                </button>
              </div>
            </>
          ) : selectedProp ? (
            <>
              <InspectorPanel target={{ kind: 'prop', prop: selectedProp }} />
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.prop}
                values={{ ...selectedProp, side: selectedProp.side ?? 'Off' } as unknown as Record<string, unknown>}
                onChange={(key, value) =>
                  updateFixtureFlags(selectedProp.prop_id, 'prop', {
                    [key]: key === 'side' && value === 'Off' ? undefined : value,
                  })
                }
              />
              <div className="maplab-editor-inspector-actions">
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => deleteProp(selectedProp.prop_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                  Delete prop
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => selectProp(null)}
                >
                  Close
                </button>
              </div>
            </>
          ) : selectedStair ? (
            <>
              <InspectorPanel target={{ kind: 'stair', stair: selectedStair }} />
              <div className="maplab-field-row maplab-stair-direction-row">
                <label htmlFor="maplab-stair-direction-up">
                  {stairUpFloor !== null ? `Stairs up to floor ${stairUpFloor}` : 'Stairs up (no floor above)'}
                </label>
                <input
                  id="maplab-stair-direction-up"
                  type="checkbox"
                  disabled={stairUpFloor === null || !selectedStairCell}
                  checked={hasStairInDirection('up')}
                  onChange={(event) =>
                    selectedStairCell &&
                    setStairDirection(state.activeZ, selectedStairCell, 'up', event.target.checked)
                  }
                />
              </div>
              <div className="maplab-field-row maplab-stair-direction-row">
                <label htmlFor="maplab-stair-direction-down">
                  {stairDownFloor !== null ? `Stairs down to floor ${stairDownFloor}` : 'Stairs down (no floor below)'}
                </label>
                <input
                  id="maplab-stair-direction-down"
                  type="checkbox"
                  disabled={stairDownFloor === null || !selectedStairCell}
                  checked={hasStairInDirection('down')}
                  onChange={(event) =>
                    selectedStairCell &&
                    setStairDirection(state.activeZ, selectedStairCell, 'down', event.target.checked)
                  }
                />
              </div>
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.stair}
                values={selectedStair as unknown as Record<string, unknown>}
                onChange={(key, value) => updateFixtureFlags(selectedStair.stair_id, 'stair', { [key]: value })}
              />
              <div className="maplab-editor-inspector-actions">
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => deleteStair(selectedStair.stair_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                  Delete stair
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => selectStair(null)}
                >
                  Close
                </button>
              </div>
            </>
          ) : selectedPortal ? (
            <>
              <InspectorPanel target={{ kind: 'portal', portal: selectedPortal }} />
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.portal}
                values={selectedPortal as unknown as Record<string, unknown>}
                layout={state.layout}
                onChange={(key, value) => updateFixtureFlags(selectedPortal.portal_id, 'portal', { [key]: value })}
              />
              <div className="maplab-editor-inspector-actions">
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => deletePortal(selectedPortal.portal_id)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                  Delete portal
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => selectPortal(null)}
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <p className="maplab-inspector-rail-empty">Select a room, door, prop, stair, or portal to see its details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
