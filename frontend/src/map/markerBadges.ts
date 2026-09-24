import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  EyeOff,
  Layers,
  Lock,
  type LucideIcon,
} from "lucide-react";
import {
  effectiveFixtureState,
  fixtureStateFromFlags,
  isPassageStateActive,
  PASSAGE_STATE_PRECEDENCE,
  PASSAGE_STATE_TOKENS,
  type MapDoor,
  type MapPortal,
  type MapProp,
  type MapStair,
  type PassageState,
  type SessionFixtureState,
} from "../model/maplabModel";

/** A single badge descriptor — one flag → one badge, fed into either a radial ring (on-square
 * markers) or a linear layout (door leaf). The `key` is stable across renders so badges keep
 * their clock position as unrelated flags toggle. */
export interface MarkerBadge {
  key: string;
  icon: LucideIcon;
  token: string;
  onToken: string;
  label: string;
}

type BadgeSource = MapDoor | MapStair | MapPortal | MapProp;

// ─── M0 / M1: Collapsed status descriptor ───────────────────────────────────

/** A collapsed on-canvas status descriptor. Consumers that need full detail
 * (inspector labels, accessible descriptions) should still use the complete
 * `MarkerBadge[]` from `markerBadges()`. */
export type CollapsedStatusDescriptor = MarkerBadge | null;

export const MULTIPLE_STATUSES_BADGE: MarkerBadge = {
  key: "multiple-statuses",
  icon: Layers,
  token: "--md-surface",
  onToken: "--md-on-surface",
  label: "Multiple statuses",
};

/** Collapse an ordered badge list to the single on-canvas disc M1 displays. */
export function collapsedStatusDescriptor(badges: MarkerBadge[]): CollapsedStatusDescriptor {
  if (badges.length === 0) return null;
  if (badges.length === 1) return badges[0];
  return MULTIPLE_STATUSES_BADGE;
}

/** Names the collapsed disc for assistive technology while retaining every underlying status.
 * The explicit prefix makes the Layers glyph understandable without relying on its shape or color. */
export function collapsedStatusLabel(badges: MarkerBadge[], fallback: string): string {
  if (badges.length === 0) return fallback;
  if (badges.length === 1) return badges[0].label;
  return `${MULTIPLE_STATUSES_BADGE.label}: ${badges.map((badge) => badge.label).join(", ")}`;
}

// ─── M2: Bounded on-square placement ────────────────────────────────────────

/** A single badge disc position and radius that is geometrically bounded to stay
 * within its owning cell. The full disc (center + radius) must lie inside the
 * cell `[cellX, cellX + cellSize) × [cellY, cellY + cellSize)`. */
export interface BoundedBadgePlacement {
  cx: number;
  cy: number;
  radius: number;
}

/** Returns a badge position for an on-square marker. The existing marker center is already
 * the fixture's reserved slot: standalone markers use the cell center; grouped markers use
 * `gridMarkerOffset`'s 2x2 sub-slot centers. Clamping preserves the full-disc cell bound
 * even if a future caller supplies an edge-biased marker center. */
export function boundedBadgeLayout(
  cellX: number,
  cellY: number,
  cellSize: number,
  markerCenterX: number,
  markerCenterY: number,
  _markerRadius: number,
  badgeRadius: number,
): BoundedBadgePlacement {
  const minX = cellX + badgeRadius;
  const maxX = cellX + cellSize - badgeRadius;
  const minY = cellY + badgeRadius;
  const maxY = cellY + cellSize - badgeRadius;

  return {
    cx: Math.min(Math.max(markerCenterX, minX), maxX),
    cy: Math.min(Math.max(markerCenterY, minY), maxY),
    radius: badgeRadius,
  };
}

/** Passage chip icon/label selection, mirroring the feature presentation chips but kept local so
 *  this module stays inside the neutral `src/map/**` boundary (model + lucide-react only).
 *  Precedence and activeness come from the shared model helpers. */
const PASSAGE_CHIP_ICONS: Record<Exclude<PassageState, "unlocked">, LucideIcon> = {
  trapped: AlertTriangle,
  locked: Lock,
  hidden: EyeOff,
};

const PASSAGE_CHIP_LABELS: Record<Exclude<PassageState, "unlocked">, string> = {
  trapped: "Trapped",
  locked: "Locked",
  hidden: "Hidden",
};

/** Derive the ordered badge descriptor list from a marker's passage flags and session state.
 *  Composed from, in fixed precedence: trapped ▸ locked ▸ hidden, then loot (when present), then
 *  trap-disarmed. Stable ordering so a badge keeps its clock position as unrelated flags toggle. */
export function markerBadges(source: BadgeSource, trapDisarmed = false): MarkerBadge[] {
  const badges: MarkerBadge[] = PASSAGE_STATE_PRECEDENCE.filter(
    (state): state is Exclude<PassageState, "unlocked"> =>
      state !== "unlocked" && isPassageStateActive(state, source),
  ).map((state) => ({
    key: state,
    icon: PASSAGE_CHIP_ICONS[state],
    token: PASSAGE_STATE_TOKENS[state],
    onToken: `--md-on-${PASSAGE_STATE_TOKENS[state].slice("--md-".length)}`,
    label: PASSAGE_CHIP_LABELS[state],
  }));

  if ("loot" in source && source.loot) {
    badges.push({
      key: "loot",
      icon: Coins,
      token: "--md-loot",
      onToken: "--md-on-loot",
      label: "Loot assigned",
    });
  }
  if (trapDisarmed) {
    badges.push({
      key: "trap-disarmed",
      icon: CheckCircle2,
      token: "--md-tertiary",
      onToken: "--md-on-tertiary",
      label: "Trap disarmed",
    });
  }

  return badges;
}

/** Token CSS variable lookup for fixture state badge backgrounds. */
const FIXTURE_BADGE_TOKENS: Record<string, string> = {
  concealed: "--md-passage-hidden",
  trapped: "--md-error",
  locked: "--md-passage-locked",
};

type FixtureChipState = "concealed" | "trapped" | "locked";

/** Fixture-state chip icon/label selection for DM marker badges, mirroring the feature
 *  presentation chips (armed obstacles, concealed → trapped → locked) within the neutral
 *  `src/map/**` boundary. */
const FIXTURE_CHIP_ICONS: Record<FixtureChipState, LucideIcon> = {
  concealed: EyeOff,
  trapped: AlertTriangle,
  locked: Lock,
};

const FIXTURE_CHIP_LABELS: Record<FixtureChipState, string> = {
  concealed: "Concealed",
  trapped: "Trapped",
  locked: "Locked",
};

function fixtureBadge(state: FixtureChipState): MarkerBadge {
  return {
    key: state,
    icon: FIXTURE_CHIP_ICONS[state],
    token: FIXTURE_BADGE_TOKENS[state],
    onToken: `--md-on-${FIXTURE_BADGE_TOKENS[state].slice("--md-".length)}`,
    label: FIXTURE_CHIP_LABELS[state],
  };
}

/** Player policy: one active, shown obstacle descriptor, with danger before obstruction. */
export function playerFixtureBadge(
  fixture: Pick<MapDoor | MapStair | MapPortal | MapProp, "locked" | "trapped">,
): MarkerBadge | null {
  const state: Exclude<FixtureChipState, "concealed"> | null = fixture.trapped
    ? "trapped"
    : fixture.locked
      ? "locked"
      : null;
  return state ? fixtureBadge(state) : null;
}

/** Badge composition for fixture-state DM markers. Consumes effective nested state
 *  (authored + session) and emits only active obstacle and loot badges. Never emits
 *  trap-disarmed or unlocked badges. Active-obstacle order matches the shared fixture
 *  chips: concealed → trapped → locked, then Loot when present. */
export function fixtureMarkerBadges(
  fixture: BadgeSource,
  session?: SessionFixtureState,
): MarkerBadge[] {
  // The player curtain deliberately flattens authored state to `open`/`closed` strings. When the
  // player renderer reuses this badge composer, recover the visible lock/trap flags instead of
  // treating that display string as a FixtureState object.
  const authored =
    typeof fixture.state === "object" && fixture.state !== null
      ? fixture.state
      : fixtureStateFromFlags(fixture);
  const effective = effectiveFixtureState(authored, session);
  const chips: FixtureChipState[] = [];
  if (effective.obstacles.concealment.armed) {
    chips.push("concealed");
  }
  if (effective.obstacles.trap.armed) {
    chips.push("trapped");
  }
  if (effective.obstacles.lock.armed) {
    chips.push("locked");
  }
  const badges: MarkerBadge[] = chips.map(fixtureBadge);

  if ("loot" in fixture && fixture.loot) {
    badges.push({
      key: "loot",
      icon: Coins,
      token: "--md-loot",
      onToken: "--md-on-loot",
      label: "Loot assigned",
    });
  }

  return badges;
}

/** Linear layout for door badges along the leaf. Badges at evenly spaced interior params
 * t_i = (i+1)/(count+1) along `segment`, each pushed off the leaf by `normal` so they float
 * just above the line. Returns absolute {x, y} positions. */
export function linearBadgeLayout(
  count: number,
  segment: { x1: number; y1: number; x2: number; y2: number },
  normal: { x: number; y: number },
  badgeRadius: number,
  clearance = badgeRadius + 2,
): { x: number; y: number }[] {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1);
    return {
      x: segment.x1 + (segment.x2 - segment.x1) * t + normal.x * clearance,
      y: segment.y1 + (segment.y2 - segment.y1) * t + normal.y * clearance,
    };
  });
}
