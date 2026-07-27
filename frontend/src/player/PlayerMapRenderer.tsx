import { useCallback, useEffect, useRef, useState } from 'react'
import {
  absoluteCells,
  roomLabelAnchor,
  doorSwingGeometry,
  doorWallSegment,
  doorsOnFloor,
  floorsInLayout,
  gridMarkerOffset,
  markersAtCell,
  nonDoorWallSegments,
  otherFloorZ,
  paddedBounds,
  roomsOnZ,
  stairCellForZ,
  stairDirection,
  stairEndpointsForZ,
} from '../model/maplabModel'
import type { KidMapLayout } from './curtain'
import type { MapLayout } from '../model/maplabModel'
import { MapCanvas } from '../map/MapCanvas'
import { FloorPicker } from './FloorPicker'
import { useMapCanvasZoom, BASE_PX_PER_UNIT } from '../map/useMapCanvasZoom'
import type { ViewportSize, ZoomState } from '../map/useMapCanvasZoom'
import { resolveMapDensity } from '../map/mapDensity'
import {
  type KidMarkerKind,
  kidFamilyTokens,
  kidMarkerFamily,
  kidMarkerIcon,
  onSquareMarkerGeometry,
  wallAttachedMarkerGeometry,
} from '../map/markerShape'

const CELL_SIZE = BASE_PX_PER_UNIT
const LABEL_PX = 16
const LABEL_HALO_PX = 4
const DOOR_PX = 8
const DISC_RADIUS_PX = 14

type Point = { x: number; y: number }

export function PlayerMapRenderer({ layout, openDoorIds }: { layout: KidMapLayout; openDoorIds?: ReadonlySet<number> }) {
  const ml = layout as unknown as MapLayout
  const bounds = paddedBounds(ml)
  const floors = floorsInLayout(ml)
  const [selectedZ, setSelectedZ] = useState<number>(
    floors.length > 0 ? floors[0].z : 0,
  )
  const activeFloorInfo = floors.find((f) => f.z === selectedZ)

  const {
    zoom,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    fitToBounds,
  } = useMapCanvasZoom({ wheelZoomMode: 'always', pointerMode: 'pan' })

  // Keyboard pan offset — additive on top of gesture pan so arrow-key navigation
  // coexists with the shared pan/zoom hook (which does not expose pan-by-delta).
  const [kbOffset, setKbOffset] = useState({ x: 0, y: 0 })
  const combinedZoom: ZoomState = {
    scale: zoom.scale,
    pan: { x: zoom.pan.x + kbOffset.x, y: zoom.pan.y + kbOffset.y },
  }

  // Auto-fit to the lowest floor on first viewport resize.
  const fittedRef = useRef(false)
  const handleViewportResize = useCallback((size: ViewportSize) => {
    if (fittedRef.current) return
    fittedRef.current = true
    fitToBounds(
      { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY },
      size,
      bounds,
    )
  }, [fitToBounds, bounds])

  // Viewport element reference for keyboard panning.
  const viewportElRef = useRef<HTMLElement | null>(null)
  const handleViewportRef = useCallback((el: HTMLElement | null) => {
    viewportElRef.current = el
  }, [])

  // Keyboard panning via native listener on the MapCanvas viewport.
  useEffect(() => {
    const el = viewportElRef.current
    if (!el) return
    const handler = (e: globalThis.KeyboardEvent) => {
      const deltas: Record<string, Point> = {
        ArrowUp: { x: 0, y: 48 },
        ArrowDown: { x: 0, y: -48 },
        ArrowLeft: { x: 48, y: 0 },
        ArrowRight: { x: -48, y: 0 },
      }
      const delta = deltas[e.key]
      if (!delta) return
      e.preventDefault()
      setKbOffset((kp) => ({ x: kp.x + delta.x, y: kp.y + delta.y }))
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [])

  const floorWidth = (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  const floorHeight = (bounds.maxY - bounds.minY + 1) * CELL_SIZE
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${floorWidth} ${floorHeight}`

  const rooms = roomsOnZ(ml, selectedZ)
  const doors = doorsOnFloor(ml, selectedZ)

  // Label visibility from shared density signal (replaces room bounding-box fit).
  const density = resolveMapDensity('auto', zoom.scale)
  const labelFits = density === 'detailed'

  // --- On-square markers (portals, on-square props) with fan-out ---
  const onSquareMarkerEls = (() => {
    const cellMarkers = new Map<string, { cell: [number, number]; kind: KidMarkerKind }[]>()
    const cells = new Map<string, [number, number]>()
    const addToCell = (cell: [number, number], kind: KidMarkerKind) => {
      const key = `${cell[0]},${cell[1]}`
      cells.set(key, cell)
      if (!cellMarkers.has(key)) cellMarkers.set(key, [])
      cellMarkers.get(key)!.push({ cell, kind })
    }
    // Collect portals
    if (layout.portals) {
      for (const p of layout.portals) {
        if (p.z === selectedZ) addToCell(p.cell, { kind: 'portal' })
      }
    }
    // Collect on-square props
    if (layout.props) {
      for (const p of layout.props) {
        if (p.z !== selectedZ || p.side) continue
        const mk: KidMarkerKind = p.kind === 'window' ? { kind: 'window' }
          : p.kind === 'chest' ? { kind: 'chest' }
          : p.kind === 'table' ? { kind: 'table' }
          : p.kind === 'mirror' ? { kind: 'mirror' }
          : p.kind === 'barrel' ? { kind: 'barrel' }
          : p.kind === 'statue' ? { kind: 'statue' }
          : p.kind === 'npc' ? { kind: 'npc' }
          : { kind: 'other' }
        addToCell(p.cell, mk)
      }
    }
    return Array.from(cellMarkers.entries()).flatMap(([key, collected]) => {
      const cell = cells.get(key)!
      // Use markersAtCell only for count and ordering (fan-out needs total count)
      const allAtCell = markersAtCell(ml, selectedZ, cell)
      const nonStairCount = allAtCell.filter((m: any) => (m as any).kind !== 'stair').length
      return collected.map((item, idx) => {
        const offset = gridMarkerOffset(nonStairCount, idx)
        const geo = onSquareMarkerGeometry(cell, CELL_SIZE, {
          offset: { dx: (offset as any).dx ?? 0, dy: (offset as any).dy ?? 0 },
          grouped: nonStairCount > 1,
        })
        const Icon = kidMarkerIcon(item.kind)
        const { fill, on } = kidFamilyTokens(kidMarkerFamily(item.kind))
        const iconSize = geo.iconSize
        return (
          <g key={`cell-${key}-${idx}`} className="kid-on-square-marker">
            <circle className="kid-marker-disc" cx={geo.cx} cy={geo.cy} r={geo.radius}
              style={{ fill: `var(${fill})`, stroke: `var(${on})` }} />
            <g transform={`translate(${geo.cx - iconSize / 2}, ${geo.cy - iconSize / 2})`}>
              <Icon width={iconSize} height={iconSize} style={{ color: `var(${on})` }} />
            </g>
          </g>
        )
      })
    })
  })()

  // --- Wall-attached props ---
  const wallPropEls = ((layout.props ?? []) as any[])
    .filter((p: any) => p.z === selectedZ && p.side)
    .map((prop: any, idx: number) => {
      const geo = wallAttachedMarkerGeometry(prop.cell, prop.side, CELL_SIZE)
      const mk: KidMarkerKind = prop.kind === 'window' ? { kind: 'window' }
        : prop.kind === 'chest' ? { kind: 'chest' }
        : prop.kind === 'table' ? { kind: 'table' }
        : prop.kind === 'mirror' ? { kind: 'mirror' }
        : prop.kind === 'barrel' ? { kind: 'barrel' }
        : prop.kind === 'statue' ? { kind: 'statue' }
        : prop.kind === 'npc' ? { kind: 'npc' }
        : { kind: 'other' }
      const Icon = kidMarkerIcon(mk)
      const { fill, on } = kidFamilyTokens(kidMarkerFamily(mk))
      return (
        <g key={`wall-prop-${idx}`} className="kid-wall-marker">
          <circle className="kid-marker-disc" cx={geo.cx} cy={geo.cy} r={geo.radius}
            style={{ fill: `var(${fill})`, stroke: `var(${on})` }} />
          <g transform={`translate(${geo.cx - geo.iconSize / 2}, ${geo.cy - geo.iconSize / 2})`}>
            <Icon width={geo.iconSize} height={geo.iconSize} style={{ color: `var(${on})` }} />
          </g>
        </g>
      )
    })

  return (
    <div role="region" aria-label="Dungeon map">
      <MapCanvas
        viewBox={viewBox}
        bounds={bounds}
        zoom={combinedZoom}
        ariaLabel="Dungeon map layout"
        onWheelZoom={handleWheel}
        onPanStart={handlePointerDown}
        onPanMove={handlePointerMove}
        onPanEnd={handlePointerUp}
        onViewportResize={handleViewportResize}
        strokeViewportRef={handleViewportRef}
        variant="neutral"
      >
      <g data-floor={selectedZ} data-testfloor="true">
        <rect
          className="player-map-floor"
          x={bounds.minX * CELL_SIZE}
          y={bounds.minY * CELL_SIZE}
          width={floorWidth}
          height={floorHeight}
        />
        {rooms.filter((room) => absoluteCells(room).length > 0).map((room) => {
          const center = roomLabelAnchor(room, CELL_SIZE)
          const cells = absoluteCells(room)
          const title = room.title ?? `Room ${room.room_id}`
          const fontSize = LABEL_PX / zoom.scale
          const strokeWidth = LABEL_HALO_PX / zoom.scale
          return (
            <g key={room.room_id} className="player-map-room" data-room-id={room.room_id}>
              {cells.map(([x, y]) => (
                <rect
                  key={`${x}-${y}`}
                  className="player-map-room-cell"
                  data-room-cell={`${x},${y}`}
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                />
              ))}
              {nonDoorWallSegments(room, doors).map((edge) => {
                const segment = doorWallSegment(edge, CELL_SIZE)
                return <line key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`} className="player-map-wall" {...segment} />
              })}
              <text
                className="player-map-room-title"
                x={center.x}
                y={center.y}
                style={{ fontSize, strokeWidth }}
                data-label-fits={labelFits ? 'true' : 'false'}
              >
                {title}
              </text>
            </g>
          )
        })}
        {doors.map((door) => {
          const isOpen = openDoorIds?.has(door.door_id) ?? false
          const segment = doorWallSegment(door, CELL_SIZE)
          const discCx = (segment.x1 + segment.x2) / 2
          const discCy = (segment.y1 + segment.y2) / 2
          const discR = DISC_RADIUS_PX / zoom.scale
          const doorKind: KidMarkerKind = { kind: 'door' }
          const DoorIcon = kidMarkerIcon(doorKind)
          const { on: doorOn } = kidFamilyTokens(kidMarkerFamily(doorKind))
          const iconSize = discR * 1.2
          const swingDoorWidth = DOOR_PX / zoom.scale

          let swingEl: React.ReactNode = null
          if (isOpen) {
            const swing = doorSwingGeometry(door, CELL_SIZE)
            swingEl = (
              <path
                className="player-map-door-leaf"
                d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
                style={{ strokeWidth: swingDoorWidth }}
              />
            )
          }

          return (
            <g key={door.door_id} className="player-map-door" data-door-id={door.door_id} data-door-open={isOpen ? 'true' : 'false'}>
              <circle className="player-map-door-disc" cx={discCx} cy={discCy} r={discR} />
              <g transform={`translate(${discCx - iconSize / 2}, ${discCy - iconSize / 2})`}>
                <DoorIcon width={iconSize} height={iconSize} style={{ color: `var(${doorOn})` }} />
              </g>
              {swingEl}
            </g>
          )
        })}
        {stairEndpointsForZ(ml, selectedZ).map((stair) => {
          const cell = stairCellForZ(stair, selectedZ)
          if (!cell) return null
          const direction = stairDirection(stair, selectedZ)
          if (direction === 'level') return null
          const cx = (cell[0] + 0.5) * CELL_SIZE
          const cy = (cell[1] + 0.5) * CELL_SIZE
          const discR = DISC_RADIUS_PX / zoom.scale
          const stairKind: KidMarkerKind = { kind: 'stair', stairDir: direction === 'up' ? 'up' : 'down' }
          const StairIcon = kidMarkerIcon(stairKind)
          const iconSize = discR * 1.2
          const { on: stairOn } = kidFamilyTokens(kidMarkerFamily(stairKind))
          const otherZ = otherFloorZ(stair, selectedZ)
          return (
            <g
              key={`stair-${stair.stair_id}-${selectedZ}`}
              className="player-map-stair"
              data-stair-id={stair.stair_id}
              data-stair-direction={direction}
              role="button"
              tabIndex={0}
              aria-label={`Go to floor ${otherZ}`}
              onClick={() => { if (otherZ !== null) setSelectedZ(otherZ) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (otherZ !== null) setSelectedZ(otherZ) }
              }}
            >
              <circle className="player-map-stair-disc" cx={cx} cy={cy} r={discR} />
              <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
                <StairIcon width={iconSize} height={iconSize} style={{ color: `var(${stairOn})` }} />
              </g>
            </g>
          )
        })}
        {onSquareMarkerEls}
        {wallPropEls}
        {activeFloorInfo?.title && (
          <text
            className="player-map-floor-title"
            x={(bounds.minX + 0.5) * CELL_SIZE}
            y={(bounds.minY + 0.75) * CELL_SIZE}
          >
            {activeFloorInfo.title}
          </text>
        )}
      </g>
    </MapCanvas>
      <FloorPicker floors={floors} selectedZ={selectedZ} onSelectFloor={setSelectedZ} />
    </div>
  )
}
