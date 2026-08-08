import { describe, it, expect } from 'vitest'
import { mapLabLayout } from '../maplabData'
import {
  absoluteCells,
  layoutBounds,
  paddedBounds,
  neighborCell,
  oppositeSide,
  doorWallSegment,
  roomOfCell,
  roomLabelAnchor,
  roomWallSegments,
  findDoorAtEdge,
  nonDoorWallSegments,
  floorsInLayout,
  roomsOnZ,
  stairEndpointsForZ,
  stairCellForZ,
  otherFloorZ,
  gridMarkerOffset,
  markersAtCell,
  sharedWallSegments,
  ghostFloorZ,
  doorsOnFloor,
  propsOnFloor,
  normalizeLayout,
  type MapLayout,
  type MapRoom,
  type MapDoor,
  type MapStair,
} from '../../../../model/maplabModel'

const baseDoorFlags = { hidden: false, locked: false, trapped: false }

describe('maplabModel (M0a scaffold)', () => {
  it('layout data exists and is typed', () => {
    expect(mapLabLayout).toBeDefined()
    expect(mapLabLayout.rooms).toHaveLength(6) // 4 from Cases 1/2 + 2 test L-shapes (stage 0)
    expect(mapLabLayout.doors).toHaveLength(2) // door 32 (Case 1) + door 98 (Stage 4 trapped test fixture)
    expect(mapLabLayout.floors).toHaveLength(3) // z:0, z:1, z:2 (stage 0)
 })
})

  describe('absoluteCells', () => {
    it('translates a rectangular room (17) by its origin', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const cells = absoluteCells(room17)
      expect(cells).toHaveLength(24) // 6x4 = 30x20 ft
      expect(cells).toContainEqual([0, 0])
      expect(cells).toContainEqual([5, 3])
    })

    it('translates an L-shaped room (23) by its origin', () => {
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      const cells = absoluteCells(room23)
      expect(cells).toHaveLength(12) // 4x4 minus a 2x2 notch
      expect(cells).toContainEqual([6, 0])
      expect(cells).toContainEqual([6, 3])
      expect(cells).not.toContainEqual([8, 2]) // notch cell, absent
    })

    it('handles a non-zero, non-trivial origin', () => {
      const room: MapRoom = { room_id: 99, z: 0, origin: [5, 7], cells: [[0, 0], [-1, 0]] }
      expect(absoluteCells(room)).toEqual([
        [5, 7],
        [4, 7],
      ])
    })
  })

  describe('layoutBounds', () => {
    it('computes bounds over a rectangle', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      expect(layoutBounds([room17])).toEqual({ minX: 0, maxX: 5, minY: 0, maxY: 3 })
    })

    it('computes bounds over a rectangle plus an L-shape', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      expect(layoutBounds([room17, room23])).toEqual({ minX: 0, maxX: 9, minY: 0, maxY: 3 })
    })

    it('returns zeroed bounds for an empty room list', () => {
      expect(layoutBounds([])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
    })
  })

  describe('paddedBounds', () => {
    it('expands a single room by meta.padding on every side', () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [mapLabLayout.rooms.find((r) => r.room_id === 17)!],
        doors: [],
        stairs: [],
        floors: [],
        props: [],
        portals: [],
        features: [],
      }
      expect(paddedBounds(layout)).toEqual({ minX: -3, maxX: 8, minY: -3, maxY: 6 })
    })

    it('expands and centers the union for a rectangle plus an L-shape', () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 2, right: 2, bottom: 2, left: 2 } },
        rooms: [
          mapLabLayout.rooms.find((r) => r.room_id === 17)!,
          mapLabLayout.rooms.find((r) => r.room_id === 23)!,
        ],
        doors: [],
        stairs: [],
        floors: [],
        props: [],
        portals: [],
        features: [],
      }
      expect(paddedBounds(layout)).toEqual({ minX: -2, maxX: 11, minY: -2, maxY: 5 })
    })

    it('computes bounds over all rooms across both floors (two-floor case), not just the active one', () => {
      // mapLabLayout.meta.padding is 3; rooms include the z:1 landing sharing the ground floor's x/y space.
      expect(paddedBounds(mapLabLayout)).toEqual({ minX: -3, maxX: 14, minY: -3, maxY: 6 })
    })
  })

  describe('padding migration', () => {
    it('converts old single-number padding to per-side padding', () => {
      const oldLayout = {
        meta: { cellSizeFt: 5, padding: 3 as unknown as { top: number; right: number; bottom: number; left: number } },
        rooms: [],
        doors: [],
        stairs: [],
        floors: [],
        props: [],
        features: [],
        portals: [],
      } as MapLayout
      const result = normalizeLayout(oldLayout)
      expect(result.meta.padding).toEqual({ top: 3, right: 3, bottom: 3, left: 3 })
    })
  })

  describe('neighborCell', () => {
    it.each([
      ['N', [3, 4]],
      ['S', [3, 6]],
      ['E', [4, 5]],
      ['W', [2, 5]],
    ] as const)('resolves %s neighbor', (side, expected) => {
      expect(neighborCell([3, 5], side)).toEqual(expected)
    })
  })

  describe('doorWallSegment', () => {
    it('returns the east wall segment of a cell', () => {
      const door: MapDoor = { door_id: 32, cell: [2, 1], side: 'E', ...baseDoorFlags }
      expect(doorWallSegment(door, 48)).toEqual({ x1: 144, y1: 48, x2: 144, y2: 96 })
    })

    it('returns the north wall segment of a cell', () => {
      const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', ...baseDoorFlags }
      expect(doorWallSegment(door, 48)).toEqual({ x1: 0, y1: 0, x2: 48, y2: 0 })
    })

    it('returns the south wall segment of a cell', () => {
      const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'S', ...baseDoorFlags }
      expect(doorWallSegment(door, 48)).toEqual({ x1: 0, y1: 48, x2: 48, y2: 48 })
    })

    it('returns the west wall segment of a cell', () => {
      const door: MapDoor = { door_id: 1, cell: [1, 1], side: 'W', ...baseDoorFlags }
      expect(doorWallSegment(door, 48)).toEqual({ x1: 48, y1: 48, x2: 48, y2: 96 })
    })
  })

  describe('oppositeSide', () => {
    it.each([
      ['N', 'S'],
      ['S', 'N'],
      ['E', 'W'],
      ['W', 'E'],
    ] as const)('%s is opposite %s', (side, expected) => {
      expect(oppositeSide(side)).toBe(expected)
    })
  })

  describe('roomWallSegments', () => {
    it('computes the full perimeter of the rectangular hall (17): 2*(6+4)=20 edges', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      expect(roomWallSegments(room17)).toHaveLength(20)
    })

    it('excludes interior edges between two cells of the same room', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const edges = roomWallSegments(room17)
      expect(edges).not.toContainEqual({ cell: [1, 1], side: 'E' })
    })

    it('includes the edge shared with an adjacent room (Hall/Armoury shared wall)', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const edges = roomWallSegments(room17)
      expect(edges).toContainEqual({ cell: [5, 3], side: 'E' })
    })

    it('computes the L-shaped armoury (23) perimeter, including the notch inner corner: 16 edges', () => {
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      const edges = roomWallSegments(room23)
      expect(edges).toHaveLength(16)
      // Cells bordering the notch must wall against it (the L's inner corner).
      expect(edges).toContainEqual({ cell: [8, 1], side: 'S' })
      expect(edges).toContainEqual({ cell: [7, 2], side: 'E' })
      // The mirrored edge of the Hall/Armoury shared wall, from the Armoury's own side.
      expect(edges).toContainEqual({ cell: [6, 3], side: 'W' })
    })
  })

  describe('findDoorAtEdge', () => {
    const door32: MapDoor = { door_id: 32, cell: [5, 3], side: 'E', hidden: false, locked: true, trapped: false }

    it('matches a door from its own cell/side', () => {
      expect(findDoorAtEdge({ cell: [5, 3], side: 'E' }, [door32])?.door_id).toBe(32)
    })

    it('matches a door from the mirrored neighbor cell/side (the other room’s perspective)', () => {
      expect(findDoorAtEdge({ cell: [6, 3], side: 'W' }, [door32])?.door_id).toBe(32)
    })

    it('returns undefined for an edge with no door', () => {
      expect(findDoorAtEdge({ cell: [0, 0], side: 'N' }, [door32])).toBeUndefined()
    })
  })

  describe('nonDoorWallSegments', () => {
    it("excludes exactly the door's segment from the hall's perimeter (20 -> 19)", () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const walls = nonDoorWallSegments(room17, mapLabLayout.doors)
      expect(walls).toHaveLength(19)
      expect(walls).not.toContainEqual({ cell: [5, 3], side: 'E' })
    })

    it("excludes exactly the mirrored door segment from the armoury's perimeter (16 -> 15)", () => {
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      const walls = nonDoorWallSegments(room23, mapLabLayout.doors)
      expect(walls).toHaveLength(15)
      expect(walls).not.toContainEqual({ cell: [6, 3], side: 'W' })
    })
  })

  describe('roomOfCell', () => {
    it('finds the rectangular room owning a cell', () => {
      expect(roomOfCell([1, 1], mapLabLayout.rooms)?.room_id).toBe(17)
    })

    it('finds the L-shaped room owning a cell', () => {
      expect(roomOfCell([6, 0], mapLabLayout.rooms)?.room_id).toBe(23)
    })

    it('returns null for the L-shape notch that is not part of the room', () => {
      // Room 23 origin [6,0] with a 2x2 notch missing at relative [2,2]-[3,3] — [8,2] is absent.
      expect(roomOfCell([8, 2], mapLabLayout.rooms)).toBeNull()
    })

    it('returns null for a cell outside all rooms', () => {
      expect(roomOfCell([100, 100], mapLabLayout.rooms)).toBeNull()
    })
  })

  describe('floorsInLayout', () => {
    it('returns all floors sorted by z ascending', () => {
      expect(floorsInLayout(mapLabLayout).map((f) => f.z)).toEqual([0, 1, 2])
    })
  })

  describe('roomsOnZ', () => {
    it('returns only rooms on the ground floor (z:0)', () => {
      const ids = roomsOnZ(mapLabLayout, 0).map((r) => r.room_id).sort()
      expect(ids).toEqual([17, 23, 32])
    })

    it('returns only rooms on the first floor (z:1)', () => {
      const ids = roomsOnZ(mapLabLayout, 1).map((r) => r.room_id)
      expect(ids).toEqual([33])
    })

    it('returns an empty array for a floor with no rooms', () => {
      expect(roomsOnZ(mapLabLayout, 5)).toEqual([])
    })
  })

  describe('stairEndpointsForZ', () => {
    it('finds stair 2 from the ground-floor endpoint', () => {
      const stairs = stairEndpointsForZ(mapLabLayout, 0)
      expect(stairs.map((s) => s.stair_id)).toEqual([2])
    })

    it('finds stair 2 from the first-floor endpoint', () => {
      const stairs = stairEndpointsForZ(mapLabLayout, 1)
      expect(stairs.map((s) => s.stair_id)).toEqual([2])
    })

    it('returns an empty array for a floor with no stairs', () => {
      expect(stairEndpointsForZ(mapLabLayout, 5)).toEqual([])
    })
  })

  describe('stairCellForZ / otherFloorZ', () => {
    const stair: MapStair = {
      stair_id: 100,
      from: { z: 0, cell: [2, 3] },
      to: { z: 1, cell: [4, 5] },
      hidden: false,
      locked: false,
      trapped: false,
    }

    it('returns the from cell at the from floor, the to cell at the to floor', () => {
      expect(stairCellForZ(stair, 0)).toEqual([2, 3])
      expect(stairCellForZ(stair, 1)).toEqual([4, 5])
    })

    it('returns null for an unrelated floor', () => {
      expect(stairCellForZ(stair, 5)).toBeNull()
    })

    it('otherFloorZ returns the opposite endpoint', () => {
      expect(otherFloorZ(stair, 0)).toBe(1)
      expect(otherFloorZ(stair, 1)).toBe(0)
    })
  })

  describe('gridMarkerOffset + markersAtCell — co-located landings', () => {
    const up: MapStair = { stair_id: 1, from: { z: 0, cell: [2, 2] }, to: { z: 1, cell: [2, 2] }, hidden: false, locked: false, trapped: false }
    const down: MapStair = { stair_id: 2, from: { z: 0, cell: [2, 2] }, to: { z: -1, cell: [2, 2] }, hidden: false, locked: false, trapped: false }
    const elsewhere: MapStair = { stair_id: 3, from: { z: 0, cell: [9, 9] }, to: { z: 1, cell: [9, 9] }, hidden: false, locked: false, trapped: false }

    it('a lone stair on its cell gets no offset', () => {
      const layout: MapLayout = { ...mapLabLayout, stairs: [elsewhere], portals: [], props: [] }
      const group = markersAtCell(layout, 0, [9, 9])
      expect(group).toHaveLength(1)
      expect(gridMarkerOffset(group.length, 0)).toEqual({ dx: 0, dy: 0 })
    })

    it('two stairs sharing a cell fan out symmetrically around zero', () => {
      const layout: MapLayout = { ...mapLabLayout, stairs: [up, down], portals: [], props: [] }
      const group = markersAtCell(layout, 0, [2, 2])
      expect(group).toHaveLength(2)
      const offsetA = gridMarkerOffset(group.length, 0)
      const offsetB = gridMarkerOffset(group.length, 1)
      expect(offsetA.dy).toBe(0)
      expect(offsetB.dy).toBe(0)
      expect(offsetA.dx).toBe(-offsetB.dx)
      expect(offsetA.dx).not.toBe(0)
    })

    it('stairs on different cells are unaffected by each other', () => {
      const layout: MapLayout = { ...mapLabLayout, stairs: [up, down, elsewhere], portals: [], props: [] }
      const group = markersAtCell(layout, 0, [9, 9])
      expect(group).toHaveLength(1)
      expect(gridMarkerOffset(group.length, 0)).toEqual({ dx: 0, dy: 0 })
    })
  })

  describe('ghostFloorZ', () => {
    it('returns the nearest lower floor with rooms', () => {
      expect(ghostFloorZ(mapLabLayout, 1)).toBe(0)
    })

    it('returns null at the lowest floor with rooms', () => {
      expect(ghostFloorZ(mapLabLayout, 0)).toBeNull()
    })

    it('returns the nearest lower floor even when higher floors exist too', () => {
      expect(ghostFloorZ(mapLabLayout, 2)).toBe(1)
    })
  })

  describe('doorsOnFloor / propsOnFloor — floor-stacked coordinates', () => {
    // Regression: two floors can legitimately share an [x,y] (a stairwell's aligned coordinates —
    // room 32 z:0 and room 33 z:1 both sit at [11,0] in the real fixture). Spatial-only inference
    // can't tell which floor a door/prop belongs to in that case; the authored `z` field must win.
    const stackedLayout: MapLayout = {
      meta: { cellSizeFt: 5, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
        { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]] },
      ],
      doors: [
        { door_id: 1, cell: [0, 0], side: 'N', z: 0, ...baseDoorFlags },
        { door_id: 2, cell: [0, 0], side: 'S', z: 1, ...baseDoorFlags },
      ],
      stairs: [],
      floors: [{ z: 0 }, { z: 1 }],
      props: [
        { prop_id: 1, kind: 'chest', cell: [0, 0], z: 0, ...baseDoorFlags },
        { prop_id: 2, kind: 'table', cell: [0, 0], z: 1, ...baseDoorFlags },
      ],
      portals: [],
      features: [],
    }

    it('doorsOnFloor resolves by authored z, not just spatial cell overlap', () => {
      expect(doorsOnFloor(stackedLayout, 0).map((d) => d.door_id)).toEqual([1])
      expect(doorsOnFloor(stackedLayout, 1).map((d) => d.door_id)).toEqual([2])
    })

    it('propsOnFloor resolves by authored z, not just spatial cell overlap', () => {
      expect(propsOnFloor(stackedLayout, 0).map((p) => p.prop_id)).toEqual([1])
      expect(propsOnFloor(stackedLayout, 1).map((p) => p.prop_id)).toEqual([2])
    })

    it('falls back to spatial inference when z is absent (legacy data)', () => {
      const legacyLayout: MapLayout = {
        ...stackedLayout,
        doors: [{ door_id: 3, cell: [0, 0], side: 'N', ...baseDoorFlags }],
      }
      // Single floor with a room at [0,0]; no ambiguity, so the spatial fallback still resolves.
      expect(doorsOnFloor({ ...legacyLayout, rooms: [legacyLayout.rooms[0]] }, 0).map((d) => d.door_id)).toEqual([3])
    })

    it('the real fixture: door98 (Rusty Trap Door, z:0) does not leak onto floor 1 despite room 32/33 sharing [11,0]', () => {
      expect(doorsOnFloor(mapLabLayout, 0).map((d) => d.door_id)).toContain(98)
      expect(doorsOnFloor(mapLabLayout, 1).map((d) => d.door_id)).not.toContain(98)
    })
  })

describe('maplabModel (Stage 0 data)', () => {
  it('includes the interlocking L-shaped test pair on z:2', () => {
    const zTwoRooms = mapLabLayout.rooms.filter((r) => r.z === 2)
    expect(zTwoRooms).toHaveLength(2)
    expect(zTwoRooms.map((r) => r.room_id)).toEqual([99, 100])
  })

  it('includes the Two-Wing Test Layout floor', () => {
    const testFloor = mapLabLayout.floors.find((f) => f.z === 2)
    expect(testFloor?.title).toBe('Two-Wing Test Layout')
  })

  it('adds optional description and kind fields to MapRoom', () => {
    const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
    expect(room17.description).toBeDefined()
    expect(room17.description).toContain('training')
  })

  it('floorsInLayout now returns 3 floors (z:0, z:1, z:2) with stage-0 test data', () => {
    expect(floorsInLayout(mapLabLayout).map((f) => f.z)).toEqual([0, 1, 2])
  })
})

describe('maplabModel (Stage 1 geometry helpers)', () => {
  describe('sharedWallSegments', () => {
    it('finds the full shared wall between the rectangular Hall and the L-shaped Armoury, including the door edge', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      // Rooms 17 and 23 are both 4 rows tall (y:0-3) and the Armoury's notch only removes its
      // eastern cells (relative x:2-3), so the whole shared column faces room 17 — 4 edges,
      // one of which (y=3) is the Heavy Stone Door.
      expect(sharedWallSegments(room17, room23, mapLabLayout.doors)).toEqual([
        { cell: [5, 0], side: 'E' },
        { cell: [5, 1], side: 'E' },
        { cell: [5, 2], side: 'E' },
        { cell: [5, 3], side: 'E' },
      ])
      expect(sharedWallSegments(room23, room17, mapLabLayout.doors)).toEqual([
        { cell: [6, 0], side: 'W' },
        { cell: [6, 1], side: 'W' },
        { cell: [6, 2], side: 'W' },
        { cell: [6, 3], side: 'W' },
      ])
    })

    it('finds the full zigzag boundary shared by the interlocking L-shaped test pair (99/100)', () => {
      const west = mapLabLayout.rooms.find((r) => r.room_id === 99)!
      const east = mapLabLayout.rooms.find((r) => r.room_id === 100)!
      const fromWest = sharedWallSegments(west, east, [])
      const fromEast = sharedWallSegments(east, west, [])

      // A straight vertical divide would produce 4 edges; the boundary here steps twice
      // (zigzag), producing 6 — proof the pair interlocks rather than sitting side by side.
      expect(fromWest).toHaveLength(6)
      expect(fromEast).toHaveLength(6)
      expect(fromWest).toEqual(
        expect.arrayContaining([
          { cell: [2, 0], side: 'E' },
          { cell: [2, 0], side: 'S' },
          { cell: [1, 1], side: 'E' },
          { cell: [1, 2], side: 'E' },
          { cell: [1, 2], side: 'S' },
          { cell: [0, 3], side: 'E' },
        ]),
      )
      expect(fromEast).toEqual(
        expect.arrayContaining([
          { cell: [3, 0], side: 'W' },
          { cell: [2, 1], side: 'N' },
          { cell: [2, 1], side: 'W' },
          { cell: [2, 2], side: 'W' },
          { cell: [1, 3], side: 'N' },
          { cell: [1, 3], side: 'W' },
        ]),
      )
    })

    it('proves the interlocking pair has no overlapping cells and covers the full 4x4 square', () => {
      const west = mapLabLayout.rooms.find((r) => r.room_id === 99)!
      const east = mapLabLayout.rooms.find((r) => r.room_id === 100)!
      const westCells = absoluteCells(west).map(([x, y]) => `${x},${y}`)
      const eastCells = absoluteCells(east).map(([x, y]) => `${x},${y}`)

      expect(westCells).toHaveLength(8)
      expect(eastCells).toHaveLength(8)
      expect(westCells.filter((c) => eastCells.includes(c))).toEqual([])

      const union = new Set([...westCells, ...eastCells])
      expect(union.size).toBe(16)
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          expect(union.has(`${x},${y}`)).toBe(true)
        }
      }
    })
  })

  describe('roomLabelAnchor', () => {
    it('picks an owned cell in an L-shaped room (room 23 Armoury)', () => {
      const room23 = mapLabLayout.rooms.find((r) => r.room_id === 23)!
      expect(roomLabelAnchor(room23, 64)).toEqual({ x: 480, y: 96 })
    })

    it('picks an owned cell in the interlocking East Wing (room 100)', () => {
      const room100 = mapLabLayout.rooms.find((r) => r.room_id === 100)!
      expect(roomLabelAnchor(room100, 64)).toEqual({ x: 160, y: 160 })
    })

    it('picks an owned cell in a ring-shaped room (would-be hole centroid)', () => {
      const ring: MapRoom = {
        room_id: 1,
        z: 0,
        origin: [0, 0],
        cells: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
        title: 'Ring',
      }
      expect(roomLabelAnchor(ring, 64)).toEqual({ x: 96, y: 32 })
    })

    it('falls back to origin centre when the room has no cells', () => {
      const empty: MapRoom = { room_id: 2, z: 0, origin: [5, 3], cells: [], title: 'Empty' }
      expect(roomLabelAnchor(empty, 64)).toEqual({ x: 352, y: 224 })
    })

    it('chooses the settled owned-cell anchor rather than the hole in an asymmetric room', () => {
      const asymmetric: MapRoom = {
        room_id: 3,
        z: 0,
        origin: [10, 4],
        cells: [[0, 0], [1, 0], [2, 0], [0, 1]],
        title: 'Asymmetric Room',
      }

      expect(roomLabelAnchor(asymmetric, 64)).toEqual({ x: 736, y: 288 })
    })
  })
})
