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

    it('updateFixtureFlags is a no-op for a non-door fixtureType', () => {
      let state = initialEditorState(emptyLayout)
      state = mapLabEditorReducer(state, { type: 'addDoor', cell: [0, 0], side: 'N' })
      const next = mapLabEditorReducer(state, {
        type: 'updateFixtureFlags',
        fixtureId: 1,
        fixtureType: 'stair',
        flags: { locked: true },
      })
      expect(next).toBe(state)
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
})
