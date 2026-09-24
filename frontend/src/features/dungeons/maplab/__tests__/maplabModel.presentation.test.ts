import { describe, it, expect } from "vitest";
import { mapLabLayout } from "../maplabData";
import { inspectableDescriptor } from "../maplabPresentation";
import {
  stairDirection,
  type MapRoom,
  type MapDoor,
  type MapStair,
  type MapProp,
  type MapPortal,
  PASSAGE_STATE_TOKENS,
} from "../../../../model/maplabModel";

// Presentation-focused model tests live in this split suite.

describe("maplabModel stair presentation", () => {
  describe("stairDirection", () => {
    const stair2 = mapLabLayout.stairs.find((s) => s.stair_id === 2)!;

    it('returns "up" when from.z < to.z (default: viewed from the authored from.z)', () => {
      expect(stairDirection(stair2)).toBe("up");
    });

    it('returns "down" when viewed from the to.z endpoint — same stair, opposite perspective', () => {
      expect(stairDirection(stair2, stair2.to.z)).toBe("down");
    });

    it('returns "level" for a same-z stair (malformed data, but must not throw)', () => {
      const level: MapStair = {
        stair_id: 99,
        from: { z: 0, cell: [0, 0] },
        to: { z: 0, cell: [1, 0] },
        hidden: false,
        locked: false,
        trapped: false,
      };
      expect(stairDirection(level)).toBe("level");
    });
  });
});

describe("maplabModel (Stage 3 inspector)", () => {
  describe("inspectableDescriptor — room", () => {
    it("produces a descriptor with title, size, and description for room 17", () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!;
      const d = inspectableDescriptor({ kind: "room", room: room17 });
      expect(d.title).toBe("Combat Training Hall");
      expect(d.typeLabel).toBe("Room");
      expect(d.icon).toBeDefined();
      expect(d.lines).toContainEqual({ label: "Size", value: "24 squares" });
      expect(d.lines.some((l) => l.label === "Description" && l.value.includes("training"))).toBe(
        true,
      );
    });
    it("includes a Kind line only when the room has one authored", () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!;
      expect(
        inspectableDescriptor({ kind: "room", room: room17 }).lines.some((l) => l.label === "Kind"),
      ).toBe(false);
      const withKind: MapRoom = { ...room17, kind: "training-hall" };
      expect(inspectableDescriptor({ kind: "room", room: withKind }).lines).toContainEqual({
        label: "Kind",
        value: "training-hall",
      });
    });
    it('falls back to "Room {id}" when untitled', () => {
      const untitled: MapRoom = { room_id: 42, z: 0, origin: [0, 0], cells: [[0, 0]] };
      expect(inspectableDescriptor({ kind: "room", room: untitled }).title).toBe("Room 42");
    });
    it("includes a Wall kind line when wallKind is set", () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!;
      expect(
        inspectableDescriptor({ kind: "room", room: { ...room17, wallKind: "natural" } }).lines,
      ).toContainEqual({ label: "Wall kind", value: "natural" });
    });
    it("omits Wall kind line when wallKind is not set", () => {
      const room17 = mapLabLayout.rooms.find((r) => r.room_id === 17)!;
      expect(
        inspectableDescriptor({ kind: "room", room: room17 }).lines.some(
          (l) => l.label === "Wall kind",
        ),
      ).toBe(false);
    });
  });
  describe("inspectableDescriptor — door", () => {
    it("produces a descriptor with state, Break DC, and Pick DC for door 32", () => {
      const door32 = mapLabLayout.doors.find((d) => d.door_id === 32)!;
      const d = inspectableDescriptor({ kind: "door", door: door32 });
      expect(d.title).toBe("Heavy Stone Door");
      expect(d.typeLabel).toBe("Door");
      expect(d.token).toBe("--md-passage-locked");
      expect(d.chips.map((c) => c.state)).toEqual(["locked"]);
      expect(d.lines).toContainEqual({ label: "Break DC", value: "23" });
      expect(d.lines).toContainEqual({ label: "Pick DC", value: "18" });
    });
    it("includes a Note line only when one is authored", () => {
      const door32 = mapLabLayout.doors.find((d) => d.door_id === 32)!;
      expect(
        inspectableDescriptor({ kind: "door", door: door32 }).lines.some((l) => l.label === "Note"),
      ).toBe(false);
      const withNote: MapDoor = { ...door32, note: "Splintered near the hinge." };
      expect(inspectableDescriptor({ kind: "door", door: withNote }).lines).toContainEqual({
        label: "Note",
        value: "Splintered near the hinge.",
      });
    });
  });
  describe("inspectableDescriptor — stair", () => {
    it("produces a descriptor for stair 2 sharing the same passage-line shape as a door", () => {
      const stair2 = mapLabLayout.stairs.find((s) => s.stair_id === 2)!;
      const d = inspectableDescriptor({ kind: "stair", stair: stair2 });
      expect(d.title).toBe("Stone Stairs");
      expect(d.typeLabel).toBe("Stair");
      expect(d.chips).toEqual([]);
    });
  });
  describe("inspectableDescriptor — portal", () => {
    it("shows the no-destination line when the portal has not been targeted yet", () => {
      const portal: MapPortal = {
        portal_id: 1,
        z: 0,
        cell: [3, 3],
        hidden: false,
        locked: false,
        trapped: false,
      };
      expect(inspectableDescriptor({ kind: "portal", portal }).lines).toContainEqual({
        label: "Destination",
        value: "This portal has no destination yet. Choose where it leads.",
      });
    });
    it("shows a Leads to line once a destination is set", () => {
      const portal: MapPortal = {
        portal_id: 1,
        z: 0,
        cell: [3, 3],
        to: { z: 2, cell: [5, 5] },
        hidden: false,
        locked: false,
        trapped: false,
      };
      expect(inspectableDescriptor({ kind: "portal", portal }).lines).toContainEqual({
        label: "Leads to",
        value: "5,5 (z:2)",
      });
    });
  });
  describe("inspectableDescriptor — prop", () => {
    it("produces a descriptor with title, type label, and icon", () => {
      const prop: MapProp = {
        prop_id: 1,
        kind: "chest",
        cell: [0, 0],
        title: "Locked chest",
        hidden: false,
        locked: true,
        trapped: false,
      };
      const d = inspectableDescriptor({ kind: "prop", prop });
      expect(d.title).toBe("Locked chest");
      expect(d.typeLabel).toBe("Prop");
      expect(d.icon).toBeDefined();
    });
    it("falls back to the kind when no title is given", () => {
      const prop: MapProp = {
        prop_id: 1,
        kind: "table",
        cell: [0, 0],
        hidden: false,
        locked: false,
        trapped: false,
      };
      expect(inspectableDescriptor({ kind: "prop", prop }).title).toBe("table");
    });
    it("includes title, kind, and passage-flag lines (locked, hidden, perception dc)", () => {
      const prop: MapProp = {
        prop_id: 1,
        kind: "chest",
        cell: [0, 0],
        title: "Locked chest",
        hidden: true,
        locked: true,
        trapped: false,
        pickDc: 12,
        hiddenDc: 15,
      };
      const d = inspectableDescriptor({ kind: "prop", prop });
      expect(d.chips.map((c) => c.state)).toEqual(["locked", "hidden"]);
      expect(d.lines).toContainEqual({ label: "Pick DC", value: "12" });
      expect(d.lines).toContainEqual({ label: "Perception DC", value: "15" });
    });
    it("shows Perception DC and Search DC independently (both coexist)", () => {
      const prop: MapProp = {
        prop_id: 1,
        kind: "chest",
        cell: [0, 0],
        title: "Hidden chest",
        hidden: true,
        locked: false,
        trapped: false,
        hiddenDc: 15,
        searchDc: 20,
      };
      const d = inspectableDescriptor({ kind: "prop", prop });
      expect(d.lines).toContainEqual({ label: "Perception DC", value: "15" });
      expect(d.lines).toContainEqual({ label: "Search DC", value: "20" });
    });
  });
});

describe("Design Phase J — Map Lab Decluttering", () => {
  describe("PASSAGE_STATE_TOKENS", () => {
    it("matches passagePresentation's tokens, locked/hidden repointed to J3's banked tokens", () => {
      expect(PASSAGE_STATE_TOKENS).toEqual({
        trapped: "--md-error",
        locked: "--md-passage-locked",
        hidden: "--md-passage-hidden",
        unlocked: "--md-on-surface-variant",
      });
    });
  });
});
