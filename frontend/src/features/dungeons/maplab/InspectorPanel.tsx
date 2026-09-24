import { Fragment, useEffect, useState } from "react";
import { CoinsIcon, SwordsIcon } from "../../../components/icons";
import { Button } from "../../../components/Button";
import { ApiError, getLootBundle } from "../../../api/client";
import type { LootBundle, LootEntry } from "../../../api/types";
import { categoryIcon } from "../../loot/itemCategories";
import { computeBundleTotal, formatGp } from "../../loot/lootTotals";
import {
  fixtureInspectableDescriptor,
  inspectableDescriptor,
  type FixtureStateChip,
} from "./maplabPresentation";
import {
  defaultFixtureState,
  effectiveFixtureState,
  type FixtureState,
  type Inspectable,
  type PassageFlags,
} from "../../../model/maplabModel";

export interface SessionControls {
  onToggleOpen?: () => void;
  onToggleLocked?: () => void;
  onDisarmTrap?: () => void;
}

/** Adapter-driven contextual differences for the shared obstacle-state panel (handoff §3.2).
 *  DM View passes effective values with session writes; DM Edit passes authored values with
 *  authored writes. Everything here is explicit props — the panel never forks markup by context.
 *  Fields left absent (legacy call sites) fall back to the `controls` callbacks and read-only
 *  cells; orders wiring the adapters fill them in. */
export interface ObstacleInspectorAdapter {
  /** Column heading label — "World now" in DM View, "Authored" in DM Edit. */
  heading?: "World now" | "Authored";
  /** Write side for the three obstacle rows (Armed column). */
  onToggleArmed?: (obstacle: "concealment" | "lock" | "trap", armed: boolean) => void;
  /** Write side for the Shown column. Lock and Trap Shown stay enabled regardless of Armed or
   *  Concealment because the controls are independent. */
  onToggleShown?: (obstacle: "concealment" | "lock" | "trap", shown: boolean) => void;
  /** Write side for the door's Open control. */
  onToggleOpen?: (open: boolean) => void;
  /** DM View-only fixture reset affordance — clears the selected fixture's whole session entry. */
  onReset?: () => void;
  resetDisabled?: boolean;
  /** Inline action-failure message rendered with role="status". */
  writeError?: string | null;
}

/** One token per fixture-state chip state — `fixtureStateChips` emits concealed/trapped/locked,
 *  which are not all keys of `PASSAGE_STATE_TOKENS` (that map covers the flat passage states). */
const FIXTURE_CHIP_TOKENS: Record<FixtureStateChip["state"], string> = {
  concealed: "--md-passage-hidden",
  trapped: "--md-error",
  locked: "--md-passage-locked",
};

/** One named DC segment — a present DC renders as "Name 15", a missing one as "Name: DC not set"
 *  so every expected DC is named even when unset (handoff §3.4). */
function dcSegment(name: string, value: number | undefined): string {
  return value === undefined ? `${name}: DC not set` : `${name} ${value}`;
}

type ObstacleKey = "concealment" | "lock" | "trap";

function StateSection({
  effective,
  isDoor,
  heading,
  dcLines,
  openDisabled,
  shownDisabled,
  armedDisabled,
  onOpenChange,
  onArmedChange,
  onShownChange,
}: {
  effective: FixtureState;
  isDoor: boolean;
  heading: string;
  dcLines: { obstacle: ObstacleKey; text: string }[];
  openDisabled: boolean;
  shownDisabled: boolean;
  armedDisabled: (obstacle: ObstacleKey) => boolean;
  onOpenChange: () => void;
  onArmedChange: (obstacle: ObstacleKey, current: boolean) => void;
  onShownChange: (obstacle: ObstacleKey, current: boolean) => void;
}) {
  return (
    <section className="maplab-inspector-state" aria-label={heading}>
      <h4 className="maplab-inspector-subheading">{heading}</h4>
      {isDoor && (
        <div className="maplab-inspector-open-row">
          <input
            type="checkbox"
            aria-label="Open"
            checked={effective.open}
            disabled={openDisabled}
            onChange={onOpenChange}
          />
          <span>Open</span>
        </div>
      )}
      <div className="maplab-inspector-obstacle-grid">
        <span className="maplab-inspector-column-header">Obstacle</span>
        <span className="maplab-inspector-column-header">Armed</span>
        <span className="maplab-inspector-column-header">Shown</span>
        <span className="maplab-inspector-obstacle-name">Concealment</span>
        <input
          type="checkbox"
          aria-label="Concealment armed"
          checked={effective.obstacles.concealment.armed}
          disabled={armedDisabled("concealment")}
          onChange={() => onArmedChange("concealment", effective.obstacles.concealment.armed)}
        />
        <span className="maplab-inspector-shown-dash" aria-hidden="true">
          —
        </span>
        <span className="maplab-inspector-obstacle-name">Lock</span>
        <input
          type="checkbox"
          aria-label="Lock armed"
          checked={effective.obstacles.lock.armed}
          disabled={armedDisabled("lock")}
          onChange={() => onArmedChange("lock", effective.obstacles.lock.armed)}
        />
        <input
          type="checkbox"
          aria-label="Lock shown"
          checked={effective.obstacles.lock.shown}
          disabled={shownDisabled}
          onChange={() => onShownChange("lock", effective.obstacles.lock.shown)}
        />
        <span className="maplab-inspector-obstacle-name">Trap</span>
        <input
          type="checkbox"
          aria-label="Trap armed"
          checked={effective.obstacles.trap.armed}
          disabled={armedDisabled("trap")}
          onChange={() => onArmedChange("trap", effective.obstacles.trap.armed)}
        />
        <input
          type="checkbox"
          aria-label="Trap shown"
          checked={effective.obstacles.trap.shown}
          disabled={shownDisabled}
          onChange={() => onShownChange("trap", effective.obstacles.trap.shown)}
        />
      </div>
      {dcLines.length > 0 && (
        <div className="maplab-inspector-dc-lines">
          {dcLines.map((dc) => (
            <p key={dc.obstacle} className="maplab-inspector-obstacle-dc">
              {dc.text}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

/** Element-agnostic descriptor panel — a room, door, stair, or prop all resolve through the
 *  inspectable descriptors to the same {title, typeLabel, icon, chips, lines} shape, so one
 *  component renders all kinds. Doors and other fixtures additionally get the canonical
 *  labelled-checkbox obstacle grid (World now/Authored, Armed/Shown columns, per-obstacle DC
 *  lines); rooms and features keep the flat descriptor rows. */
export function InspectorPanel({
  target,
  controls,
  context,
  adapter,
}: {
  target: Inspectable;
  controls?: SessionControls;
  /** Extra data `inspectableDescriptor` can't resolve on its own — currently just the destination
   * dungeon's title for a gateway portal, looked up by the caller via `listDungeons()`. */
  context?: { dungeonTitle?: string };
  adapter?: ObstacleInspectorAdapter;
}) {
  const isFixture =
    target.kind === "door" ||
    target.kind === "stair" ||
    target.kind === "portal" ||
    target.kind === "prop";
  const descriptor = isFixture
    ? fixtureInspectableDescriptor(target, context)
    : inspectableDescriptor(target, context);
  const Icon = descriptor.icon;

  let fixture: { effective: FixtureState; flags: PassageFlags; isDoor: boolean } | null = null;
  switch (target.kind) {
    case "door":
      fixture = {
        effective: effectiveFixtureState(
          target.door.state ?? defaultFixtureState(),
          target.session,
        ),
        flags: target.door,
        isDoor: true,
      };
      break;
    case "stair":
      fixture = {
        effective: effectiveFixtureState(
          target.stair.state ?? defaultFixtureState(),
          target.session,
        ),
        flags: target.stair,
        isDoor: false,
      };
      break;
    case "portal":
      fixture = {
        effective: effectiveFixtureState(
          target.portal.state ?? defaultFixtureState(),
          target.session,
        ),
        flags: target.portal,
        isDoor: false,
      };
      break;
    case "prop":
      fixture = {
        effective: effectiveFixtureState(
          target.prop.state ?? defaultFixtureState(),
          target.session,
        ),
        flags: target.prop,
        isDoor: false,
      };
      break;
  }

  const heading = adapter?.heading ?? (controls ? "World now" : "Authored");

  // Per-obstacle DC copy, present only while the obstacle is armed. DCs come from the authored
  // passage flags; the trap's disarm DC is sourced from `searchDc`.
  const dcLines: { obstacle: ObstacleKey; text: string }[] = fixture
    ? [
        ...(fixture.effective.obstacles.concealment.armed
          ? [
              {
                obstacle: "concealment" as const,
                text: dcSegment("Perception", fixture.flags.hiddenDc),
              },
            ]
          : []),
        ...(fixture.effective.obstacles.lock.armed
          ? [
              {
                obstacle: "lock" as const,
                text: [
                  dcSegment("Break", fixture.flags.breakDc),
                  dcSegment("Pick", fixture.flags.pickDc),
                ].join(" · "),
              },
            ]
          : []),
        ...(fixture.effective.obstacles.trap.armed
          ? [{ obstacle: "trap" as const, text: dcSegment("Disarm", fixture.flags.searchDc) }]
          : []),
      ]
    : [];

  // Fixture metadata rows — the DC lines now live under the obstacle grid, and the Open checkbox
  // supersedes the door "Position" line, so those old descriptor lines are dropped for fixtures.
  const metaLines = descriptor.lines.filter(
    (line) =>
      !["Position", "Break DC", "Pick DC", "Perception DC", "Search DC"].includes(line.label),
  );

  const handleOpenChange = () => {
    if (fixture) {
      if (adapter?.onToggleOpen) adapter.onToggleOpen(!fixture.effective.open);
      else controls?.onToggleOpen?.();
    }
  };
  const handleArmedChange = (obstacle: ObstacleKey, current: boolean) => {
    if (adapter?.onToggleArmed) adapter.onToggleArmed(obstacle, !current);
    else if (obstacle === "lock") controls?.onToggleLocked?.();
    else if (obstacle === "trap") controls?.onDisarmTrap?.();
  };
  const handleShownChange = (obstacle: ObstacleKey, current: boolean) => {
    adapter?.onToggleShown?.(obstacle, !current);
  };

  const openDisabled = !(adapter?.onToggleOpen || controls?.onToggleOpen);
  const shownDisabled = !adapter?.onToggleShown;
  // The Armed column is enabled per obstacle whenever a write path exists for it. Concealment has
  // no legacy callback, so without an adapter its Armed checkbox is read-only.
  const armedDisabled = (obstacle: ObstacleKey) =>
    obstacle === "concealment"
      ? !adapter?.onToggleArmed
      : !(
          adapter?.onToggleArmed ||
          (obstacle === "lock" ? controls?.onToggleLocked : controls?.onDisarmTrap)
        );

  return (
    <div className="maplab-inspector-panel">
      <div className="maplab-inspector-header">
        <Icon
          width={20}
          height={20}
          aria-hidden="true"
          style={{ color: `var(${descriptor.token})` }}
        />
        <span className="maplab-inspector-title">{descriptor.title}</span>
        <span className="maplab-inspector-kind">{descriptor.typeLabel}</span>
      </div>
      {descriptor.chips.length > 0 && (
        <div className="maplab-inspector-chips">
          {descriptor.chips.map((chip) => {
            const ChipIcon = chip.icon;
            const token =
              FIXTURE_CHIP_TOKENS[chip.state as FixtureStateChip["state"]] ??
              "--md-on-surface-variant";
            return (
              <span
                key={chip.state}
                className="maplab-inspector-chip"
                data-state={chip.state}
                style={{ color: `var(${token})` }}
              >
                <ChipIcon width={14} height={14} aria-hidden="true" />
                {chip.label}
              </span>
            );
          })}
        </div>
      )}
      {fixture && (
        <StateSection
          effective={fixture.effective}
          isDoor={fixture.isDoor}
          heading={heading}
          dcLines={dcLines}
          openDisabled={openDisabled}
          shownDisabled={shownDisabled}
          armedDisabled={armedDisabled}
          onOpenChange={handleOpenChange}
          onArmedChange={handleArmedChange}
          onShownChange={handleShownChange}
        />
      )}
      {metaLines.length > 0 && (
        <dl className="maplab-inspector-lines">
          {metaLines.map((line) => (
            <Fragment key={line.label}>
              <dt className="maplab-inspector-row">{line.label}</dt>
              <dd>{line.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {target.kind === "prop" && target.prop.loot && <LootSummaryShell loot={target.prop.loot} />}
      {adapter?.writeError && (
        <p className="maplab-inspector-write-error" role="status">
          {adapter.writeError}
        </p>
      )}
      {adapter?.onReset && (
        <Button
          type="button"
          className="maplab-pill-button maplab-inspector-reset-button"
          disabled={adapter.resetDisabled}
          onClick={adapter.onReset}
        >
          Reset to authored
        </Button>
      )}
    </div>
  );
}

function LootSummaryShell({ loot }: { loot: { bundle_id: number; bundle_name?: string } }) {
  const [bundle, setBundle] = useState<LootBundle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let active = true;
    setBundle(null);
    setStatus("loading");

    getLootBundle(loot.bundle_id)
      .then((result) => {
        if (!active) return;
        setBundle(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus(error instanceof ApiError && error.status === 404 ? "missing" : "error");
      });

    return () => {
      active = false;
    };
  }, [loot.bundle_id]);

  if (status === "loading") {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-status" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>Opening the treasure cache...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-missing" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>Could not open {loot.bundle_name ?? "this loot bundle"}.</span>
      </div>
    );
  }

  if (status === "missing" || !bundle) {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-missing" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>
          {loot.bundle_name ? `${loot.bundle_name} was removed` : "This loot bundle was removed"}
        </span>
      </div>
    );
  }

  const contents = (bundle.contents ?? []) as LootEntry[];
  const gold = bundle.gold ?? 0;
  return (
    <section className="maplab-loot-summary" aria-label="Loot contents">
      <div className="maplab-loot-summary-header">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>{bundle.name}</span>
        <strong>{formatGp(computeBundleTotal(gold, contents))}</strong>
      </div>
      <div className="maplab-loot-gold">Gold: {formatGp(gold)}</div>
      {contents.length > 0 ? (
        <ul className="maplab-loot-entries">
          {contents.map((entry, index) => {
            const EntryIcon = entry.kind === "weapon" ? SwordsIcon : categoryIcon(entry.category);
            const value = entry.value_gp === null ? null : formatGp(entry.value_gp);
            return (
              <li key={`${entry.kind}-${entry.ref_id ?? entry.name}-${index}`}>
                <EntryIcon width={14} height={14} aria-hidden="true" />
                <span>
                  {entry.quantity} x {entry.name}
                  {value ? ` (${value})` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="maplab-loot-empty">This bundle holds gold only.</p>
      )}
    </section>
  );
}
