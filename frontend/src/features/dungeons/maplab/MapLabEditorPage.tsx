import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './MapLabPage.css'
import './MapLabEditor.css'
import { MapLabRouteState } from './MapLabRouteState'
import { useDungeonShellContext, useDungeonShellStatusSlot } from './dungeonRouteContext'
import { useMapLabEditor } from './useMapLabEditor'
import { listDungeons, listIncomingGateways } from '../../../api/client'
import type { Dungeon, IncomingGateway } from '../../../api/types'
import { useMapCanvasZoom, type ViewportSize } from '../../../map/useMapCanvasZoom'
import { useMapLabNavigationSession } from './useMapLabNavigationSession'
import { useCanvasStroke } from './useCanvasStroke'
import { MapLabEditorCanvas } from './MapLabEditorCanvas'
import { MapLabEditorChrome, MapLabEditorNavigation } from './MapLabEditorChrome'
import {
  DoorClosedIcon,
  FitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PortalIcon,
  StairsIcon,
  Trees,
  Waves,
  ZoomInIcon,
  ZoomOutIcon,
} from '../../../components/icons'
import { type ObstacleInspectorAdapter } from './InspectorPanel'
import { resolveMapDensity, useMapDensity, useMapLayerVisibility } from './MapLabToolbar'
import { PROP_KIND_OPTIONS } from './fixtureTypes'
import { SelectionActions } from './SelectionActions'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import {
  absoluteCells,
  canPaintCell,
  doorsOnFloor,
  ghostFloorZ,
  layoutBounds,
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
  defaultFixtureState,
  type FixtureState,
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


function cellKey(cell: MapCell): string {
  return `${cell[0]},${cell[1]}`
}

/** Authored FixtureState for a fixture — the DM Edit adapter's read side. Fixtures saved before
 * the nested state contract land without a `state` record, so a missing record falls back to the
 * authored defaults. */
function authoredFixtureState(fixture: { state?: FixtureState }): FixtureState {
  return fixture.state ?? defaultFixtureState()
}

type ObstacleKey = 'concealment' | 'lock' | 'trap'

/** Rebuild a fixture's authored FixtureState with one obstacle leaf overridden. The
 * `updateFixtureFlags` reducer merges top-level flags shallowly, so the full nested `state`
 * record is rebuilt here before dispatch rather than relying on a deep merge. */
function withObstacleLeaf(
  fixture: { state?: FixtureState },
  obstacle: ObstacleKey,
  leaf: { armed?: boolean; shown?: boolean },
): FixtureState {
  const state = authoredFixtureState(fixture)
  if (obstacle === 'concealment') {
    return {
      ...state,
      obstacles: { ...state.obstacles, concealment: { armed: leaf.armed ?? state.obstacles.concealment.armed } },
    }
  }
  if (obstacle === 'lock') {
    return {
      ...state,
      obstacles: {
        ...state.obstacles,
        lock: { armed: leaf.armed ?? state.obstacles.lock.armed, shown: leaf.shown ?? state.obstacles.lock.shown },
      },
    }
  }
  return {
    ...state,
    obstacles: {
      ...state.obstacles,
      trap: { armed: leaf.armed ?? state.obstacles.trap.armed, shown: leaf.shown ?? state.obstacles.trap.shown },
    },
  }
}

/** DM Edit's authored-state read/write adapter for the shared obstacle inspector. Every write
 * flows through the existing debounced layout-autosave reducer path (`updateFixtureFlags`), so
 * Open/Armed/Shown edits persist exactly like the descriptive title/note/loot edits. No
 * `onReset` — DM Edit has no session layer to reset. */
function authoredInspectorAdapter(
  fixture: { state?: FixtureState },
  fixtureType: 'door' | 'stair' | 'prop' | 'portal',
  fixtureId: number,
  updateFixtureFlags: (
    fixtureId: number,
    fixtureType: 'door' | 'stair' | 'prop' | 'portal',
    flags: Record<string, unknown>,
  ) => void,
): ObstacleInspectorAdapter {
  return {
    heading: 'Authored',
    onToggleOpen: (open) =>
      updateFixtureFlags(fixtureId, fixtureType, { state: { ...authoredFixtureState(fixture), open } }),
    onToggleArmed: (obstacle, armed) =>
      updateFixtureFlags(fixtureId, fixtureType, { state: withObstacleLeaf(fixture, obstacle, { armed }) }),
    onToggleShown: (obstacle, shown) =>
      updateFixtureFlags(fixtureId, fixtureType, { state: withObstacleLeaf(fixture, obstacle, { shown }) }),
  }
}

export function MapLabEditorPage() {
  const route = useDungeonShellContext()
  const navigation = useMapLabNavigationSession(route.dungeonId)
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
  const zoomApi = useMapCanvasZoom({ wheelZoomMode: 'always', pointerMode, initialZoom: navigation.state.zoom })
  // Restore the session's active floor only when the dungeon route key initializes or changes —
  // never on ordinary editor floor changes, which would deadlock against the write effect below.
  const navigationRouteKey = useRef<number | null>(null)
  const navigationRestorePending = useRef(false)
  useEffect(() => {
    if (route.dungeonId === null) {
      navigationRouteKey.current = null
      return
    }
    if (navigationRouteKey.current === route.dungeonId) return
    navigationRouteKey.current = route.dungeonId
    navigationRestorePending.current = true
    if (navigation.state.activeZ !== state.activeZ) setActiveZ(navigation.state.activeZ)
  }, [navigation.state.activeZ, route.dungeonId, setActiveZ, state.activeZ])
  useEffect(() => {
    if (navigationRestorePending.current) {
      navigationRestorePending.current = false
      return
    }
    navigation.setState((current) => ({ ...current, activeZ: state.activeZ, zoom: zoomApi.zoom }))
  }, [navigation.setState, state.activeZ, zoomApi.zoom])
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

  const lastCanvasSelection = useRef<{ kind: string; id: number; at: number } | null>(null)

  const centerSelection = useCallback((kind: string, id: number, force = false) => {
    const fixture = kind === 'room'
      ? state.layout.rooms.find((room) => room.room_id === id)
      : kind === 'door'
        ? state.layout.doors.find((door) => door.door_id === id)
        : kind === 'stair'
          ? state.layout.stairs.find((stair) => stair.stair_id === id)
          : kind === 'portal'
            ? state.layout.portals.find((portal) => portal.portal_id === id)
            : kind === 'prop'
              ? state.layout.props.find((prop) => prop.prop_id === id)
              : state.layout.features.find((feature) => feature.feature_id === id)
    const cell = fixture && 'cell' in fixture
      ? fixture.cell
      : fixture && 'origin' in fixture
        ? fixture.origin
        : fixture && 'from' in fixture
          ? (fixture.from.z === state.activeZ ? fixture.from.cell : fixture.to.cell)
          : fixture && 'cells' in fixture
            ? fixture.cells[0]
            : null
    if (cell) {
      const target = document.querySelector<SVGGElement>(
        `[data-maplab-target-kind="${kind}"][data-maplab-target-id="${id}"]`,
      )
      const viewport = target?.closest('.maplab-canvas-viewport')
      const elementRect = target?.getBoundingClientRect()
      const viewportRect = viewport?.getBoundingClientRect()
      const isVisible = Boolean(viewport && elementRect && viewportRect
        && elementRect.bottom >= viewportRect.top
        && elementRect.top <= viewportRect.bottom
        && elementRect.right >= viewportRect.left
        && elementRect.left <= viewportRect.right)
       if (force || !isVisible) {
         zoomApi.centerOn({ x: cell[0] - bounds.minX, y: cell[1] - bounds.minY }, viewportSize)
       }
      }
  }, [bounds.minX, bounds.minY, state.layout, state.activeZ, viewportSize, zoomApi.centerOn])

  const centerCanvasSelection = useCallback((kind: string, id: number) => {
    const now = Date.now()
    const previous = lastCanvasSelection.current
    const isDoubleClick = previous?.kind === kind && previous.id === id && now - previous.at < 400
    lastCanvasSelection.current = { kind, id, at: now }
    centerSelection(kind, id, isDoubleClick)
  }, [centerSelection])

  const selectFeatureForCanvas = useCallback((id: number | null) => {
    selectFeature(id)
     if (id !== null) centerCanvasSelection('feature', id)
  }, [centerCanvasSelection, selectFeature])
  const selectRoomForCanvas = useCallback((id: number | null) => {
    selectRoom(id)
     if (id !== null) centerCanvasSelection('room', id)
  }, [centerCanvasSelection, selectRoom])
  const selectRoomFromFinder = useCallback((roomId: number) => {
    const room = state.layout.rooms.find((candidate) => candidate.room_id === roomId)
    if (room && room.z !== state.activeZ) setActiveZ(room.z)
    selectRoom(roomId)
    if (room) centerSelection('room', roomId, true)
  }, [centerSelection, selectRoom, setActiveZ, state.activeZ, state.layout.rooms])
  const selectDoorForCanvas = useCallback((id: number | null) => {
    selectDoor(id)
     if (id !== null) centerCanvasSelection('door', id)
  }, [centerCanvasSelection, selectDoor])
  const selectStairForCanvas = useCallback((id: number | null) => {
    selectStair(id)
     if (id !== null) centerCanvasSelection('stair', id)
  }, [centerCanvasSelection, selectStair])
  const selectPortalForCanvas = useCallback((id: number | null) => {
    selectPortal(id)
     if (id !== null) centerCanvasSelection('portal', id)
  }, [centerCanvasSelection, selectPortal])
  const selectPropForCanvas = useCallback((id: number | null) => {
    selectProp(id)
     if (id !== null) centerCanvasSelection('prop', id)
  }, [centerCanvasSelection, selectProp])

  useEffect(() => {
    const target = navigation.state.selectedTarget
    if (!target) return
    if (target.kind === 'feature') selectFeature(target.id)
    else if (target.kind === 'room') selectRoom(target.id)
    else if (target.kind === 'door') selectDoor(target.id)
    else if (target.kind === 'stair') selectStair(target.id)
    else if (target.kind === 'portal') selectPortal(target.id)
    else if (target.kind === 'prop') selectProp(target.id)
  }, [navigation.state.selectedTarget, selectDoor, selectFeature, selectPortal, selectProp, selectRoom, selectStair])

  useEffect(() => {
    const target = navigation.state.focusTarget
    if (!target) return
    if (target.kind === 'feature') {
      selectFeature(target.id)
      centerSelection('feature', target.id)
    } else if (target.kind === 'room') {
      selectRoom(target.id)
      centerSelection('room', target.id)
    } else if (target.kind === 'door') {
      selectDoor(target.id)
      centerSelection('door', target.id)
    } else if (target.kind === 'stair') {
      selectStair(target.id)
      centerSelection('stair', target.id)
    } else if (target.kind === 'portal') {
      selectPortal(target.id)
      centerSelection('portal', target.id)
    } else if (target.kind === 'prop') {
      selectProp(target.id)
      centerSelection('prop', target.id)
    }
    navigation.setState((current) => current.focusTarget === target ? { ...current, focusTarget: null } : current)
  }, [centerSelection, navigation.state.focusTarget, navigation.setState, selectDoor, selectFeature, selectPortal, selectProp, selectRoom, selectStair])

  useEffect(() => {
    const selectedTarget = selectedFeature
      ? { kind: 'feature', id: selectedFeature.feature_id }
      : selectedRoom
        ? { kind: 'room', id: selectedRoom.room_id }
        : selectedDoor
          ? { kind: 'door', id: selectedDoor.door_id }
          : selectedProp
            ? { kind: 'prop', id: selectedProp.prop_id }
            : selectedStair
              ? { kind: 'stair', id: selectedStair.stair_id }
              : selectedPortal
                ? { kind: 'portal', id: selectedPortal.portal_id }
                : null
    navigation.setState((current) => ({ ...current, selectedTarget }))
  }, [navigation.setState, selectedDoor, selectedFeature, selectedPortal, selectedProp, selectedRoom, selectedStair])

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
        if (strokeCells.length > 0) {
          setStrokeCells([])
          strokeModeRef.current = null
          strokeRoomIdRef.current = null
        } else if (openFlyout !== null) {
          setOpenFlyout(null)
        } else if (mapPopoverOpen) {
          setMapPopoverOpen(false)
        } else if (viewPopoverOpen) {
          setViewPopoverOpen(false)
        } else if (selectionSheetExpanded) {
          setSelectionSheetExpanded(false)
        } else if (
          state.selectedRoomId !== null || state.selectedFeatureId !== null || state.selectedDoorId !== null ||
          state.selectedStairId !== null || state.selectedPortalId !== null || state.selectedPropId !== null
        ) {
          selectFeature(null)
          selectRoom(null)
          selectDoor(null)
          selectStair(null)
          selectPortal(null)
          selectProp(null)
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
  }, [brushArmed, mapPopoverOpen, openFlyout, redo, selectDoor, selectFeature, selectPortal, selectProp, selectRoom, selectStair, selectionSheetExpanded, state.selectedDoorId, state.selectedFeatureId, state.selectedPortalId, state.selectedPropId, state.selectedRoomId, state.selectedStairId, strokeCells.length, undo, viewPopoverOpen])

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

       <MapLabEditorChrome
         state={{ layout: state.layout, activeZ: state.activeZ, selectedRoomId: state.selectedRoomId }}
         lastPassageTool={lastPassageTool}
         lastTerrainTool={lastTerrainTool}
         openFlyout={openFlyout}
         setOpenFlyout={setOpenFlyout}
         setArmedTool={setArmedTool}
         setPlacementError={setPlacementError}
         brushArmed={brushArmed}
         eraseArmed={eraseArmed}
         setEraseArmed={setEraseArmed}
         selectedPropKind={selectedPropKind}
         flyoutFilter={flyoutFilter}
         setFlyoutFilter={setFlyoutFilter}
         passagesMenuRef={passagesMenuRef}
         terrainMenuRef={terrainMenuRef}
         propMenuRef={propMenuRef}
         passageToolOptions={passageToolOptions}
         propKindOptions={propKindOptions}
         terrainToolOptions={terrainToolOptions}
         activatePassageTool={activatePassageTool}
         activatePropKind={activatePropKind}
         activateTerrainTool={activateTerrainTool}
         activateTopFilteredTool={activateTopFilteredTool}
         layerVisible={layerVisible}
         toggleLayer={toggleLayer}
         viewPopoverOpen={viewPopoverOpen}
         setViewPopoverOpen={setViewPopoverOpen}
         viewPopoverRef={viewPopoverRef}
         mapPopoverOpen={mapPopoverOpen}
         setMapPopoverOpen={setMapPopoverOpen}
         mapPopoverRef={mapPopoverRef}
         showGhostFloor={showGhostFloor}
         setShowGhostFloor={setShowGhostFloor}
         ghostZ={ghostZ}
         density={density}
         setDensity={setDensity}
         updatePadding={updatePadding}
         setConfirmingReset={setConfirmingReset}
         statusSlot={statusSlot}
          armedTool={armedTool}
          floors={floors}
          hasFloorAbove={hasFloorAbove}
          hasFloorBelow={hasFloorBelow}
          addFloorAbove={addFloorAbove}
          addFloorBelow={addFloorBelow}
         passagesFlyoutRef={passagesFlyoutRef}
         terrainFlyoutRef={terrainFlyoutRef}
         propFlyoutRef={propFlyoutRef}
          setActiveZ={setActiveZ}
          parsed={dungeonData}
          onSelectRoom={selectRoomFromFinder}
          saveStatus={saveStatus}
          dungeons={dungeons}
          incomingGateways={incomingGateways}
          connectionsLoaded={connectionsLoaded}
          connectionsLoadError={connectionsLoadError}
          selectPortal={selectPortal}
          setGatewayToRemove={setGatewayToRemove}
          handleAddReturnGateway={handleAddReturnGateway}
       />

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
         <MapLabEditorNavigation
           selectRoom={selectRoom}
          setArmedTool={setArmedTool}
          setPlacementError={setPlacementError}
         />
        <MapLabEditorCanvas
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
           state={state}
           layerVisible={layerVisible}
           showGhostFloor={showGhostFloor}
           ghostZ={ghostZ}
           ghostRooms={ghostRooms}
           ghostDoors={ghostDoors}
           ghostProps={ghostProps}
           ghostFeatures={ghostFeatures}
           featuresOnActiveFloor={featuresOnActiveFloor}
           roomsOnActiveFloor={roomsOnActiveFloor}
           doorsOnActiveFloor={doorsOnActiveFloor}
           stairsOnActiveFloor={stairsOnActiveFloor}
           portalsOnActiveFloor={portalsOnActiveFloor}
           propsOnActiveFloor={propsOnActiveFloor}
           placementEdges={placementEdges}
           strokeCells={strokeCells}
           placeRoomMode={placeRoomMode}
           eraseArmed={eraseArmed}
           placePropMode={placePropMode}
           placeDoorMode={placeDoorMode}
           placeStairMode={placeStairMode}
           placePortalMode={placePortalMode}
           drawFeatureKind={drawFeatureKind}
           simplified={simplified}
           selectedPropKind={selectedPropKind}
            selectFeature={selectFeatureForCanvas}
            selectRoom={selectRoomForCanvas}
            selectDoor={selectDoorForCanvas}
            selectStair={selectStairForCanvas}
             selectPortal={selectPortalForCanvas}
             selectProp={selectPropForCanvas}
             selectRoomContextually={selectRoom}
             selectDoorContextually={selectDoor}
             selectStairContextually={selectStair}
             selectPortalContextually={selectPortal}
             selectPropContextually={selectProp}
           addProp={addProp}
           addDoor={addDoor}
           addStair={addStair}
           addPortal={addPortal}
           setArmedTool={setArmedTool}
           setPlacementError={setPlacementError}
           brushCellStateForCell={brushCellStateForCell}
        />

        <MapLabEditorSelection
          selectionActions={selectionActions}
          selectedItemName={selectedItemName}
          selectionSheetExpanded={selectionSheetExpanded}
          onToggleExpanded={() => setSelectionSheetExpanded((expanded) => !expanded)}
          selectedFeature={selectedFeature}
          selectedDoor={selectedDoor}
          selectedRoom={selectedRoom}
          selectedDungeonRoom={selectedDungeonRoom}
          selectedProp={selectedProp}
          selectedStair={selectedStair}
          selectedStairCell={selectedStairCell}
          selectedPortal={selectedPortal}
          stairUpFloor={stairUpFloor}
          stairDownFloor={stairDownFloor}
          hasStairInDirection={hasStairInDirection}
          activeZ={state.activeZ}
          routeDungeonId={route.dungeonId ?? undefined}
          layout={state.layout}
          updateFeatureMeta={updateFeatureMeta}
          updateFixtureFlags={updateFixtureFlags}
          updateRoomTitle={updateRoomTitle}
          updateRoomWallKind={updateRoomWallKind}
          updateRoomEntries={updateRoomEntries}
          updateRoomNpcs={updateRoomNpcs}
          createRoomData={createRoomData}
          setStairDirection={setStairDirection}
          authoredInspectorAdapter={authoredInspectorAdapter}
          featureKindOptions={FEATURE_KIND_OPTIONS}
        />
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
import { MapLabEditorSelection } from './MapLabEditorSelection'
