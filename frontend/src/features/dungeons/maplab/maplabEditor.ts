import {
  absoluteCells,
  canPaintCell,
  floorsInLayout,
  nextDoorId,
  nextRoomId,
  normalizeCells,
  roomOfCell,
  type CardinalSide,
  type MapCell,
  type MapDoor,
  type MapLayout,
  type MapRoom,
} from './maplabModel'
import { FIXTURE_TYPES } from './fixtureTypes'

export interface EditorState {
  layout: MapLayout
  selectedRoomId: number | null
  selectedDoorId: number | null
  activeZ: number
}

export type EditorAction =
  | { type: 'addRoom' }
  | { type: 'selectRoom'; roomId: number | null }
  | { type: 'deleteRoom'; roomId: number }
  | { type: 'toggleCell'; roomId: number; cell: [number, number] }
  | { type: 'setRoomMeta'; roomId: number; meta: { title?: string; description?: string; kind?: string } }
  | { type: 'addDoor'; cell: [number, number]; side: CardinalSide }
  | { type: 'selectDoor'; doorId: number | null }
  | { type: 'updateFixtureFlags'; fixtureId: number; fixtureType: 'door' | 'stair'; flags: Record<string, unknown> }
  | { type: 'deleteDoor'; doorId: number }
  | { type: 'setActiveZ'; z: number }
  | { type: 'loadLayout'; layout: MapLayout }
  | { type: 'resetToFixture'; layout: MapLayout }

export function mapLabEditorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'addRoom': {
      const room_id = nextRoomId(state.layout)
      const newRoom: MapRoom = { room_id, z: state.activeZ, origin: [0, 0], cells: [] }
      return {
        ...state,
        layout: { ...state.layout, rooms: [...state.layout.rooms, newRoom] },
        selectedRoomId: room_id,
      }
    }

    case 'selectRoom':
      return { ...state, selectedRoomId: action.roomId }

    case 'deleteRoom': {
      const rooms = state.layout.rooms.filter((room) => room.room_id !== action.roomId)
      // A door's `cell` belongs to exactly one room's wall (the side-authored owner); once that
      // room is gone the cell no longer belongs to any remaining room, so the door is orphaned.
      // A shared-wall door whose cell belongs to the *surviving* room stays put.
      const doors = state.layout.doors.filter((door) => roomOfCell(door.cell, rooms) !== null)
      const selectedDoorSurvives = doors.some((door) => door.door_id === state.selectedDoorId)
      return {
        ...state,
        layout: { ...state.layout, rooms, doors },
        selectedRoomId: state.selectedRoomId === action.roomId ? null : state.selectedRoomId,
        selectedDoorId: selectedDoorSurvives ? state.selectedDoorId : null,
      }
    }

    case 'toggleCell': {
      const room = state.layout.rooms.find((r) => r.room_id === action.roomId)
      if (!room) return state

      const absolute = absoluteCells(room)
      const isOwned = absolute.some(([x, y]) => x === action.cell[0] && y === action.cell[1])

      let nextAbsolute: MapCell[]
      if (isOwned) {
        const candidate = absolute.filter(([x, y]) => !(x === action.cell[0] && y === action.cell[1]))
        if (!isConnectedPolyomino(candidate)) return state
        nextAbsolute = candidate
      } else {
        if (!canPaintCell(state.layout, action.roomId, action.cell)) return state
        nextAbsolute = [...absolute, action.cell]
      }

      const { origin, cells } = normalizeCells(nextAbsolute)
      const rooms = state.layout.rooms.map((r) => (r.room_id === action.roomId ? { ...r, origin, cells } : r))
      return { ...state, layout: { ...state.layout, rooms } }
    }

    case 'addDoor': {
      const door_id = nextDoorId(state.layout)
      const defaults = FIXTURE_TYPES.door.defaultFlags
      const newDoor: MapDoor = {
        door_id,
        cell: action.cell,
        side: action.side,
        hidden: Boolean(defaults.hidden),
        locked: Boolean(defaults.locked),
        trapped: Boolean(defaults.trapped),
      }
      return {
        ...state,
        layout: { ...state.layout, doors: [...state.layout.doors, newDoor] },
        selectedDoorId: door_id,
      }
    }

    case 'selectDoor':
      return { ...state, selectedDoorId: action.doorId }

    case 'updateFixtureFlags': {
      if (action.fixtureType !== 'door') return state
      const doors = state.layout.doors.map((door) =>
        door.door_id === action.fixtureId ? ({ ...door, ...action.flags } as MapDoor) : door,
      )
      return { ...state, layout: { ...state.layout, doors } }
    }

    case 'deleteDoor': {
      const doors = state.layout.doors.filter((door) => door.door_id !== action.doorId)
      return {
        ...state,
        layout: { ...state.layout, doors },
        selectedDoorId: state.selectedDoorId === action.doorId ? null : state.selectedDoorId,
      }
    }

    case 'setActiveZ':
      return { ...state, activeZ: action.z }

    case 'loadLayout':
      return initialEditorState(action.layout)

    case 'resetToFixture':
      return initialEditorState(action.layout)

    default:
      return state
  }
}

/** A cell-removal is rejected if it would split a room's remaining cells into more than one
 * orthogonally-connected group — 0 or 1 remaining cells are trivially connected. */
function isConnectedPolyomino(cells: MapCell[]): boolean {
  if (cells.length <= 1) return true
  const own = new Set(cells.map(([x, y]) => `${x},${y}`))
  const visited = new Set<string>()
  const stack: MapCell[] = [cells[0]]
  visited.add(`${cells[0][0]},${cells[0][1]}`)
  const deltas: MapCell[] = [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
  ]
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    for (const [dx, dy] of deltas) {
      const key = `${x + dx},${y + dy}`
      if (own.has(key) && !visited.has(key)) {
        visited.add(key)
        stack.push([x + dx, y + dy])
      }
    }
  }
  return visited.size === cells.length
}

export function initialEditorState(layout: MapLayout): EditorState {
  const floors = floorsInLayout(layout)
  const activeZ = floors[0]?.z ?? layout.rooms[0]?.z ?? 0
  return { layout, selectedRoomId: null, selectedDoorId: null, activeZ }
}
