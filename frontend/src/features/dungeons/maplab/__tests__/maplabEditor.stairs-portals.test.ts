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

describe('mapLabEditorReducer stairs and portals', () => {

  it('addStair creates a stair and selects it, defaulting to the floor below', () => {
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

  it('deleteStair removes only the one stair record', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addStair', from: { z: 0, cell: [2, 3] } })
    const stairId = state.selectedStairId as number
    expect(state.layout.stairs).toHaveLength(1)

    state = mapLabEditorReducer(state, { type: 'deleteStair', stairId })
    expect(state.layout.stairs).toHaveLength(0)
    expect(state.selectedStairId).toBeNull()
  })

  it('stair selection clears other selections, and selecting other fixtures clears stair', () => {
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

  it('addPortal creates a portal and selects it', () => {
    const state = initialEditorState(emptyLayout)
    const next = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
    expect(next.layout.portals).toHaveLength(1)
    expect(next.layout.portals[0]).toMatchObject({
      portal_id: 1,
      cell: [1, 1],
      z: 0,
    })
    expect(next.layout.portals[0].to).toBeUndefined()
    expect(next.selectedPortalId).toBe(1)

    const second = mapLabEditorReducer(next, { type: 'addPortal', cell: [4, 4] })
    expect(second.layout.portals.map((p) => p.portal_id)).toEqual([1, 2])
    expect(second.selectedPortalId).toBe(2)
  })

  it('a portal with no destination round-trips through updateFixtureFlags without acquiring a pair', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
    const portalId = state.selectedPortalId as number

    state = mapLabEditorReducer(state, {
      type: 'updateFixtureFlags',
      fixtureId: portalId,
      fixtureType: 'portal',
      flags: { title: 'Unfinished gateway' },
    })

    expect(state.layout.portals).toHaveLength(1)
    expect(state.layout.portals[0]).toMatchObject({ portal_id: portalId, title: 'Unfinished gateway' })
    expect(state.layout.portals[0].to).toBeUndefined()
  })

  it('retargeting a portal with no portal at the target auto-creates a paired return portal', () => {
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

  it('retargeting a portal onto an existing portal re-links instead of duplicating', () => {
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

  it('Connections: retargeting a portal to a gateway (dungeon_id) does not touch any other portal', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
    const sourceId = state.selectedPortalId as number
    state = mapLabEditorReducer(state, { type: 'addPortal', cell: [8, 8] })
    const otherId = state.selectedPortalId as number
    const otherBefore = state.layout.portals.find((p) => p.portal_id === otherId)!

    state = mapLabEditorReducer(state, {
      type: 'updateFixtureFlags',
      fixtureId: sourceId,
      fixtureType: 'portal',
      flags: { to: { dungeon_id: 42 } },
    })

    expect(state.layout.portals).toHaveLength(2)
    const source = state.layout.portals.find((p) => p.portal_id === sourceId)!
    expect(source.to).toEqual({ dungeon_id: 42 })
    const otherAfter = state.layout.portals.find((p) => p.portal_id === otherId)!
    expect(otherAfter).toEqual(otherBefore)
  })

  it('Connections: retargeting a gateway portal back to an in-dungeon cell resumes normal pairing', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
    const sourceId = state.selectedPortalId as number
    state = mapLabEditorReducer(state, {
      type: 'updateFixtureFlags',
      fixtureId: sourceId,
      fixtureType: 'portal',
      flags: { to: { dungeon_id: 42 } },
    })
    expect(state.layout.portals).toHaveLength(1)

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

  it('deletePortal removes the portal and clears selection if it was selected', () => {
    let state = initialEditorState(emptyLayout)
    state = mapLabEditorReducer(state, { type: 'addPortal', cell: [1, 1] })
    const next = mapLabEditorReducer(state, { type: 'deletePortal', portalId: 1 })
    expect(next.layout.portals).toHaveLength(0)
    expect(next.selectedPortalId).toBeNull()
  })

  it('portal selection is 5-way mutually exclusive', () => {
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

  // Viewer portal rendering + click-to-jump navigation is covered in
  // MapLabPage.navigation.test.tsx, not the editor reducer under test here.

  it('retargeting a portal moves its existing pair instead of leaving it orphaned', () => {
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

  it('retargeting onto an existing portal drops the old pair rather than leaving it orphaned', () => {
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

  it('updateFixtureFlags on a stair is a plain merge (title/hidden/locked/trapped/note only)', () => {
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

  it('setStairDirection(enabled: true) creates a stair for that direction if none exists', () => {
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

  it('setStairDirection recognizes an existing stair from the other endpoint (undirected match)', () => {
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

  it('setStairDirection(enabled: true) is a no-op if that direction already exists', () => {
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

  it('a cell can independently have both an up-stair and a down-stair (a landing)', () => {
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

  it('setStairDirection(enabled: false) removes the matching stair and clears selection if selected', () => {
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
