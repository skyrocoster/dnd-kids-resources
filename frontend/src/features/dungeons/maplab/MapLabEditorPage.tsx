import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './MapLabPage.css'
import './MapLabEditor.css'
import { MapLabRouteState } from './MapLabRouteState'
import { useDungeonShellContext } from './dungeonRouteContext'
import { useMapLabEditor } from './useMapLabEditor'
import { useMapCanvasZoom, type ViewportSize } from './useMapCanvasZoom'
import { MapCanvas } from './MapCanvas'
import {
  CloseIcon,
  DoorClosedIcon,
  FitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
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
import { ToolbarTray } from './MapLabPage'
import { FixturePropertiesForm } from './FixturePropertiesForm'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { StairMarker } from './StairMarker'
import { DoorBadgeLayer, DoorMarker } from './DoorMarker'
import { GhostFloorLayer } from './GhostFloorLayer'
import { FIXTURE_TYPES } from './fixtureTypes'
import { RoomContentEditor } from './RoomContentEditor'
import {
  absoluteCells,
  canPaintCell,
  doorWallSegment,
  doorsOnFloor,
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
  type CardinalSide,
  type MapCell,
  type MapLayout,
  type MapRoom,
  type WallEdge,
} from './maplabModel'

const CELL_SIZE = 64
const MARKER_SIZE = 20
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

type FootprintState = 'candidate' | 'blocked' | 'owned'

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

function cellKey(cell: MapCell): string {
  return `${cell[0]},${cell[1]}`
}

export function rectangleCells(a: MapCell, b: MapCell): MapCell[] {
  const minX = Math.min(a[0], b[0])
  const maxX = Math.max(a[0], b[0])
  const minY = Math.min(a[1], b[1])
  const maxY = Math.max(a[1], b[1])
  const cells: MapCell[] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      cells.push([x, y])
    }
  }
  return cells
}

function cellsAreConnected(cells: MapCell[]): boolean {
  if (cells.length <= 1) return true
  const pending = new Set(cells.map(cellKey))
  const stack = [cells[0]]
  pending.delete(cellKey(cells[0]))
  const deltas: MapCell[] = [[0, -1], [0, 1], [1, 0], [-1, 0]]
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    for (const [dx, dy] of deltas) {
      const next: MapCell = [x + dx, y + dy]
      const key = cellKey(next)
      if (pending.delete(key)) stack.push(next)
    }
  }
  return pending.size === 0
}

function footprintIsCommitCandidate(layout: MapLayout, selectedRoomId: number, activeZ: number, cells: MapCell[]): boolean {
  const uniqueCells = Array.from(new Map(cells.map((cell) => [cellKey(cell), cell])).values())
  const sameFloorRooms = layout.rooms.filter((room) => room.z === activeZ)
  const overlapsOtherRoom = uniqueCells.some((cell) => {
    const owner = roomOfCell(cell, sameFloorRooms)
    return owner !== null && owner.room_id !== selectedRoomId
  })
  return !overlapsOtherRoom && cellsAreConnected(uniqueCells)
}

function footprintStateForCell(
  layout: MapLayout,
  selectedRoomId: number,
  activeZ: number,
  cell: MapCell,
  rectangleIsValid: boolean,
): FootprintState {
  const owner = roomOfCell(cell, layout.rooms.filter((room) => room.z === activeZ))
  if (owner?.room_id === selectedRoomId) return 'owned'
  if (owner !== null || !rectangleIsValid) return 'blocked'
  return 'candidate'
}

function footprintCellsForSelection(
  layout: MapLayout,
  selectedRoomId: number,
  activeZ: number,
  anchor: MapCell,
  rectangle: MapCell[],
): MapCell[] {
  const owner = roomOfCell(anchor, layout.rooms.filter((room) => room.z === activeZ))
  if (owner?.room_id !== selectedRoomId) return rectangle
  return [...absoluteCells(owner), ...rectangle]
}

type RoomFootprintSelection = { anchor: MapCell; current: MapCell; mode: 'click' | 'drag' } | null

export function MapLabEditorPage() {
  const route = useDungeonShellContext()
  const {
    state,
    loading: layoutLoading,
    loadStatus,
    saveStatus,
    dungeonData,
    addRoom,
    createRoomData,
    addFloorAbove,
    addFloorBelow,
    selectRoom,
    deleteRoom,
    toggleCell,
    setRoomFootprint,
    setActiveZ,
    resetToLastLoadedLayout,
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
    updateRoomTitle,
    updateRoomEntries,
    updateRoomNpcs,
  } = useMapLabEditor(route.dungeonId, route.dungeon)
  const [hoveredCell, setHoveredCell] = useState<MapCell | null>(null)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false)
  const [roomFootprintSelection, setRoomFootprintSelection] = useState<RoomFootprintSelection>(null)
  const [placeDoorMode, setPlaceDoorMode] = useState(false)
  const [placePropMode, setPlacePropMode] = useState(false)
  const [placeStairMode, setPlaceStairMode] = useState(false)
  const [placePortalMode, setPlacePortalMode] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [showGhostFloor, setShowGhostFloor] = useState(false)
  const suppressNextPaintClickRef = useRef(false)
  const zoomApi = useMapCanvasZoom({ wheelZoomMode: 'always' })
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), [])
  const clearRoomFootprintSelection = useCallback(() => {
    setRoomFootprintSelection(null)
    setPlacementError(null)
  }, [])
  const toggleCanvasFullscreen = useCallback(() => {
    clearRoomFootprintSelection()
    setIsCanvasFullscreen((active) => !active)
  }, [clearRoomFootprintSelection])

  const floors = useMemo(
    () => [...state.layout.floors].sort((a, b) => a.z - b.z),
    [state.layout.floors]
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
  const selectedDungeonRoom = useMemo(
    () => (selectedRoom ? dungeonData.rooms?.find((room) => room.room_id === selectedRoom.room_id) ?? null : null),
    [dungeonData.rooms, selectedRoom]
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
  const floorZs = useMemo(() => floors.map((floor) => floor.z), [floors])
  const hasFloorAbove = floorZs.includes(state.activeZ + 1)
  const hasFloorBelow = floorZs.includes(state.activeZ - 1)
  const stairUpFloor = floorZs.includes(state.activeZ + 1) ? state.activeZ + 1 : null
  const stairDownFloor = floorZs.includes(state.activeZ - 1) ? state.activeZ - 1 : null
  const selectedPortal = useMemo(
    () => state.layout.portals.find((portal) => portal.portal_id === state.selectedPortalId) ?? null,
    [state.layout.portals, state.selectedPortalId]
  )

  const pendingFootprintCells = useMemo(
    () => (roomFootprintSelection ? rectangleCells(roomFootprintSelection.anchor, roomFootprintSelection.current) : []),
    [roomFootprintSelection]
  )
  const pendingFootprintCommitCells = useMemo(
    () =>
      roomFootprintSelection && state.selectedRoomId !== null
        ? footprintCellsForSelection(
            state.layout,
            state.selectedRoomId,
            state.activeZ,
            roomFootprintSelection.anchor,
            pendingFootprintCells,
          )
        : [],
    [pendingFootprintCells, roomFootprintSelection, state.activeZ, state.layout, state.selectedRoomId],
  )
  const pendingFootprintIsValid = useMemo(
    () =>
      state.selectedRoomId !== null &&
      pendingFootprintCommitCells.length > 0 &&
      footprintIsCommitCandidate(state.layout, state.selectedRoomId, state.activeZ, pendingFootprintCommitCells),
    [pendingFootprintCommitCells, state.activeZ, state.layout, state.selectedRoomId]
  )
  const footprintGuidance = useMemo(() => {
    if (state.selectedRoomId === null) return 'Select a room to edit its footprint.'
    if (roomFootprintSelection?.mode === 'click') {
      return `Corner set at ${roomFootprintSelection.anchor[0]}, ${roomFootprintSelection.anchor[1]}. Choose a second corner, or press Escape to cancel.`
    }
    if (roomFootprintSelection?.mode === 'drag') return 'Drag to the opposite corner, then release to set the footprint.'
    return 'Click two free corners to size a room. Drag from an existing room square to extend it; click an existing square to remove it.'
  }, [roomFootprintSelection, state.selectedRoomId])
  const commitRoomFootprint = useCallback(
    (cells: MapCell[]): boolean => {
      if (state.selectedRoomId === null) return false
      if (!footprintIsCommitCandidate(state.layout, state.selectedRoomId, state.activeZ, cells)) {
        setPlacementError('That footprint overlaps another room or would split this room.')
        return false
      }
      setRoomFootprint(state.selectedRoomId, cells)
      setRoomFootprintSelection(null)
      setPlacementError(null)
      return true
    },
    [setRoomFootprint, state.activeZ, state.layout, state.selectedRoomId]
  )

  useEffect(() => {
    if (!roomFootprintSelection) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearRoomFootprintSelection()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearRoomFootprintSelection, roomFootprintSelection])

  useEffect(() => {
    clearRoomFootprintSelection()
  }, [clearRoomFootprintSelection, placeDoorMode, placePortalMode, placePropMode, placeStairMode, state.activeZ, state.selectedRoomId])

  if (route.status === 'loading' || layoutLoading) {
    return <MapLabRouteState title="Loading map editor" message="Loading dungeon layout…" />
  }

  if (loadStatus.status === 'error') {
    return (
      <MapLabRouteState
        title={route.dungeon?.title ?? 'Dungeon layout unavailable'}
        message={loadStatus.error ?? 'Failed to load dungeon layout.'}
      />
    )
  }

  return (
    <div className="maplab-editor" data-footprint-selection-mode={roomFootprintSelection?.mode}>
      {loadStatus.status === 'empty' && (
        <p className="maplab-subtitle">No saved layout yet. Your first edit will save this blank map.</p>
      )}

      <div className="maplab-toolbar">
        <ToolbarTray groupKey="editor-create" label="Create">
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
        </ToolbarTray>
        <ToolbarTray groupKey="editor-session" label="Session">
          <button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={resetToLastLoadedLayout}>
            Reset unsaved changes
          </button>
        </ToolbarTray>
        <ToolbarTray groupKey="editor-view" label="View">
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
        </ToolbarTray>
        <ToolbarTray groupKey="editor-status" label="Status" extraClassName="maplab-toolbar-group-status">
          <span className="maplab-editor-save-status" data-status={saveStatus.status} aria-live="polite">
            <SaveIcon width={16} height={16} aria-hidden="true" />
            {syncStatusLabel(saveStatus.status)}
          </span>
        </ToolbarTray>
      </div>

      {placementError && (
        <p className="maplab-placement-error" role="alert">
          {placementError}
        </p>
      )}

      <div className="maplab-editor-layout">
        <div className="maplab-editor-nav-rail">
          <div className="maplab-floor-tabs" role="tablist" aria-label="Dungeon floors">
            {floors.map((floor) => (
              <button
                key={floor.z}
                type="button"
                role="tab"
                className="maplab-pill-button maplab-floor-tab"
                aria-selected={floor.z === state.activeZ}
                onClick={() => {
                  clearRoomFootprintSelection()
                  setActiveZ(floor.z)
                }}
              >
                {floor.title ?? `Floor ${floor.z}`}
              </button>
            ))}
          </div>

          <div className="maplab-editor-floor-actions" aria-label="Floor actions">
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorAbove}
              onClick={() => {
                clearRoomFootprintSelection()
                addFloorAbove()
              }}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor above
            </button>
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorBelow}
              onClick={() => {
                clearRoomFootprintSelection()
                addFloorBelow()
              }}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor below
            </button>
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
                  onClick={() => {
                    clearRoomFootprintSelection()
                    selectRoom(room.room_id === state.selectedRoomId ? null : room.room_id)
                  }}
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
          fullscreen={isCanvasFullscreen}
          onToggleFullscreen={toggleCanvasFullscreen}
          onExitFullscreen={() => {
            clearRoomFootprintSelection()
            setIsCanvasFullscreen(false)
          }}
          onWheelZoom={zoomApi.handleWheel}
          onPanStart={zoomApi.handlePointerDown}
          onPanMove={zoomApi.handlePointerMove}
          onPanEnd={zoomApi.handlePointerUp}
          onViewportResize={handleViewportResize}
          panHint="Wheel to zoom. Drag empty canvas or use scrollbars to pan. Press Escape to exit fullscreen."
          viewportDescription={footprintGuidance}
          controlsSlot={
            <>
              {(() => {
                const FullscreenIcon = isCanvasFullscreen ? FullscreenExitIcon : FullscreenEnterIcon
                return (
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label={isCanvasFullscreen ? 'Exit fullscreen map editor' : 'Enter fullscreen map editor'}
                onClick={toggleCanvasFullscreen}
              >
                    <FullscreenIcon width={20} height={20} aria-hidden="true" />
                    <span className="maplab-zoom-button-label">
                      {isCanvasFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    </span>
              </button>
                )
              })()}
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
                aria-label="Fit map to viewport"
                onClick={() => zoomApi.fitToBounds(bounds, viewportSize)}
              >
                <FitIcon width={20} height={20} aria-hidden="true" />
                <span className="maplab-zoom-button-label">Fit</span>
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

          {!placeDoorMode && !placePropMode && !placeStairMode && !placePortalMode && state.selectedRoomId !== null && roomFootprintSelection && (
            <g className="maplab-room-footprint-preview" aria-hidden="true">
              {pendingFootprintCells.map((cell) => {
                const [x, y] = cell
                const footprintState = footprintStateForCell(
                  state.layout,
                  state.selectedRoomId as number,
                  state.activeZ,
                  cell,
                  pendingFootprintIsValid,
                )
                const isAnchor = roomFootprintSelection.anchor[0] === x && roomFootprintSelection.anchor[1] === y
                return (
                  <rect
                    key={`${x}-${y}`}
                    className={isAnchor ? 'maplab-room-footprint-anchor' : 'maplab-room-footprint-cell'}
                    data-footprint-state={footprintState}
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                  />
                )
              })}
            </g>
          )}

          {doorsOnActiveFloor.map((door) => {
            const isSelected = door.door_id === state.selectedDoorId
            return (
              <DoorMarker
                key={door.door_id}
                door={door}
                cellSize={CELL_SIZE}
                selected={isSelected}
                onClick={() => selectDoor(isSelected ? null : door.door_id)}
              />
            )
          })}
          <g className="maplab-door-badge-layer" aria-hidden="true">
            {doorsOnActiveFloor.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} />)}
          </g>

          {stairsOnActiveFloor.map((stair) => {
            const cell = stairCellForZ(stair, state.activeZ)
            if (!cell) return null
            const { dx, dy, grouped } = markerOffset(state.layout, state.activeZ, cell, 'stair', stair.stair_id)
            const isSelected = stair.stair_id === state.selectedStairId
            return (
              <StairMarker
                key={stair.stair_id}
                stair={stair}
                cellSize={CELL_SIZE}
                cell={cell}
                activeZ={state.activeZ}
                selected={isSelected}
                offset={{ dx, dy }}
                grouped={grouped}
                onClick={() => selectStair(isSelected ? null : stair.stair_id)}
              />
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
                    const interactive = paintState === 'paintable' || paintState === 'ownedSelected' || roomFootprintSelection?.mode === 'click'
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
                           tabIndex={interactive ? 0 : undefined}
                          aria-label={
                            roomFootprintSelection?.mode === 'click'
                              ? `Set footprint corner ${x}, ${y}`
                              : paintState === 'paintable'
                              ? `Add cell ${x}, ${y}`
                              : paintState === 'ownedSelected'
                                ? `Remove cell ${x}, ${y}`
                                : undefined
                          }
                          onMouseEnter={() => setHoveredCell(cell)}
                          onPointerEnter={() => {
                            if (roomFootprintSelection?.mode === 'drag') {
                              setRoomFootprintSelection({ ...roomFootprintSelection, current: cell })
                            }
                          }}
                          onPointerDown={(event) => {
                            if (paintState !== 'paintable' && paintState !== 'ownedSelected') return
                            event.stopPropagation()
                            setRoomFootprintSelection({ anchor: cell, current: cell, mode: 'drag' })
                            setPlacementError(null)
                          }}
                          onPointerUp={(event) => {
                            if (roomFootprintSelection?.mode !== 'drag') return
                            event.stopPropagation()
                            const moved = roomFootprintSelection.anchor[0] !== cell[0] || roomFootprintSelection.anchor[1] !== cell[1]
                            if (moved) {
                              commitRoomFootprint(
                                footprintCellsForSelection(
                                  state.layout,
                                  state.selectedRoomId as number,
                                  state.activeZ,
                                  roomFootprintSelection.anchor,
                                  rectangleCells(roomFootprintSelection.anchor, cell),
                                ),
                              )
                            } else {
                              if (paintState === 'ownedSelected') {
                                toggleCell(state.selectedRoomId as number, cell)
                                setRoomFootprintSelection(null)
                              } else {
                                setRoomFootprintSelection({ anchor: cell, current: cell, mode: 'click' })
                              }
                            }
                            suppressNextPaintClickRef.current = true
                          }}
                           onClick={() => {
                            if (suppressNextPaintClickRef.current) {
                              suppressNextPaintClickRef.current = false
                              return
                            }
                            if (!interactive) return
                            if (roomFootprintSelection?.mode === 'click') {
                              commitRoomFootprint(rectangleCells(roomFootprintSelection.anchor, cell))
                              return
                            }
                            if (paintState === 'ownedSelected' && !roomFootprintSelection) {
                              toggleCell(state.selectedRoomId as number, cell)
                              return
                            }
                            if (paintState !== 'paintable') return
                            if (!roomFootprintSelection) {
                              setRoomFootprintSelection({ anchor: cell, current: cell, mode: 'click' })
                              setPlacementError(null)
                             }
                           }}
                           onKeyDown={(event) => {
                             if (event.key !== 'Enter' && event.key !== ' ') return
                             event.preventDefault()
                             event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
              <RoomContentEditor
                key={selectedRoom.room_id}
                room={selectedRoom}
                dungeonRoom={selectedDungeonRoom}
                onUpdateRoomTitle={updateRoomTitle}
                onUpdateRoomEntries={updateRoomEntries}
                onUpdateRoomNpcs={updateRoomNpcs}
                onCreateRoomData={createRoomData}
              />
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
