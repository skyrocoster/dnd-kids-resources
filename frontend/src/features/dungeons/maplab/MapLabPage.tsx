import { useCallback, useMemo, useState, type ReactNode } from 'react'
import './MapLabPage.css'
import { MAP_LAB_DUNGEON_ID } from '../../../api/client'
import { useMapLabLayout } from './useMapLabLayout'
import { useMapCanvasZoom, type ViewportSize } from './useMapCanvasZoom'
import { MapCanvas } from './MapCanvas'
import { ChevronDownIcon, ChevronUpIcon, FitIcon, TrapDisarmedIcon, ZoomInIcon, ZoomOutIcon } from '../../../components/icons'
import { EncounterDock } from '../../encounters/EncounterDock'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { InspectorPanel, type SessionControls } from './InspectorPanel'
import {
  absoluteCells,
  defaultPassageSession,
  doorPresentation,
  doorsOnFloor,
  doorSwingGeometry,
  doorWallSegment,
  floorsInLayout,
  GROUPED_MARKER_RADIUS_FRACTION,
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
  stairPresentation,
  type Inspectable,
  type MapCell,
  type MapDoor,
  type MapLayout,
  type MapPortal,
  type MapRoom,
  type MapStair,
  type PassageSessionState,
} from './maplabModel'

const CELL_SIZE = 64
const ICON_SIZE = 22
const GRID_PATTERN_ID = 'maplab-unknown-space-grid'

function roomCenter(room: MapRoom): { x: number; y: number } {
  const cells = absoluteCells(room)
  const sum = cells.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 },
  )
  return {
    x: ((sum.x / cells.length) + 0.5) * CELL_SIZE,
    y: ((sum.y / cells.length) + 0.5) * CELL_SIZE,
  }
}

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
  const { layout } = useMapLabLayout(MAP_LAB_DUNGEON_ID)
  const floors = useMemo(() => floorsInLayout(layout), [layout])
  const [activeZ, setActiveZ] = useState<number>(floors[0]?.z ?? 0)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [hoveredInspectable, setHoveredInspectable] = useState<InspectableRef | null>(null)
  const [focusedInspectable, setFocusedInspectable] = useState<InspectableRef | null>(null)
  const [pinnedDoorId, setPinnedDoorId] = useState<number | null>(null)
  const [doorSessions, setDoorSessions] = useState<Record<number, PassageSessionState>>({})
  const [stairSessions, setStairSessions] = useState<Record<number, PassageSessionState>>({})
  const [portalSessions, setPortalSessions] = useState<Record<number, PassageSessionState>>({})
  const [activeEncounterId, setActiveEncounterId] = useState<number | null>(null)
  const zoomApi = useMapCanvasZoom()
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 })
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), [])

  const rooms = useMemo(() => roomsOnZ(layout, activeZ), [layout, activeZ])
  const stairs = useMemo(() => stairEndpointsForZ(layout, activeZ), [layout, activeZ])
  const doors = useMemo(() => doorsOnFloor(layout, activeZ), [layout, activeZ])
  const props = useMemo(() => propsOnFloor(layout, activeZ), [layout, activeZ])
  const portals = useMemo(() => portalsOnFloor(layout, activeZ), [layout, activeZ])

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

  function toggleSelect(roomId: number) {
    setSelectedRoomId((current) => (current === roomId ? null : roomId))
  }

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
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), isOpen: !doorSession(door).isOpen },
    }))
  }

  function toggleDoorLocked(door: MapDoor) {
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), isLocked: !doorSession(door).isLocked },
    }))
  }

  function disarmDoorTrap(door: MapDoor) {
    setDoorSessions((current) => ({
      ...current,
      [door.door_id]: { ...doorSession(door), trapDisarmed: true },
    }))
  }

  function toggleStairLocked(stair: MapStair) {
    setStairSessions((current) => ({
      ...current,
      [stair.stair_id]: { ...stairSession(stair), isLocked: !stairSession(stair).isLocked },
    }))
  }

  function disarmStairTrap(stair: MapStair) {
    setStairSessions((current) => ({
      ...current,
      [stair.stair_id]: { ...stairSession(stair), trapDisarmed: true },
    }))
  }

  function portalSession(portal: MapPortal): PassageSessionState {
    return portalSessions[portal.portal_id] ?? defaultPassageSession(portal)
  }

  function togglePortalLocked(portal: MapPortal) {
    setPortalSessions((current) => ({
      ...current,
      [portal.portal_id]: { ...portalSession(portal), isLocked: !portalSession(portal).isLocked },
    }))
  }

  function disarmPortalTrap(portal: MapPortal) {
    setPortalSessions((current) => ({
      ...current,
      [portal.portal_id]: { ...portalSession(portal), trapDisarmed: true },
    }))
  }

  function resetSessions() {
    setDoorSessions({})
    setStairSessions({})
    setPortalSessions({})
  }

  const activeFloor = floors.find((floor) => floor.z === activeZ)

  const activeRef: InspectableRef | null =
    hoveredInspectable ?? focusedInspectable ?? (pinnedDoorId !== null ? { kind: 'door', id: pinnedDoorId } : null)

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
      <h1 className="maplab-title">Map Lab</h1>
      <p className="maplab-subtitle">Programmatic dungeon map prototype</p>

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

      <div className="maplab-toolbar">
        <ToolbarTray groupKey="viewer-session" label="Session">
          <button
            type="button"
            className="maplab-pill-button maplab-session-reset-button"
            onClick={resetSessions}
          >
            Reset session state
          </button>
        </ToolbarTray>
      </div>

      <div className="maplab-canvas">
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

          <g className="maplab-scale-ruler">
            <line x1={rulerX1} y1={rulerY} x2={rulerX2} y2={rulerY} />
            <line x1={rulerX1} y1={rulerY - rulerTick} x2={rulerX1} y2={rulerY + rulerTick} />
            <line x1={rulerX2} y1={rulerY - rulerTick} x2={rulerX2} y2={rulerY + rulerTick} />
            <text x={(rulerX1 + rulerX2) / 2} y={rulerY - rulerTick - 6} textAnchor="middle">
              1 square = 5 ft
            </text>
          </g>

          {rooms.map((room) => {
            const isSelected = room.room_id === selectedRoomId
            const center = roomCenter(room)
            return (
              <g
                key={room.room_id}
                className="maplab-room"
                data-selected={isSelected || undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={room.title ?? `Room ${room.room_id}`}
                onClick={() => toggleSelect(room.room_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleSelect(room.room_id)
                  }
                }}
                onMouseEnter={() => setHoveredInspectable({ kind: 'room', id: room.room_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'room', id: room.room_id })}
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
                {nonDoorWallSegments(room, layout.doors).map((edge) => {
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
                <text className="maplab-room-title" x={center.x} y={center.y}>
                  {room.title ?? `Room ${room.room_id}`}
                </text>
              </g>
            )
          })}

          {doors.map((door) => {
            const session = doorSession(door)
            const segment = doorWallSegment(door, CELL_SIZE)
            const swing = doorSwingGeometry(door, CELL_SIZE)
            const presentation = doorPresentation(door, session)
            const Icon = presentation.icon
            const midX = (segment.x1 + segment.x2) / 2
            const midY = (segment.y1 + segment.y2) / 2
            const isPinned = pinnedDoorId === door.door_id
            const openLabel = presentation.isOpen ? 'open' : 'closed'
            const disarmedLabel = door.trapped && session.trapDisarmed ? ' — trap disarmed' : ''
            const label = `${door.title ?? `Door ${door.door_id}`} — ${presentation.label}, ${openLabel}${disarmedLabel}`
            const dasharray = presentation.state === 'hidden' ? '6 4' : undefined
            return (
              <g
                key={door.door_id}
                className="maplab-door"
                data-state={presentation.state}
                role="button"
                tabIndex={0}
                aria-pressed={isPinned}
                aria-label={label}
                onMouseEnter={() => setHoveredInspectable({ kind: 'door', id: door.door_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'door', id: door.door_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => togglePinnedDoor(door.door_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    togglePinnedDoor(door.door_id)
                  }
                }}
              >
                <title>{door.title ?? `Door ${door.door_id}`}</title>
                {presentation.isOpen ? (
                  <>
                    {/* Leaf: hinge swung a quarter-turn off the wall — a door reads as a hinged
                        panel in a gap, never as a straight run that could be mistaken for a wall. */}
                    <line
                      className="maplab-door-leaf"
                      x1={swing.hinge.x}
                      y1={swing.hinge.y}
                      x2={swing.leafTip.x}
                      y2={swing.leafTip.y}
                      style={{ stroke: `var(${presentation.token})` }}
                      strokeDasharray={dasharray}
                    />
                    {/* Swing arc: the leaf's travel path back to the far jamb, the other half of
                        the same door-plan convention. */}
                    <path
                      className="maplab-door-swing"
                      d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
                      style={{ stroke: `var(${presentation.token})` }}
                    />
                  </>
                ) : (
                  // Closed: the leaf lies flush across the gap, same segment a plain wall would
                  // occupy — distinguished from `.maplab-wall` by its own bolder, door-toned stroke.
                  <line
                    className="maplab-door-leaf-closed"
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    style={{ stroke: `var(${presentation.token})` }}
                    strokeDasharray={dasharray}
                  />
                )}
                <g transform={`translate(${midX - ICON_SIZE / 2}, ${midY - ICON_SIZE / 2})`}>
                  <Icon
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    className="maplab-door-icon"
                    style={{ color: `var(${presentation.token})` }}
                  />
                </g>
                {door.trapped && session.trapDisarmed && (
                  <g transform={`translate(${midX + ICON_SIZE / 4}, ${midY + ICON_SIZE / 4})`}>
                    <TrapDisarmedIcon
                      width={14}
                      height={14}
                      className="maplab-trap-disarmed-badge"
                      aria-hidden="true"
                      style={{ color: 'var(--md-tertiary)' }}
                    />
                  </g>
                )}
              </g>
            )
          })}

          {stairs.map((stair) => {
            const cell = stairCellForZ(stair, activeZ)
            if (!cell) return null
            const session = stairSession(stair)
            const { dx, dy, grouped } = markerOffset(layout, activeZ, cell, 'stair', stair.stair_id)
            const [x, y] = cell
            const cx = (x + 0.5 + dx) * CELL_SIZE
            const cy = (y + 0.5 + dy) * CELL_SIZE
            const markerRadius = grouped ? CELL_SIZE * GROUPED_MARKER_RADIUS_FRACTION : CELL_SIZE * 0.32
            const markerIconSize = grouped ? CELL_SIZE * GROUPED_MARKER_RADIUS_FRACTION * 1.1 : ICON_SIZE
            const targetZ = otherFloorZ(stair, activeZ)
            const presentation = stairPresentation(stair, activeZ, session)
            const Icon = presentation.icon
            const disarmedLabel = stair.trapped && session.trapDisarmed ? ' — trap disarmed' : ''
            const label = `${stair.title ?? `Stair ${stair.stair_id}`} — ${presentation.label}${disarmedLabel} — go to floor ${targetZ}`
            return (
              <g
                key={stair.stair_id}
                className="maplab-stair"
                data-state={presentation.state}
                role="button"
                tabIndex={0}
                aria-label={label}
                onMouseEnter={() => setHoveredInspectable({ kind: 'stair', id: stair.stair_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'stair', id: stair.stair_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => setActiveZ(targetZ)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveZ(targetZ)
                  }
                }}
              >
                <title>{stair.title ?? `Stair ${stair.stair_id}`}</title>
                <circle
                  className="maplab-stair-marker"
                  cx={cx}
                  cy={cy}
                  r={markerRadius}
                  style={{ stroke: `var(${presentation.token})` }}
                />
                <g transform={`translate(${cx - markerIconSize / 2}, ${cy - markerIconSize / 2})`}>
                  <Icon
                    width={markerIconSize}
                    height={markerIconSize}
                    className="maplab-stair-icon"
                    style={{ color: `var(${presentation.token})` }}
                  />
                </g>
                {stair.trapped && session.trapDisarmed && (
                  <g transform={`translate(${cx + markerIconSize / 4}, ${cy + markerIconSize / 4})`}>
                    <TrapDisarmedIcon
                      width={14}
                      height={14}
                      className="maplab-trap-disarmed-badge"
                      aria-hidden="true"
                      style={{ color: 'var(--md-tertiary)' }}
                    />
                  </g>
                )}
              </g>
            )
          })}

          {portals.map((portal) => {
            const { dx, dy, grouped } = markerOffset(layout, activeZ, portal.cell, 'portal', portal.portal_id)
            return (
              <PortalMarker
                key={portal.portal_id}
                portal={portal}
                cellSize={CELL_SIZE}
                session={portalSession(portal)}
                offset={{ dx, dy }}
                grouped={grouped}
                onMouseEnter={() => setHoveredInspectable({ kind: 'portal', id: portal.portal_id })}
                onMouseLeave={() => setHoveredInspectable(null)}
                onFocus={() => setFocusedInspectable({ kind: 'portal', id: portal.portal_id })}
                onBlur={() => setFocusedInspectable(null)}
                onClick={() => setActiveZ(portal.to.z)}
              />
            )
          })}

          {props.map((prop) => {
            const propOffset = prop.side === undefined ? markerOffset(layout, activeZ, prop.cell, 'prop', prop.prop_id) : undefined
            return (
              <PropMarker
                key={prop.prop_id}
                prop={prop}
                cellSize={CELL_SIZE}
                offset={propOffset}
                grouped={propOffset?.grouped}
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

        <div className="maplab-inspector-panel-container" aria-live="polite">
          {activeInspectable ? (
            <InspectorPanel target={activeInspectable} controls={activeControls} />
          ) : (
            <p className="maplab-affordance-placeholder">Hover or focus a room, door, stair, or prop for details.</p>
          )}
        </div>
      </div>

      {activeEncounterId != null && (
        <EncounterDock encounterId={activeEncounterId} onClose={() => setActiveEncounterId(null)} />
      )}
    </div>
  )
}
