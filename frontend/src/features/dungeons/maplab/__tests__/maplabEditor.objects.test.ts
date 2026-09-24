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

describe("prop actions", () => {
  it("addProp creates a prop with default flags and selects it", () => {
    const state = initialEditorState(emptyLayout);
    const next = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    expect(next.layout.props).toHaveLength(1);
    expect(next.layout.props[0]).toMatchObject({
      prop_id: 1,
      kind: "chest",
      cell: [0, 0],
      hidden: false,
      locked: false,
      trapped: false,
    });
    expect(next.selectedPropId).toBe(1);
  });

  it("addProp uses the given kind instead of the default when provided", () => {
    const state = initialEditorState(emptyLayout);
    const next = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0], kind: "mirror" });
    expect(next.layout.props[0]).toMatchObject({ prop_id: 1, kind: "mirror", cell: [0, 0] });
  });

  it("addProp assigns increasing ids", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    state = mapLabEditorReducer(state, { type: "addProp", cell: [1, 0] });
    expect(state.layout.props.map((p) => p.prop_id)).toEqual([1, 2]);
  });

  it("selectProp sets and clears selection", () => {
    const state = initialEditorState(emptyLayout);
    const selected = mapLabEditorReducer(state, { type: "selectProp", propId: 3 });
    expect(selected.selectedPropId).toBe(3);
    const cleared = mapLabEditorReducer(selected, { type: "selectProp", propId: null });
    expect(cleared.selectedPropId).toBeNull();
  });

  it("updateFixtureFlags merges flags into the matching prop", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    const next = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: 1,
      fixtureType: "prop",
      flags: { locked: true, kind: "mirror", hiddenDc: 15 },
    });
    expect(next.layout.props[0]).toMatchObject({
      prop_id: 1,
      kind: "mirror",
      locked: true,
      hiddenDc: 15,
    });
  });

  it("round-trips a loot bundle soft-reference through the prop reducer and layout serialization", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    state = mapLabEditorReducer(state, {
      type: "updateFixtureFlags",
      fixtureId: 1,
      fixtureType: "prop",
      flags: { loot: { bundle_id: 24, bundle_name: "Wizard Cache" } },
    });

    const reloaded = JSON.parse(JSON.stringify(state.layout)) as MapLayout;
    expect(reloaded.props[0].loot).toEqual({ bundle_id: 24, bundle_name: "Wizard Cache" });
  });

  it("deleteProp removes the prop and clears selection if it was selected", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    const next = mapLabEditorReducer(state, { type: "deleteProp", propId: 1 });
    expect(next.layout.props).toHaveLength(0);
    expect(next.selectedPropId).toBeNull();
  });

  it("prop selection is mutually exclusive with room and door selection", () => {
    let state = initialEditorState(emptyLayout);
    state = mapLabEditorReducer(state, { type: "selectRoom", roomId: 1 });
    state = mapLabEditorReducer(state, { type: "addProp", cell: [0, 0] });
    expect(state.selectedPropId).toBe(1);
    expect(state.selectedRoomId).toBeNull();

    state = mapLabEditorReducer(state, { type: "selectDoor", doorId: 2 });
    expect(state.selectedDoorId).toBe(2);
    expect(state.selectedPropId).toBeNull();

    state = mapLabEditorReducer(state, { type: "selectProp", propId: 1 });
    expect(state.selectedPropId).toBe(1);
    expect(state.selectedRoomId).toBeNull();
    expect(state.selectedDoorId).toBeNull();

    state = mapLabEditorReducer(state, { type: "selectRoom", roomId: 3 });
    expect(state.selectedRoomId).toBe(3);
    expect(state.selectedPropId).toBeNull();
  });
});
