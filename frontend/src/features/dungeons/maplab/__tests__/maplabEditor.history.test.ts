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
  it('undoes and redoes layout edits, clearing redo after a new edit', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addDoor', cell: [1, 1], side: 'N' })
    expect(state.past).toHaveLength(1)

    state = mapLabEditorReducer(state, { type: 'undo' })
    expect(state.layout.doors).toHaveLength(0)
    expect(state.future).toHaveLength(1)

    state = mapLabEditorReducer(state, { type: 'redo' })
    expect(state.layout.doors).toHaveLength(1)

    state = mapLabEditorReducer(state, { type: 'undo' })
    state = mapLabEditorReducer(state, { type: 'addProp', cell: [2, 2] })
    expect(state.future).toHaveLength(0)
  })

  it('clears history when loading a layout', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addDoor', cell: [1, 1], side: 'N' })
    state = mapLabEditorReducer(state, { type: 'loadLayout', layout: emptyLayout })
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(0)
  })
})
