import { describe, it, expect } from "vitest";
import {
  onSquareMarkerGeometry,
  openingMarkerGeometry,
  wallAttachedMarkerGeometry,
  kidMarkerFamily,
  kidMarkerIcon,
  kidFamilyTokens,
  kidGlyphColorToken,
} from "../markerShapeModel";
import {
  DoorOpen as DoorOpenIcon,
  DoorClosed as DoorClosedIcon,
  ArrowUpToLine as StairsUpIcon,
  ArrowDownToLine as StairsDownIcon,
  Sparkles as PortalIcon,
  Box as PropChestIcon,
  Table2 as PropTableIcon,
  Frame as PropMirrorIcon,
  Barrel as PropBarrelIcon,
  Landmark as PropStatueIcon,
  Layers as PropWindowIcon,
  Package as PropIcon,
  User as UserIcon,
} from "lucide-react";

describe("onSquareMarkerGeometry", () => {
  it("computes ungrouped geometry with no offset", () => {
    const result = onSquareMarkerGeometry([1, 1], 100);
    expect(result.cx).toBe(150);
    expect(result.cy).toBe(150);
    expect(result.radius).toBe(32);
    expect(result.iconSize).toBe(34);
  });

  it("computes ungrouped geometry with an offset", () => {
    const result = onSquareMarkerGeometry([1, 1], 100, {
      offset: { dx: 0.3, dy: -0.2 },
    });
    expect(result.cx).toBe(180);
    expect(result.cy).toBe(130);
    expect(result.radius).toBe(32);
    expect(result.iconSize).toBe(34);
  });

  it("computes grouped geometry with no offset", () => {
    const result = onSquareMarkerGeometry([1, 1], 100, { grouped: true });
    expect(result.cx).toBe(150);
    expect(result.cy).toBe(150);
    expect(result.radius).toBe(18);
    expect(result.iconSize).toBe(19.8);
  });

  it("computes grouped geometry with an offset", () => {
    const result = onSquareMarkerGeometry([1, 1], 100, {
      offset: { dx: 0.3, dy: -0.2 },
      grouped: true,
    });
    expect(result.cx).toBe(180);
    expect(result.cy).toBe(130);
    expect(result.radius).toBe(18);
    expect(result.iconSize).toBe(19.8);
  });

  // ── Kid marker family / icon helpers ──────────────────────────────

  it("maps transition markers (stairs, portal) to transition family", () => {
    expect(kidMarkerFamily({ kind: "stair", stairDir: "up" })).toBe("transition");
    expect(kidMarkerFamily({ kind: "stair", stairDir: "down" })).toBe("transition");
    expect(kidMarkerFamily({ kind: "portal" })).toBe("transition");
  });

  it("maps opening markers (door, window) to opening family", () => {
    expect(kidMarkerFamily({ kind: "door" })).toBe("opening");
    expect(kidMarkerFamily({ kind: "window" })).toBe("opening");
  });

  it("maps fixture markers to fixture family", () => {
    for (const kind of ["chest", "table", "mirror", "barrel", "statue", "other"] as const) {
      expect(kidMarkerFamily({ kind })).toBe("fixture");
    }
  });

  it("maps npc to person family", () => {
    expect(kidMarkerFamily({ kind: "npc" })).toBe("person");
  });

  it("returns correct glyph color tokens per family", () => {
    expect(kidGlyphColorToken({ kind: "stair", stairDir: "up" })).toBe("--kid-on-transition");
    expect(kidGlyphColorToken({ kind: "door" })).toBe("--kid-on-opening");
    expect(kidGlyphColorToken({ kind: "chest" })).toBe("--kid-on-fixture");
    expect(kidGlyphColorToken({ kind: "npc" })).toBe("--kid-on-people");
  });

  it("returns correct fill/on token pairs per family", () => {
    expect(kidFamilyTokens("transition")).toEqual({
      fill: "--kid-transition",
      on: "--kid-on-transition",
    });
    expect(kidFamilyTokens("opening")).toEqual({
      fill: "--kid-opening",
      on: "--kid-on-opening",
    });
    expect(kidFamilyTokens("fixture")).toEqual({
      fill: "--kid-fixture",
      on: "--kid-on-fixture",
    });
    expect(kidFamilyTokens("person")).toEqual({
      fill: "--kid-people",
      on: "--kid-on-people",
    });
  });

  it("distinguishes stair up/down icons", () => {
    const up = kidMarkerIcon({ kind: "stair", stairDir: "up" });
    const down = kidMarkerIcon({ kind: "stair", stairDir: "down" });
    expect(up).toBe(StairsUpIcon);
    expect(down).toBe(StairsDownIcon);
    expect(up).not.toBe(down);
  });

  it("returns portal icon for portal kind", () => {
    expect(kidMarkerIcon({ kind: "portal" })).toBe(PortalIcon);
  });

  it("returns correct icons for opening kinds", () => {
    expect(kidMarkerIcon({ kind: "door", open: true })).toBe(DoorOpenIcon);
    expect(kidMarkerIcon({ kind: "window" })).toBe(PropWindowIcon);
  });

  it("draws a closed door with a closed-door glyph", () => {
    expect(kidMarkerIcon({ kind: "door" })).toBe(DoorClosedIcon);
    expect(kidMarkerIcon({ kind: "door", open: false })).toBe(DoorClosedIcon);
    expect(kidMarkerIcon({ kind: "door", open: false })).not.toBe(DoorOpenIcon);
  });

  it("sizes an opening disc to fill its doorway", () => {
    const cellSize = 64;
    const geo = openingMarkerGeometry([2, 3], "N", cellSize);
    // Straddles the wall segment's midpoint …
    expect(geo.cx).toBe(2.5 * cellSize);
    expect(geo.cy).toBe(3 * cellSize);
    // … and its diameter covers most of the one-cell gap, unlike the smaller wall-prop disc.
    expect(geo.radius * 2).toBeGreaterThan(cellSize * 0.7);
    expect(geo.radius * 2).toBeLessThan(cellSize);
    expect(geo.radius).toBeGreaterThan(wallAttachedMarkerGeometry([2, 3], "N", cellSize).radius);
  });

  it("returns correct icons for fixture kinds", () => {
    expect(kidMarkerIcon({ kind: "chest" })).toBe(PropChestIcon);
    expect(kidMarkerIcon({ kind: "table" })).toBe(PropTableIcon);
    expect(kidMarkerIcon({ kind: "mirror" })).toBe(PropMirrorIcon);
    expect(kidMarkerIcon({ kind: "barrel" })).toBe(PropBarrelIcon);
    expect(kidMarkerIcon({ kind: "statue" })).toBe(PropStatueIcon);
    expect(kidMarkerIcon({ kind: "other" })).toBe(PropIcon);
  });

  it("returns user icon for npc", () => {
    expect(kidMarkerIcon({ kind: "npc" })).toBe(UserIcon);
  });
});
