import { describe, expect, it } from "vitest";

import {
  gridMarkerOffset,
  markersAtCell,
  npcIdsFromMarkersInRoom,
  MAX_MARKERS_PER_CELL,
  type MapLayout,
  type MapPortal,
  type MapProp,
  type MapRoom,
  type MapStair,
} from "../../../../model/maplabModel";
import { mapLabLayout } from "../maplabData";

describe("gridMarkerOffset (Phase I3)", () => {
  it("centers a single marker", () => {
    expect(gridMarkerOffset(1, 0)).toEqual({ dx: 0, dy: 0 });
  });

  it("arranges 2 markers side-by-side", () => {
    const a = gridMarkerOffset(2, 0);
    const b = gridMarkerOffset(2, 1);
    expect(a.dy).toBe(0);
    expect(b.dy).toBe(0);
    expect(a.dx).toBeLessThan(0);
    expect(b.dx).toBeGreaterThan(0);
    expect(a.dx).toBe(-b.dx);
  });

  it("arranges 3-4 markers in a 2x2 grid, wrapping after 2 columns", () => {
    const offsets4 = [0, 1, 2, 3].map((i) => gridMarkerOffset(4, i));
    // Two distinct columns (x) and two distinct rows (y), symmetric around zero.
    const xs = [...new Set(offsets4.map((o) => o.dx))];
    const ys = [...new Set(offsets4.map((o) => o.dy))];
    expect(xs).toHaveLength(2);
    expect(ys).toHaveLength(2);
    expect(xs[0]).toBe(-xs[1]);
    expect(ys[0]).toBe(-ys[1]);

    const offsets3 = [0, 1, 2].map((i) => gridMarkerOffset(3, i));
    expect(offsets3[0].dy).toBe(offsets3[1].dy); // first row: two side-by-side
    expect(offsets3[2].dy).not.toBe(offsets3[0].dy); // third wraps to a new row
  });

  it("MAX_MARKERS_PER_CELL matches the largest grid gridMarkerOffset lays out (2x2)", () => {
    expect(MAX_MARKERS_PER_CELL).toBe(4);
  });
});

describe("markersAtCell (Phase I3)", () => {
  const stairHere: MapStair = {
    stair_id: 1,
    from: { z: 0, cell: [3, 3] },
    to: { z: 1, cell: [3, 3] },
    hidden: false,
    locked: false,
    trapped: false,
  };
  const portalHere: MapPortal = {
    portal_id: 1,
    z: 0,
    cell: [3, 3],
    to: { z: 2, cell: [0, 0] },
    hidden: false,
    locked: false,
    trapped: false,
  };
  const propHere: MapProp = {
    prop_id: 1,
    kind: "chest",
    z: 0,
    cell: [3, 3],
    hidden: false,
    locked: false,
    trapped: false,
  };
  const wallPropHere: MapProp = {
    prop_id: 2,
    kind: "window",
    z: 0,
    cell: [3, 3],
    side: "N",
    hidden: false,
    locked: false,
    trapped: false,
  };

  it("gathers stairs sharing the exact (z, cell)", () => {
    const layout: MapLayout = { ...mapLabLayout, stairs: [stairHere], portals: [], props: [] };
    expect(markersAtCell(layout, 0, [3, 3])).toEqual([{ type: "stair", id: 1 }]);
    expect(markersAtCell(layout, 1, [3, 3])).toEqual([{ type: "stair", id: 1 }]);
    expect(markersAtCell(layout, 0, [4, 4])).toEqual([]);
  });

  it("gathers portals sharing the exact (z, cell)", () => {
    const layout: MapLayout = { ...mapLabLayout, stairs: [], portals: [portalHere], props: [] };
    expect(markersAtCell(layout, 0, [3, 3])).toEqual([{ type: "portal", id: 1 }]);
    expect(markersAtCell(layout, 2, [3, 3])).toEqual([]);
  });

  it("gathers on-square props sharing the exact (z, cell) (walls excluded)", () => {
    const layout: MapLayout = {
      ...mapLabLayout,
      stairs: [],
      portals: [],
      props: [propHere, wallPropHere],
    };
    expect(markersAtCell(layout, 0, [3, 3])).toEqual([{ type: "prop", id: 1 }]);
  });

  it("mixes stair/portal/prop types in one cell, in type-then-id order", () => {
    const layout: MapLayout = {
      ...mapLabLayout,
      stairs: [stairHere],
      portals: [portalHere],
      props: [propHere],
    };
    expect(markersAtCell(layout, 0, [3, 3])).toEqual([
      { type: "stair", id: 1 },
      { type: "portal", id: 1 },
      { type: "prop", id: 1 },
    ]);
  });
});

describe("npcIdsFromMarkersInRoom", () => {
  const room: MapRoom = {
    room_id: 17,
    z: 0,
    origin: [0, 0],
    cells: [
      [0, 0],
      [1, 0],
    ],
  };

  it("returns npc ids from markers standing inside the room", () => {
    const npcMarker: MapProp = {
      prop_id: 1,
      kind: "npc",
      z: 0,
      cell: [0, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, npcMarker] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([42]);
  });

  it("excludes markers from a different room", () => {
    const npcMarker: MapProp = {
      prop_id: 1,
      kind: "npc",
      z: 0,
      cell: [9, 9],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, npcMarker] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([]);
  });

  it("excludes markers from a different floor", () => {
    const npcMarker: MapProp = {
      prop_id: 1,
      kind: "npc",
      z: 1,
      cell: [0, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, npcMarker] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([]);
  });

  it("excludes props that are not npc markers", () => {
    const chestProp: MapProp = {
      prop_id: 1,
      kind: "chest",
      z: 0,
      cell: [0, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, chestProp] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([]);
  });

  it("excludes markers with null npc_id", () => {
    const unlinkedMarker: MapProp = {
      prop_id: 1,
      kind: "npc",
      z: 0,
      cell: [0, 0],
      npc_id: null,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, unlinkedMarker] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([]);
  });

  it("de-duplicates npc ids and orders by prop_id", () => {
    const marker1: MapProp = {
      prop_id: 10,
      kind: "npc",
      z: 0,
      cell: [0, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const marker2: MapProp = {
      prop_id: 5,
      kind: "npc",
      z: 0,
      cell: [1, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, marker1, marker2] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([42]);
  });

  it("handles multiple distinct npc ids ordered by prop_id", () => {
    const marker1: MapProp = {
      prop_id: 10,
      kind: "npc",
      z: 0,
      cell: [0, 0],
      npc_id: 99,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const marker2: MapProp = {
      prop_id: 5,
      kind: "npc",
      z: 0,
      cell: [1, 0],
      npc_id: 42,
      hidden: false,
      locked: false,
      trapped: false,
    };
    const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, marker1, marker2] };
    expect(npcIdsFromMarkersInRoom(layout, room)).toEqual([42, 99]);
  });
});
