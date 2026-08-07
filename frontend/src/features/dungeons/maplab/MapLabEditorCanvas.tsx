import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react'
import { MapCanvas } from '../../../map/MapCanvas'
import { PropMarker } from './PropMarker'
import { PortalMarker } from './PortalMarker'
import { StairMarker } from './StairMarker'
import { DoorBadgeLayer, DoorMarker } from './DoorMarker'
import { GhostFloorLayer } from './GhostFloorLayer'
import {
  absoluteCells,
  doorWallSegment,
  gridMarkerOffset,
  markersAtCell,
  MAX_MARKERS_PER_CELL,
  nonDoorWallSegments,
  roomLabelAnchor,
  stairCellForZ,
} from '../../../model/maplabModel'
import { roomIsOffMap } from './roomContent'
import type { CardinalSide, MapCell, MapLayout, MapRoom, WallEdge } from '../../../model/maplabModel'
import type { EditorState } from './maplabEditor'

type MapLabEditorCanvasProps = Omit<ComponentProps<typeof MapCanvas>, 'children'> & {
  state: EditorState
  layerVisible: { outside: boolean; labels: boolean; passages: boolean; props: boolean }
  showGhostFloor: boolean
  ghostZ: number | null
  ghostRooms: MapRoom[]
  ghostDoors: MapLayout['doors']
  ghostProps: MapLayout['props']
  ghostFeatures: MapLayout['features']
  featuresOnActiveFloor: MapLayout['features']
  roomsOnActiveFloor: MapRoom[]
  doorsOnActiveFloor: MapLayout['doors']
  stairsOnActiveFloor: MapLayout['stairs']
  portalsOnActiveFloor: MapLayout['portals']
  propsOnActiveFloor: MapLayout['props']
  placementEdges: WallEdge[]
  strokeCells: MapCell[]
  placeRoomMode: boolean
  eraseArmed: boolean
  placePropMode: boolean
  placeDoorMode: boolean
  placeStairMode: boolean
  placePortalMode: boolean
  drawFeatureKind: string | null
  simplified: boolean
  selectedPropKind: string
  selectFeature: (id: number | null) => void
  selectRoom: (id: number | null) => void
  selectDoor: (id: number | null) => void
  selectStair: (id: number | null) => void
  selectPortal: (id: number | null) => void
  selectProp: (id: number | null) => void
  selectRoomContextually: (id: number | null) => void
  selectDoorContextually: (id: number | null) => void
  selectStairContextually: (id: number | null) => void
  selectPortalContextually: (id: number | null) => void
  selectPropContextually: (id: number | null) => void
  addProp: (cell: MapCell, kind: string) => void
  addDoor: (cell: MapCell, side: CardinalSide) => void
  addStair: (value: { z: number; cell: MapCell }) => void
  addPortal: (cell: MapCell) => void
  setArmedTool: (tool: 'select') => void
  setPlacementError: (value: string | null) => void
  brushCellStateForCell: (layout: MapLayout, z: number, roomId: number | null, erase: boolean, cell: MapCell) => string
}

function edgeKey(edge: WallEdge): string {
  return `${edge.cell[0]},${edge.cell[1]},${edge.side}`
}

function cellIsFull(layout: MapLayout, z: number, cell: MapCell): boolean {
  return markersAtCell(layout, z, cell).length >= MAX_MARKERS_PER_CELL
}

function markerOffset(layout: MapLayout, z: number, cell: MapCell, type: 'stair' | 'portal' | 'prop', id: number) {
  const group = markersAtCell(layout, z, cell)
  const index = group.findIndex((marker) => marker.type === type && marker.id === id)
  return { ...gridMarkerOffset(group.length, index), grouped: group.length > 1 }
}

export function MapLabEditorCanvas({
  state, layerVisible, showGhostFloor, ghostZ, ghostRooms, ghostDoors, ghostProps, ghostFeatures,
  featuresOnActiveFloor, roomsOnActiveFloor, doorsOnActiveFloor, stairsOnActiveFloor,
  portalsOnActiveFloor, propsOnActiveFloor, placementEdges, strokeCells, placeRoomMode, eraseArmed,
  placePropMode, placeDoorMode, placeStairMode, placePortalMode, drawFeatureKind, simplified,
  selectedPropKind, selectFeature, selectRoom, selectDoor, selectStair, selectPortal, selectProp,
  selectRoomContextually, selectDoorContextually, selectStairContextually, selectPortalContextually,
  selectPropContextually,
  addProp, addDoor, addStair, addPortal, setArmedTool, setPlacementError, viewBox, bounds, zoom,
  ariaLabel, variant, fullscreen, onToggleFullscreen, onExitFullscreen, onWheelZoom, onPanStart,
  onPanMove, onPanEnd, onStrokePointerDown, onStrokePointerMove, onStrokePointerUp,
  strokeViewportRef, onViewportResize, panHint, viewportDescription, topRightSlot, bottomCenterSlot,
  controlsSlot, brushCellStateForCell,
}: MapLabEditorCanvasProps) {
  const CELL_SIZE = 64
  const contextualSelectionAllowed = !drawFeatureKind && !placeDoorMode && !placePropMode
    && !placeStairMode && !placePortalMode && !placeRoomMode
  const handleContextualKeyDown = (event: KeyboardEvent<SVGGElement>, select: () => void) => {
    if (!contextualSelectionAllowed || !(event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))) return
    event.preventDefault()
    event.stopPropagation()
    select()
  }
  const handleContextMenu = (event: MouseEvent<SVGGElement>, select: () => void) => {
    if (!contextualSelectionAllowed) return
    event.preventDefault()
    event.stopPropagation()
    select()
  }
  return (
    <MapCanvas viewBox={viewBox} bounds={bounds} zoom={zoom} ariaLabel={ariaLabel} variant={variant}
      fullscreen={fullscreen} onToggleFullscreen={onToggleFullscreen} onExitFullscreen={onExitFullscreen}
      onWheelZoom={onWheelZoom} onPanStart={onPanStart} onPanMove={onPanMove} onPanEnd={onPanEnd}
      onStrokePointerDown={onStrokePointerDown} onStrokePointerMove={onStrokePointerMove}
      onStrokePointerUp={onStrokePointerUp} strokeViewportRef={strokeViewportRef}
      onViewportResize={onViewportResize} panHint={panHint} viewportDescription={viewportDescription}
      topRightSlot={topRightSlot} bottomCenterSlot={bottomCenterSlot} controlsSlot={controlsSlot}>
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
      {layerVisible.outside && <rect className="maplab-unknown-space" x={bounds.minX * CELL_SIZE} y={bounds.minY * CELL_SIZE}
        width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE} height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE}
        fill="var(--maplab-outside-fill)" onClick={() => {
          if (drawFeatureKind || placeDoorMode || placePropMode || placeStairMode || placePortalMode || placeRoomMode) return
          selectFeature(null)
          selectRoom(null)
          selectDoor(null)
          selectStair(null)
          selectPortal(null)
          selectProp(null)
        }} />}
      {showGhostFloor && ghostZ !== null && <GhostFloorLayer rooms={ghostRooms} doors={ghostDoors} props={ghostProps} features={ghostFeatures} cellSize={CELL_SIZE} />}
      {layerVisible.outside && featuresOnActiveFloor.map((feature) => <g key={feature.feature_id} className="maplab-feature"
         data-feature-kind={feature.kind} data-maplab-target-kind="feature" data-maplab-target-id={feature.feature_id}
         data-selected={feature.feature_id === state.selectedFeatureId || undefined}
        role="button" tabIndex={0} aria-pressed={feature.feature_id === state.selectedFeatureId} aria-label={feature.title ?? feature.kind}
        onClick={() => selectFeature(feature.feature_id === state.selectedFeatureId ? null : feature.feature_id)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectFeature(feature.feature_id === state.selectedFeatureId ? null : feature.feature_id) } }}>
        {feature.cells.map(([x, y]) => <rect key={`${x}-${y}`} className="maplab-feature-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={`url(#feature-${feature.kind}-pattern)`} />)}
      </g>)}
        {roomsOnActiveFloor.filter((room) => !roomIsOffMap(room)).map((room) => <g key={room.room_id} className="maplab-room"
          data-maplab-target-kind="room" data-maplab-target-id={room.room_id}
         data-selected={room.room_id === state.selectedRoomId || undefined} role="button" tabIndex={0}
         aria-pressed={room.room_id === state.selectedRoomId} aria-label={room.title ?? `Room ${room.room_id}`}
         onContextMenu={(event) => handleContextMenu(event, () => selectRoomContextually(room.room_id))}
         onKeyDownCapture={(event) => handleContextualKeyDown(event, () => selectRoomContextually(room.room_id))}
         onClick={() => { const nextRoomId = room.room_id === state.selectedRoomId ? null : room.room_id; selectRoom(nextRoomId); if (nextRoomId !== null) setArmedTool('select') }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const nextRoomId = room.room_id === state.selectedRoomId ? null : room.room_id; selectRoom(nextRoomId); if (nextRoomId !== null) setArmedTool('select') } }}>
        {absoluteCells(room).map(([x, y]) => <rect key={`${x}-${y}`} className="maplab-room-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} />)}
        {nonDoorWallSegments(room, doorsOnActiveFloor).map((edge) => { const segment = doorWallSegment(edge, CELL_SIZE); return <line key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`} className="maplab-wall" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} /> })}
        {layerVisible.labels && (() => { const anchor = roomLabelAnchor(room, CELL_SIZE); return <text className="maplab-room-title" x={anchor.x} y={anchor.y}>{room.title ?? `Room ${room.room_id}`}</text> })()}
      </g>)}
      {placeRoomMode && strokeCells.length > 0 && <g className="maplab-room-brush-preview" aria-hidden="true">{strokeCells.map((cell) => <rect key={`${cell[0]}-${cell[1]}`} className="maplab-room-brush-cell" data-brush-state={brushCellStateForCell(state.layout, state.activeZ, state.selectedRoomId, eraseArmed, cell)} x={cell[0] * CELL_SIZE} y={cell[1] * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} />)}</g>}
       {layerVisible.passages && doorsOnActiveFloor.map((door) => { const isSelected = door.door_id === state.selectedDoorId; return <g key={door.door_id} data-maplab-target-kind="door" data-maplab-target-id={door.door_id} onContextMenu={(event) => handleContextMenu(event, () => selectDoorContextually(door.door_id))} onKeyDownCapture={(event) => handleContextualKeyDown(event, () => selectDoorContextually(door.door_id))}><DoorMarker door={door} cellSize={CELL_SIZE} selected={isSelected} onClick={() => selectDoor(isSelected ? null : door.door_id)} /></g> })}
      {layerVisible.passages && <g className="maplab-door-badge-layer" aria-hidden="true">{doorsOnActiveFloor.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} />)}</g>}
       {layerVisible.passages && stairsOnActiveFloor.map((stair) => { const cell = stairCellForZ(stair, state.activeZ); if (!cell) return null; const { dx, dy, grouped } = markerOffset(state.layout, state.activeZ, cell, 'stair', stair.stair_id); const isSelected = stair.stair_id === state.selectedStairId; return <g key={stair.stair_id} data-maplab-target-kind="stair" data-maplab-target-id={stair.stair_id} onContextMenu={(event) => handleContextMenu(event, () => selectStairContextually(stair.stair_id))} onKeyDownCapture={(event) => handleContextualKeyDown(event, () => selectStairContextually(stair.stair_id))}><StairMarker stair={stair} cellSize={CELL_SIZE} cell={cell} activeZ={state.activeZ} selected={isSelected} offset={{ dx, dy }} grouped={grouped} simplified={simplified} onClick={() => selectStair(isSelected ? null : stair.stair_id)} /></g> })}
       {layerVisible.passages && portalsOnActiveFloor.map((portal) => { const { grouped, ...offset } = markerOffset(state.layout, state.activeZ, portal.cell, 'portal', portal.portal_id); return <g key={portal.portal_id} data-maplab-target-kind="portal" data-maplab-target-id={portal.portal_id} onContextMenu={(event) => handleContextMenu(event, () => selectPortalContextually(portal.portal_id))} onKeyDownCapture={(event) => handleContextualKeyDown(event, () => selectPortalContextually(portal.portal_id))}><PortalMarker portal={portal} cellSize={CELL_SIZE} selected={portal.portal_id === state.selectedPortalId} offset={offset} grouped={grouped} simplified={simplified} onClick={() => selectPortal(portal.portal_id === state.selectedPortalId ? null : portal.portal_id)} /></g> })}
      {placePropMode && <g className="maplab-prop-placement-overlay">{roomsOnActiveFloor.flatMap((room) => absoluteCells(room).map(([x, y]) => <rect key={`${room.room_id}-${x}-${y}`} className="maplab-prop-placement-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} role="button" aria-label={`Place prop at ${x}, ${y}`} onClick={(event) => { event.stopPropagation(); if (cellIsFull(state.layout, state.activeZ, [x, y])) { setPlacementError('That square already has 4 markers — pick a different square.'); return } setPlacementError(null); addProp([x, y], selectedPropKind) }} />))}</g>}
      {placeDoorMode && <g className="maplab-door-placement-overlay">{placementEdges.map((edge) => { const segment = doorWallSegment(edge, CELL_SIZE); const isHorizontal = segment.y1 === segment.y2; const hitBandDepth = 40; const hitRect = isHorizontal ? { x: Math.min(segment.x1, segment.x2), y: segment.y1 - hitBandDepth / 2, width: Math.abs(segment.x2 - segment.x1), height: hitBandDepth } : { x: segment.x1 - hitBandDepth / 2, y: Math.min(segment.y1, segment.y2), width: hitBandDepth, height: Math.abs(segment.y2 - segment.y1) }; return <g key={edgeKey(edge)}><rect className="maplab-door-placement-hitband" {...hitRect} role="button" aria-label={`Place door at ${edge.cell[0]}, ${edge.cell[1]} ${edge.side}`} onClick={(event) => { event.stopPropagation(); addDoor(edge.cell, edge.side as CardinalSide); setArmedTool('select') }} /><line className="maplab-door-placement-edge" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} /></g> })}</g>}
      {placeStairMode && <g className="maplab-stair-placement-overlay">{roomsOnActiveFloor.flatMap((room) => absoluteCells(room).map(([x, y]) => <rect key={`${room.room_id}-${x}-${y}`} className="maplab-stair-placement-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} role="button" aria-label={`Place stair at ${x}, ${y}`} onClick={(event) => { event.stopPropagation(); if (cellIsFull(state.layout, state.activeZ, [x, y])) { setPlacementError('That square already has 4 markers — pick a different square.'); return } setPlacementError(null); addStair({ z: state.activeZ, cell: [x, y] }) }} />))}</g>}
      {placePortalMode && <g className="maplab-portal-placement-overlay">{roomsOnActiveFloor.flatMap((room) => absoluteCells(room).map(([x, y]) => <rect key={`${room.room_id}-${x}-${y}`} className="maplab-portal-placement-cell" x={x * CELL_SIZE} y={y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} role="button" aria-label={`Place portal at ${x}, ${y}`} onClick={(event) => { event.stopPropagation(); if (cellIsFull(state.layout, state.activeZ, [x, y])) { setPlacementError('That square already has 4 markers — pick a different square.'); return } setPlacementError(null); addPortal([x, y]) }} />))}</g>}
      {drawFeatureKind && <rect className="maplab-feature-stroke-overlay" x={bounds.minX * CELL_SIZE} y={bounds.minY * CELL_SIZE} width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE} height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE} fill="transparent" aria-hidden="true" />}
        {layerVisible.props && propsOnActiveFloor.map((prop) => { const propOffset = prop.side === undefined ? markerOffset(state.layout, state.activeZ, prop.cell, 'prop', prop.prop_id) : undefined; return <g key={prop.prop_id} data-maplab-target-kind="prop" data-maplab-target-id={prop.prop_id} onContextMenu={(event) => handleContextMenu(event, () => selectPropContextually(prop.prop_id))} onKeyDownCapture={(event) => handleContextualKeyDown(event, () => selectPropContextually(prop.prop_id))}><PropMarker prop={prop} cellSize={CELL_SIZE} selected={prop.prop_id === state.selectedPropId} offset={propOffset} grouped={propOffset?.grouped} simplified={simplified} onClick={() => selectProp(prop.prop_id === state.selectedPropId ? null : prop.prop_id)} /></g> })}
    </MapCanvas>
  )
}
