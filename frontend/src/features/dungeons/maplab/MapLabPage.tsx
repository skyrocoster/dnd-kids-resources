import { useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import './MapLabPage.css'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { FloatingWindow } from '../../../components/FloatingWindow'
import { getAtTheTable, listDungeons, setAtTheTable } from '../../../api/client'
import { MapLabRouteState } from './MapLabRouteState'
import { useDungeonShellContext } from './dungeonRouteContext'
import { useMapLabLayout } from './useMapLabLayout'
import { useMapLabSessionState } from './useMapLabSessionState'
import { useMapCanvasZoom, type ViewportSize } from '../../../map/useMapCanvasZoom'
import { MapCanvas } from '../../../map/MapCanvas'
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, FitIcon, ZoomInIcon, ZoomOutIcon } from '../../../components/icons'
import { EncounterDock } from '../../encounters/EncounterDock'
import { NPCStatCard } from '../../npcs/NPCStatCard'
import { StatePanel } from '../../../components/StatePanel'
import { resolveMapDensity, AUTO_DENSITY_SIMPLE_THRESHOLD } from '../../../map/mapDensity'
import type { MapDensity } from '../../../map/mapDensity'
export { resolveMapDensity, AUTO_DENSITY_SIMPLE_THRESHOLD }
import { useNpc } from '../../npcs/useNpc'
import { parseDungeonData } from '../dungeonModel'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { StairMarker } from './StairMarker'
import { DoorBadgeLayer, DoorMarker } from './DoorMarker'
import { InspectorPanel, type SessionControls } from './InspectorPanel'
import { RoomDetailsPanel } from './RoomDetailsPanel'
import { useActiveRoom } from './useActiveRoom'
import { ViewerRoomRail } from './ViewerRoomRail'
import {
  absoluteCells,
  roomLabelAnchor,
  defaultPassageSession,
  doorsOnFloor,
  doorWallSegment,
  floorsInLayout,
  gridMarkerOffset,
  markersAtCell,
  nonDoorWallSegments,
  paddedBounds,
  otherFloorZ,
  portalsOnFloor,
  propsOnFloor,
  roomsOnZ,
  stairCellForZ,
  stairEndpointsForZ,
  type Inspectable,
  type MapCell,
  type MapDoor,
  type MapLayout,
  type MapPortal,
  type MapStair,
  type PassageSessionState,
} from '../../../model/maplabModel'

const CELL_SIZE = 64


/** Grid-layout offset for one marker among any others (stair/portal/on-square-prop) sharing its
 * exact `(z, cell)` — the I3 replacement for the stair-only `stairMarkerOffset`. */
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

type InspectableKind = Inspectable['kind']
interface InspectableRef {
  kind: InspectableKind
  id: number
}

const TOOLBAR_TRAY_STORAGE_PREFIX = 'dnd-kids-maplab-tray-collapsed:'

function readStoredTrayCollapsed(groupKey: string): boolean {
  try {
    return window.localStorage.getItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey) === 'true'
  } catch {
    return false
  }
}

/** Per-group toolbar-tray collapse (Design Phase J1, `docs/dungeon_plan.md`): each toolbar group
 * (Create/Session/View/Status) collapses independently rather than through one unified "compact
 * mode" switch, since a DM running combat wants Session/Status open while rarely touching Create.
 * `localStorage`-backed per `groupKey`, default expanded — same pattern as `docs/design_plan.md`
 * DP2's `useNavCollapse`, keyed per group instead of one global flag. */
export function useToolbarTrayCollapse(groupKey: string): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStoredTrayCollapsed(groupKey))

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey, String(next))
      } catch {
        // localStorage unavailable (e.g. private mode) — collapse state just won't persist
      }
      return next
    })
  }, [groupKey])

  return { collapsed, toggle }
}

export type MapLayerKey = 'outside' | 'props' | 'passages' | 'labels'

const LAYER_VISIBILITY_STORAGE_PREFIX = 'dnd-kids-maplab-layer-visible:'

const MAP_LAYER_KEYS: MapLayerKey[] = ['outside', 'props', 'passages', 'labels']

function readStoredLayerVisible(key: MapLayerKey): boolean {
  try {
    return window.localStorage.getItem(LAYER_VISIBILITY_STORAGE_PREFIX + key) !== 'false'
  } catch {
    return true
  }
}

/** Tracks visibility of the four map layers — Outside, Props, Passages, Labels — defaulting all
 * to visible (absence of a stored value ≠ `'false'`), persisted per-key in `localStorage`. Same
 * try/catch-and-ignore pattern as `useToolbarTrayCollapse`, inverted default. */
export function useMapLayerVisibility(): {
  visible: Record<MapLayerKey, boolean>
  toggleLayer: (key: MapLayerKey) => void
} {
  const [visible, setVisible] = useState<Record<MapLayerKey, boolean>>(() => {
    const initial = {} as Record<MapLayerKey, boolean>
    for (const key of MAP_LAYER_KEYS) {
      initial[key] = readStoredLayerVisible(key)
    }
    return initial
  })

  const toggleLayer = useCallback((key: MapLayerKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        window.localStorage.setItem(LAYER_VISIBILITY_STORAGE_PREFIX + key, String(next[key]))
      } catch {
        // localStorage unavailable (e.g. private mode) — visibility state just won't persist
      }
      return next
    })
  }, [])

  return { visible, toggleLayer }
}

const DENSITY_STORAGE_KEY = 'dnd-kids-maplab-density'

function readStoredDensity(): MapDensity {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    if (stored === 'detailed' || stored === 'auto' || stored === 'simple') return stored
  } catch {
    // localStorage unavailable — use default
  }
  return 'auto'
}

/** Persisted density preference for the whole dungeon canvas — `Detailed` / `Auto` / `Simple`.
 *  Same try/catch-and-ignore pattern as `useMapLayerVisibility`. */
export function useMapDensity(): {
  density: MapDensity
  setDensity: (value: MapDensity) => void
} {
  const [density, setDensity] = useState<MapDensity>(() => readStoredDensity())

  const updateDensity = useCallback((value: MapDensity) => {
    setDensity(value)
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, value)
    } catch {
      // localStorage unavailable — density state just won't persist
    }
  }, [])

  return { density, setDensity: updateDensity }
}

/** A collapsible toolbar group: label + chevron toggle always visible (so the group structure
 * stays legible collapsed), controls hidden via width/overflow (never `display:none`) when
 * collapsed. Shared by `MapLabPage`'s Session group and `MapLabEditorPage`'s Create/Session/View/
 * Status groups — the reusable half of J1's per-group collapse. */
export function ToolbarTray({
  groupKey,
  label,
  extraClassName,
  children,
}: {
  groupKey: string
  label: string
  extraClassName?: string
  children: ReactNode
}) {
  const { collapsed, toggle } = useToolbarTrayCollapse(groupKey)
  const ChevronIcon = collapsed ? ChevronDownIcon : ChevronUpIcon
  return (
    <div
      className={`maplab-toolbar-group maplab-toolbar-tray${extraClassName ? ` ${extraClassName}` : ''}`}
      data-collapsed={collapsed || undefined}
    >
      <span className="maplab-toolbar-group-label">{label}</span>
      <button
        type="button"
        className="maplab-toolbar-tray-toggle"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label} tools`}
        onClick={toggle}
      >
        <ChevronIcon width={14} height={14} aria-hidden="true" />
      </button>
      <div className="maplab-toolbar-tray-controls">{children}</div>
    </div>
  )
}

/** Map Lab prototype page — Stage M2.3: walls, and door/stair affordances with state + details. */
export function MapLabPage() {
  const route = useDungeonShellContext()
  const navigate = useNavigate()
  const [otherDungeonTitles, setOtherDungeonTitles] = useState<Record<number, string>>({})
  const { layout, loading: layoutLoading, status: layoutStatus, error: layoutError } = useMapLabLayout(route.dungeonId)
  const [parsed, setParsed] = useState(() => parseDungeonData(route.dungeon?.data ?? {}))
  const floors = useMemo(() => floorsInLayout(layout), [layout])
  const [activeZ, setActiveZ] = useState<number>(floors[0]?.z ?? 0)
  const [hoveredInspectable, setHoveredInspectable] = useState<InspectableRef | null>(null)
  const [focusedInspectable, setFocusedInspectable] = useState<InspectableRef | null>(null)
  const [pinnedDoorId, setPinnedDoorId] = useState<number | null>(null)
  const {
    doorSessions,
    setDoorSessions,
    stairSessions,
    setStairSessions,
    portalSessions,
    setPortalSessions,
    setPartyRoomId,
    resetSessions,
    actionError,
    clearActionError,
  } = useMapLabSessionState(route.dungeonId)
  const [resetDungeonConfirmOpen, setResetDungeonConfirmOpen] = useState(false)
  const [atTableDungeonId, setAtTableDungeonId] = useState<number | null>(null)
  const [atTablePending, setAtTablePending] = useState(false)
  const [atTableError, setAtTableError] = useState<string | null>(null)
  const [partyRoomActionActive, setPartyRoomActionActive] = useState(false)
  const [activeEncounterId, setActiveEncounterId] = useState<number | null>(null)
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null)
  const zoomApi = useMapCanvasZoom()
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), [])
  const { visible: layerVisible, toggleLayer } = useMapLayerVisibility()
  const { density, setDensity } = useMapDensity()
  const [viewPopoverOpen, setViewPopoverOpen] = useState(false)
  const viewPopoverRef = useRef<HTMLDivElement>(null)
  const [roomsDrawerOpen, setRoomsDrawerOpen] = useState(false)
  const [desktopRailCollapsed, setDesktopRailCollapsed] = useState(false)
  const simplified = resolveMapDensity(density, zoomApi.zoom.scale) === 'simple'
  const allLayersHidden = MAP_LAYER_KEYS.every((key) => !layerVisible[key])

  useEffect(() => {
    setParsed(parseDungeonData(route.dungeon?.data ?? {}))
  }, [route.dungeon?.data])

  useEffect(() => {
    listDungeons()
      .then((dungeons) => setOtherDungeonTitles(Object.fromEntries(dungeons.map((d) => [d.id, d.title]))))
      .catch(() => setOtherDungeonTitles({}))
  }, [])

  useEffect(() => {
    getAtTheTable()
      .then((response) => setAtTableDungeonId(response.dungeon_id))
      .catch(() => setAtTableDungeonId(null))
  }, [])

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
    if (!viewPopoverOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewPopoverOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [viewPopoverOpen])

  useEffect(() => {
    if (!roomsDrawerOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRoomsDrawerOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [roomsDrawerOpen])

  const isAtTable = route.dungeonId !== null && atTableDungeonId === route.dungeonId
  const viewerError = (partyRoomActionActive ? null : actionError) ?? atTableError

  function clearViewerStatus() {
    clearActionError()
    setAtTableError(null)
    setPartyRoomActionActive(false)
  }

  async function putThisDungeonAtTheTable() {
    if (route.dungeonId === null) return
    clearViewerStatus()
    setAtTablePending(true)
    try {
      const response = await setAtTheTable({ dungeon_id: route.dungeonId })
      setAtTableDungeonId(response.dungeon_id)
    } catch {
      setAtTableError("Couldn't put this map at the table. Try again.")
    } finally {
      setAtTablePending(false)
    }
  }

  useEffect(() => {
    if (floors.length === 0) return
    if (!floors.some((floor) => floor.z === activeZ)) {
      setActiveZ(floors[0].z)
    }
  }, [activeZ, floors])

  const rooms = useMemo(() => roomsOnZ(layout, activeZ), [layout, activeZ])
  const stairs = useMemo(() => stairEndpointsForZ(layout, activeZ), [layout, activeZ])
  const doors = useMemo(() => doorsOnFloor(layout, activeZ), [layout, activeZ])
  const props = useMemo(() => propsOnFloor(layout, activeZ), [layout, activeZ])
  const portals = useMemo(() => portalsOnFloor(layout, activeZ), [layout, activeZ])
  const features = useMemo(() => layout.features.filter((f) => f.z === activeZ), [layout, activeZ])

  // Bounds computed over every room, not just the active floor, so the viewBox stays
  // aligned across floor switches — proving shared coordinate space across z. Padded by
  // meta.padding on every side: the margin of visible "unknown space" around authored content.
  const bounds = useMemo(() => paddedBounds(layout), [layout])
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${
    (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  } ${(bounds.maxY - bounds.minY + 1) * CELL_SIZE}`

  // Scale ruler: one cell, ticked at both ends, sits in the padding band above the rooms.
  const rulerX1 = (bounds.minX + 1) * CELL_SIZE
  const rulerX2 = rulerX1 + CELL_SIZE
  const rulerY = (bounds.minY + 1.5) * CELL_SIZE
  const rulerTick = CELL_SIZE * 0.12

  const {
    activeRoomId,
    setActiveRoomId,
    activeLayoutRoom,
    activeDungeonRoom,
  } = useActiveRoom(layout, activeZ, parsed, setActiveZ)

  function togglePinnedDoor(doorId: number) {
    setPinnedDoorId((current) => (current === doorId ? null : doorId))
  }

  function doorSession(door: MapDoor): PassageSessionState {
    return doorSessions[door.door_id] ?? defaultPassageSession(door)
  }

  function stairSession(stair: MapStair): PassageSessionState {
    return stairSessions[stair.stair_id] ?? defaultPassageSession(stair)
  }

  function toggleDoorOpen(door: MapDoor) {
    clearViewerStatus()
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), isOpen: !doorSession(door).isOpen },
    }))
  }

  function toggleDoorLocked(door: MapDoor) {
    clearViewerStatus()
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), isLocked: !doorSession(door).isLocked },
    }))
  }

  function disarmDoorTrap(door: MapDoor) {
    clearViewerStatus()
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), trapDisarmed: true },
    }))
  }

  function toggleStairLocked(stair: MapStair) {
    clearViewerStatus()
    setStairSessions((current) => ({
      ...current,
      [stair.stair_id]: { ...stairSession(stair), isLocked: !stairSession(stair).isLocked },
    }))
  }

  function disarmStairTrap(stair: MapStair) {
    clearViewerStatus()
    setStairSessions((current) => ({
      ...current,
      [stair.stair_id]: { ...stairSession(stair), trapDisarmed: true },
    }))
  }

  function portalSession(portal: MapPortal): PassageSessionState {
    return portalSessions[portal.portal_id] ?? defaultPassageSession(portal)
  }

  function togglePortalLocked(portal: MapPortal) {
    clearViewerStatus()
    setPortalSessions((current) => ({
      ...current,
      [portal.portal_id]: { ...portalSession(portal), isLocked: !portalSession(portal).isLocked },
    }))
  }

  function disarmPortalTrap(portal: MapPortal) {
    clearViewerStatus()
    setPortalSessions((current) => ({
      ...current,
      [portal.portal_id]: { ...portalSession(portal), trapDisarmed: true },
    }))
  }

  const activeFloor = floors.find((floor) => floor.z === activeZ)

  if (route.status === 'loading' || layoutLoading) {
    return <MapLabRouteState title="Loading map" message="Loading dungeon map…" variant="loading" />
  }

  if (layoutStatus === 'error') {
    return (
      <MapLabRouteState
        title={route.dungeon?.title ?? 'Dungeon layout unavailable'}
        message={layoutError?.message ?? 'Failed to load dungeon layout.'}
        variant="error"
      />
    )
  }

  const activeRef: InspectableRef | null =
    focusedInspectable ?? (pinnedDoorId !== null ? { kind: 'door', id: pinnedDoorId } : null) ?? hoveredInspectable

  let activeInspectable: Inspectable | null = null
  let activeControls: SessionControls | undefined
  if (activeRef?.kind === 'door') {
    const door = layout.doors.find((d) => d.door_id === activeRef.id)
    if (door) {
      activeInspectable = { kind: 'door', door, session: doorSession(door) }
      activeControls = {
        onToggleOpen: () => toggleDoorOpen(door),
        onToggleLocked: () => toggleDoorLocked(door),
        onDisarmTrap: door.trapped ? () => disarmDoorTrap(door) : undefined,
      }
    }
  } else if (activeRef?.kind === 'stair') {
    const stair = layout.stairs.find((s) => s.stair_id === activeRef.id)
    if (stair) {
      activeInspectable = { kind: 'stair', stair, session: stairSession(stair) }
      activeControls = {
        onToggleLocked: () => toggleStairLocked(stair),
        onDisarmTrap: stair.trapped ? () => disarmStairTrap(stair) : undefined,
      }
    }
  } else if (activeRef?.kind === 'room') {
    const room = layout.rooms.find((r) => r.room_id === activeRef.id)
    if (room) activeInspectable = { kind: 'room', room }
  } else if (activeRef?.kind === 'prop') {
    const prop = layout.props.find((p) => p.prop_id === activeRef.id)
    if (prop) activeInspectable = { kind: 'prop', prop }
  } else if (activeRef?.kind === 'portal') {
    const portal = layout.portals.find((p) => p.portal_id === activeRef.id)
    if (portal) {
      activeInspectable = { kind: 'portal', portal, session: portalSession(portal) }
      activeControls = {
        onToggleLocked: () => togglePortalLocked(portal),
        onDisarmTrap: portal.trapped ? () => disarmPortalTrap(portal) : undefined,
      }
    }
  }

  return (
    <div className="maplab-page">
      {layoutStatus === 'empty' && (
        <p className="maplab-subtitle">No saved layout yet. This dungeon is starting from a blank map.</p>
      )}

      <div className="maplab-toolbar">
        <ToolbarTray groupKey="viewer-session" label="Session">
          <button
            type="button"
            className="maplab-pill-button maplab-session-reset-button"
            onClick={() => setResetDungeonConfirmOpen(true)}
          >
            Reset dungeon
          </button>
          <button
            type="button"
            className="maplab-pill-button maplab-at-table-button"
            aria-pressed={isAtTable}
            data-active={isAtTable || undefined}
            disabled={atTablePending || isAtTable}
            onClick={putThisDungeonAtTheTable}
          >
            {isAtTable ? 'At the table' : 'Put at the table'}
          </button>
        </ToolbarTray>
        <div className="maplab-view-popover-wrap" ref={viewPopoverRef}>
          <button
            type="button"
            className="maplab-pill-button"
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
        <div className="maplab-floor-tabs" role="tablist" aria-label="Dungeon floors">
          {floors.map((floor) => (
            <button
              key={floor.z}
              type="button"
              role="tab"
              className="maplab-pill-button maplab-floor-tab"
              aria-selected={floor.z === activeZ}
              onClick={() => setActiveZ(floor.z)}
            >
              {floor.title ?? `Floor ${floor.z}`}
            </button>
          ))}
        </div>
      </div>

      <div className="maplab-canvas">
        <button
          type="button"
          className="maplab-pill-button maplab-viewer-rail-toggle"
          aria-label="Open room navigation"
          aria-expanded={roomsDrawerOpen}
          aria-controls="maplab-viewer-room-rail"
          onClick={() => setRoomsDrawerOpen((open) => !open)}
        >
          Rooms
        </button>
        <div
          id="maplab-viewer-room-rail"
          className="maplab-viewer-rail-container"
          data-open={roomsDrawerOpen || undefined}
          data-collapsed={desktopRailCollapsed || undefined}
        >
          <ViewerRoomRail
            layout={layout}
            parsed={parsed}
            activeRoomId={activeRoomId}
            onSelectRoom={(id) => {
              setActiveRoomId(id)
              setRoomsDrawerOpen(false)
            }}
          />
        </div>
        <button
          type="button"
          className="maplab-viewer-rail-seam"
          aria-label={desktopRailCollapsed ? 'Show room rail' : 'Hide room rail'}
          aria-expanded={!desktopRailCollapsed}
          aria-controls="maplab-viewer-room-rail"
          onClick={() => setDesktopRailCollapsed((c) => !c)}
        />
        <button
          type="button"
          className="maplab-viewer-rail-backdrop"
          aria-label="Close room navigation"
          tabIndex={roomsDrawerOpen ? 0 : -1}
          onClick={() => setRoomsDrawerOpen(false)}
        />

        <div className="maplab-canvas-area">
          {allLayersHidden ? (
            <p className="maplab-canvas-filtered-empty">All layers are hidden. Turn one on to see the map.</p>
          ) : (
          <MapCanvas
            viewBox={viewBox}
            bounds={bounds}
            zoom={zoomApi.zoom}
            ariaLabel={`Dungeon floor map — ${activeFloor?.title ?? `Floor ${activeZ}`}`}
            variant="neutral"
            onWheelZoom={zoomApi.handleWheel}
            onPanStart={zoomApi.handlePointerDown}
            onPanMove={zoomApi.handlePointerMove}
            onPanEnd={zoomApi.handlePointerUp}
            onViewportResize={handleViewportResize}
            panHint="Drag to pan. Pinch or scroll to zoom."
            bottomCenterSlot={
              viewerError ? (
                <p className="maplab-viewer-status" role="status">{viewerError}</p>
              ) : null
            }
            controlsSlot={
              <>
                <button
                  type="button"
                  className="maplab-pill-button maplab-zoom-button"
                  aria-label="Fit map to viewport"
                  onClick={() => zoomApi.fitToBounds(bounds, viewportSize, bounds)}
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
            />
          )}

          {layerVisible.outside && features.map((feature) => (
            <g key={feature.feature_id} className="maplab-feature" data-feature-kind={feature.kind}>
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

          <g className="maplab-scale-ruler">
            <line x1={rulerX1} y1={rulerY} x2={rulerX2} y2={rulerY} />
            <line x1={rulerX1} y1={rulerY - rulerTick} x2={rulerX1} y2={rulerY + rulerTick} />
            <line x1={rulerX2} y1={rulerY - rulerTick} x2={rulerX2} y2={rulerY + rulerTick} />
            <text x={(rulerX1 + rulerX2) / 2} y={rulerY - rulerTick - 6} textAnchor="middle">
              1 square = 5 ft
            </text>
          </g>

          {rooms.map((room) => {
            const isSelected = room.room_id === activeRoomId
            const center = roomLabelAnchor(room, CELL_SIZE)
            return (
              <g
                key={room.room_id}
                className="maplab-room"
                data-selected={isSelected || undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={room.title ?? `Room ${room.room_id}`}
                onClick={() => setActiveRoomId(room.room_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveRoomId(room.room_id)
                  }
                }}
                onMouseEnter={() => setHoveredInspectable({ kind: 'room', id: room.room_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => {
                  setFocusedInspectable({ kind: 'room', id: room.room_id })
                  setActiveRoomId(room.room_id)
                }}
                onBlur={() => setFocusedInspectable(null)}
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
                {nonDoorWallSegments(room, doors).map((edge) => {
                  const segment = doorWallSegment(edge, CELL_SIZE)
                  return (
                    <line
                      key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`}
                      className="maplab-wall"
                      data-wall-kind={room.wallKind ?? 'solid'}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                    />
                  )
                })}
                {layerVisible.labels && (
                  <text className="maplab-room-title" x={center.x} y={center.y}>
                    {room.title ?? `Room ${room.room_id}`}
                  </text>
                )}
              </g>
            )
          })}

          {layerVisible.passages && doors.map((door) => {
            const isPinned = pinnedDoorId === door.door_id
            return (
              <DoorMarker
                key={door.door_id}
                door={door}
                cellSize={CELL_SIZE}
                session={doorSession(door)}
                selected={isPinned}
                onMouseEnter={() => setHoveredInspectable({ kind: 'door', id: door.door_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'door', id: door.door_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => togglePinnedDoor(door.door_id)}
              />
            )
          })}
          {layerVisible.passages && (
            <g className="maplab-door-badge-layer" aria-hidden="true">
              {doors.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} session={doorSession(door)} />)}
            </g>
          )}

          {layerVisible.passages && stairs.map((stair) => {
            const cell = stairCellForZ(stair, activeZ)
            if (!cell) return null
            const session = stairSession(stair)
            const { dx, dy, grouped } = markerOffset(layout, activeZ, cell, 'stair', stair.stair_id)
            const targetZ = otherFloorZ(stair, activeZ)
            return (
              <StairMarker
                key={stair.stair_id}
                stair={stair}
                cellSize={CELL_SIZE}
                cell={cell}
                activeZ={activeZ}
                session={session}
                trapDisarmed={stair.trapped && session.trapDisarmed}
                offset={{ dx, dy }}
                grouped={grouped}
                simplified={simplified}
                destinationLabel={`go to floor ${targetZ}`}
                onMouseEnter={() => setHoveredInspectable({ kind: 'stair', id: stair.stair_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'stair', id: stair.stair_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => setActiveZ(targetZ)}
              />
            )
          })}

          {layerVisible.passages && portals.map((portal) => {
            const { dx, dy, grouped } = markerOffset(layout, activeZ, portal.cell, 'portal', portal.portal_id)
            return (
              <PortalMarker
                key={portal.portal_id}
                portal={portal}
                cellSize={CELL_SIZE}
                session={portalSession(portal)}
                offset={{ dx, dy }}
                grouped={grouped}
                simplified={simplified}
                onMouseEnter={() => setHoveredInspectable({ kind: 'portal', id: portal.portal_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'portal', id: portal.portal_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => {
                  if (portal.to?.dungeon_id !== undefined) {
                    navigate(`/dungeons/${portal.to.dungeon_id}`)
                  } else if (portal.to?.z !== undefined) {
                    setActiveZ(portal.to.z)
                  }
                }}
              />
            )
          })}

          {layerVisible.props && props.map((prop) => {
            const propOffset = prop.side === undefined ? markerOffset(layout, activeZ, prop.cell, 'prop', prop.prop_id) : undefined
            return (
              <PropMarker
                key={prop.prop_id}
                prop={prop}
                cellSize={CELL_SIZE}
                offset={propOffset}
                grouped={propOffset?.grouped}
                simplified={simplified}
                onMouseEnter={() => setHoveredInspectable({ kind: 'prop', id: prop.prop_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'prop', id: prop.prop_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={
                  prop.kind === 'encounter' && prop.encounter_id != null
                    ? () => setActiveEncounterId(prop.encounter_id as number)
                    : undefined
                }
              />
            )
          })}
          </MapCanvas>
          )}
        </div>

        <div className="maplab-sidebar">
          <div className="maplab-inspector-panel-container" aria-live="polite">
            {activeInspectable ? (
              <InspectorPanel
                target={activeInspectable}
                controls={activeControls}
                context={
                  activeInspectable.kind === 'portal' && activeInspectable.portal.to?.dungeon_id !== undefined
                    ? { dungeonTitle: otherDungeonTitles[activeInspectable.portal.to.dungeon_id] }
                    : undefined
                }
              />
            ) : (
              <p className="maplab-affordance-placeholder">Hover or focus a room, door, stair, or prop for details.</p>
            )}
          </div>
          <RoomDetailsPanel
            room={activeLayoutRoom}
            dungeonRoom={activeDungeonRoom}
            parsed={parsed}
            dungeonId={route.dungeonId ?? 0}
            layout={layout}
            onRunEncounter={setActiveEncounterId}
            onOpenNpc={setActiveNpcId}
            onPartyIsHere={() => {
              clearViewerStatus()
              setPartyRoomActionActive(true)
              setPartyRoomId(activeRoomId)
            }}
            actionError={partyRoomActionActive ? actionError : null}
            clearActionError={clearActionError}
          />
        </div>
      </div>

      {activeEncounterId != null && (
        <EncounterDock encounterId={activeEncounterId} onClose={() => setActiveEncounterId(null)} />
      )}
      {activeNpcId != null && <NpcDock npcId={activeNpcId} onClose={() => setActiveNpcId(null)} />}

      {resetDungeonConfirmOpen && (
        <ConfirmDialog
          message={`Reset "${route.dungeon?.title}"? Every door, trap, and toggle returns to its authored state. This cannot be undone.`}
          confirmLabel="Reset"
          onConfirm={() => {
            clearViewerStatus()
            resetSessions()
            setResetDungeonConfirmOpen(false)
          }}
          onCancel={() => setResetDungeonConfirmOpen(false)}
        />
      )}
    </div>
  )
}

function NpcDock({ npcId, onClose }: { npcId: number; onClose: () => void }) {
  const { npc, loading, error } = useNpc(npcId)

  return (
    <FloatingWindow
      title={loading ? 'Loading…' : npc?.name ?? `NPC #${npcId}`}
      storageKey="dungeon-npc-dock-position"
      onClose={onClose}
    >
      {loading && <StatePanel status="loading" message="Loading NPC…" />}
      {!loading && error && <StatePanel status="error" message={error} />}
      {!loading && npc && <NPCStatCard npc={npc} compact />}
    </FloatingWindow>
  )
}
