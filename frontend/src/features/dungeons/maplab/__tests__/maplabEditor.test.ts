import { describe, expect, it } from 'vitest'
import { initialEditorState, mapLabEditorReducer } from '../maplabEditor'
import type { MapLayout } from '../maplabModel'

const emptyLayout: MapLayout = {
  meta: { cellSizeFt: 5, padding: 3 },
  rooms: [],
  doors: [],
  stairs: [],
  floors: [
    { z: 0, title: 'Ground Floor' },
    { z: 1, title: 'First Floor' },
  ],
  props: [],
  portals: [],
}

describe('initialEditorState', () => {
  it('seeds activeZ from the layout\'s lowest floor', () => {
    const state = initialEditorState(emptyLayout)
    expect(state.layout).toBe(emptyLayout)
    expect(state.activeZ).toBe(0)
    expect(state.selectedRoomId).toBeNull()
  })

  it('falls back to a room\'s z when floors is empty', () => {
    const layout: MapLayout = { ...emptyLayout, floors: [], rooms: [{ room_id: 1, z: 2, origin: [0, 0], cells: [[0, 0]] }] }
    const state = initialEditorState(layout)
    expect(state.activeZ).toBe(2)
  })

  it('falls back to 0 with no floors and no rooms', () => {
    const state = initialEditorState({ ...emptyLayout, floors: [] })
    expect(state.activeZ).toBe(0)
  })
})

describe('mapLabEditorReducer', () => {
  it('addRoom creates an empty room on the active floor and selects it', () => {
    const state = initialEditorState(emptyLayout)
    const next = mapLabEditorReducer(state, { type: 'addRoom' })
    expect(next.layout.rooms).toHaveLength(1)
    expect(next.layout.rooms[0]).toMatchObject({ room_id: 1, z: 0, origin: [0, 0], cells: [] })
    expect(next.selectedRoomId).toBe(1)
  })

  it('addRoom assigns increasing ids', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addRoom' })
    state = mapLabEditorReducer(state, { type: 'addRoom' })
    expect(state.layout.rooms.map((r) => r.room_id)).toEqual([1, 2])
  })

  it('selectRoom sets and clears selection', () => {
    const state = initialEditorState(emptyLayout)
    const selected = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 5 })
    expect(selected.selectedRoomId).toBe(5)
    const cleared = mapLabEditorReducer(selected, { type: 'selectRoom', roomId: null })
    expect(cleared.selectedRoomId).toBeNull()
  })

  it('deleteRoom removes the room and clears selection if it was selected', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addRoom' })
    state = mapLabEditorReducer(state, { type: 'deleteRoom', roomId: 1 })
    expect(state.layout.rooms).toHaveLength(0)
    expect(state.selectedRoomId).toBeNull()
  })

  it('deleteRoom drops doors orphaned by the deletion but keeps doors owned by a surviving room', () => {
    const layout: MapLayout = {
      ...emptyLayout,
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
        { room_id: 2, z: 0, origin: [1, 0], cells: [[0, 0]] },
      ],
      doors: [
        { door_id: 10, cell: [0, 0], side: 'E', hidden: false, locked: false, trapped: false },
        { door_id: 11, cell: [1, 0], side: 'W', hidden: false, locked: false, trapped: false },
      ],
    }
    const state = initialEditorState(layout)
    const next = mapLabEditorReducer(state, { type: 'deleteRoom', roomId: 1 })
    expect(next.layout.doors.map((d) => d.door_id)).toEqual([11])
  })

  it('setActiveZ switches the active floor', () => {
    const state = initialEditorState(emptyLayout)
    const next = mapLabEditorReducer(state, { type: 'setActiveZ', z: 1 })
    expect(next.activeZ).toBe(1)
  })

  it('loadLayout replaces layout and resets selection/activeZ', () => {
    const state = mapLabEditorReducer(initialEditorState(emptyLayout), { type: 'selectRoom', roomId: 3 })
    const other: MapLayout = { ...emptyLayout, floors: [{ z: 5, title: 'Loaded' }] }
    const next = mapLabEditorReducer(state, { type: 'loadLayout', layout: other })
    expect(next.layout).toBe(other)
    expect(next.selectedRoomId).toBeNull()
    expect(next.activeZ).toBe(5)
  })

  it('resetToFixture behaves like loadLayout', () => {
    const state = initialEditorState(emptyLayout)
    const other: MapLayout = { ...emptyLayout, floors: [{ z: 7, title: 'Fixture' }] }
    const next = mapLabEditorReducer(state, { type: 'resetToFixture', layout: other })
    expect(next.layout).toBe(other)
    expect(next.activeZ).toBe(7)
  })

  it('unhandled action types are a no-op', () => {
    const state = initialEditorState(emptyLayout)
    const next = mapLabEditorReducer(state, { type: 'setRoomMeta', roomId: 1, meta: { title: 'x' } })
    expect(next).toBe(state)
  })

  describe('toggleCell', () => {
    it('adds the first cell of an empty room anywhere', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      state = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [5, 5] })
      expect(state.layout.rooms[0]).toMatchObject({ origin: [0, 0], cells: [[5, 5]] })
    })

    it('adds a cell adjacent to the room and rejects a non-adjacent cell', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      state = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [0, 0] })
      state = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [1, 0] })
      expect(state.layout.rooms[0].cells).toEqual(expect.arrayContaining([[0, 0], [1, 0]]))
      expect(state.layout.rooms[0].cells).toHaveLength(2)

      const rejected = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [5, 5] })
      expect(rejected).toBe(state)
    })

    it('rejects painting a cell already owned by a different room', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] }],
      }
      let state = initialEditorState(layout)
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      const next = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 2, cell: [0, 0] })
      expect(next).toBe(state)
    })

    it('removes an interior cell that leaves the remainder connected', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0], [2, 0]] }],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [2, 0] })
      expect(next.layout.rooms[0].cells).toEqual([[0, 0], [1, 0]])
    })

    it('rejects removing a cell that would split the room into two groups', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0], [2, 0]] }],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 1, cell: [1, 0] })
      expect(next).toBe(state)
    })

    it('allows different floors to share the same [x,y] without conflict', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] }],
      }
      let state = initialEditorState(layout)
      state = mapLabEditorReducer(state, { type: 'setActiveZ', z: 1 })
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      const next = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 2, cell: [0, 0] })
      expect(next.layout.rooms[1]).toMatchObject({ z: 1, cells: [[0, 0]] })
    })

    it('is a no-op for an unknown room id', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, { type: 'toggleCell', roomId: 999, cell: [0, 0] })
      expect(next).toBe(state)
    })
  })

  describe('setRoomFootprint', () => {
    it('commits a 2x3 rectangle and normalizes the room cells', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] }],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, {
        type: 'setRoomFootprint',
        roomId: 1,
        cells: [[2, 4], [3, 4], [2, 5], [3, 5], [2, 6], [3, 6]],
      })

      expect(next.layout.rooms[0]).toMatchObject({
        origin: [0, 0],
        cells: [[2, 4], [3, 4], [2, 5], [3, 5], [2, 6], [3, 6]],
      })
    })

    it('rejects overlap with another same-floor room', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [
          { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
          { room_id: 2, z: 0, origin: [0, 0], cells: [[2, 0]] },
        ],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, { type: 'setRoomFootprint', roomId: 1, cells: [[1, 0], [2, 0]] })
      expect(next).toBe(state)
    })

    it('allows same [x,y] on another floor', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [
          { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
          { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]] },
        ],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, { type: 'setRoomFootprint', roomId: 1, cells: [[0, 0], [1, 0]] })
      expect(next.layout.rooms[0].cells).toEqual([[0, 0], [1, 0]])
    })

    it('rejects disconnected replacement', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0]] }],
      }
      const state = initialEditorState(layout)
      const next = mapLabEditorReducer(state, { type: 'setRoomFootprint', roomId: 1, cells: [[0, 0], [2, 0]] })
      expect(next).toBe(state)
    })

    it('is a no-op for an unknown room id', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, { type: 'setRoomFootprint', roomId: 999, cells: [[0, 0]] })
      expect(next).toBe(state)
    })
  })

  describe('door actions', () => {
    it('addDoor creates a door with default flags and selects it', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      expect(next.layout.doors).toHaveLength(1)
      expect(next.layout.doors[0]).toMatchObject({ door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false })
      expect(next.selectedDoorId).toBe(1)
    })

    it('addDoor assigns increasing ids', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [1, 0], side: 'N' })
      expect(state.layout.doors.map((d) => d.door_id)).toEqual([1, 2])
    })

    it('selectDoor sets and clears selection', () => {
      const state = initialEditorState(emptyLayout)
      const selected = mapLabEditorReducer(state, { type: 'selectDoor', doorId: 3 })
      expect(selected.selectedDoorId).toBe(3)
      const cleared = mapLabEditorReducer(selected, { type: 'selectDoor', doorId: null })
      expect(cleared.selectedDoorId).toBeNull()
    })

    it('updateFixtureFlags merges flags into the matching door', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      const next = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: 1,
        fixtureType: 'door',
        flags: { locked: true, breakDc: 15 },
      })
      expect(next.layout.doors[0]).toMatchObject({ locked: true, breakDc: 15 })
    })

    it('updateFixtureFlags for stair/portal with non-matching id returns state with empty array', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      const next = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: 999,
        fixtureType: 'stair',
        flags: { locked: true },
      })
      expect(next.layout.stairs).toEqual([])
      expect(next.selectedDoorId).toBe(1)
    })

    it('deleteDoor removes the door and clears selection if it was selected', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      const next = mapLabEditorReducer(state, { type: 'deleteDoor', doorId: 1 })
      expect(next.layout.doors).toHaveLength(0)
      expect(next.selectedDoorId).toBeNull()
    })

    it('deleteRoom clears selectedDoorId only if the selected door was orphaned', () => {
      const layout: MapLayout = {
        ...emptyLayout,
        rooms: [
          { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
          { room_id: 2, z: 0, origin: [1, 0], cells: [[0, 0]] },
        ],
        doors: [{ door_id: 10, cell: [1, 0], side: 'W', hidden: false, locked: false, trapped: false }],
      }
      let state = initialEditorState(layout)
      state = mapLabEditorReducer(state, { type: 'selectDoor', doorId: 10 })
      const next = mapLabEditorReducer(state, { type: 'deleteRoom', roomId: 1 })
      expect(next.layout.doors.map((d) => d.door_id)).toEqual([10])
      expect(next.selectedDoorId).toBe(10)

      const afterOwnerDeleted = mapLabEditorReducer(next, { type: 'deleteRoom', roomId: 2 })
      expect(afterOwnerDeleted.layout.doors).toHaveLength(0)
      expect(afterOwnerDeleted.selectedDoorId).toBeNull()
    })
  })

  describe('prop actions', () => {
    it('addProp creates a prop with default flags and selects it', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      expect(next.layout.props).toHaveLength(1)
      expect(next.layout.props[0]).toMatchObject({ prop_id: 1, kind: 'chest', cell: [0, 0], hidden: false, locked: false, trapped: false })
      expect(next.selectedPropId).toBe(1)
    })

    it('addProp assigns increasing ids', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [1, 0] })
      expect(state.layout.props.map((p) => p.prop_id)).toEqual([1, 2])
    })

    it('selectProp sets and clears selection', () => {
      const state = initialEditorState(emptyLayout)
      const selected = mapLabEditorReducer(state, { type: 'selectProp', propId: 3 })
      expect(selected.selectedPropId).toBe(3)
      const cleared = mapLabEditorReducer(selected, { type: 'selectProp', propId: null })
      expect(cleared.selectedPropId).toBeNull()
    })

    it('updateFixtureFlags merges flags into the matching prop', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      const next = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: 1,
        fixtureType: 'prop',
        flags: { locked: true, kind: 'mirror', hiddenDc: 15 },
      })
      expect(next.layout.props[0]).toMatchObject({ prop_id: 1, kind: 'mirror', locked: true, hiddenDc: 15 })
    })

    it('round-trips a loot bundle soft-reference through the prop reducer and layout serialization', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: 1,
        fixtureType: 'prop',
        flags: { loot: { bundle_id: 24, bundle_name: 'Wizard Cache' } },
      })

      const reloaded = JSON.parse(JSON.stringify(state.layout)) as MapLayout
      expect(reloaded.props[0].loot).toEqual({ bundle_id: 24, bundle_name: 'Wizard Cache' })
    })

    it('deleteProp removes the prop and clears selection if it was selected', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      const next = mapLabEditorReducer(state, { type: 'deleteProp', propId: 1 })
      expect(next.layout.props).toHaveLength(0)
      expect(next.selectedPropId).toBeNull()
    })

    it('prop selection is mutually exclusive with room and door selection', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 1 })
      state = mapLabEditorReducer(state, { type: 'addProp', cell: [0, 0] })
      expect(state.selectedPropId).toBe(1)
      expect(state.selectedRoomId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectDoor', doorId: 2 })
      expect(state.selectedDoorId).toBe(2)
      expect(state.selectedPropId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectProp', propId: 1 })
      expect(state.selectedPropId).toBe(1)
      expect(state.selectedRoomId).toBeNull()
      expect(state.selectedDoorId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 3 })
      expect(state.selectedRoomId).toBe(3)
      expect(state.selectedPropId).toBeNull()
    })
  })

  // Phase H — Stair Authoring + Portal Doors (H0 stubs)
  describe('Phase H — Stairs and Portals', () => {
    it.skip('H0: stair/portal fields are stubbed', () => {
      // H0 scaffolding: type additions complete, reducer cases stubbed
    })

    it('H1: addStair creates a stair and selects it, defaulting to the floor below', () => {
      const state = initialEditorState(emptyLayout)
      // emptyLayout has floors 0 and 1; z:0 has no floor below, so the default direction is up.
      const next = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [2, 3] } })
      expect(next.layout.stairs).toHaveLength(1)
      expect(next.layout.stairs[0]).toMatchObject({
        stair_id: 1,
        from: { z: 0, cell: [2, 3] },
        to: { z: 1, cell: [2, 3] },
      })
      expect(next.selectedStairId).toBe(1)

      // z:1 has a floor below (z:0), so a new stair placed there defaults down.
      const second = mapLabEditorReducer(next, { type: 'addStair', from: { z: 1, cell: [5, 5] } })
      expect(second.layout.stairs.map((s) => s.stair_id)).toEqual([1, 2])
      expect(second.layout.stairs[1]).toMatchObject({
        from: { z: 1, cell: [5, 5] },
        to: { z: 0, cell: [5, 5] },
      })
      expect(second.selectedStairId).toBe(2)
    })

    it('H1: deleteStair removes only the one stair record', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [2, 3] } })
      const stairId = state.selectedStairId as number
      expect(state.layout.stairs).toHaveLength(1)

      state = mapLabEditorReducer(state, { type: 'deleteStair', stairId })
      expect(state.layout.stairs).toHaveLength(0)
      expect(state.selectedStairId).toBeNull()
    })

    it('H1: stair selection clears other selections, and selecting other fixtures clears stair', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      state = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [2, 3] } })
      expect(state.selectedStairId).toBe(1)
      expect(state.selectedRoomId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectStair', stairId: 1 })
      expect(state.selectedStairId).toBe(1)

      state = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 1 })
      expect(state.selectedRoomId).toBe(1)
      expect(state.selectedStairId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectStair', stairId: 1 })
      expect(state.selectedStairId).toBe(1)
      expect(state.selectedRoomId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectDoor', doorId: 9 })
      expect(state.selectedDoorId).toBe(9)
      expect(state.selectedStairId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectStair', stairId: 1 })
      state = mapLabEditorReducer(state, { type: 'selectProp', propId: 9 })
      expect(state.selectedPropId).toBe(9)
      expect(state.selectedStairId).toBeNull()
    })

    it('H2: addPortal creates a portal and selects it', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      expect(next.layout.portals).toHaveLength(1)
      expect(next.layout.portals[0]).toMatchObject({
        portal_id: 1,
        cell: [1, 1],
        z: 0,
        to: { z: 0, cell: [1, 1] },
      })
      expect(next.selectedPortalId).toBe(1)

      const second = mapLabEditorReducer(next, { type: 'addPortal', cell: [4, 4] })
      expect(second.layout.portals.map((p) => p.portal_id)).toEqual([1, 2])
      expect(second.selectedPortalId).toBe(2)
    })

    it('H2: retargeting a portal with no portal at the target auto-creates a paired return portal', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      const sourceId = state.selectedPortalId as number
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: sourceId,
        fixtureType: 'portal',
        flags: { to: { z: 1, cell: [5, 5] } },
      })

      expect(state.layout.portals).toHaveLength(2)
      const source = state.layout.portals.find((p) => p.portal_id === sourceId)!
      expect(source.to).toEqual({ z: 1, cell: [5, 5] })
      const paired = state.layout.portals.find((p) => p.portal_id !== sourceId)!
      expect(paired).toMatchObject({ z: 1, cell: [5, 5], to: { z: 0, cell: [1, 1] } })
    })

    it('H2: retargeting a portal onto an existing portal re-links instead of duplicating', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      const firstId = state.selectedPortalId as number
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [8, 8] })
      const secondId = state.selectedPortalId as number

      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: firstId,
        fixtureType: 'portal',
        flags: { to: { z: 0, cell: [8, 8] } },
      })

      expect(state.layout.portals).toHaveLength(2)
      const first = state.layout.portals.find((p) => p.portal_id === firstId)!
      const second = state.layout.portals.find((p) => p.portal_id === secondId)!
      expect(first.to).toEqual({ z: 0, cell: [8, 8] })
      expect(second.to).toEqual({ z: 0, cell: [1, 1] })
    })

    it('H2: deletePortal removes the portal and clears selection if it was selected', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      const next = mapLabEditorReducer(state, { type: 'deletePortal', portalId: 1 })
      expect(next.layout.portals).toHaveLength(0)
      expect(next.selectedPortalId).toBeNull()
    })

    it('H2: portal selection is 5-way mutually exclusive', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addRoom' })
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      expect(state.selectedPortalId).toBe(1)
      expect(state.selectedRoomId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 1 })
      expect(state.selectedRoomId).toBe(1)
      expect(state.selectedPortalId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectPortal', portalId: 1 })
      expect(state.selectedPortalId).toBe(1)
      expect(state.selectedRoomId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectDoor', doorId: 9 })
      expect(state.selectedDoorId).toBe(9)
      expect(state.selectedPortalId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectPortal', portalId: 1 })
      state = mapLabEditorReducer(state, { type: 'selectProp', propId: 9 })
      expect(state.selectedPropId).toBe(9)
      expect(state.selectedPortalId).toBeNull()

      state = mapLabEditorReducer(state, { type: 'selectPortal', portalId: 1 })
      state = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [3, 3] } })
      expect(state.selectedStairId).toBe(1)
      expect(state.selectedPortalId).toBeNull()
    })

    // H3: viewer portal rendering + click-to-jump navigation — covered in MapLabPage.test.tsx
    // ("Stage H3 — portal viewer rendering + navigation"), not the editor reducer under test here.

    it('H3: retargeting a portal moves its existing pair instead of leaving it orphaned', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      const sourceId = state.selectedPortalId as number
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: sourceId,
        fixtureType: 'portal',
        flags: { to: { z: 1, cell: [5, 5] } },
      })
      const pairedId = state.layout.portals.find((p) => p.portal_id !== sourceId)!.portal_id

      // Retarget the source to a brand-new, unoccupied location.
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: sourceId,
        fixtureType: 'portal',
        flags: { to: { z: 2, cell: [9, 9] } },
      })

      // Still exactly two portals — the old pair moved, no orphan left behind at [5,5].
      expect(state.layout.portals).toHaveLength(2)
      const source = state.layout.portals.find((p) => p.portal_id === sourceId)!
      expect(source.to).toEqual({ z: 2, cell: [9, 9] })
      const paired = state.layout.portals.find((p) => p.portal_id === pairedId)!
      expect(paired).toMatchObject({ z: 2, cell: [9, 9], to: { z: 0, cell: [1, 1] } })
    })

    it('H3: retargeting onto an existing portal drops the old pair rather than leaving it orphaned', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
      const sourceId = state.selectedPortalId as number
      state = mapLabEditorReducer(state, { type: 'addPortal', cell: [8, 8] })
      const standaloneId = state.selectedPortalId as number

      // Give the source an initial pair at [5,5].
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: sourceId,
        fixtureType: 'portal',
        flags: { to: { z: 1, cell: [5, 5] } },
      })
      expect(state.layout.portals).toHaveLength(3)

      // Retarget the source onto the standalone portal at [8,8] — it re-links, and the old
      // pair at [5,5] (nothing points to it anymore) is dropped rather than left orphaned.
      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: sourceId,
        fixtureType: 'portal',
        flags: { to: { z: 0, cell: [8, 8] } },
      })

      expect(state.layout.portals).toHaveLength(2)
      const source = state.layout.portals.find((p) => p.portal_id === sourceId)!
      const standalone = state.layout.portals.find((p) => p.portal_id === standaloneId)!
      expect(source.to).toEqual({ z: 0, cell: [8, 8] })
      expect(standalone.to).toEqual({ z: 0, cell: [1, 1] })
      expect(state.layout.portals.some((p) => p.cell[0] === 5 && p.cell[1] === 5)).toBe(false)
    })

    it.skip('H4: portal marker reads as distinct from door/stair/prop', () => {
      // H4 design pass: visual/interaction review
    })

    it('I1: updateFixtureFlags on a stair is a plain merge (title/hidden/locked/trapped/note only)', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [2, 3] } })
      const stairId = state.selectedStairId as number
      const before = { ...state.layout.stairs[0] }

      state = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: stairId,
        fixtureType: 'stair',
        flags: { hidden: true, title: 'Spiral Stair' },
      })

      expect(state.layout.stairs).toHaveLength(1)
      const stair = state.layout.stairs[0]
      expect(stair.hidden).toBe(true)
      expect(stair.title).toBe('Spiral Stair')
      // Destination is untouched by updateFixtureFlags — it's only set via setStairDirection.
      expect(stair.to).toEqual(before.to)
    })

    it('I1: setStairDirection(enabled: true) creates a stair for that direction if none exists', () => {
      const state = initialEditorState(emptyLayout)
      const next = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })
      expect(next.layout.stairs).toHaveLength(1)
      expect(next.layout.stairs[0]).toMatchObject({
        from: { z: 0, cell: [4, 4] },
        to: { z: 1, cell: [4, 4] },
        hidden: false,
        locked: false,
        trapped: false,
      })
      expect(next.selectedStairId).toBe(next.layout.stairs[0].stair_id)
    })

    it('I1: setStairDirection recognizes an existing stair from the other endpoint (undirected match)', () => {
      // A stair created on z:0 going up is stored as from:{z:0} to:{z:1}. Viewed/toggled from
      // z:1 (the `to` side), it must still be recognized as "down to floor 0" — the from/to
      // fields just name endpoints, they aren't a fixed "viewed from here" direction.
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })
      expect(state.layout.stairs).toHaveLength(1)

      // Re-enabling "down to floor 0" from z:1's perspective must be a no-op (already exists).
      const again = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 1,
        cell: [4, 4],
        direction: 'down',
        enabled: true,
      })
      expect(again.layout.stairs).toHaveLength(1)

      // Disabling it from z:1's perspective must remove the one existing record.
      const removed = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 1,
        cell: [4, 4],
        direction: 'down',
        enabled: false,
      })
      expect(removed.layout.stairs).toHaveLength(0)
    })

    it('I1: setStairDirection(enabled: true) is a no-op if that direction already exists', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })
      const again = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })
      expect(again.layout.stairs).toHaveLength(1)
    })

    it('I1: a cell can independently have both an up-stair and a down-stair (a landing)', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })
      // z:0 has no floor below in emptyLayout, but the reducer doesn't gate on floor existence
      // itself (the editor UI disables the checkbox) — verify the reducer's own behavior directly.
      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'down',
        enabled: true,
      })
      expect(state.layout.stairs).toHaveLength(2)
      const up = state.layout.stairs.find((s) => s.to.z === 1)!
      const down = state.layout.stairs.find((s) => s.to.z === -1)!
      expect(up.from).toEqual({ z: 0, cell: [4, 4] })
      expect(down.from).toEqual({ z: 0, cell: [4, 4] })
    })

    it('I1: setStairDirection(enabled: false) removes the matching stair and clears selection if selected', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: true,
      })

      state = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: false,
      })
      expect(state.layout.stairs).toHaveLength(0)
      expect(state.selectedStairId).toBeNull()
      // Deleting an already-absent direction is a no-op, not an error.
      const noop = mapLabEditorReducer(state, {
        type: 'setStairDirection',
        z: 0,
        cell: [4, 4],
        direction: 'up',
        enabled: false,
      })
      expect(noop).toBe(state)
    })
  })
})
