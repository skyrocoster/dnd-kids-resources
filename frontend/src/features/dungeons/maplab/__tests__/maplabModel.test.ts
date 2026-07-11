import { describe, it, expect } from 'vitest'
import { mapLabLayout } from '../maplabData'
import { UnlockIcon, StairsUpIcon, StairsDownIcon } from '../../../../components/icons'
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
  sharedWallSegments,
  stairDirection,
  stairPresentation,
  doorPresentation,
  inspectableDescriptor,
  effectivePassageState,
  defaultPassageSession,
  type MapLayout,
  type MapRoom,
  type MapDoor,
  type MapStair,
  type MapItem,
} from '../maplabModel'

const baseDoorFlags = { hidden: false, locked: false, trapped: false }

describe('maplabModel (M0a scaffold)', () => {
  it('layout data exists and is typed', () => {
    expect(mapLabLayout).toBeDefined()
    expect(mapLabLayout.rooms).toHaveLength(6) // 4 from Cases 1/2 + 2 test L-shapes (stage 0)
    expect(mapLabLayout.doors).toHaveLength(2) // door 32 (Case 1) + door 98 (Stage 4 trapped test fixture)
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
})

describe('maplabModel (Stage 2 stair presentation)', () => {
  describe('stairDirection', () => {
    const stair2 = mapLabLayout.stairs.find((s) => s.stair_id === 2)!

    it('returns "up" when from.z < to.z (default: viewed from the authored from.z)', () => {
      expect(stairDirection(stair2)).toBe('up')
    })

    it('returns "down" when viewed from the to.z endpoint — same stair, opposite perspective', () => {
      expect(stairDirection(stair2, stair2.to.z)).toBe('down')
    })

    it('returns "level" for a same-z stair (malformed data, but must not throw)', () => {
      const level: MapStair = {
        stair_id: 99,
        from: { z: 0, cell: [0, 0] },
        to: { z: 0, cell: [1, 0] },
        hidden: false,
        locked: false,
        trapped: false,
      }
      expect(stairDirection(level)).toBe('level')
    })
  })

  describe('stairPresentation', () => {
    const stair2 = mapLabLayout.stairs.find((s) => s.stair_id === 2)!

    it('gives a plain (unlocked) stair a real directional glyph instead of the generic unlock icon', () => {
      const p = stairPresentation(stair2, 0)
      expect(p.direction).toBe('up')
      expect(p.icon).toBe(StairsUpIcon)
      expect(p.icon).not.toBe(UnlockIcon)
    })

    it('flips to the down glyph when viewed from the other endpoint', () => {
      const p = stairPresentation(stair2, 1)
      expect(p.direction).toBe('down')
      expect(p.icon).toBe(StairsDownIcon)
    })

    it('keeps the state icon (not the directional glyph) for a trapped/locked/hidden stair', () => {
      const trapped: MapStair = { ...stair2, trapped: true }
      const p = stairPresentation(trapped, 0)
      expect(p.state).toBe('trapped')
      expect(p.icon).not.toBe(StairsUpIcon)
      expect(p.icon).not.toBe(StairsDownIcon)
    })

    it('shares one token family between the base passage state and the stair presentation', () => {
      const p = stairPresentation(stair2, 0)
      expect(p.token).toBe(passagePresentation(stair2).token)
    })
  })
})

describe('maplabModel (Stage 3 inspector)', () => {
  describe('inspectableDescriptor — room', () => {
    it('produces a descriptor with title, size, and description for room 17', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      const d = inspectableDescriptor({ kind: 'room', room: room17 })

      expect(d.title).toBe('Combat Training Hall')
      expect(d.typeLabel).toBe('Room')
      expect(d.icon).toBeDefined()
      expect(d.lines).toContainEqual({ label: 'Size', value: '24 squares' })
      expect(d.lines.some((l) => l.label === 'Description' && l.value.includes('training'))).toBe(true)
    })

    it('includes a Kind line only when the room has one authored', () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!
      expect(inspectableDescriptor({ kind: 'room', room: room17 }).lines.some((l) => l.label === 'Kind')).toBe(false)

      const withKind: MapRoom = { ...room17, kind: 'training-hall' }
      const d = inspectableDescriptor({ kind: 'room', room: withKind })
      expect(d.lines).toContainEqual({ label: 'Kind', value: 'training-hall' })
    })

    it('falls back to "Room {id}" when untitled', () => {
      const untitled: MapRoom = { room_id: 42, z: 0, origin: [0, 0], cells: [[0, 0]] }
      expect(inspectableDescriptor({ kind: 'room', room: untitled }).title).toBe('Room 42')
    })
  })

  describe('inspectableDescriptor — door', () => {
    it('produces a descriptor with state, Break DC, and Pick DC for door 32', () => {
      const door32 = mapLabLayout.doors.find((d) => d.door_id === 32)!
      const d = inspectableDescriptor({ kind: 'door', door: door32 })

      expect(d.title).toBe('Heavy Stone Door')
      expect(d.typeLabel).toBe('Door')
      expect(d.token).toBe('--md-secondary') // locked
      expect(d.lines).toContainEqual({ label: 'State', value: 'Locked' })
      expect(d.lines).toContainEqual({ label: 'Break DC', value: '23' })
      expect(d.lines).toContainEqual({ label: 'Pick DC', value: '18' })
    })

    it('includes a Note line only when one is authored', () => {
      const door32 = mapLabLayout.doors.find((d) => d.door_id === 32)!
      expect(inspectableDescriptor({ kind: 'door', door: door32 }).lines.some((l) => l.label === 'Note')).toBe(false)

      const withNote: MapDoor = { ...door32, note: 'Splintered near the hinge.' }
      const d = inspectableDescriptor({ kind: 'door', door: withNote })
      expect(d.lines).toContainEqual({ label: 'Note', value: 'Splintered near the hinge.' })
    })
  })

  describe('inspectableDescriptor — stair', () => {
    it('produces a descriptor for stair 2 sharing the same passage-line shape as a door', () => {
      const stair2 = mapLabLayout.stairs.find((s) => s.stair_id === 2)!
      const d = inspectableDescriptor({ kind: 'stair', stair: stair2 })

      expect(d.title).toBe('Stone Stairs')
      expect(d.typeLabel).toBe('Stair')
      expect(d.lines).toContainEqual({ label: 'State', value: 'Unlocked' })
    })
  })

  describe('inspectableDescriptor — item (typed hook, unrendered)', () => {
    it('produces a minimal descriptor (title, type label) with no content lines', () => {
      const item: MapItem = { item_id: 1, cell: [0, 0], title: 'Locked chest' }
      const d = inspectableDescriptor({ kind: 'item', item })

      expect(d.title).toBe('Locked chest')
      expect(d.typeLabel).toBe('Item')
      expect(d.icon).toBeDefined()
      expect(d.lines).toEqual([])
    })
  })
})

describe('maplabModel (Stage 4 session state)', () => {
  it('effectivePassageState merges authored flags with session overrides', () => {
    const flags = { hidden: false, locked: true, trapped: false }
    const effective = effectivePassageState(flags, { isOpen: false, isLocked: false, trapDisarmed: false })

    expect(effective.locked).toBe(false)
    expect(passagePresentation(effective).state).toBe('unlocked')
  })

  it('effectivePassageState reflects disarmed traps in the presentation', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    const effective = effectivePassageState(flags, { isOpen: false, isLocked: true, trapDisarmed: true })

    expect(effective.trapped).toBe(false)
    expect(effective.trapDisarmed).toBe(true)
    // Trap disarmed, but still locked — presentation steps to the next active flag, not straight
    // to unlocked, since the flags are independent.
    expect(passagePresentation(effective).state).toBe('locked')
  })

  it('effectivePassageState falls back to the authored defaults with no session (door open — the shipped Stage-2 baseline)', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    const effective = effectivePassageState(flags)

    expect(effective.locked).toBe(true)
    expect(effective.trapped).toBe(true)
    expect(effective.sessionOpen).toBe(true)
  })

  it('defaultPassageSession seeds the reset baseline from authored flags (open by default)', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    expect(defaultPassageSession(flags)).toEqual({ isOpen: true, isLocked: true, trapDisarmed: false })
  })

  it('doorPresentation swaps in a closed/open glyph on the unlocked case', () => {
    const door: MapDoor = { door_id: 1, cell: [0, 0], side: 'N', ...baseDoorFlags }

    const open = doorPresentation(door, defaultPassageSession(door))
    expect(open.state).toBe('unlocked')
    expect(open.isOpen).toBe(true)
    expect(open.icon).not.toBe(UnlockIcon)

    const closed = doorPresentation(door, { isOpen: false, isLocked: false, trapDisarmed: false })
    expect(closed.isOpen).toBe(false)
    expect(closed.icon).not.toBe(open.icon)
  })

  it('doorPresentation keeps the state icon when trapped/locked/hidden, regardless of open/closed', () => {
    const door: MapDoor = { door_id: 2, cell: [0, 0], side: 'N', hidden: false, locked: true, trapped: false }
    const presentation = doorPresentation(door, { isOpen: true, isLocked: true, trapDisarmed: false })
    expect(presentation.state).toBe('locked')
  })

  it('inspectableDescriptor reflects session overrides for a door', () => {
    const door: MapDoor = { door_id: 3, cell: [0, 0], side: 'N', hidden: false, locked: true, trapped: true }
    const d = inspectableDescriptor({
      kind: 'door',
      door,
      session: { isOpen: true, isLocked: false, trapDisarmed: true },
    })

    expect(d.lines).toContainEqual({ label: 'Position', value: 'Open' })
    expect(d.lines).toContainEqual({ label: 'Trap', value: 'Disarmed' })
  })
})
