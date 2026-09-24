import { describe, it, expect } from "vitest";
import { mapLabLayout } from "../maplabData";
import {
  createEmptyMapLayout,
  normalizeLayout,
  type MapLayout,
  type MapProp,
} from "../../../../model/maplabModel";

describe("maplabModel persistence", () => {
  describe("MapProp.encounter_id round-trip (D1)", () => {
    const encounterProp: MapProp = {
      prop_id: 501,
      kind: "encounter",
      cell: [0, 0],
      hidden: false,
      locked: false,
      trapped: false,
      title: "Goblin Ambush",
      encounter_id: 42,
    };

    it("survives a JSON round-trip through the persisted layout blob", () => {
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] };
      const roundTripped: MapLayout = JSON.parse(JSON.stringify(layout));
      const prop = roundTripped.props.find((p) => p.prop_id === 501);
      expect(prop?.encounter_id).toBe(42);
    });

    it("is preserved by normalizeLayout", () => {
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, encounterProp] };
      const normalized = normalizeLayout(layout);
      const prop = normalized.props.find((p) => p.prop_id === 501);
      expect(prop?.encounter_id).toBe(42);
    });

    it("preserves a null encounter_id for an unlinked encounter marker", () => {
      const unlinked: MapProp = { ...encounterProp, encounter_id: null };
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, unlinked] };
      const roundTripped: MapLayout = JSON.parse(JSON.stringify(layout));
      const prop = roundTripped.props.find((p) => p.prop_id === 501);
      expect(prop?.encounter_id).toBeNull();
    });
  });

  describe("MapProp.npc_id round-trip (D1)", () => {
    const npcProp: MapProp = {
      prop_id: 502,
      kind: "npc",
      cell: [1, 1],
      hidden: false,
      locked: false,
      trapped: false,
      title: "Wizard NPC",
      npc_id: 24,
    };

    it("survives a JSON round-trip through the persisted layout blob", () => {
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, npcProp] };
      const roundTripped: MapLayout = JSON.parse(JSON.stringify(layout));
      const prop = roundTripped.props.find((p) => p.prop_id === 502);
      expect(prop?.npc_id).toBe(24);
    });

    it("is preserved by normalizeLayout", () => {
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, npcProp] };
      const normalized = normalizeLayout(layout);
      const prop = normalized.props.find((p) => p.prop_id === 502);
      expect(prop?.npc_id).toBe(24);
    });

    it("preserves a null npc_id for an unlinked npc marker", () => {
      const unlinked: MapProp = { ...npcProp, npc_id: null };
      const layout: MapLayout = { ...mapLabLayout, props: [...mapLabLayout.props, unlinked] };
      const roundTripped: MapLayout = JSON.parse(JSON.stringify(layout));
      const prop = roundTripped.props.find((p) => p.prop_id === 502);
      expect(prop?.npc_id).toBeNull();
    });
  });

  describe("layout ID counters (Order 03)", () => {
    it("createEmptyMapLayout seeds all four counters at 1", () => {
      const layout = createEmptyMapLayout();
      expect(layout.meta.nextDoorId).toBe(1);
      expect(layout.meta.nextPropId).toBe(1);
      expect(layout.meta.nextStairId).toBe(1);
      expect(layout.meta.nextPortalId).toBe(1);
    });

    it("counters survive a JSON round-trip through the persisted layout blob", () => {
      const base = createEmptyMapLayout();
      const layout: MapLayout = {
        ...base,
        doors: [
          { door_id: 1, cell: [0, 0], side: "N", hidden: false, locked: false, trapped: false },
        ],
        meta: { ...base.meta, nextDoorId: 7 },
      };
      const roundTripped: MapLayout = JSON.parse(JSON.stringify(layout));
      expect(roundTripped.meta.nextDoorId).toBe(7);
      expect(roundTripped.meta.nextPropId).toBe(1);
      expect(roundTripped.meta.nextStairId).toBe(1);
      expect(roundTripped.meta.nextPortalId).toBe(1);
    });

    it("normalizeLayout backfills missing counters from the current per-kind maxima", () => {
      const base = createEmptyMapLayout();
      const layout: MapLayout = {
        ...base,
        doors: [
          { door_id: 5, cell: [0, 0], side: "N", hidden: false, locked: false, trapped: false },
        ],
        props: [
          { prop_id: 3, kind: "chest", cell: [0, 0], hidden: false, locked: false, trapped: false },
        ],
        stairs: [
          {
            stair_id: 2,
            from: { z: 0, cell: [0, 0] },
            to: { z: 1, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          },
        ],
        portals: [
          {
            portal_id: 4,
            z: 0,
            cell: [0, 0],
            to: { z: 1, cell: [1, 1] },
            hidden: false,
            locked: false,
            trapped: false,
          },
        ],
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      };
      const normalized = normalizeLayout(layout);
      expect(normalized.meta.nextDoorId).toBe(6);
      expect(normalized.meta.nextPropId).toBe(4);
      expect(normalized.meta.nextStairId).toBe(3);
      expect(normalized.meta.nextPortalId).toBe(5);
    });

    it("normalizeLayout leaves an existing counter untouched (no backfill over it)", () => {
      const base = createEmptyMapLayout();
      const layout: MapLayout = {
        ...base,
        doors: [
          { door_id: 5, cell: [0, 0], side: "N", hidden: false, locked: false, trapped: false },
        ],
        meta: { ...base.meta, nextDoorId: 9 },
      };
      const normalized = normalizeLayout(layout);
      expect(normalized.meta.nextDoorId).toBe(9);
    });

    it("normalizeLayout tolerates an old persisted layout missing props and portals", () => {
      const base = createEmptyMapLayout();
      const legacyLayout: Partial<MapLayout> = {
        ...base,
        doors: [
          { door_id: 5, cell: [0, 0], side: "N", hidden: false, locked: false, trapped: false },
        ],
        stairs: [
          {
            stair_id: 2,
            from: { z: 0, cell: [0, 0] },
            to: { z: 1, cell: [0, 0] },
            hidden: false,
            locked: false,
            trapped: false,
          },
        ],
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      };
      delete legacyLayout.props;
      delete legacyLayout.portals;
      const normalized = normalizeLayout(legacyLayout as MapLayout);
      expect(normalized.props).toEqual([]);
      expect(normalized.portals).toEqual([]);
      expect(normalized.meta.nextDoorId).toBe(6);
      expect(normalized.meta.nextStairId).toBe(3);
      expect(normalized.meta.nextPropId).toBe(1);
      expect(normalized.meta.nextPortalId).toBe(1);
    });
  });
});
