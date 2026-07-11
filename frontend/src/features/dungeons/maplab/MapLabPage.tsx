import { useMemo, useState } from 'react'
import './MapLabPage.css'
import { mapLabLayout } from './maplabData'
import {
  absoluteCells,
  doorWallSegment,
  floorsInLayout,
  nonDoorWallSegments,
  paddedBounds,
  passagePresentation,
  roomOfCell,
  roomsOnZ,
  secondaryPassageStates,
  stairEndpointsForZ,
  type MapRoom,
  type MapStair,
  type PassageFlags,
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

function stairCellForZ(stair: MapStair, z: number): [number, number] | null {
  if (stair.from.z === z) return stair.from.cell
  if (stair.to.z === z) return stair.to.cell
  return null
}

function otherFloorZ(stair: MapStair, currentZ: number): number {
  return stair.from.z === currentZ ? stair.to.z : stair.from.z
}

type AffordanceKind = 'door' | 'stair'
interface AffordanceRef {
  kind: AffordanceKind
  id: number
}

/** The Hall/Armoury door and Stone Stairs share one details readout: title, state (icon + token +
 * label), any secondary flags, DCs, and a free-text note — a door and a stair are both "passages"
 * from the DM's point of view. */
function PassageDetails({ title, kind, passage }: { title: string; kind: string; passage: PassageFlags }) {
  const presentation = passagePresentation(passage)
  const Icon = presentation.icon
  const secondary = secondaryPassageStates(passage)
  const hasDcs = passage.breakDc !== undefined || passage.pickDc !== undefined || passage.hiddenDc !== undefined

  return (
    <div className="maplab-passage-details">
      <div className="maplab-passage-details-header">
        <Icon width={20} height={20} aria-hidden="true" style={{ color: `var(${presentation.token})` }} />
        <span className="maplab-passage-details-title">{title}</span>
        <span className="maplab-passage-details-kind">{kind}</span>
      </div>
      <p className="maplab-passage-details-state" style={{ color: `var(${presentation.token})` }}>
        {presentation.label}
      </p>
      {secondary.length > 0 && (
        <ul className="maplab-passage-details-chips">
          {secondary.map((state) => (
            <li key={state} className="maplab-passage-details-chip">
              {state}
            </li>
          ))}
        </ul>
      )}
      {hasDcs && (
        <dl className="maplab-passage-details-dcs">
          {passage.breakDc !== undefined && (
            <>
              <dt>Break DC</dt>
              <dd>{passage.breakDc}</dd>
            </>
          )}
          {passage.pickDc !== undefined && (
            <>
              <dt>Pick DC</dt>
              <dd>{passage.pickDc}</dd>
            </>
          )}
          {passage.hiddenDc !== undefined && (
            <>
              <dt>Perception DC</dt>
              <dd>{passage.hiddenDc}</dd>
            </>
          )}
        </dl>
      )}
      {passage.note && <p className="maplab-passage-details-note">{passage.note}</p>}
    </div>
  )
}

/** Map Lab prototype page — Stage M2.3: walls, and door/stair affordances with state + details. */
export function MapLabPage() {
  const floors = useMemo(() => floorsInLayout(mapLabLayout), [])
  const [activeZ, setActiveZ] = useState<number>(floors[0]?.z ?? 0)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [hoveredAffordance, setHoveredAffordance] = useState<AffordanceRef | null>(null)
  const [focusedAffordance, setFocusedAffordance] = useState<AffordanceRef | null>(null)
  const [pinnedDoorId, setPinnedDoorId] = useState<number | null>(null)

  const rooms = useMemo(() => roomsOnZ(mapLabLayout, activeZ), [activeZ])
  const stairs = useMemo(() => stairEndpointsForZ(mapLabLayout, activeZ), [activeZ])
  const doors = useMemo(
    () =>
      mapLabLayout.doors.filter((door) => {
        const owner = roomOfCell(door.cell, rooms)
        return owner !== null
      }),
    [rooms],
  )

  // Bounds computed over every room, not just the active floor, so the viewBox stays
  // aligned across floor switches — proving shared coordinate space across z. Padded by
  // meta.padding on every side: the margin of visible "unknown space" around authored content.
  const bounds = useMemo(() => paddedBounds(mapLabLayout), [])
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

  const activeFloor = floors.find((floor) => floor.z === activeZ)

  const activeAffordance: AffordanceRef | null =
    hoveredAffordance ?? focusedAffordance ?? (pinnedDoorId !== null ? { kind: 'door', id: pinnedDoorId } : null)
  const activeDoor =
    activeAffordance?.kind === 'door'
      ? mapLabLayout.doors.find((door) => door.door_id === activeAffordance.id)
      : undefined
  const activeStair =
    activeAffordance?.kind === 'stair'
      ? mapLabLayout.stairs.find((stair) => stair.stair_id === activeAffordance.id)
      : undefined

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
            className="maplab-floor-tab"
            aria-selected={floor.z === activeZ}
            onClick={() => setActiveZ(floor.z)}
          >
            {floor.title ?? `Floor ${floor.z}`}
          </button>
        ))}
      </div>

      <div className="maplab-canvas">
        <svg
          className="maplab-svg"
          viewBox={viewBox}
          role="img"
          aria-label={`Dungeon floor map — ${activeFloor?.title ?? `Floor ${activeZ}`}`}
          data-variant="neutral"
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
                {nonDoorWallSegments(room, mapLabLayout.doors).map((edge) => {
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
            const segment = doorWallSegment(door, CELL_SIZE)
            const presentation = passagePresentation(door)
            const Icon = presentation.icon
            const midX = (segment.x1 + segment.x2) / 2
            const midY = (segment.y1 + segment.y2) / 2
            const isPinned = pinnedDoorId === door.door_id
            const label = `${door.title ?? `Door ${door.door_id}`} — ${presentation.label}`
            return (
              <g
                key={door.door_id}
                className="maplab-door"
                data-state={presentation.state}
                role="button"
                tabIndex={0}
                aria-pressed={isPinned}
                aria-label={label}
                onMouseEnter={() => setHoveredAffordance({ kind: 'door', id: door.door_id })}
                onMouseLeave={() => setHoveredAffordance(null)}
                onFocus={() => setFocusedAffordance({ kind: 'door', id: door.door_id })}
                onBlur={() => setFocusedAffordance(null)}
                onClick={() => togglePinnedDoor(door.door_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    togglePinnedDoor(door.door_id)
                  }
                }}
              >
                <title>{door.title ?? `Door ${door.door_id}`}</title>
                <line
                  className="maplab-door-glyph"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  style={{ stroke: `var(${presentation.token})` }}
                  strokeDasharray={presentation.state === 'hidden' ? '6 4' : undefined}
                />
                <g transform={`translate(${midX - ICON_SIZE / 2}, ${midY - ICON_SIZE / 2})`}>
                  <Icon
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    className="maplab-door-icon"
                    style={{ color: `var(${presentation.token})` }}
                  />
                </g>
              </g>
            )
          })}

          {stairs.map((stair) => {
            const cell = stairCellForZ(stair, activeZ)
            if (!cell) return null
            const [x, y] = cell
            const cx = (x + 0.5) * CELL_SIZE
            const cy = (y + 0.5) * CELL_SIZE
            const targetZ = otherFloorZ(stair, activeZ)
            const presentation = passagePresentation(stair)
            const Icon = presentation.icon
            const label = `${stair.title ?? `Stair ${stair.stair_id}`} — ${presentation.label} — go to floor ${targetZ}`
            return (
              <g
                key={stair.stair_id}
                className="maplab-stair"
                data-state={presentation.state}
                role="button"
                tabIndex={0}
                aria-label={label}
                onMouseEnter={() => setHoveredAffordance({ kind: 'stair', id: stair.stair_id })}
                onMouseLeave={() => setHoveredAffordance(null)}
                onFocus={() => setFocusedAffordance({ kind: 'stair', id: stair.stair_id })}
                onBlur={() => setFocusedAffordance(null)}
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
                  r={CELL_SIZE * 0.32}
                  style={{ stroke: `var(${presentation.token})` }}
                />
                <g transform={`translate(${cx - ICON_SIZE / 2}, ${cy - ICON_SIZE / 2})`}>
                  <Icon
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    className="maplab-stair-icon"
                    style={{ color: `var(${presentation.token})` }}
                  />
                </g>
              </g>
            )
          })}
        </svg>

        <div className="maplab-affordance-panel" aria-live="polite">
          {activeDoor && <PassageDetails title={activeDoor.title ?? `Door ${activeDoor.door_id}`} kind="Door" passage={activeDoor} />}
          {activeStair && (
            <PassageDetails title={activeStair.title ?? `Stair ${activeStair.stair_id}`} kind="Stair" passage={activeStair} />
          )}
          {!activeDoor && !activeStair && (
            <p className="maplab-affordance-placeholder">Hover or focus a door or stair for details.</p>
          )}
        </div>
      </div>
    </div>
  )
}
