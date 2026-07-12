import { PropMarker } from './PropMarker'
import { absoluteCells, doorWallSegment, doorSwingGeometry, nonDoorWallSegments, type MapDoor, type MapProp, type MapRoom } from './maplabModel'

interface GhostFloorLayerProps {
  rooms: MapRoom[]
  doors: MapDoor[]
  props: MapProp[]
  cellSize: number
}

function roomCenter(room: MapRoom, cellSize: number): { x: number; y: number } {
  const cells = absoluteCells(room)
  const sum = cells.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 })
  return {
    x: ((sum.x / cells.length) + 0.5) * cellSize,
    y: ((sum.y / cells.length) + 0.5) * cellSize,
  }
}

/** Presentational layer for ghosted (non-interactive) lower-floor objects when the editor displays
 * the floor below the active one for alignment reference. Read-only glyphs only — no `role`,
 * `tabIndex`, or click handlers anywhere in this tree; the whole group is `aria-hidden` so focus
 * and assistive tech never land on a ghost. */
export function GhostFloorLayer({ rooms, doors, props, cellSize }: GhostFloorLayerProps) {
  return (
    <g className="maplab-ghost-layer" aria-hidden="true">
      {rooms.map((room) => (
        <g key={room.room_id} className="maplab-ghost-room">
          {absoluteCells(room).map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              className="maplab-ghost-room-cell"
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
            />
          ))}
          {nonDoorWallSegments(room, doors).map((edge) => {
            const segment = doorWallSegment(edge, cellSize)
            return (
              <line
                key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`}
                className="maplab-ghost-wall"
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
              />
            )
          })}
          <text className="maplab-ghost-room-title" x={roomCenter(room, cellSize).x} y={roomCenter(room, cellSize).y}>
            {room.title ?? `Room ${room.room_id}`}
          </text>
        </g>
      ))}

      {doors.map((door) => {
        const swing = doorSwingGeometry(door, cellSize)
        return (
          <g key={door.door_id} className="maplab-ghost-door">
            <line className="maplab-ghost-door-leaf" x1={swing.hinge.x} y1={swing.hinge.y} x2={swing.leafTip.x} y2={swing.leafTip.y} />
            <path
              className="maplab-ghost-door-swing"
              d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
            />
          </g>
        )
      })}

      {props.map((prop) => (
        <PropMarker key={prop.prop_id} prop={prop} cellSize={cellSize} interactive={false} />
      ))}
    </g>
  )
}
