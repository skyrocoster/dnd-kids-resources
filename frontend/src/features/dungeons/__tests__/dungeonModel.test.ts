import { describe, it, expect } from "vitest";
import {
  parseDungeonData,
  getRooms,
  getRoomById,
  groupEntriesByType,
  getRoomThreatHints,
  getFloors,
  getFloorForRoom,
  getRoomsOnFloor,
} from "../dungeonModel";

// Seed data for "Isly Castle" — minimal fixture for testing.
// These are actual entries from data/seeds/seed_dungeons.json (id: 4).
const islyData = {
  general_info: {
    title: "Isly Castle",
    size: null,
    walls: null,
    floor: null,
    temperature: null,
    illumination: null,
  },
  rooms: [
    {
      room_id: 1,
      title: "Outside",
      entries: [],
    },
    {
      room_id: 2,
      title: "Entrance Hall",
      entries: [
        {
          entry_type: "feature",
          title: "Pillars",
          content:
            "Two large stone pillars engraved with writings and clearly defaced by students over the years.",
        },
      ],
    },
    {
      room_id: 3,
      title: "Portal Room",
      entries: [
        {
          entry_type: "feature",
          title: "Stone Archways",
          content: "two rows of large archways set upon marble pedestals",
        },
        {
          entry_type: "trap",
          title: "Paralysing Light",
          content:
            "attempting to touch or use a portal without the portal master results in a paralysing spell (DC 18 Con save)",
        },
      ],
      npcs: [4],
    },
    {
      room_id: 4,
      title: "Large Corridor",
      entries: [],
    },
    {
      room_id: 5,
      title: "Great Hall",
      entries: [],
    },
  ],
  doors: [
    {
      door_id: 1,
      entry_type: "door",
      title: "Great Double Wooden Doors",
      content: "",
      leads_to: [2, 1],
    },
    {
      door_id: 2,
      entry_type: "door",
      title: "Double Stone Doors",
      content:
        "Enscribed with large runes. Reading them reveals they are teleportation runes of various types.",
      leads_to: [3, 2],
    },
    {
      door_id: 3,
      entry_type: "door",
      title: "Ornate Wooden Door",
      content: "",
      leads_to: [4, 2],
    },
    {
      door_id: 4,
      entry_type: "door",
      title: "Grand Double Wooden Doors",
      content: "",
      leads_to: [5, 4],
    },
  ],
  corridors: [],
  map_image: null,
  map_image_length: 0,
};

describe("dungeonModel", () => {
  describe("parseDungeonData", () => {
    it("parses the opaque blob into typed DungeonData", () => {
      const parsed = parseDungeonData(islyData);
      expect(parsed.rooms).toBeDefined();
      expect(parsed.doors).toBeDefined();
      expect(parsed.general_info).toBeDefined();
    });

    it("handles null/undefined input gracefully", () => {
      const parsed = parseDungeonData(null);
      expect(parsed.rooms).toEqual([]);
      expect(parsed.doors).toEqual([]);
    });

    it("handles missing keys without throwing", () => {
      const partial = { rooms: [] };
      const parsed = parseDungeonData(partial);
      expect(parsed.doors).toEqual([]);
      expect(parsed.general_info).toEqual({});
    });

    it("coerces numeric-string monster_id/encounter_id on entries (real seed data uses strings)", () => {
      const withStringIds = {
        rooms: [
          {
            room_id: 1,
            title: "Kennels",
            entries: [
              {
                entry_type: "encounter",
                title: "Fight",
                content: "",
                encounter_id: "1",
                monster_id: "7",
              },
              {
                entry_type: "feature",
                title: "Empty",
                content: "",
                encounter_id: "",
                monster_id: "not-a-number",
              },
            ],
          },
        ],
      };
      const parsed = parseDungeonData(withStringIds);
      const entries = parsed.rooms![0].entries!;
      expect(entries[0].encounter_id).toBe(1);
      expect(entries[0].monster_id).toBe(7);
      expect(entries[1].encounter_id).toBeNull();
      expect(entries[1].monster_id).toBeNull();
    });
  });

  describe("getRooms", () => {
    it("returns all rooms from parsed data", () => {
      const parsed = parseDungeonData(islyData);
      const rooms = getRooms(parsed);
      expect(rooms.length).toBe(5);
      expect(rooms.map((r) => r.room_id)).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns empty array if no rooms", () => {
      const parsed = parseDungeonData({ rooms: [] });
      expect(getRooms(parsed)).toEqual([]);
    });
  });

  describe("getRoomById", () => {
    it("finds a room by room_id", () => {
      const parsed = parseDungeonData(islyData);
      const room = getRoomById(parsed, 3);
      expect(room).toBeDefined();
      expect(room?.title).toBe("Portal Room");
    });

    it("returns undefined for unknown room_id", () => {
      const parsed = parseDungeonData(islyData);
      expect(getRoomById(parsed, 999)).toBeUndefined();
    });
  });

  describe("groupEntriesByType", () => {
    it("groups entries by type with labels", () => {
      const parsed = parseDungeonData(islyData);
      const room = getRoomById(parsed, 3)!;
      const grouped = groupEntriesByType(room);
      expect(grouped.length).toBeGreaterThan(0);
      expect(grouped.some((g) => g.label === "Features")).toBe(true);
      expect(grouped.some((g) => g.label === "Traps")).toBe(true);
    });

    it("returns empty array for room with no entries", () => {
      const parsed = parseDungeonData(islyData);
      const room = getRoomById(parsed, 1)!;
      const grouped = groupEntriesByType(room);
      expect(grouped.length).toBe(0);
    });

    it('assigns unrecognized types to "Other"', () => {
      const withUnknown = {
        ...islyData,
        rooms: [
          {
            room_id: 99,
            title: "Mystery Room",
            entries: [
              {
                entry_type: "unknown_type",
                title: "Mystery",
                content: "A mysterious thing",
              },
            ],
          },
        ],
      };
      const parsed = parseDungeonData(withUnknown);
      const room = getRoomById(parsed, 99)!;
      const grouped = groupEntriesByType(room);
      expect(grouped.some((g) => g.label === "Other")).toBe(true);
    });
  });

  describe("getRoomThreatHints", () => {
    it("detects traps in a room", () => {
      const parsed = parseDungeonData(islyData);
      const room = getRoomById(parsed, 3)!; // Portal Room has a trap
      const hints = getRoomThreatHints(room);
      expect(hints.hasTrap).toBe(true);
    });

    it("detects no threats when absent", () => {
      const parsed = parseDungeonData(islyData);
      const room = getRoomById(parsed, 1)!; // Outside has no entries
      const hints = getRoomThreatHints(room);
      expect(hints.hasTrap).toBe(false);
      expect(hints.hasMonster).toBe(false);
      expect(hints.hasEncounter).toBe(false);
    });
  });

  describe("Floor selectors", () => {
    it("returns empty array when no floors present", () => {
      const parsed = parseDungeonData(islyData);
      const floors = getFloors(parsed);
      expect(floors).toEqual([]);
    });

    it("maps rooms to their floor", () => {
      const withFloors = {
        ...islyData,
        floors: [
          {
            floor_id: 1,
            title: "Ground Floor",
            room_ids: [1, 2, 3],
            floor_below: null,
            floor_above: 2,
          },
          {
            floor_id: 2,
            title: "Second Floor",
            room_ids: [4, 5],
            floor_below: 1,
            floor_above: null,
          },
        ],
      };
      const parsed = parseDungeonData(withFloors);

      const floor1 = getFloorForRoom(parsed, 1);
      expect(floor1?.floor_id).toBe(1);

      const floor5 = getFloorForRoom(parsed, 5);
      expect(floor5?.floor_id).toBe(2);
    });

    it("returns rooms on a specific floor", () => {
      const withFloors = {
        ...islyData,
        floors: [
          {
            floor_id: 1,
            title: "Ground Floor",
            room_ids: [1, 2, 3],
            floor_below: null,
            floor_above: 2,
          },
          {
            floor_id: 2,
            title: "Second Floor",
            room_ids: [4, 5],
            floor_below: 1,
            floor_above: null,
          },
        ],
      };
      const parsed = parseDungeonData(withFloors);

      const floor1Rooms = getRoomsOnFloor(parsed, 1);
      expect(floor1Rooms.map((r) => r.room_id)).toEqual([1, 2, 3]);

      const floor2Rooms = getRoomsOnFloor(parsed, 2);
      expect(floor2Rooms.map((r) => r.room_id)).toEqual([4, 5]);
    });
  });
});
