import { describe, it, expect } from 'vitest'
import {
  parseDungeonData,
  getRooms,
  getRoomById,
  getExitsFromRoom,
  groupEntriesByType,
  getRoomThreatHints,
  getRoomGraph,
  getAdjacentRoomIds,
  getFloors,
  getFloorForRoom,
  getRoomsOnFloor,
} from '../dungeonModel'

// Seed data for "Isly Castle" — minimal fixture for testing.
// These are actual entries from data/seeds/seed_dungeons.json (id: 4).
const islyData = {
  general_info: {
    title: 'Isly Castle',
    size: null,
    walls: null,
    floor: null,
    temperature: null,
    illumination: null,
  },
  rooms: [
    {
      room_id: 1,
      title: 'Outside',
      entries: [],
    },
    {
      room_id: 2,
      title: 'Entrance Hall',
      entries: [
        {
          entry_type: 'feature',
          title: 'Pillars',
          content: 'Two large stone pillars engraved with writings and clearly defaced by students over the years.',
          is_hidden: false,
          hidden_dc: null,
        },
      ],
    },
    {
      room_id: 3,
      title: 'Portal Room',
      entries: [
        {
          entry_type: 'feature',
          title: 'Stone Archways',
          content: 'two rows of large archways set upon marble pedestals',
          is_hidden: false,
          hidden_dc: null,
        },
        {
          entry_type: 'trap',
          title: 'Paralysing Light',
          content: 'attempting to touch or use a portal without the portal master results in a paralysing spell (DC 18 Con save)',
          is_hidden: false,
          hidden_dc: null,
        },
      ],
      npcs: [4],
    },
    {
      room_id: 4,
      title: 'Large Corridor',
      entries: [],
    },
    {
      room_id: 5,
      title: 'Great Hall',
      entries: [],
    },
  ],
  doors: [
    {
      door_id: 1,
      entry_type: 'door',
      title: 'Great Double Wooden Doors',
      content: '',
      leads_to: [2, 1],
      is_hidden: false,
      hidden_dc: null,
    },
    {
      door_id: 2,
      entry_type: 'door',
      title: 'Double Stone Doors',
      content: 'Enscribed with large runes. Reading them reveals they are teleportation runes of various types.',
      leads_to: [3, 2],
      is_hidden: false,
      hidden_dc: null,
    },
    {
      door_id: 3,
      entry_type: 'door',
      title: 'Ornate Wooden Door',
      content: '',
      leads_to: [4, 2],
      is_hidden: false,
      hidden_dc: null,
    },
    {
      door_id: 4,
      entry_type: 'door',
      title: 'Grand Double Wooden Doors',
      content: '',
      leads_to: [5, 4],
      is_hidden: false,
      hidden_dc: null,
    },
    // Hidden door for testing
    {
      door_id: 99,
      entry_type: 'door',
      title: 'Secret Passage',
      content: 'A hidden door.',
      leads_to: [5, 3],
      is_hidden: true,
      hidden_dc: 15,
    },
  ],
  corridors: [],
  map_image: null,
  map_image_length: 0,
}

describe('dungeonModel', () => {
  describe('parseDungeonData', () => {
    it('parses the opaque blob into typed DungeonData', () => {
      const parsed = parseDungeonData(islyData)
      expect(parsed.rooms).toBeDefined()
      expect(parsed.doors).toBeDefined()
      expect(parsed.general_info).toBeDefined()
    })

    it('handles null/undefined input gracefully', () => {
      const parsed = parseDungeonData(null)
      expect(parsed.rooms).toEqual([])
      expect(parsed.doors).toEqual([])
    })

    it('handles missing keys without throwing', () => {
      const partial = { rooms: [] }
      const parsed = parseDungeonData(partial)
      expect(parsed.doors).toEqual([])
      expect(parsed.general_info).toEqual({})
    })

    it('coerces numeric-string monster_id/encounter_id on entries (real seed data uses strings)', () => {
      const withStringIds = {
        rooms: [
          {
            room_id: 1,
            title: 'Kennels',
            entries: [
              { entry_type: 'encounter', title: 'Fight', content: '', encounter_id: '1', monster_id: '7' },
              { entry_type: 'feature', title: 'Empty', content: '', encounter_id: '', monster_id: 'not-a-number' },
            ],
          },
        ],
      }
      const parsed = parseDungeonData(withStringIds)
      const entries = parsed.rooms![0].entries!
      expect(entries[0].encounter_id).toBe(1)
      expect(entries[0].monster_id).toBe(7)
      expect(entries[1].encounter_id).toBeNull()
      expect(entries[1].monster_id).toBeNull()
    })
  })

  describe('getRooms', () => {
    it('returns all rooms from parsed data', () => {
      const parsed = parseDungeonData(islyData)
      const rooms = getRooms(parsed)
      expect(rooms.length).toBe(5)
      expect(rooms.map((r) => r.room_id)).toEqual([1, 2, 3, 4, 5])
    })

    it('returns empty array if no rooms', () => {
      const parsed = parseDungeonData({ rooms: [] })
      expect(getRooms(parsed)).toEqual([])
    })
  })

  describe('getRoomById', () => {
    it('finds a room by room_id', () => {
      const parsed = parseDungeonData(islyData)
      const room = getRoomById(parsed, 3)
      expect(room).toBeDefined()
      expect(room?.title).toBe('Portal Room')
    })

    it('returns undefined for unknown room_id', () => {
      const parsed = parseDungeonData(islyData)
      expect(getRoomById(parsed, 999)).toBeUndefined()
    })
  })

  describe('getExitsFromRoom', () => {
    it('finds all exits from a room', () => {
      const parsed = parseDungeonData(islyData)
      const exits = getExitsFromRoom(parsed, 2)
      expect(exits.length).toBeGreaterThan(0)
      expect(exits.every((e) => typeof e.toRoomId === 'number')).toBe(true)
    })

    it('resolves the *other* room_id from leads_to', () => {
      const parsed = parseDungeonData(islyData)
      // Door 1 has leads_to: [2, 1] so from room 1, it should lead to room 2
      const exits = getExitsFromRoom(parsed, 1)
      expect(exits.some((e) => e.toRoomId === 2)).toBe(true)
    })

    it('filters out self-loops', () => {
      const withSelfLoop = {
        ...islyData,
        doors: [
          ...islyData.doors,
          {
            door_id: 100,
            entry_type: 'door' as const,
            title: 'Mirror Door',
            content: '',
            leads_to: [5, 5],
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withSelfLoop)
      const exits = getExitsFromRoom(parsed, 5)
      expect(exits.some((e) => e.toRoomId === 5)).toBe(false)
    })

    it('deduplicates exits by destination room', () => {
      const withDupe = {
        ...islyData,
        doors: [
          ...islyData.doors,
          {
            door_id: 101,
            entry_type: 'door' as const,
            title: 'Second Door to Room 2',
            content: '',
            leads_to: [3, 2],
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withDupe)
      const exits = getExitsFromRoom(parsed, 3)
      const toRoom2 = exits.filter((e) => e.toRoomId === 2)
      // Should only have one exit to room 2 (the first door encountered)
      expect(toRoom2.length).toBe(1)
    })

    it('marks hidden exits correctly', () => {
      const parsed = parseDungeonData(islyData)
      const exits = getExitsFromRoom(parsed, 3)
      // Room 3 should have exits to 2 (via door 2) and to 5 (via hidden door 99)
      const toRoom2 = exits.find((e) => e.toRoomId === 2)
      const toRoom5 = exits.find((e) => e.toRoomId === 5)
      expect(toRoom2).toBeDefined()
      expect(toRoom5).toBeDefined()
      expect(toRoom5?.isHidden).toBe(true)
      expect(toRoom5?.hiddenDc).toBe(15)
    })

    it('resolves toRoom reference when available', () => {
      const parsed = parseDungeonData(islyData)
      const exits = getExitsFromRoom(parsed, 1)
      const toRoom2 = exits.find((e) => e.toRoomId === 2)
      expect(toRoom2?.toRoom).toBeDefined()
      expect(toRoom2?.toRoom?.title).toBe('Entrance Hall')
    })

    it('returns exits from a room that is destination of multiple doors', () => {
      const parsed = parseDungeonData(islyData)
      // Room 5 is reached by door 4 (from room 4) and door 99 (from room 3)
      // From room 5's perspective, it should have exits to both room 4 and room 3
      const exits = getExitsFromRoom(parsed, 5)
      expect(exits.length).toBeGreaterThan(0)
      const destIds = exits.map((e) => e.toRoomId)
      expect(destIds).toContain(4)
      expect(destIds).toContain(3)
    })

    it('handles scalar leads_to gracefully', () => {
      const withScalar = {
        ...islyData,
        doors: [
          {
            door_id: 102,
            entry_type: 'door' as const,
            title: 'Scalar Door',
            content: '',
            leads_to: 2, // scalar instead of array
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withScalar)
      // Should not crash, and doors without valid 2-element leads_to should be skipped
      expect(() => getExitsFromRoom(parsed, 1)).not.toThrow()
    })
  })

  describe('groupEntriesByType', () => {
    it('groups entries by type with labels', () => {
      const parsed = parseDungeonData(islyData)
      const room = getRoomById(parsed, 3)!
      const grouped = groupEntriesByType(room)
      expect(grouped.length).toBeGreaterThan(0)
      expect(grouped.some((g) => g.label === 'Features')).toBe(true)
      expect(grouped.some((g) => g.label === 'Traps')).toBe(true)
    })

    it('returns empty array for room with no entries', () => {
      const parsed = parseDungeonData(islyData)
      const room = getRoomById(parsed, 1)!
      const grouped = groupEntriesByType(room)
      expect(grouped.length).toBe(0)
    })

    it('assigns unrecognized types to "Other"', () => {
      const withUnknown = {
        ...islyData,
        rooms: [
          {
            room_id: 99,
            title: 'Mystery Room',
            entries: [
              {
                entry_type: 'unknown_type',
                title: 'Mystery',
                content: 'A mysterious thing',
              },
            ],
          },
        ],
      }
      const parsed = parseDungeonData(withUnknown)
      const room = getRoomById(parsed, 99)!
      const grouped = groupEntriesByType(room)
      expect(grouped.some((g) => g.label === 'Other')).toBe(true)
    })
  })

  describe('getRoomThreatHints', () => {
    it('detects traps in a room', () => {
      const parsed = parseDungeonData(islyData)
      const room = getRoomById(parsed, 3)! // Portal Room has a trap
      const hints = getRoomThreatHints(room)
      expect(hints.hasTrap).toBe(true)
    })

    it('detects no threats when absent', () => {
      const parsed = parseDungeonData(islyData)
      const room = getRoomById(parsed, 1)! // Outside has no entries
      const hints = getRoomThreatHints(room)
      expect(hints.hasTrap).toBe(false)
      expect(hints.hasMonster).toBe(false)
      expect(hints.hasEncounter).toBe(false)
    })
  })

  describe('getAdjacentRoomIds', () => {
    it('returns destination room IDs from a room', () => {
      const parsed = parseDungeonData(islyData)
      const adjacent = getAdjacentRoomIds(parsed, 1)
      expect(adjacent).toContain(2)
    })

    it('returns empty array if no adjacent rooms', () => {
      const isolated = {
        general_info: {},
        rooms: [{ room_id: 99, title: 'Isolated', entries: [] }],
        doors: [],
        corridors: [],
      }
      const parsed = parseDungeonData(isolated)
      const adjacent = getAdjacentRoomIds(parsed, 99)
      expect(adjacent).toEqual([])
    })
  })

  describe('getRoomGraph', () => {
    it('produces a graph with nodes for all rooms', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      expect(graph.nodes.length).toBe(5)
      expect(graph.nodes.map((n) => n.roomId)).toEqual([1, 2, 3, 4, 5])
    })

    it('produces edges from all valid doors', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      expect(graph.edges.length).toBeGreaterThan(0)
      expect(graph.edges.every((e) => e.doorId && typeof e.a === 'number' && typeof e.b === 'number')).toBe(true)
    })

    it('excludes self-loop edges', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      expect(graph.edges.some((e) => e.a === e.b)).toBe(false)
    })

    it('excludes edges to unknown rooms', () => {
      const withBadDoor = {
        ...islyData,
        doors: [
          ...islyData.doors,
          {
            door_id: 200,
            entry_type: 'door' as const,
            title: 'Portal to Void',
            content: '',
            leads_to: [1, 999], // 999 does not exist
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withBadDoor)
      const graph = getRoomGraph(parsed)
      expect(graph.edges.some((e) => e.doorId === 200)).toBe(false)
    })

    it('includes threat hints on nodes', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      const node3 = graph.nodes.find((n) => n.roomId === 3)
      expect(node3?.hints.hasTrap).toBe(true)
    })

    it('includes optional geometry slots (typed but unpopulated)', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      for (const node of graph.nodes) {
        expect(node).toHaveProperty('position')
        expect(node).toHaveProperty('floorId')
      }
    })

    it('marks hidden doors in edges', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)
      const hiddenEdge = graph.edges.find((e) => e.isHidden)
      expect(hiddenEdge).toBeDefined()
      expect(hiddenEdge?.hiddenDc).toBe(15)
    })
  })

  describe('end-to-end: navigating a full dungeon', () => {
    it('can traverse the fixture dungeon and reach all rooms', () => {
      const parsed = parseDungeonData(islyData)
      const visited = new Set<number>()
      const queue: number[] = [1] // Start at room 1 (Outside)

      while (queue.length > 0) {
        const roomId = queue.shift()!
        if (visited.has(roomId)) continue
        visited.add(roomId)

        const exits = getExitsFromRoom(parsed, roomId)
        for (const exit of exits) {
          if (!visited.has(exit.toRoomId)) {
            queue.push(exit.toRoomId)
          }
        }
      }

      // All rooms should be reachable
      expect(visited).toContain(1)
      expect(visited).toContain(2)
      expect(visited).toContain(3)
      expect(visited).toContain(4)
      expect(visited).toContain(5)
    })

    it('exits derive from graph edges (single source of truth)', () => {
      const parsed = parseDungeonData(islyData)
      const graph = getRoomGraph(parsed)

      for (const node of graph.nodes) {
        const exits = getExitsFromRoom(parsed, node.roomId)

        // Each exit should correspond to a graph edge
        for (const exit of exits) {
          const edge = graph.edges.find(
            (e) =>
              (e.a === node.roomId && e.b === exit.toRoomId) ||
              (e.b === node.roomId && e.a === exit.toRoomId),
          )
          expect(edge, `Room ${node.roomId} exit to ${exit.toRoomId} has no graph edge`).toBeDefined()
        }

        // Each edge connected to this room should have at most one deduplicated exit
        // (doors to the same destination are deduplicated, keeping only the first)
        const edgesConnectedToNode = graph.edges.filter(
          (e) => e.a === node.roomId || e.b === node.roomId,
        )
        const uniqueDestinations = new Set<number>()
        for (const edge of edgesConnectedToNode) {
          const dest = edge.a === node.roomId ? edge.b : edge.a
          uniqueDestinations.add(dest)
        }
        expect(exits.length).toBeLessThanOrEqual(uniqueDestinations.size)
      }
    })
  })

  describe('Floor selectors', () => {
    it('returns empty array when no floors present', () => {
      const parsed = parseDungeonData(islyData)
      const floors = getFloors(parsed)
      expect(floors).toEqual([])
    })

    it('maps rooms to their floor', () => {
      const withFloors = {
        ...islyData,
        floors: [
          { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
          { floor_id: 2, title: 'Second Floor', room_ids: [4, 5], floor_below: 1, floor_above: null },
        ],
      }
      const parsed = parseDungeonData(withFloors)

      const floor1 = getFloorForRoom(parsed, 1)
      expect(floor1?.floor_id).toBe(1)

      const floor5 = getFloorForRoom(parsed, 5)
      expect(floor5?.floor_id).toBe(2)
    })

    it('returns rooms on a specific floor', () => {
      const withFloors = {
        ...islyData,
        floors: [
          { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
          { floor_id: 2, title: 'Second Floor', room_ids: [4, 5], floor_below: 1, floor_above: null },
        ],
      }
      const parsed = parseDungeonData(withFloors)

      const floor1Rooms = getRoomsOnFloor(parsed, 1)
      expect(floor1Rooms.map((r) => r.room_id)).toEqual([1, 2, 3])

      const floor2Rooms = getRoomsOnFloor(parsed, 2)
      expect(floor2Rooms.map((r) => r.room_id)).toEqual([4, 5])
    })
  })

  describe('Stair exits', () => {
    it('includes stairs in getExitsFromRoom', () => {
      const withStairs = {
        ...islyData,
        floors: [
          { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
          { floor_id: 2, title: 'Second Floor', room_ids: [4, 5], floor_below: 1, floor_above: null },
        ],
        stairs: [
          {
            stair_id: 10,
            title: 'Stone Stairs',
            leads_to_rooms: [3, 4],
            leads_to_floors: [1, 2],
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withStairs)

      // Room 3 (ground floor) should have a stair exit to room 4 (second floor)
      const exits3 = getExitsFromRoom(parsed, 3)
      const stairExit = exits3.find((e) => e.kind === 'stair')
      expect(stairExit).toBeDefined()
      expect(stairExit?.toRoomId).toBe(4)
      expect(stairExit?.direction).toBe('up')

      // Room 4 (second floor) should have a stair exit to room 3 (ground floor)
      const exits4 = getExitsFromRoom(parsed, 4)
      const downStair = exits4.find((e) => e.kind === 'stair')
      expect(downStair).toBeDefined()
      expect(downStair?.toRoomId).toBe(3)
      expect(downStair?.direction).toBe('down')
    })

    it('includes stairs in getRoomGraph', () => {
      const withStairs = {
        ...islyData,
        floors: [
          { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
          { floor_id: 2, title: 'Second Floor', room_ids: [4, 5], floor_below: 1, floor_above: null },
        ],
        stairs: [
          {
            stair_id: 10,
            title: 'Stone Stairs',
            leads_to_rooms: [3, 4],
            leads_to_floors: [1, 2],
            is_hidden: false,
            hidden_dc: null,
          },
        ],
      }
      const parsed = parseDungeonData(withStairs)
      const graph = getRoomGraph(parsed)

      const stairEdge = graph.edges.find((e) => e.kind === 'stair')
      expect(stairEdge).toBeDefined()
      expect(stairEdge?.stairId).toBe(10)
      expect([stairEdge?.a, stairEdge?.b].sort()).toEqual([3, 4])
    })

    it('populates floorId on graph nodes', () => {
      const withFloors = {
        ...islyData,
        floors: [
          { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
        ],
      }
      const parsed = parseDungeonData(withFloors)
      const graph = getRoomGraph(parsed)

      const node1 = graph.nodes.find((n) => n.roomId === 1)
      expect(node1?.floorId).toBe(1)

      const node4 = graph.nodes.find((n) => n.roomId === 4)
      expect(node4?.floorId).toBeUndefined()
    })
  })
})
