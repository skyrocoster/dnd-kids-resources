import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  absoluteCells,
  doorWallSegment,
  doorsOnFloor,
  floorsInLayout,
  nonDoorWallSegments,
  paddedBounds,
  roomsOnZ,
  type MapLayout,
  type MapRoom,
} from '../model/maplabModel'

const CELL_SIZE = 64
const FLOOR_GAP = CELL_SIZE * 2
const MIN_SCALE = 0.75
const MAX_SCALE = 4

type Point = { x: number; y: number }
type ViewTransform = Point & { scale: number }

function roomCenter(room: MapRoom): Point {
  const cells = absoluteCells(room)
  if (cells.length === 0) {
    return { x: (room.origin[0] + 0.5) * CELL_SIZE, y: (room.origin[1] + 0.5) * CELL_SIZE }
  }
  const total = cells.reduce((sum, [x, y]) => ({ x: sum.x + x, y: sum.y + y }), { x: 0, y: 0 })
  return {
    x: (total.x / cells.length + 0.5) * CELL_SIZE,
    y: (total.y / cells.length + 0.5) * CELL_SIZE,
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function PlayerMapRenderer({ layout }: { layout: MapLayout }) {
  const pointers = useRef(new Map<number, Point>())
  const lastGesture = useRef<{ center: Point; distance: number | null } | null>(null)
  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 })

  const bounds = paddedBounds(layout)
  const floorWidth = (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  const floorHeight = (bounds.maxY - bounds.minY + 1) * CELL_SIZE
  const floors = floorsInLayout(layout)
  const displayedFloors = floors.length > 0 ? floors : [{ z: 0, title: undefined }]
  const canvasWidth = floorWidth * displayedFloors.length + FLOOR_GAP * (displayedFloors.length - 1)
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${canvasWidth} ${floorHeight}`

  const resetGesture = () => {
    const active = [...pointers.current.values()]
    if (active.length === 0) lastGesture.current = null
    else if (active.length === 1) lastGesture.current = { center: active[0], distance: null }
    else lastGesture.current = { center: midpoint(active[0], active[1]), distance: distance(active[0], active[1]) }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    resetGesture()
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const active = [...pointers.current.values()]
    const previous = lastGesture.current
    if (!previous || active.length === 0) return resetGesture()

    const center = active.length === 1 ? active[0] : midpoint(active[0], active[1])
    const nextDistance = active.length > 1 ? distance(active[0], active[1]) : null
    setView((current) => {
      const proposed = nextDistance !== null && previous.distance
        ? current.scale * (nextDistance / previous.distance)
        : current.scale
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, proposed))
      const ratio = scale / current.scale
      return {
        scale,
        x: center.x - (previous.center.x - current.x) * ratio,
        y: center.y - (previous.center.y - current.y) * ratio,
      }
    })
    lastGesture.current = { center, distance: nextDistance }
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    resetGesture()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const deltas: Partial<Record<string, Point>> = {
      ArrowUp: { x: 0, y: 48 },
      ArrowDown: { x: 0, y: -48 },
      ArrowLeft: { x: 48, y: 0 },
      ArrowRight: { x: -48, y: 0 },
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    setView((current) => ({ ...current, x: current.x + delta.x, y: current.y + delta.y }))
  }

  return (
    <div
      className="player-map-viewport"
      role="region"
      aria-label="Dungeon map"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <svg
        className="player-map"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Dungeon map layout"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        <defs>
          <pattern id="player-river-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
            <rect width={CELL_SIZE} height={CELL_SIZE} className="player-map-feature-river" />
            <path d={`M 0 22 Q 16 14 32 22 T ${CELL_SIZE} 22 M 0 42 Q 16 34 32 42 T ${CELL_SIZE} 42`} />
          </pattern>
          <pattern id="player-trees-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
            <rect width={CELL_SIZE} height={CELL_SIZE} className="player-map-feature-trees" />
            <circle cx="18" cy="22" r="8" />
            <circle cx="42" cy="38" r="10" />
          </pattern>
        </defs>

        {displayedFloors.map((floor, index) => {
          const offsetX = index * (floorWidth + FLOOR_GAP)
          const rooms = roomsOnZ(layout, floor.z)
          const doors = doorsOnFloor(layout, floor.z)
          const features = layout.features.filter((feature) => feature.z === floor.z)
          return (
            <g key={floor.z} transform={`translate(${offsetX} 0)`} data-floor={floor.z}>
              <rect
                className="player-map-floor"
                x={bounds.minX * CELL_SIZE}
                y={bounds.minY * CELL_SIZE}
                width={floorWidth}
                height={floorHeight}
              />
              {features.map((feature) => (
                <g key={feature.feature_id} className="player-map-feature" data-feature-kind={feature.kind}>
                  {feature.cells.map(([x, y]) => (
                    <rect
                      key={`${x}-${y}`}
                      x={x * CELL_SIZE}
                      y={y * CELL_SIZE}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      fill={feature.kind === 'river' || feature.kind === 'trees'
                        ? `url(#player-${feature.kind}-pattern)`
                        : 'var(--md-surface-3)'}
                    />
                  ))}
                </g>
              ))}
              {rooms.map((room) => {
                const center = roomCenter(room)
                return (
                  <g key={room.room_id} className="player-map-room" data-room-id={room.room_id}>
                    {absoluteCells(room).map(([x, y]) => (
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
                    <text className="player-map-room-title" x={center.x} y={center.y}>
                      {room.title ?? `Room ${room.room_id}`}
                    </text>
                  </g>
                )
              })}
              {doors.map((door) => {
                const segment = doorWallSegment(door, CELL_SIZE)
                return <line key={door.door_id} className="player-map-door" {...segment} />
              })}
              {floor.title && (
                <text
                  className="player-map-floor-title"
                  x={(bounds.minX + 0.5) * CELL_SIZE}
                  y={(bounds.minY + 0.75) * CELL_SIZE}
                >
                  {floor.title}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}