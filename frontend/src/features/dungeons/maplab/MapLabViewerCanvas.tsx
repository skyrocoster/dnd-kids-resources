import type { ComponentProps } from 'react'
import { MapCanvas } from '../../../map/MapCanvas'
import { FitIcon, ZoomInIcon, ZoomOutIcon } from '../../../components/icons'
import { DoorBadgeLayer, DoorMarker } from './DoorMarker'
import { PortalMarker } from './PortalMarker'
import { PropMarker } from './PropMarker'
import { StairMarker } from './StairMarker'
import { ViewerRoomRail } from './ViewerRoomRail'
import {
  absoluteCells,
  doorWallSegment,
  gridMarkerOffset,
  markersAtCell,
  nonDoorWallSegments,
  otherFloorZ,
  roomLabelAnchor,
  stairCellForZ,
  type Inspectable,
  type MapCell,
  type MapDoor,
  type MapLayout,
  type MapPortal,
  type MapProp,
  type MapStair,
  type SessionFixtureState,
} from '../../../model/maplabModel'
import type { ViewportSize } from '../../../map/useMapCanvasZoom'

const CELL_SIZE = 64

type InspectableRef = { kind: Inspectable['kind']; id: number }

interface Props {
  layout: MapLayout
  parsed: ReturnType<typeof import('../dungeonModel').parseDungeonData>
  activeZ: number
  activeRoomId: number | null
  partyRoomId: number | null
  rooms: MapLayout['rooms']
  doors: MapDoor[]
  stairs: MapStair[]
  portals: MapPortal[]
  props: MapProp[]
  features: MapLayout['features']
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  viewBox: string
  rulerX1: number
  rulerX2: number
  rulerY: number
  rulerTick: number
  layerVisible: Record<'outside' | 'labels' | 'passages' | 'props', boolean>
  simplified: boolean
  allLayersHidden: boolean
  zoom: ComponentProps<typeof MapCanvas>['zoom']
  viewerError: string | null
  roomsDrawerOpen: boolean
  desktopRailCollapsed: boolean
  selectedInspectable: InspectableRef | null
  pinnedDoorId: number | null
  onSelectRoom: (id: number) => void
  onToggleRoomsDrawer: () => void
  onToggleRail: () => void
  onCloseRoomsDrawer: () => void
  onFocus: (ref: InspectableRef) => void
  onClick: (ref: InspectableRef) => void
  onClearSelection: () => void
  onSetActiveZ: (z: number) => void
  onNavigate: (path: string) => void
  onNavigateStair: (stair: MapStair) => void
  onNavigatePortal: (portal: MapPortal) => void
  onSetActiveEncounterId: (id: number) => void
  onWheelZoom: (event: WheelEvent) => void
  onPanStart: (event: globalThis.PointerEvent) => void
  onPanMove: (event: globalThis.PointerEvent) => void
  onPanEnd: (event: globalThis.PointerEvent) => void
  onViewportResize: (size: ViewportSize) => void
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  doorSession: (door: MapDoor) => SessionFixtureState | undefined
  stairSession: (stair: MapStair) => SessionFixtureState | undefined
  portalSession: (portal: MapPortal) => SessionFixtureState | undefined
  propSession: (prop: MapProp) => SessionFixtureState | undefined
}

function markerOffset(layout: MapLayout, z: number, cell: MapCell, type: 'stair' | 'portal' | 'prop', id: number) {
  const group = markersAtCell(layout, z, cell)
  const index = group.findIndex((marker) => marker.type === type && marker.id === id)
  return { ...gridMarkerOffset(group.length, index), grouped: group.length > 1 }
}

export function MapLabViewerCanvas({
  layout, parsed, activeZ, activeRoomId, partyRoomId, rooms, doors, stairs, portals, props, features,
  bounds, viewBox, rulerX1, rulerX2, rulerY, rulerTick, layerVisible, simplified, allLayersHidden,
  zoom, viewerError, roomsDrawerOpen, desktopRailCollapsed, selectedInspectable, pinnedDoorId,
  onSelectRoom, onToggleRoomsDrawer,
  onToggleRail, onCloseRoomsDrawer, onFocus, onClick, onClearSelection, onNavigateStair, onNavigatePortal, onSetActiveEncounterId,
  onWheelZoom, onPanStart, onPanMove, onPanEnd, onViewportResize, onFit, onZoomIn, onZoomOut,
  doorSession, stairSession, portalSession, propSession,
}: Props) {
  return (
    <div className="maplab-canvas">
      <button type="button" className="maplab-pill-button maplab-viewer-rail-toggle" aria-label="Open room navigation" aria-expanded={roomsDrawerOpen} aria-controls="maplab-viewer-room-rail" onClick={onToggleRoomsDrawer}>Rooms</button>
      <div id="maplab-viewer-room-rail" className="maplab-viewer-rail-container" data-open={roomsDrawerOpen || undefined} data-collapsed={desktopRailCollapsed || undefined}>
        <ViewerRoomRail layout={layout} parsed={parsed} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} />
      </div>
      <button type="button" className="maplab-viewer-rail-seam" aria-label={desktopRailCollapsed ? 'Show room rail' : 'Hide room rail'} aria-expanded={!desktopRailCollapsed} aria-controls="maplab-viewer-room-rail" onClick={onToggleRail} />
      <button type="button" className="maplab-viewer-rail-backdrop" aria-label="Close room navigation" tabIndex={roomsDrawerOpen ? 0 : -1} onClick={onCloseRoomsDrawer} />

      <div className="maplab-canvas-area">
        {allLayersHidden ? <p className="maplab-canvas-filtered-empty">All layers are hidden. Turn one on to see the map.</p> : (
          <MapCanvas viewBox={viewBox} bounds={bounds} zoom={zoom} ariaLabel={`Dungeon floor map — Floor ${activeZ}`} variant="neutral" onWheelZoom={onWheelZoom} onPanStart={onPanStart} onPanMove={onPanMove} onPanEnd={onPanEnd} onViewportResize={onViewportResize} panHint="Drag to pan. Pinch or scroll to zoom."
            bottomCenterSlot={viewerError ? <p className="maplab-viewer-status" role="status">{viewerError}</p> : null}
            controlsSlot={<><button type="button" className="maplab-pill-button maplab-zoom-button" aria-label="Fit map to viewport" onClick={onFit}><FitIcon width={22} height={22} aria-hidden="true" /></button><div className="maplab-zoom-cluster"><button type="button" className="maplab-pill-button maplab-zoom-button" aria-label="Zoom in" onClick={onZoomIn}><ZoomInIcon width={22} height={22} aria-hidden="true" /></button><button type="button" className="maplab-pill-button maplab-zoom-button" aria-label="Zoom out" onClick={onZoomOut}><ZoomOutIcon width={22} height={22} aria-hidden="true" /></button></div></>}
          >
            <defs>
              <pattern id="feature-river-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}><rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-river-fill)" /><line x1={0} y1={CELL_SIZE * 0.35} x2={CELL_SIZE} y2={CELL_SIZE * 0.35} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" /><line x1={0} y1={CELL_SIZE * 0.65} x2={CELL_SIZE} y2={CELL_SIZE * 0.65} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" /></pattern>
              <pattern id="feature-trees-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}><rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-trees-fill)" /><circle cx={CELL_SIZE * 0.25} cy={CELL_SIZE * 0.3} r={3} fill="var(--md-nature)" opacity={0.55} /><circle cx={CELL_SIZE * 0.7} cy={CELL_SIZE * 0.45} r={2.5} fill="var(--md-nature)" opacity={0.45} /><circle cx={CELL_SIZE * 0.4} cy={CELL_SIZE * 0.7} r={3.5} fill="var(--md-nature)" opacity={0.4} /><circle cx={CELL_SIZE * 0.75} cy={CELL_SIZE * 0.75} r={2} fill="var(--md-nature)" opacity={0.55} /></pattern>
            </defs>
             {layerVisible.outside && <rect className="maplab-unknown-space" x={bounds.minX * CELL_SIZE} y={bounds.minY * CELL_SIZE} width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE} height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE} fill="var(--maplab-outside-fill)" onClick={onClearSelection} />}
            {layerVisible.outside && features.map((feature) => <g key={feature.feature_id} className="maplab-feature" data-feature-kind={feature.kind}>{feature.cells.map(([x, y]) => <rect key={`${x}-${y}`} className="maplab-feature-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={`url(#feature-${feature.kind}-pattern)`} />)}</g>)}
            <g className="maplab-scale-ruler"><line x1={rulerX1} y1={rulerY} x2={rulerX2} y2={rulerY} /><line x1={rulerX1} y1={rulerY - rulerTick} x2={rulerX1} y2={rulerY + rulerTick} /><line x1={rulerX2} y1={rulerY - rulerTick} x2={rulerX2} y2={rulerY + rulerTick} /><text x={(rulerX1 + rulerX2) / 2} y={rulerY - rulerTick - 6} textAnchor="middle">1 square = 5 ft</text></g>
             {rooms.map((room) => { const isSelected = room.room_id === activeRoomId; const isPartyRoom = room.room_id === partyRoomId; const center = roomLabelAnchor(room, CELL_SIZE); return <g key={room.room_id} className="maplab-room" data-selected={isSelected || undefined} data-party={isPartyRoom || undefined} role="button" tabIndex={0} aria-pressed={isSelected} aria-label={`${room.title ?? `Room ${room.room_id}`}${isPartyRoom ? ' (party location)' : ''}`} onClick={() => { onSelectRoom(room.room_id); onClick({ kind: 'room', id: room.room_id }) }} onKeyDown={(event) => { if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) { event.preventDefault(); onFocus({ kind: 'room', id: room.room_id }); onSelectRoom(room.room_id); return } if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectRoom(room.room_id); onClick({ kind: 'room', id: room.room_id }) } }} onContextMenu={(event) => { event.preventDefault(); onFocus({ kind: 'room', id: room.room_id }); onSelectRoom(room.room_id) }} onFocus={() => { onFocus({ kind: 'room', id: room.room_id }); onSelectRoom(room.room_id) }}>{absoluteCells(room).map(([x, y]) => <rect key={`${x}-${y}`} className="maplab-room-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} />)}{nonDoorWallSegments(room, doors).map((edge) => { const segment = doorWallSegment(edge, CELL_SIZE); return <line key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`} className="maplab-wall" data-wall-kind={room.wallKind ?? 'solid'} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} /> })}{layerVisible.labels && <text className="maplab-room-title" x={center.x} y={center.y}>{room.title ?? `Room ${room.room_id}`}</text>}</g> })}
             {layerVisible.passages && doors.map((door) => <DoorMarker key={door.door_id} door={door} cellSize={CELL_SIZE} session={doorSession(door)} selected={pinnedDoorId === door.door_id} onFocus={() => onFocus({ kind: 'door', id: door.door_id })} onContextMenu={() => onFocus({ kind: 'door', id: door.door_id })} onClick={() => onClick({ kind: 'door', id: door.door_id })} />)}
            {layerVisible.passages && <g className="maplab-door-badge-layer" aria-hidden="true">{doors.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} session={doorSession(door)} />)}</g>}
              {layerVisible.passages && stairs.map((stair) => { const cell = stairCellForZ(stair, activeZ); if (!cell) return null; const session = stairSession(stair); const { dx, dy, grouped } = markerOffset(layout, activeZ, cell, 'stair', stair.stair_id); const targetZ = otherFloorZ(stair, activeZ); return <StairMarker key={stair.stair_id} stair={stair} cellSize={CELL_SIZE} cell={cell} activeZ={activeZ} session={session} offset={{ dx, dy }} grouped={grouped} simplified={simplified} destinationLabel={`go to floor ${targetZ}`} selected={selectedInspectable?.kind === 'stair' && selectedInspectable.id === stair.stair_id} onFocus={() => onFocus({ kind: 'stair', id: stair.stair_id })} onContextMenu={() => onFocus({ kind: 'stair', id: stair.stair_id })} onClick={() => { onClick({ kind: 'stair', id: stair.stair_id }); onNavigateStair(stair) }} /> })}
              {layerVisible.passages && portals.map((portal) => { const { dx, dy, grouped } = markerOffset(layout, activeZ, portal.cell, 'portal', portal.portal_id); return <PortalMarker key={portal.portal_id} portal={portal} cellSize={CELL_SIZE} session={portalSession(portal)} offset={{ dx, dy }} grouped={grouped} simplified={simplified} selected={selectedInspectable?.kind === 'portal' && selectedInspectable.id === portal.portal_id} onFocus={() => onFocus({ kind: 'portal', id: portal.portal_id })} onContextMenu={() => onFocus({ kind: 'portal', id: portal.portal_id })} onClick={() => { onClick({ kind: 'portal', id: portal.portal_id }); onNavigatePortal(portal) }} /> })}
              {layerVisible.props && props.map((prop) => { const propOffset = prop.side === undefined ? markerOffset(layout, activeZ, prop.cell, 'prop', prop.prop_id) : undefined; return <PropMarker key={prop.prop_id} prop={prop} cellSize={CELL_SIZE} session={propSession(prop)} offset={propOffset} grouped={propOffset?.grouped} simplified={simplified} selected={selectedInspectable?.kind === 'prop' && selectedInspectable.id === prop.prop_id} onFocus={() => onFocus({ kind: 'prop', id: prop.prop_id })} onContextMenu={() => onFocus({ kind: 'prop', id: prop.prop_id })} onClick={() => { onClick({ kind: 'prop', id: prop.prop_id }); if (prop.kind === 'encounter' && prop.encounter_id != null) onSetActiveEncounterId(prop.encounter_id) }} /> })}
          </MapCanvas>
        )}
      </div>
    </div>
  )
}
