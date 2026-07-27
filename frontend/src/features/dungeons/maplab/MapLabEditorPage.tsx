import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './MapLabPage.css'
import './MapLabEditor.css'
import { MapLabRouteState } from './MapLabRouteState'
import { useDungeonShellContext, useDungeonShellStatusSlot } from './dungeonRouteContext'
import { useMapLabEditor } from './useMapLabEditor'
import { listDungeons, listIncomingGateways } from '../../../api/client'
import type { Dungeon, IncomingGateway } from '../../../api/types'
import { useMapCanvasZoom, type ViewportSize } from './useMapCanvasZoom'
import { useCanvasStroke } from './useCanvasStroke'
import { MapCanvas } from './MapCanvas'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DoorClosedIcon,
  EraserIcon,
  EyeIcon,
  FitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  MapIcon,
  MousePointer2,
  OffMapIcon,
  PlusIcon,
  PortalIcon,
  PropIcon,
  RoomIcon,
  SaveIcon,
  StairsIcon,
  TrashIcon,
  Trees,
  Waves,
  ZoomInIcon,
  ZoomOutIcon,
} from '../../../components/icons'
import { InspectorPanel } from './InspectorPanel'
import { resolveMapDensity, ToolbarTray, useMapDensity, useMapLayerVisibility } from './MapLabPage'
import { FixturePropertiesForm } from './FixturePropertiesForm'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { StairMarker } from './StairMarker'
import { DoorBadgeLayer, DoorMarker } from './DoorMarker'
import { GhostFloorLayer } from './GhostFloorLayer'
import { FIXTURE_TYPES, PROP_KIND_ICONS, PROP_KIND_OPTIONS } from './fixtureTypes'
import { RoomContentEditor } from './RoomContentEditor'
import { ConnectionsResolveList } from './ConnectionsResolveList'
import { SelectionActions } from './SelectionActions'
import { roomIsOffMap } from './roomContent'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import {
  absoluteCells,
  canPaintCell,
  doorWallSegment,
  doorsOnFloor,
  MAX_MARKERS_PER_CELL,
  ghostFloorZ,
  gridMarkerOffset,
  layoutBounds,
  markersAtCell,
  neighborCell,
  nonDoorWallSegments,
  oppositeSide,
  paddedBounds,
  propsOnFloor,
  roomLabelAnchor,
  roomOfCell,
  roomsOnZ,
  stairCellForZ,
  stairEndpointsForZ,
  type CardinalSide,
  type MapCell,
  type MapLayout,
  type MapPortal,
  type MapRoom,
  type WallEdge,
  FEATURE_KIND_OPTIONS,
} from '../../../model/maplabModel'
import { roomEraseOutcome } from './roomContent'

const CELL_SIZE = 64

type ToolFlyout = 'passages' | 'terrain' | 'prop'

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

type ArmedTool = 'select' | 'room' | 'door' | 'stair' | 'portal' | 'prop' | 'river' | 'trees'

/** A brush-stroke cell's preview state, computed against the *same floor*'s rooms only — different
 * z planes may legitimately share [x,y] (e.g. a stair landing directly above a stairwell). */
type BrushCellState = 'create' | 'paint' | 'erase' | 'blocked'

function brushCellStateForCell(
  layout: MapLayout,
  activeZ: number,
  selectedRoomId: number | null,
  eraseArmed: boolean,
  cell: MapCell,
): BrushCellState {
  const sameFloorRooms = layout.rooms.filter((room) => room.z === activeZ)
  const owner = roomOfCell(cell, sameFloorRooms)
  if (selectedRoomId === null) return owner === null ? 'create' : 'blocked'
  if (eraseArmed) return owner?.room_id === selectedRoomId ? 'erase' : 'blocked'
  if (owner === null) return canPaintCell(layout, selectedRoomId, cell) ? 'paint' : 'blocked'
  return owner.room_id === selectedRoomId ? 'paint' : 'blocked'
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

export function MapLabEditorPage() {
  const route = useDungeonShellContext()
  const statusSlot = useDungeonShellStatusSlot()
  const {
    state,
    loading: layoutLoading,
    loadStatus,
    saveStatus,
    dungeonData,
    addRoomWithCells,
    createRoomData,
    addFloorAbove,
    addFloorBelow,
    selectRoom,
    deleteRoom,
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
    addFeature,
    toggleFeatureCell,
    selectFeature,
    deleteFeature,
    updateFeatureMeta,
    updateRoomTitle,
    updateRoomWallKind,
    updatePadding,
    updateRoomEntries,
    updateRoomNpcs,
    undo,
    redo,
    canUndo,
    canRedo,
    dropEmptyRoom,
  } = useMapLabEditor(route.dungeonId, route.dungeon)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false)
  const [tabletNavOpen, setTabletNavOpen] = useState(false)
  const [selectionSheetExpanded, setSelectionSheetExpanded] = useState(false)
  const [armedTool, setArmedTool] = useState<ArmedTool>('select')
  const [lastPassageTool, setLastPassageTool] = useState<'door' | 'stair' | 'portal'>('door')
  const [lastTerrainTool, setLastTerrainTool] = useState<'river' | 'trees'>('river')
  const [openFlyout, setOpenFlyout] = useState<ToolFlyout | null>(null)
  const [flyoutFilter, setFlyoutFilter] = useState('')
  const passagesFlyoutRef = useRef<HTMLDivElement>(null)
  const terrainFlyoutRef = useRef<HTMLDivElement>(null)
  const propFlyoutRef = useRef<HTMLDivElement>(null)
  const passagesMenuRef = useRef<HTMLDivElement>(null)
  const terrainMenuRef = useRef<HTMLDivElement>(null)
  const propMenuRef = useRef<HTMLDivElement>(null)
  const [mapPopoverOpen, setMapPopoverOpen] = useState(false)
  const mapPopoverRef = useRef<HTMLDivElement>(null)
  const [viewPopoverOpen, setViewPopoverOpen] = useState(false)
  const viewPopoverRef = useRef<HTMLDivElement>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const placeDoorMode = armedTool === 'door'
  const placePropMode = armedTool === 'prop'
  const placeStairMode = armedTool === 'stair'
  const placePortalMode = armedTool === 'portal'
  const drawFeatureKind: 'river' | 'trees' | null =
    armedTool === 'river' ? 'river' : armedTool === 'trees' ? 'trees' : null
  const placeRoomMode = armedTool === 'room'
  // A brush tool is armed for terrain drawing or the sticky Room tool.
  const brushArmed = armedTool === 'room' || armedTool === 'river' || armedTool === 'trees'
  const [eraseArmed, setEraseArmed] = useState(false)
  const [selectedPropKind, setSelectedPropKind] = useState<string>('chest')
  const [roomToDelete, setRoomToDelete] = useState<MapRoom | null>(null)
  const [gatewayToRemove, setGatewayToRemove] = useState<MapPortal | null>(null)
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [incomingGateways, setIncomingGateways] = useState<IncomingGateway[]>([])
  const [connectionsLoaded, setConnectionsLoaded] = useState(false)
  const [connectionsLoadError, setConnectionsLoadError] = useState(false)
  const [dismissZWarning, setDismissZWarning] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [deletedFixture, setDeletedFixture] = useState<string | null>(null)
  const [removedEmptyRoom, setRemovedEmptyRoom] = useState(false)
  const [showGhostFloor, setShowGhostFloor] = useState(false)
  const { visible: layerVisible, toggleLayer } = useMapLayerVisibility()
  const { density, setDensity } = useMapDensity()
  const pointerMode = placeDoorMode || placePropMode || placeStairMode || placePortalMode || drawFeatureKind !== null || placeRoomMode ? 'tool' : 'pan'
  const zoomApi = useMapCanvasZoom({ wheelZoomMode: 'always', pointerMode })
  const simplified = resolveMapDensity(density, zoomApi.zoom.scale) === 'simple'
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), [])
  const bounds = useMemo(() => paddedBounds(state.layout), [state.layout])
  const roomBounds = useMemo(() => layoutBounds(state.layout.rooms), [state.layout])
  const { fitToBounds } = zoomApi
  const toggleCanvasFullscreen = useCallback(() => {
    setIsCanvasFullscreen((active) => !active)
    if (!isCanvasFullscreen) {
      const result = fitToBounds(roomBounds, viewportSize, bounds)
      setPlacementError(
        result.clampedToMin
          ? 'This floor is too large to fit on screen. Zoom out further isn\'t possible; pan to see the rest.'
          : null
      )
    }
  }, [isCanvasFullscreen, roomBounds, bounds, viewportSize, fitToBounds])

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
  const featuresOnActiveFloor = useMemo(
    () => state.layout.features.filter((f) => f.z === state.activeZ),
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
  const ghostFeatures = useMemo(
    () => (showGhostFloor && ghostZ !== null ? state.layout.features.filter((f) => f.z === ghostZ) : []),
    [showGhostFloor, ghostZ, state.layout]
  )

  const filterMatches = useCallback(
    (label: string) => label.toLowerCase().includes(flyoutFilter.trim().toLowerCase()),
    [flyoutFilter],
  )
  const passageToolOptions = useMemo(
    () => [
      { key: 'door' as const, label: 'Door', icon: DoorClosedIcon, active: placeDoorMode },
      { key: 'stair' as const, label: 'Stair', icon: StairsIcon, active: placeStairMode },
      { key: 'portal' as const, label: 'Portal', icon: PortalIcon, active: placePortalMode },
    ].filter((option) => filterMatches(option.label)),
    [filterMatches, placeDoorMode, placePortalMode, placeStairMode],
  )
  const propKindOptions = useMemo(
    () => PROP_KIND_OPTIONS.filter((option) => filterMatches(option.label)),
    [filterMatches],
  )
  const terrainToolOptions = useMemo(
    () => [
      { key: 'river' as const, label: 'River', icon: Waves, active: drawFeatureKind === 'river' },
      { key: 'trees' as const, label: 'Trees', icon: Trees, active: drawFeatureKind === 'trees' },
    ].filter((option) => filterMatches(option.label)),
    [drawFeatureKind, filterMatches],
  )

  const activatePassageTool = useCallback((tool: 'door' | 'stair' | 'portal') => {
    setLastPassageTool(tool)
    setArmedTool(tool)
    setPlacementError(null)
    setOpenFlyout(null)
  }, [])

  const activatePropKind = useCallback((kind: string) => {
    setSelectedPropKind(kind)
    setOpenFlyout(null)
  }, [])

  const activateTerrainTool = useCallback((tool: 'river' | 'trees') => {
    setLastTerrainTool(tool)
    setArmedTool(tool)
    setDismissZWarning(false)
    setPlacementError(null)
    setOpenFlyout(null)
  }, [])

  const activateTopFilteredTool = useCallback(() => {
    if (openFlyout === 'passages' && passageToolOptions[0]) activatePassageTool(passageToolOptions[0].key)
    if (openFlyout === 'prop' && propKindOptions[0]) activatePropKind(propKindOptions[0].value)
    if (openFlyout === 'terrain' && terrainToolOptions[0]) activateTerrainTool(terrainToolOptions[0].key)
  }, [activatePassageTool, activatePropKind, activateTerrainTool, openFlyout, passageToolOptions, propKindOptions, terrainToolOptions])

  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${
    (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  } ${(bounds.maxY - bounds.minY + 1) * CELL_SIZE}`

  // Cells touched by the in-flight Room-tool stroke, for the live brush preview — committed to the
  // layout as one action on pointer-up rather than dispatched cell-by-cell, so a fast drag that
  // revisits cells or crosses invalid ones behaves predictably (see handleRoomStrokeEnd).
  const [strokeCells, setStrokeCells] = useState<MapCell[]>([])
  const strokeModeRef = useRef<'create' | 'paint' | 'erase' | null>(null)
  const strokeRoomIdRef = useRef<number | null>(null)

  const handleRoomStrokeStart = useCallback(
    (cell: MapCell) => {
      strokeModeRef.current = state.selectedRoomId === null ? 'create' : eraseArmed ? 'erase' : 'paint'
      strokeRoomIdRef.current = state.selectedRoomId
      setStrokeCells([cell])
    },
    [state.selectedRoomId, eraseArmed],
  )

  const handleRoomStrokeCell = useCallback((cell: MapCell) => {
    setStrokeCells((cells) => (cells.some(([x, y]) => x === cell[0] && y === cell[1]) ? cells : [...cells, cell]))
  }, [])

  const handleRoomStrokeEnd = useCallback(() => {
    const mode = strokeModeRef.current
    const roomId = strokeRoomIdRef.current
    strokeModeRef.current = null
    strokeRoomIdRef.current = null

    if (mode === 'create') {
      const sameFloorRooms = state.layout.rooms.filter((room) => room.z === state.activeZ)
      const validCells = strokeCells.filter((cell) => roomOfCell(cell, sameFloorRooms) === null)
      if (validCells.length > 0) addRoomWithCells(validCells)
    } else if (roomId !== null) {
      const room = state.layout.rooms.find((candidate) => candidate.room_id === roomId)
      if (room) {
        const existingCells = absoluteCells(room)
        if (mode === 'erase') {
          const eraseKeys = new Set(strokeCells.map(cellKey))
          const remaining = existingCells.filter((cell) => !eraseKeys.has(cellKey(cell)))
          if (remaining.length !== existingCells.length) {
            const dataRoom = dungeonData.rooms?.find((r) => r.room_id === roomId)
            const outcome = roomEraseOutcome(remaining, room, dataRoom)
            if (outcome === 'shrink') {
              setRoomFootprint(roomId, remaining)
            } else if (outcome === 'flag') {
              setRoomFootprint(roomId, [])
            } else if (outcome === 'drop') {
              dropEmptyRoom(roomId)
              setRemovedEmptyRoom(true)
            }
          }
        } else if (mode === 'paint') {
          const sameFloorRooms = state.layout.rooms.filter((r) => r.z === state.activeZ)
          const ownedKeys = new Set(existingCells.map(cellKey))
          const validNewCells = strokeCells.filter((cell) => {
            if (ownedKeys.has(cellKey(cell))) return false
            const owner = roomOfCell(cell, sameFloorRooms)
            return owner === null
          })
          if (validNewCells.length > 0) {
            setRoomFootprint(roomId, [...existingCells, ...validNewCells])
          }
        }
      }
    }
    setStrokeCells([])
  }, [strokeCells, state.layout, state.activeZ, addRoomWithCells, setRoomFootprint, dungeonData, dropEmptyRoom])

  // Any pending brush preview is stale once the tool or active floor changes.
  useEffect(() => {
    setStrokeCells([])
  }, [armedTool, state.activeZ])

  const handleFeatureStrokeStart = useCallback(
    (cell: MapCell) => {
      if (drawFeatureKind === null) return
      if (eraseArmed) {
        // In erase mode, erase the start cell from any feature that owns it
        const owningFeature = state.layout.features.find((f) =>
          f.cells.some(([x, y]) => x === cell[0] && y === cell[1])
        )
        if (owningFeature) {
          toggleFeatureCell(owningFeature.feature_id, cell)
        }
        return
      }
      if (state.selectedFeatureId === null) {
        addFeature(drawFeatureKind, cell, state.activeZ)
      }
    },
    [drawFeatureKind, state.selectedFeatureId, state.activeZ, addFeature, eraseArmed, state.layout.features, toggleFeatureCell],
  )

  const handleFeatureStrokeCell = useCallback(
    (cell: MapCell) => {
      if (drawFeatureKind === null) return
      if (eraseArmed) {
        // Find the feature that owns this cell (if any)
        const owningFeature = state.layout.features.find((f) =>
          f.cells.some(([x, y]) => x === cell[0] && y === cell[1])
        )
        if (owningFeature) {
          toggleFeatureCell(owningFeature.feature_id, cell)
        }
      } else {
        if (state.selectedFeatureId === null) return
        toggleFeatureCell(state.selectedFeatureId, cell)
      }
    },
    [drawFeatureKind, state.selectedFeatureId, state.layout.features, eraseArmed, toggleFeatureCell],
  )

  const handleFeatureStrokeEnd = useCallback(() => {
    // Feature cells are applied immediately via toggleFeatureCell, nothing to do on end
  }, [])

  const strokeApi = useCanvasStroke({
    enabled: placeRoomMode,
    zoom: zoomApi.zoom,
    bounds,
    onStrokeStart: handleRoomStrokeStart,
    onStrokeCell: handleRoomStrokeCell,
    onStrokeEnd: handleRoomStrokeEnd,
  })

  const featureStrokeApi = useCanvasStroke({
    enabled: drawFeatureKind !== null,
    zoom: zoomApi.zoom,
    bounds,
    onStrokeStart: handleFeatureStrokeStart,
    onStrokeCell: handleFeatureStrokeCell,
    onStrokeEnd: handleFeatureStrokeEnd,
  })

  const roomBrushGuidance = useMemo(() => {
    if (!placeRoomMode) return undefined
    if (state.selectedRoomId === null) return 'Drag on empty ground to start a new room.'
    return eraseArmed ? 'Drag across squares to remove them from the room.' : 'Drag to add squares to the room.'
  }, [placeRoomMode, state.selectedRoomId, eraseArmed])

  const placementEdges = useMemo(
    () => (placeDoorMode ? doorPlacementEdges(roomsOnActiveFloor, doorsOnActiveFloor) : []),
    [placeDoorMode, roomsOnActiveFloor, doorsOnActiveFloor]
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
  const selectedFeature = useMemo(
    () => state.layout.features.find((feature) => feature.feature_id === state.selectedFeatureId) ?? null,
    [state.layout.features, state.selectedFeatureId]
  )

  const deleteFixtureWithUndo = useCallback((thing: string, remove: () => void) => {
    remove()
    setPlacementError(null)
    setDeletedFixture(thing)
  }, [])

  const undoDeletedFixture = useCallback(() => {
    undo()
    setDeletedFixture(null)
  }, [undo])

  const undoRemovedEmptyRoom = useCallback(() => {
    undo()
    setRemovedEmptyRoom(false)
  }, [undo])

  const selectedItemKey = selectedFeature
    ? `feature-${selectedFeature.feature_id}`
    : selectedDoor
      ? `door-${selectedDoor.door_id}`
      : selectedRoom
        ? `room-${selectedRoom.room_id}`
        : selectedProp
          ? `prop-${selectedProp.prop_id}`
          : selectedStair
            ? `stair-${selectedStair.stair_id}`
            : selectedPortal
              ? `portal-${selectedPortal.portal_id}`
              : null
  const selectedItemName = selectedFeature
    ? selectedFeature.title ?? selectedFeature.kind
    : selectedDoor
      ? 'Door'
      : selectedRoom
        ? selectedRoom.title ?? `Room ${selectedRoom.room_id}`
        : selectedProp
          ? selectedProp.kind
          : selectedStair
            ? 'Stairs'
            : selectedPortal?.title ?? 'Portal'

  useEffect(() => {
    setSelectionSheetExpanded(false)
  }, [selectedItemKey])

  const selectionActions = selectedFeature ? (
    <SelectionActions
      deleteLabel="Delete feature"
      onDelete={() => deleteFixtureWithUndo(selectedFeature.title ?? selectedFeature.kind, () => deleteFeature(selectedFeature.feature_id))}
      onClose={() => selectFeature(null)}
    />
  ) : selectedDoor ? (
    <SelectionActions
      deleteLabel="Delete door"
      onDelete={() => deleteFixtureWithUndo('door', () => deleteDoor(selectedDoor.door_id))}
      onClose={() => selectDoor(null)}
    />
  ) : selectedRoom ? (
    <SelectionActions deleteLabel="Delete room" onDelete={() => setRoomToDelete(selectedRoom)} onClose={() => selectRoom(null)} />
  ) : selectedProp ? (
    <SelectionActions
      deleteLabel="Delete prop"
      onDelete={() => deleteFixtureWithUndo('prop', () => deleteProp(selectedProp.prop_id))}
      onClose={() => selectProp(null)}
    />
  ) : selectedStair ? (
    <SelectionActions
      deleteLabel="Delete stair"
      onDelete={() => deleteFixtureWithUndo('stair', () => deleteStair(selectedStair.stair_id))}
      onClose={() => selectStair(null)}
    />
  ) : selectedPortal ? (
    <SelectionActions
      deleteLabel="Delete portal"
      onDelete={() => deleteFixtureWithUndo('portal', () => deletePortal(selectedPortal.portal_id))}
      onClose={() => selectPortal(null)}
    />
  ) : null

  useEffect(() => {
    if (drawFeatureKind === null) {
      setDismissZWarning(false)
    }
  }, [drawFeatureKind, armedTool, state.activeZ, state.selectedRoomId])

  useEffect(() => {
    if (!brushArmed) setEraseArmed(false)
  }, [brushArmed])

  useEffect(() => {
    setFlyoutFilter('')
    if (!openFlyout) return
    const menuRef = openFlyout === 'passages' ? passagesMenuRef : openFlyout === 'prop' ? propMenuRef : terrainMenuRef
    window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLInputElement>('.maplab-tool-palette-filter')?.focus()
    }, 0)
  }, [openFlyout])

  useEffect(() => {
    if (!openFlyout) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const groupRef = openFlyout === 'passages' ? passagesFlyoutRef : openFlyout === 'prop' ? propFlyoutRef : terrainFlyoutRef
      const menuRef = openFlyout === 'passages' ? passagesMenuRef : openFlyout === 'prop' ? propMenuRef : terrainMenuRef
      if (
        groupRef.current && !groupRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpenFlyout(null)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openFlyout])

  useEffect(() => {
    if (!mapPopoverOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (mapPopoverRef.current && !mapPopoverRef.current.contains(target)) setMapPopoverOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mapPopoverOpen])

  useEffect(() => {
    if (!viewPopoverOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (viewPopoverRef.current && !viewPopoverRef.current.contains(target)) setViewPopoverOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [viewPopoverOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select, [contenteditable]') || target.isContentEditable)
      ) return

      if (event.key === 'Escape') {
        event.preventDefault()
        if (openFlyout !== null) {
          setOpenFlyout(null)
        } else if (mapPopoverOpen) {
          setMapPopoverOpen(false)
        } else if (viewPopoverOpen) {
          setViewPopoverOpen(false)
        } else if (tabletNavOpen) {
          setTabletNavOpen(false)
        } else if (selectionSheetExpanded) {
          setSelectionSheetExpanded(false)
        } else {
          setArmedTool('select')
          setPlacementError(null)
        }
        return
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

      switch (event.key.toLowerCase()) {
        case 'v':
          setArmedTool('select')
          setPlacementError(null)
          break
        case 'r':
          setArmedTool('room')
          setPlacementError(null)
          break
        case 'd':
          setLastPassageTool('door')
          setArmedTool('door')
          setPlacementError(null)
          setOpenFlyout(null)
          break
        case 'p':
          setArmedTool('prop')
          setPlacementError(null)
          break
        case 's':
          setLastPassageTool('stair')
          setArmedTool('stair')
          setPlacementError(null)
          setOpenFlyout(null)
          break
        case 'o':
          setLastPassageTool('portal')
          setArmedTool('portal')
          setPlacementError(null)
          setOpenFlyout(null)
          break
        case 'w':
          setLastTerrainTool('river')
          setArmedTool('river')
          setDismissZWarning(false)
          setPlacementError(null)
          setOpenFlyout(null)
          break
        case 't':
          setLastTerrainTool('trees')
          setArmedTool('trees')
          setDismissZWarning(false)
          setPlacementError(null)
          setOpenFlyout(null)
          break
        case 'e':
          if (brushArmed) setEraseArmed((active) => !active)
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [brushArmed, mapPopoverOpen, openFlyout, redo, selectionSheetExpanded, tabletNavOpen, undo, viewPopoverOpen])

  useEffect(() => {
    if (route.dungeonId === null) return
    let cancelled = false
    setConnectionsLoaded(false)
    setConnectionsLoadError(false)
    Promise.all([listDungeons(), listIncomingGateways(route.dungeonId)])
      .then(([dungeonsResult, incomingGatewaysResult]) => {
        if (cancelled) return
        setDungeons(dungeonsResult)
        setIncomingGateways(incomingGatewaysResult)
        setConnectionsLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setConnectionsLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [route.dungeonId])

  const handleAddReturnGateway = useCallback(
    (gateway: IncomingGateway) => {
      const roomsHere = roomsOnZ(state.layout, state.activeZ)
      const room = roomsHere[0] ?? roomsOnZ(state.layout, 0)[0]
      const z = room?.z ?? state.activeZ
      const cell: MapCell = room
        ? absoluteCells(room).find((candidate) => markersAtCell(state.layout, z, candidate).length === 0) ??
          absoluteCells(room)[0]
        : [0, 0]
      if (z !== state.activeZ) setActiveZ(z)
      addPortal(cell, { dungeon_id: gateway.dungeon_id })
    },
    [addPortal, setActiveZ, state.activeZ, state.layout],
  )

  const renderFlyoutFilter = (label: string) => (
    <input
      type="search"
      className="maplab-tool-palette-filter"
      aria-label={label}
      placeholder="Filter tools"
      value={flyoutFilter}
      onChange={(event) => setFlyoutFilter(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        activateTopFilteredTool()
      }}
    />
  )

  if (route.status === 'loading' || layoutLoading) {
    return <MapLabRouteState title="Loading map editor" message="Loading dungeon layout…" variant="loading" />
  }

  if (loadStatus.status === 'error') {
    return (
      <MapLabRouteState
        title={route.dungeon?.title ?? 'Dungeon layout unavailable'}
        message={loadStatus.error ?? 'Failed to load dungeon layout.'}
        variant="error"
      />
    )
  }

  return (
    <div
      className="maplab-editor"
      data-fullscreen={isCanvasFullscreen || undefined}
      role={isCanvasFullscreen ? 'dialog' : undefined}
      aria-modal={isCanvasFullscreen || undefined}
      aria-label={isCanvasFullscreen ? 'Fullscreen map editor workspace' : undefined}
      tabIndex={isCanvasFullscreen ? -1 : undefined}
    >
      {loadStatus.status === 'empty' && (
        <p className="maplab-subtitle">No saved layout yet. Your first edit will save this blank map.</p>
      )}

      <div className="maplab-toolbar">
        <ToolbarTray groupKey="editor-create" label="Create">
          <div className="maplab-tool-palette" role="group" aria-label="Drawing tools">
            <button
              type="button"
              className="maplab-pill-button maplab-tool-palette-button"
              aria-pressed={armedTool === 'select'}
              data-active={armedTool === 'select' || undefined}
              onClick={() => {
                setArmedTool('select')
                setPlacementError(null)
              }}
            >
              <MousePointer2 width={18} height={18} aria-hidden="true" />
              Select
            </button>

            <button
              type="button"
              className="maplab-pill-button maplab-tool-palette-button"
              aria-pressed={placeRoomMode}
              data-active={placeRoomMode || undefined}
              title={placeRoomMode ? 'Click again or press Escape to return to Select.' : undefined}
              onClick={() => {
                if (armedTool === 'room') {
                  setArmedTool('select')
                } else {
                  setArmedTool('room')
                }
                setPlacementError(null)
              }}
            >
              <RoomIcon width={18} height={18} aria-hidden="true" />
              Room
            </button>

            <div className="maplab-tool-palette-group" ref={passagesFlyoutRef}>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-button"
                aria-label="Passage tools"
                aria-pressed={placeDoorMode || placeStairMode || placePortalMode}
                data-active={(placeDoorMode || placeStairMode || placePortalMode) || undefined}
                title={(placeDoorMode || placeStairMode || placePortalMode) ? 'Click again or press Escape to return to Select.' : undefined}
                onClick={() => {
                  if (placeDoorMode || placeStairMode || placePortalMode) {
                    setArmedTool('select')
                  } else {
                    setArmedTool(lastPassageTool)
                  }
                  setPlacementError(null)
                  setOpenFlyout(null)
                }}
              >
                {lastPassageTool === 'stair' ? (
                  <StairsIcon width={18} height={18} aria-hidden="true" />
                ) : lastPassageTool === 'portal' ? (
                  <PortalIcon width={18} height={18} aria-hidden="true" />
                ) : (
                  <DoorClosedIcon width={18} height={18} aria-hidden="true" />
                )}
                Passages
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-flyout-toggle"
                aria-label="Choose passage tool"
                aria-haspopup="menu"
                aria-expanded={openFlyout === 'passages'}
                onClick={() => setOpenFlyout((open) => (open === 'passages' ? null : 'passages'))}
              >
                {openFlyout === 'passages' ? (
                  <ChevronUpIcon width={14} height={14} aria-hidden="true" />
                ) : (
                  <ChevronDownIcon width={14} height={14} aria-hidden="true" />
                )}
              </button>
              {openFlyout === 'passages' && passagesFlyoutRef.current && createPortal(
                <div
                  className="maplab-tool-palette-flyout"
                  role="menu"
                  ref={passagesMenuRef}
                  style={{
                    position: 'fixed',
                    top: passagesFlyoutRef.current.getBoundingClientRect().bottom,
                    left: passagesFlyoutRef.current.getBoundingClientRect().left,
                    zIndex: 'var(--z-floating)',
                  }}
                >
                  {renderFlyoutFilter('Filter passage tools')}
                  {passageToolOptions.length === 0 ? (
                    <p className="maplab-tool-palette-empty">No tools match that.</p>
                  ) : passageToolOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.key}
                        type="button"
                        role="menuitem"
                        className="maplab-pill-button"
                        data-active={option.active || undefined}
                        onClick={() => activatePassageTool(option.key)}
                      >
                        <Icon width={16} height={16} aria-hidden="true" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>,
                document.body
              )}
            </div>

            <div className="maplab-tool-palette-group" ref={propFlyoutRef}>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-button"
                aria-pressed={placePropMode}
                data-active={placePropMode || undefined}
                title={placePropMode ? 'Click again or press Escape to return to Select.' : undefined}
                onClick={() => {
                  if (armedTool === 'prop') {
                    setArmedTool('select')
                  } else {
                    setArmedTool('prop')
                  }
                  setPlacementError(null)
                  setOpenFlyout(null)
                }}
              >
                <PropIcon width={18} height={18} aria-hidden="true" />
                Prop
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-flyout-toggle"
                aria-label="Choose prop kind"
                aria-haspopup="menu"
                aria-expanded={openFlyout === 'prop'}
                onClick={() => setOpenFlyout((open) => (open === 'prop' ? null : 'prop'))}
              >
                {openFlyout === 'prop' ? (
                  <ChevronUpIcon width={14} height={14} aria-hidden="true" />
                ) : (
                  <ChevronDownIcon width={14} height={14} aria-hidden="true" />
                )}
              </button>
              {openFlyout === 'prop' && propFlyoutRef.current && createPortal(
                <div
                  className="maplab-tool-palette-flyout"
                  role="menu"
                  ref={propMenuRef}
                  style={{
                    position: 'fixed',
                    top: propFlyoutRef.current.getBoundingClientRect().bottom,
                    left: propFlyoutRef.current.getBoundingClientRect().left,
                    zIndex: 'var(--z-floating)',
                  }}
                >
                  {renderFlyoutFilter('Filter prop tools')}
                  {propKindOptions.length === 0 ? (
                    <p className="maplab-tool-palette-empty">No tools match that.</p>
                  ) : propKindOptions.map((option) => {
                    const KindIcon = PROP_KIND_ICONS[option.value as keyof typeof PROP_KIND_ICONS]
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitem"
                        className="maplab-pill-button"
                        data-active={selectedPropKind === option.value || undefined}
                        onClick={() => activatePropKind(option.value)}
                      >
                        <KindIcon width={16} height={16} aria-hidden="true" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>,
                document.body
              )}
            </div>

            <div className="maplab-tool-palette-group" ref={terrainFlyoutRef}>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-button"
                aria-pressed={drawFeatureKind !== null}
                data-active={drawFeatureKind !== null || undefined}
                title={drawFeatureKind !== null ? 'Click again or press Escape to return to Select.' : undefined}
                onClick={() => {
                  if (drawFeatureKind !== null) {
                    setArmedTool('select')
                  } else {
                    setArmedTool(lastTerrainTool)
                  }
                  setDismissZWarning(false)
                  setPlacementError(null)
                  setOpenFlyout(null)
                }}
              >
                {lastTerrainTool === 'trees' ? (
                  <Trees width={18} height={18} aria-hidden="true" />
                ) : (
                  <Waves width={18} height={18} aria-hidden="true" />
                )}
                Terrain
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-flyout-toggle"
                aria-label="Choose terrain tool"
                aria-haspopup="menu"
                aria-expanded={openFlyout === 'terrain'}
                onClick={() => setOpenFlyout((open) => (open === 'terrain' ? null : 'terrain'))}
              >
                {openFlyout === 'terrain' ? (
                  <ChevronUpIcon width={14} height={14} aria-hidden="true" />
                ) : (
                  <ChevronDownIcon width={14} height={14} aria-hidden="true" />
                )}
              </button>
              {openFlyout === 'terrain' && terrainFlyoutRef.current && createPortal(
                <div
                  className="maplab-tool-palette-flyout"
                  role="menu"
                  ref={terrainMenuRef}
                  style={{
                    position: 'fixed',
                    top: terrainFlyoutRef.current.getBoundingClientRect().bottom,
                    left: terrainFlyoutRef.current.getBoundingClientRect().left,
                    zIndex: 'var(--z-floating)',
                  }}
                >
                  {renderFlyoutFilter('Filter terrain tools')}
                  {terrainToolOptions.length === 0 ? (
                    <p className="maplab-tool-palette-empty">No tools match that.</p>
                  ) : terrainToolOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.key}
                        type="button"
                        role="menuitem"
                        className="maplab-pill-button"
                        data-active={option.active || undefined}
                        onClick={() => activateTerrainTool(option.key)}
                      >
                        <Icon width={16} height={16} aria-hidden="true" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>,
                document.body
              )}
            </div>
          </div>

          {brushArmed && (
            <div className="maplab-tool-options" role="group" aria-label="Brush options">
              <button
                type="button"
                className="maplab-pill-button maplab-tool-options-erase"
                aria-pressed={eraseArmed}
                data-active={eraseArmed || undefined}
                onClick={() => setEraseArmed((active) => !active)}
              >
                <EraserIcon width={18} height={18} aria-hidden="true" />
                Erase
              </button>
            </div>
          )}

        </ToolbarTray>
        <div className="maplab-view-popover-wrap" ref={viewPopoverRef}>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-haspopup="true"
            aria-expanded={viewPopoverOpen}
            data-active={viewPopoverOpen || undefined}
            onClick={() => setViewPopoverOpen((open) => !open)}
          >
            <EyeIcon width={18} height={18} aria-hidden="true" />
            View
          </button>
          {viewPopoverOpen && (
            <div className="maplab-view-popover" role="menu">
              <button
                type="button"
                className="maplab-pill-button maplab-layer-toggle-button"
                aria-pressed={layerVisible.outside}
                data-active={layerVisible.outside || undefined}
                onClick={() => toggleLayer('outside')}
              >
                Outside
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-layer-toggle-button"
                aria-pressed={layerVisible.props}
                data-active={layerVisible.props || undefined}
                onClick={() => toggleLayer('props')}
              >
                Props
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-layer-toggle-button"
                aria-pressed={layerVisible.passages}
                data-active={layerVisible.passages || undefined}
                onClick={() => toggleLayer('passages')}
              >
                Passages
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-layer-toggle-button"
                aria-pressed={layerVisible.labels}
                data-active={layerVisible.labels || undefined}
                onClick={() => toggleLayer('labels')}
              >
                Labels
              </button>
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
              <button
                type="button"
                className="maplab-pill-button"
                aria-pressed={density === 'detailed'}
                data-active={density === 'detailed' || undefined}
                onClick={() => setDensity('detailed')}
              >
                Detailed
              </button>
              <button
                type="button"
                className="maplab-pill-button"
                aria-pressed={density === 'auto'}
                data-active={density === 'auto' || undefined}
                onClick={() => setDensity('auto')}
              >
                Auto
              </button>
              <button
                type="button"
                className="maplab-pill-button"
                aria-pressed={density === 'simple'}
                data-active={density === 'simple' || undefined}
                onClick={() => setDensity('simple')}
              >
                Simple
              </button>
            </div>
          )}
        </div>
        <div className="maplab-map-popover-wrap" ref={mapPopoverRef}>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            aria-haspopup="true"
            aria-expanded={mapPopoverOpen}
            data-active={mapPopoverOpen || undefined}
            onClick={() => setMapPopoverOpen((open) => !open)}
          >
            <MapIcon width={18} height={18} aria-hidden="true" />
            Map
          </button>
          {mapPopoverOpen && (
            <div className="maplab-map-popover" role="menu">
              <label className="maplab-field-row maplab-room-content-field maplab-editor-padding-input">
                <span>Top</span>
                <input type="number" min={0} value={state.layout.meta.padding.top}
                  onChange={(event) => updatePadding({ ...state.layout.meta.padding, top: Number(event.target.value) })} />
              </label>
              <label className="maplab-field-row maplab-room-content-field maplab-editor-padding-input">
                <span>Right</span>
                <input type="number" min={0} value={state.layout.meta.padding.right}
                  onChange={(event) => updatePadding({ ...state.layout.meta.padding, right: Number(event.target.value) })} />
              </label>
              <label className="maplab-field-row maplab-room-content-field maplab-editor-padding-input">
                <span>Bottom</span>
                <input type="number" min={0} value={state.layout.meta.padding.bottom}
                  onChange={(event) => updatePadding({ ...state.layout.meta.padding, bottom: Number(event.target.value) })} />
              </label>
              <label className="maplab-field-row maplab-room-content-field maplab-editor-padding-input">
                <span>Left</span>
                <input type="number" min={0} value={state.layout.meta.padding.left}
                  onChange={(event) => updatePadding({ ...state.layout.meta.padding, left: Number(event.target.value) })} />
              </label>
              <button
                type="button"
                className="maplab-pill-button maplab-editor-toolbar-button"
                onClick={() => setConfirmingReset(true)}
              >
                Reset unsaved changes
              </button>
            </div>
          )}
        </div>
        <div className="maplab-floor-tabs" role="tablist" aria-label="Dungeon floors">
            {floors.map((floor) => (
              <button
                key={floor.z}
                type="button"
                role="tab"
                className="maplab-pill-button maplab-floor-tab"
                aria-selected={floor.z === state.activeZ}
                onClick={() => {
                  setActiveZ(floor.z)
                  setTabletNavOpen(false)
                }}
              >
                {floor.title ?? `Floor ${floor.z}`}
              </button>
            ))}
        </div>
      </div>

      {statusSlot &&
        createPortal(
          <span className="maplab-editor-save-status" data-status={saveStatus.status} role="status" aria-live="polite">
            <SaveIcon width={16} height={16} aria-hidden="true" />
            {syncStatusLabel(saveStatus.status)}
          </span>,
          statusSlot,
        )}

      {drawFeatureKind !== null && state.activeZ !== 0 && !dismissZWarning && (
        <p className="maplab-placement-error" role="status">
          Rivers and woods usually sit on the ground floor. Draw it here anyway?
          <button
            type="button"
            className="maplab-pill-button maplab-editor-toolbar-button"
            onClick={() => setDismissZWarning(true)}
            style={{ marginLeft: 'var(--space-3)' }}
          >
            Dismiss
          </button>
        </p>
      )}

      <div className="maplab-editor-layout">
        <button
          type="button"
          className="maplab-pill-button maplab-editor-nav-toggle"
          aria-label="Open map editor navigation"
          aria-expanded={tabletNavOpen}
          aria-controls="maplab-editor-navigation"
          onClick={() => setTabletNavOpen((open) => !open)}
        >
          Floors, rooms, and connections
        </button>
        <div
          id="maplab-editor-navigation"
          className="maplab-editor-nav-rail"
          data-open={tabletNavOpen || undefined}
        >
          <div className="maplab-floor-tabs maplab-editor-nav-floor-tabs" aria-hidden="true" />
          <div className="maplab-editor-floor-actions" aria-label="Floor actions">
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorAbove}
              onClick={() => addFloorAbove()}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor above
            </button>
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorBelow}
              onClick={() => addFloorBelow()}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor below
            </button>
          </div>

          <button
            type="button"
            className="maplab-pill-button maplab-editor-room-list-new"
            onClick={() => {
              selectRoom(null)
              setArmedTool('room')
              setPlacementError(null)
            }}
          >
            <PlusIcon width={16} height={16} aria-hidden="true" />
            New room
          </button>

          <ul className="maplab-editor-room-list" aria-label="Rooms on this floor">
            {roomsOnActiveFloor.map((room) => (
              <li
                key={room.room_id}
                className="maplab-editor-room-item"
                data-selected={room.room_id === state.selectedRoomId || undefined}
                data-off-map={roomIsOffMap(room) || undefined}
              >
                <button
                  type="button"
                  className="maplab-editor-room-item-select"
                  aria-pressed={room.room_id === state.selectedRoomId}
                  onClick={() => {
                    const nextRoomId = room.room_id === state.selectedRoomId ? null : room.room_id
                    selectRoom(nextRoomId)
                    if (nextRoomId !== null) setArmedTool('room')
                  }}
                >
                  {room.title ?? `Room ${room.room_id}`}
                  {roomIsOffMap(room) && (
                    <span className="maplab-editor-room-offmap">
                      <OffMapIcon width={14} height={14} aria-hidden="true" />
                      not on the map
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="maplab-editor-room-item-delete"
                  aria-label={`Delete ${room.title ?? `Room ${room.room_id}`}`}
                  onClick={() => setRoomToDelete(room)}
                >
                  <TrashIcon width={16} height={16} aria-hidden="true" />
                </button>
              </li>
            ))}
            {roomsOnActiveFloor.length === 0 && <li className="maplab-editor-room-list-empty">No rooms on this floor yet.</li>}
          </ul>

          <ConnectionsResolveList
            layout={state.layout}
            dungeons={dungeons}
            incomingGateways={incomingGateways}
            connectionsLoaded={connectionsLoaded}
            connectionsLoadError={connectionsLoadError}
            onResolve={(portal) => {
              setActiveZ(portal.z)
              selectPortal(portal.portal_id)
            }}
            onRemoveGateway={(portal) => setGatewayToRemove(portal)}
            onAddReturnGateway={handleAddReturnGateway}
          />
        </div>
        <button
          type="button"
          className="maplab-editor-nav-backdrop"
          aria-label="Close map editor navigation"
          tabIndex={tabletNavOpen ? 0 : -1}
          onClick={() => setTabletNavOpen(false)}
        />

        <MapCanvas
          viewBox={viewBox}
          bounds={bounds}
          zoom={zoomApi.zoom}
          ariaLabel={`Editor floor map — Floor ${state.activeZ}`}
          variant="neutral"
          fullscreen={isCanvasFullscreen}
          onToggleFullscreen={toggleCanvasFullscreen}
          onExitFullscreen={() => setIsCanvasFullscreen(false)}
          onWheelZoom={zoomApi.handleWheel}
          onPanStart={zoomApi.handlePointerDown}
          onPanMove={zoomApi.handlePointerMove}
          onPanEnd={zoomApi.handlePointerUp}
          onStrokePointerDown={(e) => {
            strokeApi.onStrokePointerDown(e)
            featureStrokeApi.onStrokePointerDown(e)
          }}
          onStrokePointerMove={(e) => {
            strokeApi.onStrokePointerMove(e)
            featureStrokeApi.onStrokePointerMove(e)
          }}
          onStrokePointerUp={(e) => {
            strokeApi.onStrokePointerUp(e)
            featureStrokeApi.onStrokePointerUp(e)
          }}
          strokeViewportRef={(el) => {
            strokeApi.setStrokeViewportEl(el)
            featureStrokeApi.setStrokeViewportEl(el)
          }}
          onViewportResize={handleViewportResize}
          panHint={isCanvasFullscreen ? "Drag to pan. Pinch or scroll to zoom. Press Escape to exit fullscreen." : undefined}
          viewportDescription={roomBrushGuidance}
          topRightSlot={(() => {
            const FullscreenIcon = isCanvasFullscreen ? FullscreenExitIcon : FullscreenEnterIcon
            return (
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label={isCanvasFullscreen ? 'Exit fullscreen map editor' : 'Enter fullscreen map editor'}
                onClick={toggleCanvasFullscreen}
              >
                <FullscreenIcon width={22} height={22} aria-hidden="true" />
              </button>
            )
          })()}
          bottomCenterSlot={
            placementError ? (
              <p className="maplab-placement-error" role="status">
                {placementError}
              </p>
            ) : deletedFixture ? (
              <div className="maplab-placement-error" role="status">
                Deleted {deletedFixture}. <button type="button" aria-label="Undo deletion" onClick={undoDeletedFixture}>Undo</button>
              </div>
            ) : removedEmptyRoom ? (
              <div className="maplab-placement-error" role="status">
                Removed empty room. <button type="button" aria-label="Undo removal" onClick={undoRemovedEmptyRoom}>Undo</button>
              </div>
            ) : null
          }
          controlsSlot={
            <>
              <div className="maplab-history-cluster">
                <button
                  type="button"
                  className="maplab-pill-button maplab-history-button"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-history-button"
                  onClick={redo}
                  disabled={!canRedo}
                >
                  Redo
                </button>
              </div>
              <button
                type="button"
                className="maplab-pill-button maplab-zoom-button"
                aria-label="Fit map to viewport"
                onClick={() => {
                  const result = zoomApi.fitToBounds(roomBounds, viewportSize, bounds)
                  setPlacementError(
                    result.clampedToMin
                      ? 'This floor is too large to fit on screen. Zoom out further isn\'t possible; pan to see the rest.'
                      : null
                  )
                }}
              >
                <FitIcon width={22} height={22} aria-hidden="true" />
              </button>
              <div className="maplab-zoom-cluster">
                <button
                  type="button"
                  className="maplab-pill-button maplab-zoom-button"
                  aria-label="Zoom in"
                  onClick={() => zoomApi.zoomIn(viewportSize)}
                >
                  <ZoomInIcon width={22} height={22} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="maplab-pill-button maplab-zoom-button"
                  aria-label="Zoom out"
                  onClick={() => zoomApi.zoomOut(viewportSize)}
                >
                  <ZoomOutIcon width={22} height={22} aria-hidden="true" />
                </button>
              </div>
            </>
          }
        >
          <defs>
            <pattern id="feature-river-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
              <rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-river-fill)" />
              <line x1={0} y1={CELL_SIZE * 0.35} x2={CELL_SIZE} y2={CELL_SIZE * 0.35} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={0} y1={CELL_SIZE * 0.65} x2={CELL_SIZE} y2={CELL_SIZE * 0.65} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" />
            </pattern>
            <pattern id="feature-trees-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
              <rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-trees-fill)" />
              <circle cx={CELL_SIZE * 0.25} cy={CELL_SIZE * 0.3} r={3} fill="var(--md-nature)" opacity={0.55} />
              <circle cx={CELL_SIZE * 0.7} cy={CELL_SIZE * 0.45} r={2.5} fill="var(--md-nature)" opacity={0.45} />
              <circle cx={CELL_SIZE * 0.4} cy={CELL_SIZE * 0.7} r={3.5} fill="var(--md-nature)" opacity={0.4} />
              <circle cx={CELL_SIZE * 0.75} cy={CELL_SIZE * 0.75} r={2} fill="var(--md-nature)" opacity={0.55} />
            </pattern>
          </defs>

          {layerVisible.outside && (
            <rect
            className="maplab-unknown-space"
            x={bounds.minX * CELL_SIZE}
            y={bounds.minY * CELL_SIZE}
            width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE}
            height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE}
            fill="var(--maplab-outside-fill)"
            onClick={() => {
              if (drawFeatureKind || placeDoorMode || placePropMode || placeStairMode || placePortalMode) return
              if (state.selectedRoomId !== null) return
            }}
          />
          )}

          {showGhostFloor && ghostZ !== null && (
            <GhostFloorLayer rooms={ghostRooms} doors={ghostDoors} props={ghostProps} features={ghostFeatures} cellSize={CELL_SIZE} />
          )}

          {layerVisible.outside && featuresOnActiveFloor.map((feature) => (
            <g
              key={feature.feature_id}
              className="maplab-feature"
              data-feature-kind={feature.kind}
              data-selected={feature.feature_id === state.selectedFeatureId || undefined}
              role="button"
              tabIndex={0}
              aria-pressed={feature.feature_id === state.selectedFeatureId}
              aria-label={feature.title ?? feature.kind}
              onClick={() => selectFeature(feature.feature_id === state.selectedFeatureId ? null : feature.feature_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  selectFeature(feature.feature_id === state.selectedFeatureId ? null : feature.feature_id)
                }
              }}
            >
              {feature.cells.map(([x, y]) => (
                <rect
                  key={`${x}-${y}`}
                  className="maplab-feature-cell"
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={`url(#feature-${feature.kind}-pattern)`}
                />
              ))}
            </g>
          ))}

          {roomsOnActiveFloor.filter((room) => !roomIsOffMap(room)).map((room) => (
            <g
              key={room.room_id}
              className="maplab-room"
              data-selected={room.room_id === state.selectedRoomId || undefined}
              role="button"
              tabIndex={0}
              aria-pressed={room.room_id === state.selectedRoomId}
              aria-label={room.title ?? `Room ${room.room_id}`}
              onClick={() => {
                const nextRoomId = room.room_id === state.selectedRoomId ? null : room.room_id
                selectRoom(nextRoomId)
                if (nextRoomId !== null) setArmedTool('room')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  const nextRoomId = room.room_id === state.selectedRoomId ? null : room.room_id
                  selectRoom(nextRoomId)
                  if (nextRoomId !== null) setArmedTool('room')
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
              {nonDoorWallSegments(room, doorsOnActiveFloor).map((edge) => {
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
              {layerVisible.labels && (() => {
                const anchor = roomLabelAnchor(room, CELL_SIZE)
                return (
                  <text className="maplab-room-title" x={anchor.x} y={anchor.y}>
                    {room.title ?? `Room ${room.room_id}`}
                  </text>
                )
              })()}
            </g>
          ))}

          {placeRoomMode && strokeCells.length > 0 && (
            <g className="maplab-room-brush-preview" aria-hidden="true">
              {strokeCells.map((cell) => {
                const [x, y] = cell
                const brushState = brushCellStateForCell(state.layout, state.activeZ, state.selectedRoomId, eraseArmed, cell)
                return (
                  <rect
                    key={`${x}-${y}`}
                    className="maplab-room-brush-cell"
                    data-brush-state={brushState}
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                  />
                )
              })}
            </g>
          )}

          {layerVisible.passages && doorsOnActiveFloor.map((door) => {
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
          {layerVisible.passages && (
            <g className="maplab-door-badge-layer" aria-hidden="true">
              {doorsOnActiveFloor.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} />)}
            </g>
          )}

          {layerVisible.passages && stairsOnActiveFloor.map((stair) => {
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
                simplified={simplified}
                onClick={() => selectStair(isSelected ? null : stair.stair_id)}
              />
            )
          })}

          {layerVisible.passages && portalsOnActiveFloor.map((portal) => {
            const { grouped, ...offset } = markerOffset(state.layout, state.activeZ, portal.cell, 'portal', portal.portal_id)
            return (
              <PortalMarker
                key={portal.portal_id}
                portal={portal}
                cellSize={CELL_SIZE}
                selected={portal.portal_id === state.selectedPortalId}
                offset={offset}
                grouped={grouped}
                simplified={simplified}
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
                      addProp([x, y], selectedPropKind)
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
                const isHorizontal = segment.y1 === segment.y2
                const hitBandDepth = 40
                const hitRect = isHorizontal
                  ? {
                      x: Math.min(segment.x1, segment.x2),
                      y: segment.y1 - hitBandDepth / 2,
                      width: Math.abs(segment.x2 - segment.x1),
                      height: hitBandDepth,
                    }
                  : {
                      x: segment.x1 - hitBandDepth / 2,
                      y: Math.min(segment.y1, segment.y2),
                      width: hitBandDepth,
                      height: Math.abs(segment.y2 - segment.y1),
                    }
                const handleDoorPlacement = (event: { stopPropagation: () => void }) => {
                  event.stopPropagation()
                  addDoor(edge.cell, edge.side as CardinalSide)
                  setArmedTool('select')
                }
                return (
                  <g key={edgeKey(edge)}>
                    <rect
                      className="maplab-door-placement-hitband"
                      x={hitRect.x}
                      y={hitRect.y}
                      width={hitRect.width}
                      height={hitRect.height}
                      role="button"
                      aria-label={`Place door at ${edge.cell[0]}, ${edge.cell[1]} ${edge.side}`}
                      onClick={handleDoorPlacement}
                    />
                    <line
                      className="maplab-door-placement-edge"
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                    />
                  </g>
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
                    }}
                  />
                ))
              )}
            </g>
          )}

          {drawFeatureKind && (
            <rect
              className="maplab-feature-stroke-overlay"
              x={bounds.minX * CELL_SIZE}
              y={bounds.minY * CELL_SIZE}
              width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE}
              height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE}
              fill="transparent"
              aria-hidden="true"
            />
          )}

          {/* Rendered after the paint/placement overlays so a prop marker always stays on top and
           * clickable — the room brush preview in particular can cover cells of the selected room
           * (including ones a prop sits on), and would otherwise swallow the prop's click/hover. */}
          {layerVisible.props && propsOnActiveFloor.map((prop) => {
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
                simplified={simplified}
                onClick={() => selectProp(prop.prop_id === state.selectedPropId ? null : prop.prop_id)}
              />
            )
          })}
        </MapCanvas>

        {selectionActions && (
          <aside
            className="maplab-inspector-rail maplab-selection-sheet"
            aria-label={`${selectedItemName} editor`}
            data-expanded={selectionSheetExpanded || undefined}
          >
            <div className="maplab-selection-sheet-peek">
              <strong>{selectedItemName}</strong>
              <button
                type="button"
                className="maplab-pill-button maplab-selection-sheet-toggle"
                aria-expanded={selectionSheetExpanded}
                aria-controls="maplab-selection-sheet-content"
                onClick={() => setSelectionSheetExpanded((expanded) => !expanded)}
              >
                {selectionSheetExpanded ? 'Collapse editor' : 'Edit'}
              </button>
              {selectionActions}
            </div>
            <div className="maplab-selection-sheet-content" id="maplab-selection-sheet-content">
          {selectedFeature ? (
            <>
              <InspectorPanel target={{ kind: 'feature', feature: selectedFeature }} />
              <div className="maplab-field-row">
                <label>Kind</label>
                <select
                  value={selectedFeature.kind}
                  onChange={(e) => updateFeatureMeta(selectedFeature.feature_id, { kind: e.target.value })}
                >
                  {FEATURE_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="maplab-field-row">
                <label>Title</label>
                <input
                  type="text"
                  value={selectedFeature.title ?? ''}
                  onChange={(e) => updateFeatureMeta(selectedFeature.feature_id, { title: e.target.value })}
                />
              </div>
            </>
          ) : selectedDoor ? (
            <>
              <InspectorPanel target={{ kind: 'door', door: selectedDoor }} />
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.door}
                values={selectedDoor as unknown as Record<string, unknown>}
                onChange={(key, value) => updateFixtureFlags(selectedDoor.door_id, 'door', { [key]: value })}
              />
            </>
          ) : selectedRoom ? (
            <>
              <RoomContentEditor
                key={selectedRoom.room_id}
                room={selectedRoom}
                dungeonRoom={selectedDungeonRoom}
                onUpdateRoomTitle={updateRoomTitle}
                onUpdateRoomWallKind={updateRoomWallKind}
                onUpdateRoomEntries={updateRoomEntries}
                onUpdateRoomNpcs={updateRoomNpcs}
                onCreateRoomData={createRoomData}
              />
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
            </>
          ) : selectedPortal ? (
            <>
              <InspectorPanel target={{ kind: 'portal', portal: selectedPortal }} />
              <FixturePropertiesForm
                spec={FIXTURE_TYPES.portal}
                values={selectedPortal as unknown as Record<string, unknown>}
                layout={state.layout}
                currentDungeonId={route.dungeonId ?? undefined}
                onChange={(key, value) => updateFixtureFlags(selectedPortal.portal_id, 'portal', { [key]: value })}
              />
              </>
            ) : null}
            </div>
          </aside>
        )}
      </div>

      {roomToDelete && (
        <ConfirmDialog
          message={`Delete "${roomToDelete.title ?? `Room ${roomToDelete.room_id}`}"? This cannot be undone.`}
          onConfirm={() => {
            deleteRoom(roomToDelete.room_id)
            setRoomToDelete(null)
          }}
          onCancel={() => setRoomToDelete(null)}
        />
      )}

      {gatewayToRemove && (
        <ConfirmDialog
          message={`Delete "${gatewayToRemove.title ?? `Portal ${gatewayToRemove.portal_id}`}"? This cannot be undone.`}
          onConfirm={() => {
            deleteFixtureWithUndo('portal', () => deletePortal(gatewayToRemove.portal_id))
            setGatewayToRemove(null)
          }}
          onCancel={() => setGatewayToRemove(null)}
        />
      )}

      {confirmingReset && (
        <ConfirmDialog
          message="Discard unsaved changes and restore the last saved layout?"
          confirmLabel="Discard changes"
          onConfirm={() => {
            resetToLastLoadedLayout()
            setConfirmingReset(false)
            setMapPopoverOpen(false)
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  )
}
