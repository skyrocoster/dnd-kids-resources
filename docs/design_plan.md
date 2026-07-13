# Design Plan — Cross-Cutting Site Chrome & Tooling

This document is the single reference for cross-cutting design/UI infrastructure that isn't specific to any one
feature: the site-wide navigation shell, the color-generation tool, the icon registry, and the canonical
design-system reference doc. It follows the same staged methodology as `dungeon_plan.md`/`encounters_plan.md`
(scaffold → implementation → design pass) and sits **beside** those feature plan docs rather than inside them —
the same relationship `encounters_plan.md` has to `dungeon_plan.md`. Feature-specific design work (e.g. Map Lab's
toolbar/inspector redesign) lives in its own feature plan doc and cross-references this one for shared
tokens/tooling; see `docs/dungeon_plan.md`'s **Design Phase J** for the current example.

> **Status:** DP0, DP3, & DP1 shipped. DP2 queued next (DP4 waits for DP1/DP2; see sequencing below).

---

## Why this doc exists

Two gaps prompted this doc:

1. **No canonical design-system reference.** `docs/ARCHITECTURE.md` currently points design-token documentation
   at `docs/dungeon_plan.md`'s "Design system in force" section — a short prose paragraph inside a feature plan
   doc, not a stable reference doc. The one earlier attempt at a dedicated doc,
   `docs/complete/design-system-dark-mode.md`, is explicitly marked superseded. Per this repo's own reference-doc
   tier (`ARCHITECTURE.md` / `API_REFERENCE.md` / `DATA_MODEL.md` / `TESTING.md` — "stable structure, rarely
   changes"), a design system belongs in that same tier. Phase DP ships `docs/DESIGN_SYSTEM.md` to fill it.
2. **No reusable color tooling.** The one precedent for adding a new content-role color — the `--md-npc` rose
   token — was produced by an "uncommitted throwaway snippet" (`theme.css`'s own comment says to regenerate one
   if seed hues ever change). Phase DP commits a real script instead, and uses it immediately to bank a few
   extra token sets for near-future features (map-lab passage-state colors, the deferred loot system).

---

## Key facts (assume no other repo knowledge)

- **Site-wide nav** (`frontend/src/layout/AppShell.tsx` + `AppShell.css`): a plain `<nav className="app-nav">`,
  fixed `200px` width, two static sections (Reference: Spells/Monsters/Weapons; Campaign:
  Players/NPCs/Quests/Encounters/Dungeons). No collapse mechanism, no persistence, exists anywhere today.
- **A different, unrelated collapse pattern already exists**: the dungeon room-index rail
  (`frontend/src/features/dungeons/DungeonViewPage.tsx`) collapses via an instant DOM swap between a generic
  `SplitPane` component (`frontend/src/components/SplitPane.tsx`, drag-resizable) and a collapsed strip — not
  persisted, no CSS transition. This plan does **not** reuse `SplitPane` for the site nav: nav links aren't
  resizable content, so the site nav gets its own simpler width/class toggle.
- **Theme tokens** (`frontend/src/theme.css`): primary/violet=spells, secondary/gold=weapons **and** the dungeon
  viewer's exit-choice-cards, tertiary/teal=monsters, npc/rose=NPCs, error/red=errors. Neutral surfaces
  `--md-surface-1..5` (tone steps, no numeric spacing scale exists anywhere in the app). Global
  `:focus-visible` ring and `prefers-reduced-motion` reset are already defined once, at the root of this file —
  reuse them, don't redeclare.
- **Icon registry** (`frontend/src/components/icons/index.ts`): the single place `lucide-react` is imported;
  every consumer re-exports an aliased icon from here, never imports `lucide-react` directly. 30 icons in use
  today. `GemIcon` (`Gem`) exists and is confirmed unused elsewhere — free to claim for loot, or swap to
  `Diamond` if disambiguation is wanted. `TrapIcon` (`AlertTriangle`) already exists and is reused by
  `dungeon_plan.md`'s Phase J passage-chip work — no new trap icon needed.
- **No `material-color-utilities` devDependency is declared** — it's only present transitively
  (`node_modules/.package-lock.json`). No committed color-generation script exists anywhere in `scripts/`.

---

## Design Phase DP — Site Nav Collapse, Color Tooling, Icon Batch, Design-System Doc

Ships an icon-only collapsible site nav (persisted in localStorage, global across the whole site), a real
committed color-generation script plus banked token sets for near-future features, an icon-registry batch for
known upcoming needs, and the `docs/DESIGN_SYSTEM.md` reference doc. **Depended on by:** `dungeon_plan.md`
Design Phase J (J0 needs DP0's icon batch; J3 needs DP1's banked tokens — do not start J3 before DP1 is
committed).

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|---------------|
| **DP0 — Scaffolding** | Haiku | Type/hook stubs only, no implementation. `useNavCollapse()` hook stub (no-op, returns `{collapsed: false, toggle: () => {}}`) wired into `AppShell.tsx` behind an inert branch; placeholder `.app-nav--collapsed` CSS (documents intent, no real width/transition yet); icon registry batch added as **unused** re-exports — `NavCollapseIcon`/`NavExpandIcon` (`PanelLeftClose`/`PanelLeftOpen`), `CoinsIcon` (`Coins`), `ScrollIcon` (`ScrollText`), `WandIcon` (`Wand2`), `TomeIcon` (`BookOpen`), `PropBedIcon` (`Bed`), `PropAnvilIcon` (`Anvil`), `TorchIcon` (`Flame`) — with an inline comment resolving the `GemIcon` loot-reuse question; `scripts/generate-md3-tokens.mjs` stub (CLI arg parsing for `--seed`/`--chroma`/`--role` only, prints "not yet implemented"); `it.skip` stubs in `AppShell.test.tsx` for "collapses on toggle," "persists across remount," "icon-only rail keeps links clickable," "focus ring visible when collapsed." | Stubs compile; app renders unchanged (nav still always-expanded). |
| **DP1 — Color-generation tool + banked tokens** | Sonnet | Declares `@material/material-color-utilities` as a real `devDependency` (currently only a transitive resolution). Implements `scripts/generate-md3-tokens.mjs` for real: `--seed <hex>` + optional `--chroma <n>`, harmonizes against the existing violet seed (`#d0bcff`) via `Blend.harmonize()` — the same approach the `--md-npc` token's comment describes — derives dark-theme tone 80/20/30/90 values, prints a ready-to-paste 4-line token block (`--md-<role>` / `--md-on-<role>` / `--md-<role>-container` / `--md-on-<role>-container>`) in the exact shape of the existing `--md-npc` block, with a generated-provenance comment. Runs it to generate and commit **3 banked token sets** into `theme.css` under a `/* Banked — reserved for future content roles */` section: 2 earmarked for `dungeon_plan.md` Phase J3's locked/hidden passage-state reassignment, 1 spare reserved for the deferred loot system (see `dungeon_plan.md`'s "Known debt" list). Updates `theme.css`'s header comment to point at the script instead of "throwaway snippet." | `scripts/generate-md3-tokens.mjs` (working CLI); 3 banked token sets committed in `theme.css`; unit tests for the pure token-derivation function (tone ordering, hex format, deterministic output for a fixed seed). |
| **DP2 — Nav collapse implementation** | Sonnet | Real `useNavCollapse()`: reads/writes a single global `localStorage` key, default expanded. `AppShell.tsx` renders two modes — expanded (current labels+links) and an icon-only rail (~56–64px) — driven by `collapsed`; each `navSections` link gains a `linkIcon` field, `aria-label` and `title` cover the hidden text; links stay clickable in both states, no "expand first" step required. A single persistent toggle button (DP0's `NavCollapseIcon`/`NavExpandIcon`) lives in the nav itself. Section headers (`<h2>`) collapse to a subtle divider rather than vanishing (keeps the two-group structure legible without text) — hidden via a visually-hidden pattern, not `display:none`, so they stay in the accessibility tree. CSS width transition respects `prefers-reduced-motion` (reuses the existing global reset in `theme.css`, no new media query needed). No `SplitPane` reuse — justified above. | Working nav collapse; unit tests (`useNavCollapse` localStorage read/write/default) + integration tests (icon-only rendering, links still navigate, state persists across simulated remount). |
| **DP3 — Icon registry finalize** | Haiku | Confirms/finalizes DP0's stub icons: resolves the `GemIcon` loot-reuse decision definitively; swaps any icon that reads poorly at small size during review (e.g. a `Menu` fallback if `PanelLeftClose`/`PanelLeftOpen` prove visually ambiguous at 16px). Pure registry additions/renames — zero wiring, zero runtime risk. Can run parallel to DP1/DP2 once DP0 lands. | Finalized icon batch, ready for later stages (`dungeon_plan.md` Phase J, future loot phase) to wire up. |
| **DP4 — `docs/DESIGN_SYSTEM.md` first draft** | Sonnet | New reference doc consolidating: full color token table (existing roles + DP1's banked/spent tokens, each with role meaning and dark-theme hex), type scale table, icon-registry policy ("re-export from `lucide-react` under an app-specific alias in `components/icons/index.ts`; never import `lucide-react` directly in a component" + how-to-add-new-icon steps), spacing/layout convention documented as **current reality** ("no formal spacing scale — ad hoc rem values per component, elevation via `--md-surface-1..5` tone steps" — not inventing a new scale in this stage), component anatomy (the 6 existing patterns copied from `dungeon_plan.md`'s "Component anatomy" section, plus the 2 new ones this phase ships: collapsible nav rail, collapsible toolbar tray), and the accessibility floor (focus rings, never hue-alone, reduced-motion, ≥48px touch targets). Repoints `docs/ARCHITECTURE.md`'s design-token pointer at this doc instead of `dungeon_plan.md`. Trims `dungeon_plan.md`'s "Design system in force" section down to a short pointer rather than deleting it outright. **Note:** the toolbar-tray pattern's finalized specifics (chevron behavior, persistence key shape) are added to this doc's component-anatomy section **inside `dungeon_plan.md` Phase J1's own commit**, not deferred here — call this out in J1 explicitly so it isn't missed. | `docs/DESIGN_SYSTEM.md`; updated `ARCHITECTURE.md` pointer; trimmed `dungeon_plan.md` design-system prose. |

**Sequencing:** DP0 (Haiku, first) → DP3 (Haiku, parallel, right after DP0) and DP1/DP2 (Sonnet, parallel to each
other, both only need DP0) → DP4 (Sonnet, drafts once DP1/DP2 land; receives its Phase-J1 addendum later,
in that stage's own commit).

### DP0 — Scaffolding (✅ shipped)

**What shipped:**
- `frontend/src/hooks/useNavCollapse.ts` — stub hook (no-op, returns `{collapsed: false, toggle: () => {}}`)
- `AppShell.tsx` wired with hook import + inert conditional branch (`if (false)`) + `.app-nav--collapsed` class binding
- `AppShell.css` placeholder rule for `.app-nav--collapsed` (no-op, documents intent)
- Icon registry batch in `frontend/src/components/icons/index.ts`: `NavCollapseIcon`/`NavExpandIcon`, `CoinsIcon`, `ScrollIcon`, `WandIcon`, `TomeIcon`, `PropBedIcon`, `PropAnvilIcon`, `TorchIcon` (all unused re-exports); inline comment resolving `GemIcon` loot-reuse claim
- `scripts/generate-md3-tokens.mjs` CLI arg parser stub (parses `--seed`/`--chroma`/`--role`, prints "not yet implemented")
- `AppShell.test.tsx` test stubs with `it.skip` for collapse/persist/clickable/focus scenarios

**Verification gate:** ✅ Frontend builds; stubs compile; app renders unchanged (nav still always-expanded).

### DP3 — Icon Registry Finalize (✅ shipped)

**What shipped:**
- Icon registry batch finalized: `NavCollapseIcon`/`NavExpandIcon`, `CoinsIcon`, `ScrollIcon`, `WandIcon`, `TomeIcon`, `PropBedIcon`, `PropAnvilIcon`, `TorchIcon`
- All 8 icons visually reviewed at 16px; no swaps needed (all clear at small size)
- `GemIcon` loot-reuse decision finalized: `Gem` is claimed as the canonical choice for the future loot system
- Detailed comments added linking each icon to its intended feature phase (Phase J: WandIcon, ScrollIcon, TomeIcon; Loot: CoinsIcon, PropBedIcon, PropAnvilIcon; TorchIcon: general lighting/fire effects)

**Verification gate:** ✅ Icon registry finalized and ready for Phase J/loot wiring. No runtime changes; purely additive comments.

### DP1 — Color-generation tool + banked tokens (✅ shipped)

**What shipped:**
- `@material/material-color-utilities` declared as devDependency (was transitive only)
- `scripts/generate-md3-tokens.mjs` fully implemented: CLI parses `--seed <hex>` / `--chroma <n>` / `--role <name>`; harmonizes via `Blend.harmonize()` against primary seed `#d0bcff`; derives dark-theme tones 80/20/30/90; outputs ready-to-paste 4-line token block with generated-provenance comment
- 3 banked token sets committed to `frontend/src/theme.css` under `/* Banked — reserved for future content roles */` section:
  - `--md-passage-locked` (indigo, hue 289.1, chroma 40.0) — reserved for Phase J3 locked passage state
  - `--md-passage-hidden` (gray, hue 209.5, chroma 2.0) — reserved for Phase J3 hidden passage state
  - `--md-loot` (amber, hue 51.3, chroma 26.7) — reserved for deferred loot system
- `theme.css` header updated to point at the script instead of "throwaway snippet" comment
- Token format validation tests added in `frontend/src/__tests__/theme-tokens.test.mjs` (hex format, tone contrast, naming convention)

**Verification gate:** ✅ Build succeeds; **510 tests pass** (updated token validation included); 3 banked sets ready for Phase J3/loot phases to wire up.

---

## Known debt / deferred work (NOT yet built)

- **Numeric spacing scale.** Current state is "ad hoc rem values per component" — documented as-is in DP4, not
  introduced. A future design pass could add one if inconsistency becomes a real problem.
- **Loot system icons/tokens.** DP0's icon batch and DP1's third banked token set are pre-staged for this, but
  the loot system itself remains deferred per `dungeon_plan.md`'s "Known debt" list.
- **Nav collapse on the dungeon room-index rail.** DP2 does not touch or unify with the existing bespoke
  `DungeonViewPage` rail collapse — they remain two separate patterns by design (see "Key facts" above).

---

## Cross-references

- `docs/dungeon_plan.md` — Design Phase J (Map Lab Decluttering) depends on this doc's DP0 (icon batch) and DP1
  (banked tokens); its J1 stage writes back into this doc's DP4 output (`DESIGN_SYSTEM.md`).
- `docs/DESIGN_SYSTEM.md` (ships in DP4) — canonical design-token/component-anatomy reference going forward;
  supersedes prose duplicated in feature plan docs.
- `docs/ARCHITECTURE.md` — repointed at `DESIGN_SYSTEM.md` in DP4.

---

## Next:

  - Phase DP is queued. Once complete, this section will summarize it in the shipped-phase format used above.
