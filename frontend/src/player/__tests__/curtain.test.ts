import { describe, expect, it } from "vitest";
import { createEmptyMapLayout } from "../../model/maplabModel";
import type { PassageSessionState } from "../../model/maplabModel";
import { playerViewTransform } from "../curtain";

describe("curtain (player-view transform)", () => {
  it("always fields survive the transform", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 42,
      cell: [5, 10],
      side: "N",
      z: 0,
      title: "Iron Door",
      hidden: false,
      locked: true,
      trapped: false,
    });
    const result = playerViewTransform(layout);
    expect(result.doors[0].door_id).toBe(42);
    expect(result.doors[0].cell).toEqual([5, 10]);
    expect(result.doors[0].side).toBe("N");
    expect(result.doors[0].title).toBe("Iron Door");
  });

  it("never fields are stripped from passage types", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      breakDc: 20,
      pickDc: 15,
      hiddenDc: 18,
      note: "Secret door",
      hidden: false,
      locked: false,
      trapped: false,
    });
    const result = playerViewTransform(layout);
    expect(result.doors[0]).not.toHaveProperty("breakDc");
    expect(result.doors[0]).not.toHaveProperty("pickDc");
    expect(result.doors[0]).not.toHaveProperty("hiddenDc");
    expect(result.doors[0]).not.toHaveProperty("note");
  });

  it("hidden doors are excluded", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: true,
      locked: false,
      trapped: false,
    });
    const result = playerViewTransform(layout);
    expect(result.doors).toHaveLength(0);
  });

  it("non-hidden doors appear without hidden field", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
    });
    const result = playerViewTransform(layout);
    expect(result.doors).toHaveLength(1);
    expect(result.doors[0]).not.toHaveProperty("hidden");
  });

  it("hidden props are excluded", () => {
    const layout = createEmptyMapLayout("Test");
    layout.props.push({
      prop_id: 1,
      kind: "chest",
      cell: [0, 0],
      hidden: true,
      locked: false,
      trapped: false,
    });
    const result = playerViewTransform(layout);
    expect(result.props).toHaveLength(0);
  });

  it("encounter markers are excluded from the returned props", () => {
    const layout = createEmptyMapLayout("Test");
    layout.props.push(
      {
        prop_id: 1,
        kind: "encounter",
        cell: [0, 0],
        hidden: false,
        locked: false,
        trapped: false,
      },
      {
        prop_id: 2,
        kind: "npc",
        cell: [1, 0],
        hidden: false,
        locked: false,
        trapped: false,
      },
    );
    const result = playerViewTransform(layout);
    expect(result.props).toHaveLength(1);
    expect(result.props[0].prop_id).toBe(2);
  });

  it("features are absent from the kid layout", () => {
    const layout = createEmptyMapLayout("Test");
    layout.features.push({
      feature_id: 1,
      z: 0,
      kind: "river",
      cells: [[0, 0]],
    });
    const result = playerViewTransform(layout);
    expect(result).not.toHaveProperty("features");
  });

  it("does not mutate the input layout", () => {
    const layout = createEmptyMapLayout("Test");
    layout.props.push({
      prop_id: 99,
      kind: "encounter",
      cell: [0, 0],
      hidden: false,
      locked: false,
      trapped: false,
    });
    const before = layout.props.length;
    playerViewTransform(layout);
    expect(layout.props).toHaveLength(before);
    expect(layout.props[0]).toHaveProperty("kind", "encounter");
  });

  it("returns effective open state and only active trap/lock facts for every fixture kind", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
    });
    layout.stairs.push({
      stair_id: 2,
      from: { z: 0, cell: [1, 0] },
      to: { z: 0, cell: [2, 0] },
      hidden: false,
      locked: false,
      trapped: false,
    });
    layout.props.push({
      prop_id: 3,
      kind: "chest",
      cell: [3, 0],
      hidden: false,
      locked: true,
      trapped: false,
    });
    layout.portals.push({
      portal_id: 4,
      cell: [4, 0],
      z: 0,
      to: { z: 0, cell: [5, 0] },
      hidden: false,
      locked: false,
      trapped: true,
    });

    const result = playerViewTransform(layout, {
      doors: { "1": { open: true } },
      stairs: { "2": { open: true } },
      props: { "3": { open: false } },
      portals: { "4": { open: true } },
    });

    expect(result.doors[0]).toMatchObject({ state: "open" });
    expect(result.stairs[0]).toMatchObject({ state: "open" });
    expect(result.props[0]).toMatchObject({ state: "closed", locked: true });
    expect(result.portals[0]).toMatchObject({ state: "open", trapped: true });
    for (const fixture of [...result.doors, ...result.stairs, ...result.props, ...result.portals]) {
      expect(fixture).not.toHaveProperty("hidden");
      expect(fixture).not.toHaveProperty("loot");
      expect(fixture).not.toHaveProperty("note");
      expect(fixture).not.toHaveProperty("breakDc");
      expect(fixture).not.toHaveProperty("pickDc");
      expect(fixture).not.toHaveProperty("hiddenDc");
      expect(fixture).not.toHaveProperty("status");
      expect(fixture).not.toHaveProperty("encounter");
      if (!("locked" in fixture)) expect(fixture).not.toHaveProperty("locked");
      if (!("trapped" in fixture)) expect(fixture).not.toHaveProperty("trapped");
    }
  });

  it("omits a fixture concealed by an armed concealment session fact", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
    });

    const result = playerViewTransform(layout, {
      doors: { "1": { hidden: true } as unknown as PassageSessionState },
    });

    expect(result.doors).toHaveLength(0);
  });

  it("omits a legacy fixture when session concealment is armed", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
    });

    const result = playerViewTransform(layout, {
      doors: { "1": { obstacles: { concealment: { armed: true } } } },
    });

    expect(result.doors).toHaveLength(0);
  });

  it("projects nested authored and session state into flat player facts", () => {
    const layout = createEmptyMapLayout("Test");
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: "N",
      hidden: false,
      locked: false,
      trapped: false,
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: true, shown: true },
          trap: { armed: false, shown: false },
        },
      },
    });

    const result = playerViewTransform(layout, {
      doors: {
        "1": {
          open: true,
          obstacles: {
            concealment: { armed: false },
            lock: { armed: false, shown: false },
            trap: { armed: true, shown: true },
          },
        },
      },
    });

    expect(result.doors[0]).toMatchObject({ state: "open", trapped: true });
    expect(result.doors[0]).not.toHaveProperty("locked");
    expect(result.doors[0]).not.toHaveProperty("obstacles");
    expect(result.doors[0]).not.toHaveProperty("concealment");
  });
});
