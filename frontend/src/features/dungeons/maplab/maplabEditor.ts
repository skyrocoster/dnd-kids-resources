import {
  absoluteCells,
  canPaintCell,
  floorsInLayout,
  nextDoorId,
  nextPortalId,
  nextPropId,
  nextRoomId,
  nextStairId,
  normalizeCells,
  roomOfCell,
  type CardinalSide,
  type MapCell,
  type MapDoor,
  type MapLayout,
  type MapPortal,
  type MapProp,
  type MapRoom,
  type MapStair,
} from './maplabModel'
import { FIXTURE_TYPES } from './fixtureTypes'

export interface EditorState {
  layout: MapLayout
  selectedRoomId: number | null
  selectedDoorId: number | null
  selectedPropId: number | null
  selectedStairId: number | null // Phase H
  selectedPortalId: number | null // Phase H
  activeZ: number
}

export type EditorAction =
  | { type: 'addRoom' }
  | { type: 'addFloorAbove' }
  | { type: 'addFloorBelow' }
  | { type: 'selectRoom'; roomId: number | null }
  | { type: 'deleteRoom'; roomId: number }
  | { type: 'toggleCell'; roomId: number; cell: [number, number] }
  | { type: 'setRoomFootprint'; roomId: number; cells: MapCell[] }
  | { type: 'setRoomMeta'; roomId: number; meta: { title?: string; description?: string; kind?: string } }
  | { type: 'addDoor'; cell: [number, number]; side: CardinalSide }
  | { type: 'selectDoor'; doorId: number | null }
  | { type: 'updateFixtureFlags'; fixtureId: number; fixtureType: 'door' | 'stair' | 'prop' | 'portal'; flags: Record<string, unknown> }
  | { type: 'deleteDoor'; doorId: number }
  | { type: 'addProp'; cell: [number, number] }
  | { type: 'selectProp'; propId: number | null }
  | { type: 'deleteProp'; propId: number }
  | { type: 'addStair'; from: { z: number; cell: [number, number] } } // Phase H, stub
  | { type: 'selectStair'; stairId: number | null } // Phase H, stub
  | { type: 'deleteStair'; stairId: number } // Phase H, stub
  | { type: 'setStairDirection'; z: number; cell: MapCell; direction: 'up' | 'down'; enabled: boolean } // Phase I
  | { type: 'addPortal'; cell: [number, number] } // Phase H
  | { type: 'selectPortal'; portalId: number | null } // Phase H
  | { type: 'deletePortal'; portalId: number } // Phase H
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
        selectedDoorId: null,
        selectedPropId: null,
        selectedStairId: null,
        selectedPortalId: null,
      }
    }

    case 'addFloorAbove': {
      const z = state.activeZ + 1
      if (state.layout.floors.some((floor) => floor.z === z)) return state
      return {
        ...state,
        layout: {
          ...state.layout,
          floors: [...state.layout.floors, { z, title: defaultFloorTitle(z) }],
        },
        activeZ: z,
        selectedRoomId: null,
        selectedDoorId: null,
        selectedPropId: null,
        selectedStairId: null,
        selectedPortalId: null,
      }
    }

    case 'addFloorBelow': {
      const z = state.activeZ - 1
      if (state.layout.floors.some((floor) => floor.z === z)) return state
      return {
        ...state,
        layout: {
          ...state.layout,
          floors: [...state.layout.floors, { z, title: defaultFloorTitle(z) }],
        },
        activeZ: z,
        selectedRoomId: null,
        selectedDoorId: null,
        selectedPropId: null,
        selectedStairId: null,
        selectedPortalId: null,
      }
    }

    case 'selectRoom':
      return {
        ...state,
        selectedRoomId: action.roomId,
        selectedDoorId: action.roomId === null ? state.selectedDoorId : null,
        selectedPropId: action.roomId === null ? state.selectedPropId : null,
        selectedStairId: action.roomId === null ? state.selectedStairId : null,
        selectedPortalId: action.roomId === null ? state.selectedPortalId : null,
      }

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

    case 'setRoomFootprint':
      {
        const room = state.layout.rooms.find((r) => r.room_id === action.roomId)
        if (!room) return state

        const uniqueCells = Array.from(new Map(action.cells.map((cell) => [`${cell[0]},${cell[1]}`, cell])).values())
        const sameFloorRooms = state.layout.rooms.filter((r) => r.z === room.z)
        const overlapsOtherRoom = uniqueCells.some((cell) => {
          const owner = roomOfCell(cell, sameFloorRooms)
          return owner !== null && owner.room_id !== action.roomId
        })
        if (overlapsOtherRoom || !isConnectedPolyomino(uniqueCells)) return state

        const { origin, cells } = normalizeCells(uniqueCells)
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
        z: state.activeZ,
        hidden: Boolean(defaults.hidden),
        locked: Boolean(defaults.locked),
        trapped: Boolean(defaults.trapped),
      }
      return {
        ...state,
        layout: { ...state.layout, doors: [...state.layout.doors, newDoor] },
        selectedDoorId: door_id,
        selectedRoomId: null,
        selectedPropId: null,
        selectedStairId: null,
        selectedPortalId: null,
      }
    }

    case 'selectDoor':
      return {
        ...state,
        selectedDoorId: action.doorId,
        selectedRoomId: action.doorId === null ? state.selectedRoomId : null,
        selectedPropId: action.doorId === null ? state.selectedPropId : null,
        selectedStairId: action.doorId === null ? state.selectedStairId : null,
        selectedPortalId: action.doorId === null ? state.selectedPortalId : null,
      }

    case 'updateFixtureFlags': {
      if (action.fixtureType === 'door') {
        const doors = state.layout.doors.map((door) =>
          door.door_id === action.fixtureId ? ({ ...door, ...action.flags } as MapDoor) : door,
        )
        return { ...state, layout: { ...state.layout, doors } }
      } else if (action.fixtureType === 'prop') {
        const props = state.layout.props.map((prop) =>
          prop.prop_id === action.fixtureId ? ({ ...prop, ...action.flags } as MapProp) : prop,
        )
        return { ...state, layout: { ...state.layout, props } }
      } else if (action.fixtureType === 'stair') {
        // A MapStair already stores both endpoints (from/to), so one record renders on both
        // floors via `stairCellForZ` — no separate paired record is needed here (unlike portals,
        // which are one-way objects). Destination is set structurally via `setStairDirection`
        // (always same x,y, adjacent z), so this stays a plain flag merge (title/hidden/locked/
        // trapped/note).
        const stairs = state.layout.stairs.map((stair) =>
          stair.stair_id === action.fixtureId ? ({ ...stair, ...action.flags } as MapStair) : stair,
        )
        return { ...state, layout: { ...state.layout, stairs } }
      } else if (action.fixtureType === 'portal') {
        const source = state.layout.portals.find((portal) => portal.portal_id === action.fixtureId)
        if (!source) return state
        const updatedSource = { ...source, ...action.flags } as MapPortal

        if ('to' in action.flags) {
          const target = updatedSource.to
          // The portal that currently points back at the source — its "pair" before this edit.
          // Portals only ever exist in pairs, so retargeting the source relocates this record to
          // the new destination rather than leaving it behind as an orphan one-way portal.
          const oldPair = state.layout.portals.find(
            (portal) =>
              portal.portal_id !== source.portal_id &&
              portal.to.z === source.z &&
              portal.to.cell[0] === source.cell[0] &&
              portal.to.cell[1] === source.cell[1],
          )
          const targetPortal = state.layout.portals.find(
            (portal) =>
              portal.portal_id !== source.portal_id &&
              portal.portal_id !== oldPair?.portal_id &&
              portal.z === target.z &&
              portal.cell[0] === target.cell[0] &&
              portal.cell[1] === target.cell[1],
          )

          let portals: MapPortal[]
          if (targetPortal) {
            // Re-link: an independent portal already sits at the target, so it becomes the new
            // pair — it now points back at the source. The old pair (if any) is dropped: nothing
            // points to it anymore, and an unpaired portal isn't a valid state.
            portals = state.layout.portals
              .filter((portal) => portal.portal_id !== oldPair?.portal_id)
              .map((portal) => {
                if (portal.portal_id === source.portal_id) return updatedSource
                if (portal.portal_id === targetPortal.portal_id) {
                  return { ...portal, to: { z: updatedSource.z, cell: updatedSource.cell } }
                }
                return portal
              })
          } else if (oldPair) {
            // Move the existing pair to the new target rather than creating a third portal.
            portals = state.layout.portals.map((portal) => {
              if (portal.portal_id === source.portal_id) return updatedSource
              if (portal.portal_id === oldPair.portal_id) {
                return { ...portal, cell: target.cell, z: target.z, to: { z: updatedSource.z, cell: updatedSource.cell } }
              }
              return portal
            })
          } else {
            // No existing pair (e.g. a freshly created portal) — auto-create one at the target.
            const newPortal: MapPortal = {
              portal_id: nextPortalId(state.layout),
              cell: target.cell,
              z: target.z,
              to: { z: updatedSource.z, cell: updatedSource.cell },
              hidden: false,
              locked: false,
              trapped: false,
            }
            portals = [
              ...state.layout.portals.map((portal) => (portal.portal_id === source.portal_id ? updatedSource : portal)),
              newPortal,
            ]
          }
          return { ...state, layout: { ...state.layout, portals } }
        }

        const portals = state.layout.portals.map((portal) =>
          portal.portal_id === source.portal_id ? updatedSource : portal,
        )
        return { ...state, layout: { ...state.layout, portals } }
      }
      return state
    }

    case 'deleteDoor': {
      const doors = state.layout.doors.filter((door) => door.door_id !== action.doorId)
      return {
        ...state,
        layout: { ...state.layout, doors },
        selectedDoorId: state.selectedDoorId === action.doorId ? null : state.selectedDoorId,
      }
    }

    case 'addProp': {
      const prop_id = nextPropId(state.layout)
      const defaults = FIXTURE_TYPES.prop.defaultFlags
      const newProp: MapProp = {
        prop_id,
        kind: String(defaults.kind),
        cell: action.cell,
        z: state.activeZ,
        title: String(defaults.title),
        hidden: Boolean(defaults.hidden),
        locked: Boolean(defaults.locked),
        trapped: Boolean(defaults.trapped),
      }
      return {
        ...state,
        layout: { ...state.layout, props: [...state.layout.props, newProp] },
        selectedPropId: prop_id,
        selectedRoomId: null,
        selectedDoorId: null,
        selectedStairId: null,
        selectedPortalId: null,
      }
    }

    case 'selectProp':
      return {
        ...state,
        selectedPropId: action.propId,
        selectedRoomId: action.propId === null ? state.selectedRoomId : null,
        selectedDoorId: action.propId === null ? state.selectedDoorId : null,
        selectedStairId: action.propId === null ? state.selectedStairId : null,
        selectedPortalId: action.propId === null ? state.selectedPortalId : null,
      }

    case 'deleteProp': {
      const props = state.layout.props.filter((prop) => prop.prop_id !== action.propId)
      return {
        ...state,
        layout: { ...state.layout, props },
        selectedPropId: state.selectedPropId === action.propId ? null : state.selectedPropId,
      }
    }

    case 'addStair': {
      const stair_id = nextStairId(state.layout)
      const defaults = FIXTURE_TYPES.stair.defaultFlags
      // Default direction: prefer down (the floor below is the common case — a stairwell
      // reachable from where you're standing), else up if there's no floor below, else fall back
      // to a same-floor placeholder on a single-floor layout (both direction checkboxes disabled,
      // inert until a floor exists to point at).
      const floors = floorsInLayout(state.layout)
      const hasFloorBelow = floors.some((floor) => floor.z === action.from.z - 1)
      const hasFloorAbove = floors.some((floor) => floor.z === action.from.z + 1)
      const to = hasFloorBelow
        ? { z: action.from.z - 1, cell: action.from.cell }
        : hasFloorAbove
          ? { z: action.from.z + 1, cell: action.from.cell }
          : action.from
      const newStair: MapStair = {
        stair_id,
        from: action.from,
        to,
        title: typeof defaults.title === 'string' ? defaults.title : undefined,
        hidden: Boolean(defaults.hidden),
        locked: Boolean(defaults.locked),
        trapped: Boolean(defaults.trapped),
      }
      return {
        ...state,
        layout: { ...state.layout, stairs: [...state.layout.stairs, newStair] },
        selectedStairId: stair_id,
        selectedRoomId: null,
        selectedDoorId: null,
        selectedPropId: null,
        selectedPortalId: null,
      }
    }

    case 'selectStair':
      return {
        ...state,
        selectedStairId: action.stairId,
        selectedRoomId: action.stairId === null ? state.selectedRoomId : null,
        selectedDoorId: action.stairId === null ? state.selectedDoorId : null,
        selectedPropId: action.stairId === null ? state.selectedPropId : null,
        selectedPortalId: action.stairId === null ? state.selectedPortalId : null,
      }

    case 'deleteStair': {
      const stairs = state.layout.stairs.filter((stair) => stair.stair_id !== action.stairId)
      return {
        ...state,
        layout: { ...state.layout, stairs },
        selectedStairId: state.selectedStairId === action.stairId ? null : state.selectedStairId,
      }
    }

    case 'setStairDirection': {
      // Stairs only ever cross to the adjacent floor at the same [x, y] — no arbitrary cell
      // picking. A cell can independently have an up-stair and/or a down-stair (a landing);
      // this toggles the one MapStair record for the given direction at (z, cell).
      const targetZ = action.direction === 'up' ? action.z + 1 : action.z - 1
      // A stair record is undirected — from/to just name its two endpoints — so it must match
      // regardless of which endpoint happens to be stored as `from` vs `to`.
      const endpointsMatch = (stair: MapStair, aZ: number, aCell: MapCell, bZ: number, bCell: MapCell) =>
        (stair.from.z === aZ && stair.from.cell[0] === aCell[0] && stair.from.cell[1] === aCell[1] &&
          stair.to.z === bZ && stair.to.cell[0] === bCell[0] && stair.to.cell[1] === bCell[1]) ||
        (stair.to.z === aZ && stair.to.cell[0] === aCell[0] && stair.to.cell[1] === aCell[1] &&
          stair.from.z === bZ && stair.from.cell[0] === bCell[0] && stair.from.cell[1] === bCell[1])
      const existing = state.layout.stairs.find((stair) =>
        endpointsMatch(stair, action.z, action.cell, targetZ, action.cell),
      )

      if (action.enabled) {
        if (existing) return state
        const newStair: MapStair = {
          stair_id: nextStairId(state.layout),
          from: { z: action.z, cell: action.cell },
          to: { z: targetZ, cell: action.cell },
          hidden: false,
          locked: false,
          trapped: false,
        }
        return {
          ...state,
          layout: { ...state.layout, stairs: [...state.layout.stairs, newStair] },
          selectedStairId: newStair.stair_id,
        }
      }

      if (!existing) return state
      const stairs = state.layout.stairs.filter((stair) => stair.stair_id !== existing.stair_id)
      return {
        ...state,
        layout: { ...state.layout, stairs },
        selectedStairId: state.selectedStairId === existing.stair_id ? null : state.selectedStairId,
      }
    }

    case 'addPortal': {
      const portal_id = nextPortalId(state.layout)
      const defaults = FIXTURE_TYPES.portal.defaultFlags
      const newPortal: MapPortal = {
        portal_id,
        cell: action.cell,
        z: state.activeZ,
        to: { z: state.activeZ, cell: action.cell }, // placeholder, set via the destination picker
        title: typeof defaults.title === 'string' ? defaults.title : undefined,
        hidden: Boolean(defaults.hidden),
        locked: Boolean(defaults.locked),
        trapped: Boolean(defaults.trapped),
      }
      return {
        ...state,
        layout: { ...state.layout, portals: [...state.layout.portals, newPortal] },
        selectedPortalId: portal_id,
        selectedRoomId: null,
        selectedDoorId: null,
        selectedPropId: null,
        selectedStairId: null,
      }
    }

    case 'selectPortal':
      return {
        ...state,
        selectedPortalId: action.portalId,
        selectedRoomId: action.portalId === null ? state.selectedRoomId : null,
        selectedDoorId: action.portalId === null ? state.selectedDoorId : null,
        selectedPropId: action.portalId === null ? state.selectedPropId : null,
        selectedStairId: action.portalId === null ? state.selectedStairId : null,
      }

    case 'deletePortal': {
      const portals = state.layout.portals.filter((portal) => portal.portal_id !== action.portalId)
      return {
        ...state,
        layout: { ...state.layout, portals },
        selectedPortalId: state.selectedPortalId === action.portalId ? null : state.selectedPortalId,
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
  return {
    layout,
    selectedRoomId: null,
    selectedDoorId: null,
    selectedPropId: null,
    selectedStairId: null,
    selectedPortalId: null,
    activeZ,
  }
}

function defaultFloorTitle(z: number): string {
  if (z === 0) return 'Ground Floor'
  if (z < 0) return z === -1 ? 'Basement' : `Basement ${Math.abs(z)}`

  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth']
  const ordinal = ordinals[z - 1]
  return ordinal ? `${ordinal} Floor` : `Floor ${z}`
}
