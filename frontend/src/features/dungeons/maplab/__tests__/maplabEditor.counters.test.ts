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

describe("monotonic layout ID counters (Order 03)", () => {
  it("addDoor after deleteDoor gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [0, 0], side: "N" });
    expect(state.layout.doors[0].door_id).toBe(1);
    state = mapLabEditorReducer(state, { type: "deleteDoor", doorId: 1 });
    state = mapLabEditorReducer(state, { type: "addDoor", cell: [1, 0], side: "N" });
    expect(state.layout.doors[0].door_id).toBe(2);
  });

  it("addProp after deleteProp gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    expect(state.layout.props[0].prop_id).toBe(1);
    state = mapLabEditorReducer(state, { type: "deleteProp", propId: 1 });
    state = mapLabEditorReducer(state, { type: "addProp", cell: [1, 0] });
    expect(state.layout.props[0].prop_id).toBe(2);
  });

  it("addStair after deleteStair gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addStair", from: { z: 0, cell: [2, 3] } });
    expect(state.layout.stairs[0].stair_id).toBe(1);
    state = mapLabEditorReducer(state, { type: "deleteStair", stairId: 1 });
    state = mapLabEditorReducer(state, { type: "addStair", from: { z: 0, cell: [5, 5] } });
    expect(state.layout.stairs[0].stair_id).toBe(2);
  });

  it("setStairDirection after disabling gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, {
      type: "setStairDirection",
      z: 0,
      cell: [4, 4],
      direction: "up",
      enabled: true,
    });
    expect(state.layout.stairs[0].stair_id).toBe(1);
    state = mapLabEditorReducer(state, {
      type: "setStairDirection",
      z: 0,
      cell: [4, 4],
      direction: "up",
      enabled: false,
    });
    state = mapLabEditorReducer(state, {
      type: "setStairDirection",
      z: 0,
      cell: [4, 4],
      direction: "up",
      enabled: true,
    });
    expect(state.layout.stairs[0].stair_id).toBe(2);
  });

  it("addPortal after deletePortal gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addPortal", cell: [1, 1] });
    expect(state.layout.portals[0].portal_id).toBe(1);
    state = mapLabEditorReducer(state, { type: "deletePortal", portalId: 1 });
    state = mapLabEditorReducer(state, { type: "addPortal", cell: [2, 2] });
    expect(state.layout.portals[0].portal_id).toBe(2);
  });

  it("portal auto-pair after deleting the pair gets a new id, not the reused one", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addPortal", cell: [1, 1] });
    const sourceId = state.selectedPortalId as number;
    state = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: sourceId,
      fixtureType: "portal",
      flags: { to: { z: 1, cell: [5, 5] } },
    });
    // The auto-paired return portal got the next id (2), not a reuse of the source's.
    const paired = state.layout.portals.find((p) => p.portal_id !== sourceId)!;
    expect(paired.portal_id).toBe(2);

    // Delete the pair, then retarget elsewhere to trigger a fresh auto-pair.
    state = mapLabEditorReducer(state, { type: "deletePortal", portalId: paired.portal_id });
    state = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: sourceId,
      fixtureType: "portal",
      flags: { to: { z: 2, cell: [9, 9] } },
    });
    const newPair = state.layout.portals.find((p) => p.portal_id !== sourceId)!;
    expect(newPair.portal_id).toBe(3);
  });
});
