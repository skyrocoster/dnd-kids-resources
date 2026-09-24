import type { ComponentType, CSSProperties } from "react";
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  WALL_PROP_ICON_SCALE,
  WALL_PROP_RADIUS_FRACTION,
  doorWallSegment,
  type CardinalSide,
  type MapCell,
} from "../model/maplabModel";
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

export interface MarkerGeometry {
  cx: number;
  cy: number;
  radius: number;
  iconSize: number;
}

export function onSquareMarkerGeometry(
  cell: MapCell,
  cellSize: number,
  options?: { offset?: { dx: number; dy: number }; grouped?: boolean },
): MarkerGeometry {
  const offset = options?.offset;
  const grouped = options?.grouped;

  const cx = (cell[0] + 0.5 + (offset?.dx ?? 0)) * cellSize;
  const cy = (cell[1] + 0.5 + (offset?.dy ?? 0)) * cellSize;
  const radius = grouped
    ? cellSize * GROUPED_MARKER_RADIUS_FRACTION
    : cellSize * MARKER_RADIUS_FRACTION;
  const iconSize = grouped ? cellSize * GROUPED_MARKER_RADIUS_FRACTION * 1.1 : cellSize * 0.34;

  return { cx, cy, radius, iconSize };
}

export function wallAttachedMarkerGeometry(
  cell: MapCell,
  side: CardinalSide,
  cellSize: number,
): MarkerGeometry {
  const segment = doorWallSegment({ cell, side }, cellSize);
  const cx = (segment.x1 + segment.x2) / 2;
  const cy = (segment.y1 + segment.y2) / 2;
  const radius = cellSize * WALL_PROP_RADIUS_FRACTION;
  const iconSize = cellSize * WALL_PROP_ICON_SCALE;
  return { cx, cy, radius, iconSize };
}

/** A doorway is exactly one cell wide, so its opening disc scales with the cell. */
export const OPENING_RADIUS_FRACTION = 0.4;
export const OPENING_ICON_SCALE = 0.44;

export function openingMarkerGeometry(
  cell: MapCell,
  side: CardinalSide,
  cellSize: number,
): MarkerGeometry {
  const segment = doorWallSegment({ cell, side }, cellSize);
  return {
    cx: (segment.x1 + segment.x2) / 2,
    cy: (segment.y1 + segment.y2) / 2,
    radius: cellSize * OPENING_RADIUS_FRACTION,
    iconSize: cellSize * OPENING_ICON_SCALE,
  };
}

/** Disc-family for a kid-visible marker. */
export type MarkerFamily = "transition" | "opening" | "fixture" | "person";

/** Stair direction shown as an up/down chevron. */
export type StairDirection = "up" | "down";

/** Every kid-visible marker kind that can appear on the player map. */
export type KidMarkerKind =
  | { kind: "stair"; stairDir: StairDirection }
  | { kind: "portal" }
  | { kind: "door"; open?: boolean }
  | { kind: "window" }
  | { kind: "chest" }
  | { kind: "table" }
  | { kind: "mirror" }
  | { kind: "barrel" }
  | { kind: "statue" }
  | { kind: "other" }
  | { kind: "npc" };

const FAMILY_TOKENS: Record<MarkerFamily, { fill: string; on: string }> = {
  transition: { fill: "--kid-transition", on: "--kid-on-transition" },
  opening: { fill: "--kid-opening", on: "--kid-on-opening" },
  fixture: { fill: "--kid-fixture", on: "--kid-on-fixture" },
  person: { fill: "--kid-people", on: "--kid-on-people" },
};

export function kidMarkerFamily(kind: KidMarkerKind): MarkerFamily {
  switch (kind.kind) {
    case "stair":
    case "portal":
      return "transition";
    case "door":
    case "window":
      return "opening";
    case "chest":
    case "table":
    case "mirror":
    case "barrel":
    case "statue":
    case "other":
      return "fixture";
    case "npc":
      return "person";
  }
}

export function kidFamilyTokens(family: MarkerFamily): { fill: string; on: string } {
  return FAMILY_TOKENS[family];
}

export function kidMarkerIcon(
  kind: KidMarkerKind,
): ComponentType<{ width: number; height: number; className?: string; style?: CSSProperties }> {
  switch (kind.kind) {
    case "stair":
      return kind.stairDir === "up" ? StairsUpIcon : StairsDownIcon;
    case "portal":
      return PortalIcon;
    case "door":
      return kind.open ? DoorOpenIcon : DoorClosedIcon;
    case "window":
      return PropWindowIcon;
    case "chest":
      return PropChestIcon;
    case "table":
      return PropTableIcon;
    case "mirror":
      return PropMirrorIcon;
    case "barrel":
      return PropBarrelIcon;
    case "statue":
      return PropStatueIcon;
    case "other":
      return PropIcon;
    case "npc":
      return UserIcon;
  }
}

export function kidGlyphColorToken(kind: KidMarkerKind): string {
  return FAMILY_TOKENS[kidMarkerFamily(kind)].on;
}
