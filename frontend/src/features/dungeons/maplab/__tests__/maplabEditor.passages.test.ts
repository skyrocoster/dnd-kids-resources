import { describe, expect, it } from "vitest";

import { initialEditorState, mapLabEditorReducer } from "../maplabEditor";
import type { MapLayout } from "../../../../model/maplabModel";

const emptyLayout: MapLayout = {
  meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
  rooms: [],
  doors: [],
  stairs: [],
  floors: [
    { z: 0, title: "Ground Floor" },
    { z: 1, title: "First Floor" },
  ],
  props: [],
  portals: [],
  features: [],
};

describe("door actions", () => {
  it("addDoor creates a door with default flags and selects it", () => {
    const state = initialEditorState(emptyLayout);
    const next = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    expect(next.layout.doors).toHaveLength(1);
    expect(next.layout.doors[0]).toMatchObject({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
    });
    expect(next.selectedDoorId).toBe(1);
  });

  it("addDoor assigns increasing ids", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [1, 0], side: "N" });
    expect(state.layout.doors.map((d) => d.door_id)).toEqual([1, 2]);
  });

  it("selectDoor sets and clears selection", () => {
    const state = initialEditorState(emptyLayout);
    const selected = mapLabEditorReducer(state, { type: "selectDoor", doorId: 3 });
    expect(selected.selectedDoorId).toBe(3);
    const cleared = mapLabEditorReducer(selected, { type: "selectDoor", doorId: null });
    expect(cleared.selectedDoorId).toBeNull();
  });

  it("updateFixtureFlags merges flags into the matching door", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    const next = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: 1,
      fixtureType: "door",
      flags: { locked: true, breakDc: 15 },
    });
    expect(next.layout.doors[0]).toMatchObject({ locked: true, breakDc: 15 });
  });

  it("updateFixtureFlags for stair/portal with non-matching id returns state with empty array", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    const next = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: 999,
      fixtureType: "stair",
      flags: { locked: true },
    });
    expect(next.layout.stairs).toEqual([]);
    expect(next.selectedDoorId).toBe(1);
  });

  it("deleteDoor removes the door and clears selection if it was selected", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    const next = mapLabEditorReducer(state, { type: "deleteDoor", doorId: 1 });
    expect(next.layout.doors).toHaveLength(0);
    expect(next.selectedDoorId).toBeNull();
  });

  it("deleteRoom clears selectedDoorId only if the selected door was orphaned", () => {
    const layout: MapLayout = {
      ...emptyLayout,
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] },
        { room_id: 2, z: 0, origin: [1, 0], cells: [[0, 0]] },
      ],
      doors: [
        { door_id: 10, cell: [1, 0], side: "W", hidden: false, locked: false, trapped: false },
      ],
    };
    let state = initialEditorState(layout);
    state = mapLabEditorReducer(state, { type: "selectDoor", doorId: 10 });
    const next = mapLabEditorReducer(state, { type: "deleteRoom", roomId: 1 });
    expect(next.layout.doors.map((d) => d.door_id)).toEqual([10]);
    expect(next.selectedDoorId).toBe(10);

    const afterOwnerDeleted = mapLabEditorReducer(next, { type: "deleteRoom", roomId: 2 });
    expect(afterOwnerDeleted.layout.doors).toHaveLength(0);
    expect(afterOwnerDeleted.selectedDoorId).toBeNull();
  });
});
