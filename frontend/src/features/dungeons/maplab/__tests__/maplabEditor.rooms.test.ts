import { describe, expect, it } from 'vitest'
import { initialEditorState, mapLabEditorReducer } from '../maplabEditor'
import type { MapLayout } from '../../../../model/maplabModel'

const emptyLayout: MapLayout = {
  meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
  rooms: [],
  doors: [],
  stairs: [],
  floors: [
    { z: 0, title: 'Ground Floor' },
    { z: 1, title: 'First Floor' },
  ],
  props: [],
  portals: [],
  features: [],
}

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

  it('dropEmptyRoom removes the room, drops orphaned doors, clears selection, and can be undone', () => {
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
    let state = initialEditorState(layout)
    state = mapLabEditorReducer(state, { type: 'selectRoom', roomId: 1 })
    const afterDrop = mapLabEditorReducer(state, { type: 'dropEmptyRoom', roomId: 1 })
    expect(afterDrop.layout.rooms).toHaveLength(1)
    expect(afterDrop.layout.doors.map((d) => d.door_id)).toEqual([11])
    expect(afterDrop.selectedRoomId).toBeNull()
    const afterUndo = mapLabEditorReducer(afterDrop, { type: 'undo' })
    expect(afterUndo.layout.rooms).toHaveLength(2)
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

  it('setRoomMeta updates the matching room cache fields', () => {
    const layout: MapLayout = {
      ...emptyLayout,
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Old', description: 'Old desc', kind: 'Old kind' }],
    }
    const state = initialEditorState(layout)
    const next = mapLabEditorReducer(state, {
      type: 'setRoomMeta',
      roomId: 1,
      meta: { title: 'New', description: 'New desc', kind: 'New kind' },
    })

    expect(next.layout.rooms[0]).toMatchObject({ title: 'New', description: 'New desc', kind: 'New kind' })
  })

  it('setRoomMeta is a no-op for an unknown room id', () => {
    const state = initialEditorState(emptyLayout)
    const next = mapLabEditorReducer(state, { type: 'setRoomMeta', roomId: 99, meta: { title: 'x' } })
    expect(next).toBe(state)
  })

  it('resetToFixture behaves like loadLayout', () => {
    const state = initialEditorState(emptyLayout)
    const other: MapLayout = { ...emptyLayout, floors: [{ z: 7, title: 'Fixture' }] }
    const next = mapLabEditorReducer(state, { type: 'resetToFixture', layout: other })
    expect(next.layout).toBe(other)
    expect(next.activeZ).toBe(7)
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
})
