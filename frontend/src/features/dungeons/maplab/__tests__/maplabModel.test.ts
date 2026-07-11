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
  roomWallSegments,
  findDoorAtEdge,
  nonDoorWallSegments,
  floorsInLayout,
  roomsOnZ,
  stairEndpointsForZ,
  passagePresentation,
  secondaryPassageStates,
  type MapLayout,
  type MapRoom,
  type MapDoor,
  type MapStair,
} from '../maplabModel'

const baseDoorFlags = { hidden: false, locked: false, trapped: false }

describe('maplabModel (M0a scaffold)', () => {
  it('layout data exists and is typed', () => {
    expect(mapLabLayout).toBeDefined()
    expect(mapLabLayout.rooms).toHaveLength(6) // 4 from Cases 1/2 + 2 test L-shapes (stage 0)
    expect(mapLabLayout.doors).toHaveLength(1)
    expect(mapLabLayout.floors).toHaveLength(3) // z:0, z:1, z:2 (stage 0)
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
        meta: { cellSizeFt: 5, padding: 3 },
        rooms: [mapLabLayout.rooms.find((r) => r.room_id === 17)!],
        doors: [],
        stairs: [],
        floors: [],
        items: [],
      }
      expect(paddedBounds(layout)).toEqual({ minX: -3, maxX: 8, minY: -3, maxY: 6 })
    })

    it('expands and centers the union for a rectangle plus an L-shape', () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: 2 },
        rooms: [
          mapLabLayout.rooms.find((r) => r.room_id === 17)!,
          mapLabLayout.rooms.find((r) => r.room_id === 23)!,
        ],
        doors: [],
        stairs: [],
        floors: [],
        items: [],
      }
      expect(paddedBounds(layout)).toEqual({ minX: -2, maxX: 11, minY: -2, maxY: 5 })
    })

    it('computes bounds over all rooms across both floors (two-floor case), not just the active one', () => {
      // mapLabLayout.meta.padding is 3; rooms include the z:1 landing sharing the ground floor's x/y space.
      expect(paddedBounds(mapLabLayout)).toEqual({ minX: -3, maxX: 14, minY: -3, maxY: 6 })
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

  describe('passagePresentation', () => {
    const base: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', ...baseDoorFlags }

    it('shows trapped state with highest precedence', () => {
      const door: MapDoor = { ...base, trapped: true, locked: true, hidden: true }
      const p = passagePresentation(door)
      expect(p.state).toBe('trapped')
      expect(p.token).toBe('--md-error')
      expect(p.label).toBe('Trapped')
      expect(p.icon).toBeDefined()
    })

    it('shows locked state when not trapped', () => {
      const door: MapDoor = { ...base, locked: true, hidden: true }
      const p = passagePresentation(door)
      expect(p.state).toBe('locked')
      expect(p.token).toBe('--md-secondary')
      expect(p.label).toBe('Locked')
    })

    it('shows hidden state when not trapped or locked', () => {
      const door: MapDoor = { ...base, hidden: true }
      const p = passagePresentation(door)
      expect(p.state).toBe('hidden')
      expect(p.token).toBe('--md-outline')
      expect(p.label).toBe('Hidden')
    })

    it('shows unlocked state when no flags are set', () => {
      const p = passagePresentation(base)
      expect(p.state).toBe('unlocked')
      expect(p.token).toBe('--md-on-surface-variant')
      expect(p.label).toBe('Unlocked')
    })

    it('presents a stair identically to a door — same flags, same mapping', () => {
      const stair: MapStair = {
        stair_id: 9,
        from: { z: 0, cell: [0, 0] },
        to: { z: 1, cell: [0, 0] },
        trapped: true,
        locked: false,
        hidden: false,
      }
      const p = passagePresentation(stair)
      expect(p.state).toBe('trapped')
      expect(p.token).toBe('--md-error')
    })
  })

  describe('secondaryPassageStates', () => {
    it('surfaces the non-primary active flags as secondary states', () => {
      const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', trapped: true, locked: true, hidden: true }
      expect(secondaryPassageStates(door)).toEqual(['locked', 'hidden'])
    })

    it('returns an empty array when only the primary flag is set', () => {
      const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', trapped: true, locked: false, hidden: false }
      expect(secondaryPassageStates(door)).toEqual([])
    })

    it('returns an empty array for a plain unlocked passage', () => {
      const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', ...baseDoorFlags }
      expect(secondaryPassageStates(door)).toEqual([])
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
    const door32 = { door_id: 32, cell: [5, 3] as const, side: 'E' as const, hidden: false, locked: true, trapped: false }

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
  it.skip('sharedWallSegments detects edges shared by two adjacent rooms', () => {
    // Stage 1: Prove that rooms 17 and 23 share exactly the edge at [5,3] E / [6,3] W
    // and that L-shapes (99a/99b) share their vertical boundary.
  })
})

describe('maplabModel (Stage 2 stair presentation)', () => {
  it.skip('stairDirection returns "up" when from.z < to.z', () => {
    // Stage 2: Stair 2 goes from z:0 to z:1 → "up"
  })

  it.skip('stairPresentation returns directional glyph info', () => {
    // Stage 2: StairsUp icon and MD3 semantic token for a going-up stair
  })
})

describe('maplabModel (Stage 3 inspector)', () => {
  it.skip('inspectableDescriptor produces a room descriptor with title, kind, description, size', () => {
    // Stage 3: Room 17 has title "Combat Training Hall", description, kind inferred or explicit
  })

  it.skip('inspectableDescriptor produces a door descriptor with state, DCs, and note', () => {
    // Stage 3: Door 32 shows "Locked", Break DC 23, Pick DC 18, and any authored note
  })

  it.skip('inspectableDescriptor handles item descriptors without rendering content', () => {
    // Stage 3: kind:'item' produces a descriptor (title, type label) but is unrendered
  })
})

describe('maplabModel (Stage 4 session state)', () => {
  it.skip('effectivePassageState merges authored flags with session overrides', () => {
    // Stage 4: Authored locked + session isLocked:false → effective unlocked
  })

  it.skip('effectivePassageState reflects disarmed traps in the presentation', () => {
    // Stage 4: Authored trapped + session trapDisarmed:true → presentation steps to next flag
  })
})
