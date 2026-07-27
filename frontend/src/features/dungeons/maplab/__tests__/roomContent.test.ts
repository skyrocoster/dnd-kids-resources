import { describe, it, expect } from 'vitest'
import {
  roomIsOffMap,
  roomCarriesContent,
  roomEraseOutcome,
  ghostRoomIds,
} from '../roomContent'
import type { MapRoom, MapCell } from '../../../../model/maplabModel'
import type { DungeonRoom } from '../../dungeonModel'

describe('roomContent predicates', () => {
  describe('roomIsOffMap', () => {
    it('returns true for rooms with no cells', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [],
      }
      expect(roomIsOffMap(room)).toBe(true)
    })

    it('returns false for rooms with cells', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      expect(roomIsOffMap(room)).toBe(false)
    })
  })

  describe('roomCarriesContent', () => {
    it('returns false when both blobs are empty', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        title: '',
        description: '',
        kind: '',
        wallKind: '',
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '',
        entries: [],
        npcs: [],
      }
      expect(roomCarriesContent(room, dataRoom)).toBe(false)
    })

    it('returns false when dataRoom is undefined and MapRoom is empty', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        title: '',
      }
      expect(roomCarriesContent(room, undefined)).toBe(false)
    })

    it('returns true when MapRoom has non-empty title', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        title: 'The Throne Room',
      }
      expect(roomCarriesContent(room, undefined)).toBe(true)
    })

    it('returns true when MapRoom has non-empty description', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        description: 'A large hall with pillars',
      }
      expect(roomCarriesContent(room, undefined)).toBe(true)
    })

    it('returns true when MapRoom has non-empty kind', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        kind: 'treasure-chamber',
      }
      expect(roomCarriesContent(room, undefined)).toBe(true)
    })

    it('returns true when MapRoom has non-empty wallKind', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        wallKind: 'stone',
      }
      expect(roomCarriesContent(room, undefined)).toBe(true)
    })

    it('returns false when MapRoom fields are whitespace-only', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        title: '   ',
        description: '\t',
        kind: '\n',
        wallKind: ' ',
      }
      expect(roomCarriesContent(room, undefined)).toBe(false)
    })

    it('returns true when DungeonRoom has non-empty title', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: 'Guard Post',
        entries: [],
        npcs: [],
      }
      expect(roomCarriesContent(room, dataRoom)).toBe(true)
    })

    it('returns true when DungeonRoom has entries', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '',
        entries: [
          {
            entry_type: 'trap',
            title: 'Floor Trap',
            content: 'A trap',
          },
        ],
      }
      expect(roomCarriesContent(room, dataRoom)).toBe(true)
    })

    it('returns true when DungeonRoom has npcs', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '',
        entries: [],
        npcs: [1, 2, 3],
      }
      expect(roomCarriesContent(room, dataRoom)).toBe(true)
    })

    it('returns false when DungeonRoom title is whitespace-only', () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '  \t  ',
        entries: [],
        npcs: [],
      }
      expect(roomCarriesContent(room, dataRoom)).toBe(false)
    })
  })

  describe('roomEraseOutcome', () => {
    it("returns 'shrink' when cells remain after erase", () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0], [1, 0]],
      }
      const remainingCells: MapCell[] = [[0, 0]]
      const outcome = roomEraseOutcome(remainingCells, room, undefined)
      expect(outcome).toBe('shrink')
    })

    it("returns 'flag' when no cells remain and room carries content", () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
        title: 'Boss Chamber',
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '',
        entries: [],
        npcs: [],
      }
      const remainingCells: MapCell[] = []
      const outcome = roomEraseOutcome(remainingCells, room, dataRoom)
      expect(outcome).toBe('flag')
    })

    it("returns 'flag' when no cells remain and DungeonRoom carries content", () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: 'Treasure Room',
        entries: [],
        npcs: [],
      }
      const remainingCells: MapCell[] = []
      const outcome = roomEraseOutcome(remainingCells, room, dataRoom)
      expect(outcome).toBe('flag')
    })

    it("returns 'drop' when no cells remain and room carries no content", () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const dataRoom: DungeonRoom = {
        room_id: 1,
        title: '',
        entries: [],
        npcs: [],
      }
      const remainingCells: MapCell[] = []
      const outcome = roomEraseOutcome(remainingCells, room, dataRoom)
      expect(outcome).toBe('drop')
    })

    it("returns 'drop' when no cells remain, no MapRoom, and dataRoom is undefined", () => {
      const room: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0, 0]],
      }
      const remainingCells: MapCell[] = []
      const outcome = roomEraseOutcome(remainingCells, room, undefined)
      expect(outcome).toBe('drop')
    })
  })

  describe('ghostRoomIds', () => {
    it('returns empty array when no ghost rooms exist', () => {
      const rooms = [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [[0, 0]] } as MapRoom,
      ]
      const dataRooms = [
        { room_id: 1, title: '', entries: [], npcs: [] },
        { room_id: 2, title: '', entries: [], npcs: [] },
      ] as DungeonRoom[]
      const ghosts = ghostRoomIds(rooms, dataRooms)
      expect(ghosts).toEqual([])
    })

    it('returns room_ids of rooms that are off-map with no content', () => {
      const rooms = [
        { room_id: 1, z: 0, origin: [0, 0], cells: [] } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [] } as MapRoom,
      ]
      const dataRooms = [
        { room_id: 1, title: '', entries: [], npcs: [] },
        { room_id: 2, title: '', entries: [], npcs: [] },
      ] as DungeonRoom[]
      const ghosts = ghostRoomIds(rooms, dataRooms)
      expect(ghosts).toEqual([1, 2])
    })

    it('excludes off-map rooms that carry content', () => {
      const rooms = [
        { room_id: 1, z: 0, origin: [0, 0], cells: [] } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [] } as MapRoom,
      ]
      const dataRooms = [
        { room_id: 1, title: 'Secret Room', entries: [], npcs: [] },
        { room_id: 2, title: '', entries: [], npcs: [] },
      ] as DungeonRoom[]
      const ghosts = ghostRoomIds(rooms, dataRooms)
      expect(ghosts).toEqual([2])
    })

    it('excludes on-map rooms regardless of content', () => {
      const rooms = [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [] } as MapRoom,
      ]
      const dataRooms = [
        { room_id: 1, title: '', entries: [], npcs: [] },
        { room_id: 2, title: '', entries: [], npcs: [] },
      ] as DungeonRoom[]
      const ghosts = ghostRoomIds(rooms, dataRooms)
      expect(ghosts).toEqual([2])
    })

    it('handles null and undefined dataRooms', () => {
      const rooms = [
        { room_id: 1, z: 0, origin: [0, 0], cells: [] } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [] } as MapRoom,
      ]
      const ghosts1 = ghostRoomIds(rooms, null)
      const ghosts2 = ghostRoomIds(rooms, undefined)
      expect(ghosts1).toEqual([1, 2])
      expect(ghosts2).toEqual([1, 2])
    })

    it('selects ghosts based on MapRoom content when no dataRoom exists', () => {
      const rooms = [
        {
          room_id: 1,
          z: 0,
          origin: [0, 0],
          cells: [],
          title: 'Boss Room',
        } as MapRoom,
        { room_id: 2, z: 0, origin: [0, 0], cells: [] } as MapRoom,
      ]
      const ghosts = ghostRoomIds(rooms, null)
      expect(ghosts).toEqual([2])
    })
  })
})
