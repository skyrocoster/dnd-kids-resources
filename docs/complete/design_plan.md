# Design Plan — Cross-Cutting Site Chrome & Tooling

This document is the single reference for cross-cutting design/UI infrastructure that isn't specific to any one
feature: the site-wide navigation shell, the color-generation tool, the icon registry, and the canonical
design-system reference doc. It follows the same staged methodology as `dungeon_plan.md`/`encounters_plan.md`
(scaffold → implementation → design pass) and sits **beside** those feature plan docs rather than inside them —
the same relationship `encounters_plan.md` has to `dungeon_plan.md`. Feature-specific design work (e.g. Map Lab's
toolbar/inspector redesign) lives in its own feature plan doc and cross-references this one for shared
tokens/tooling; see `docs/dungeon_plan.md`'s **Design Phase J** for the current example.

> **Status:** DP0–DP4 shipped.

---

## What this doc covers

Two gaps prompted this doc:

1. **No canonical design-system reference.** `docs/ARCHITECTURE.md` currently points design-token documentation
   at `docs/dungeon_plan.md`'s "Design system in force" section — a short prose paragraph inside a feature plan
   doc, not a stable reference doc. Per this repo's reference-doc tier (`ARCHITECTURE.md` / `API_REFERENCE.md` /
   `DATA_MODEL.md` / `TESTING.md`), a design system belongs in that same tier. Phase DP ships
   `docs/DESIGN_SYSTEM.md` to fill it.
2. **No reusable color tooling.** The one precedent for adding a new content-role color — the `--md-npc` rose
   token — was produced by an "uncommitted throwaway snippet." Phase DP commits a real script instead, and uses
   it immediately to bank token sets for near-future features (passage-state colors, loot system).

---

## Key facts (assume no other repo knowledge)

- **Site-wide nav** (`frontend/src/layout/AppShell.tsx` + `AppShell.css`): a plain `<nav className="app-nav">`,
  fixed `200px` width, two static sections (Reference: Spells/Monsters/Weapons; Campaign:
  Players/NPCs/Quests/Encounters/Dungeons). No collapse mechanism, no persistence.
- **A different, unrelated collapse pattern already exists**: the dungeon room-index rail
  (`DungeonViewPage.tsx`) collapses via an instant DOM swap between `SplitPane` and a collapsed strip — not
  persisted, no CSS transition. This plan does **not** reuse `SplitPane` for the site nav.
- **Nav collapse is intentionally separate.** Two different patterns by design — nav links aren't resizable
  content, so the site nav gets its own simpler toggle. No unification planned.
- **No `material-color-utilities` devDependency was declared** — only transitive. Now committed as a real
  dependency per DP1.

---

## Design system in force

- **Content-role palette** (dark theme): primary/violet=spells, secondary/gold=weapons + exit choice-cards,
  tertiary/teal=monsters, npc/rose=NPCs, error/red=errors. Each role exposes `--md-{role}` /
  `--md-on-{role}` / `--md-{role}-container` / `--md-on-{role}-container`. Three banked sets reserved in
  `theme.css`: `--md-passage-locked` (indigo), `--md-passage-hidden` (gray), `--md-loot` (amber).
- **Type scale:** headline (1.5rem), title (1rem/500), body (1rem), body-sm (0.875rem), label (0.875rem),
  caption (0.6875rem) — no ad-hoc rem/px.
- **Icons:** local Lucide line-icon set in `frontend/src/components/icons/index.ts`, re-exported under app
  aliases (never import `lucide-react` in a component). 38 icons in registry today.
- **Surfaces:** `--md-surface-1..5` tone steps. No numeric spacing scale — ad hoc rem per component.
- **Accessibility floor:** visible `:focus-visible` rings, never hue-alone, `prefers-reduced-motion` reset at
  root, ≥48px touch targets on interactive controls.
- All tokens live in `frontend/src/theme.css`. Never use the `--md-sys-color-*` namespace (it does not exist).

---

## Reusable pieces (do not rebuild)

- `frontend/src/components/icons/index.ts` — the single Lucide import point; re-export under app aliases
- `frontend/src/hooks/useNavCollapse.ts` — site nav collapse state (localStorage, default expanded)
- `frontend/src/theme.css` — canonical design tokens
- `scripts/generate-md3-tokens.mjs` — color-token generator (CLI: `--seed` / `--chroma` / `--role`)
- `frontend/src/__tests__/theme-tokens.test.mjs` — token format validation

---

## Design Phase DP — Site Nav Collapse, Color Tooling, Icon Batch, Design-System Doc

Ships an icon-only collapsible site nav (persisted in localStorage), a real committed color-generation script
plus banked token sets, an icon-registry batch for known upcoming needs, and `docs/DESIGN_SYSTEM.md`.
**Depended on by:** `dungeon_plan.md` Design Phase J (J0 needs DP0's icon batch; J3 needs DP1's banked tokens).

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **DP0 — Scaffolding** | Haiku | Type/hook stubs only, no implementation. Placeholder CSS, unused icon batch, CLI parser stub, `it.skip` tests. | Stubs compile; app renders unchanged. |
| **DP1 — Color tool + banked tokens** | Sonnet | Real `generate-md3-tokens.mjs` using `Blend.harmonize()`, 3 banked token sets in `theme.css`, validation tests. | Working CLI; 3 token sets; token tests. |
| **DP2 — Nav collapse implementation** | Sonnet | Real `useNavCollapse()`, icon-only 64px rail, persisted state, a11y (aria-label, visually-hidden headers, reduced-motion), 4 integration tests. | Working collapse; test coverage. |
| **DP3 — Icon registry finalize** | Haiku | Confirms/finalizes DP0's stub icons, reviews at 16px, resolves `GemIcon` loot-reuse decision. | Finalized batch, no runtime risk. |
| **DP4 — `docs/DESIGN_SYSTEM.md` first draft** | Sonnet | New reference doc: color token table, type scale, icon policy, spacing/layout convention, component anatomy (6 existing + 2 new patterns), accessibility floor. Repoints `ARCHITECTURE.md` pointer; trims `dungeon_plan.md` design-system prose. | `DESIGN_SYSTEM.md`; updated pointers. |

**Sequencing:** DP0 (Haiku, first) → DP3 (Haiku, parallel, right after DP0) and DP1/DP2 (Sonnet, parallel to each
other, both only need DP0) → DP4 (Sonnet, drafts once DP1/DP2 land; receives Phase-J1 addendum in that commit).

<!-- ===== SHIPPED STAGE ===== -->

### DP4 — `docs/DESIGN_SYSTEM.md` first draft ✅

Created `docs/DESIGN_SYSTEM.md` consolidating the full color token table (8 roles with hex values and
semantic meaning), type scale, icon-registry policy with add-new-icon steps, spacing/layout documentation
(as-is reality), component anatomy (FeatureTile, choice-card grid, CombatantCard, NPCStatCard,
FloatingWindow, InspectorPanel/Inspectable, collapsible nav rail, ToolbarTray), and the accessibility
floor. Repointed `docs/ARCHITECTURE.md`'s design-token pointer at the new doc. Trimmed `dungeon_plan.md`'s
"Design system in force" to a short pointer with feature-specific detail retained. Gate ✅ — build,
typecheck, and tests clean.

<!-- ============================================================================================= -->

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **DP0** | Scaffolding: `useNavCollapse()` stub, placeholder CSS, unused icon batch (8 icons), `generate-md3-tokens.mjs` CLI stub, `it.skip` tests. Gate ✅ — builds, app unchanged. |
| **DP3** | Icon registry finalized: 8 icons reviewed at 16px, `GemIcon` claimed for loot, phase-comments added. Gate ✅ — no runtime changes. |
| **DP1** | Color-generation tool implemented (`Blend.harmonize()` via `--seed`/`--chroma`/`--role`); 3 banked token sets (`--md-passage-locked`, `--md-passage-hidden`, `--md-loot`) committed in `theme.css`; token validation tests. Gate ✅ — build succeeds, 510 tests pass. |
| **DP2** | Nav collapse implemented: `useNavCollapse()` (localStorage, private-browsing-safe), 64px icon-only rail with `aria-label` on all links, visually-hidden section headers with border-top dividers, 4 integration tests. Gate ✅ — 7/7 AppShell tests, 514 total pass, `tsc -b && vite build` clean. |
| **DP4** | `docs/DESIGN_SYSTEM.md` first draft: color token table, type scale, icon policy, spacing/layout convention, 8-component anatomy, a11y floor. `ARCHITECTURE.md` pointer repointed; `dungeon_plan.md` prose trimmed. Gate ✅ — build clean. |

---

## Known debt / deferred work (NOT yet built)

- **Numeric spacing scale.** Current state is "ad hoc rem values per component" — documented as-is in DP4, not
  introduced. A future design pass could add one if inconsistency becomes a real problem.
- **Loot system icons/tokens.** DP0's icon batch and DP1's third banked token set are pre-staged for this, but
  the loot system itself remains deferred per `dungeon_plan.md`'s "Known debt" list.
- **Nav collapse on the dungeon room-index rail.** DP2 does not touch or unify with the existing bespoke
  `DungeonViewPage` rail collapse — they remain two separate patterns by design (see Key facts).

---

## Cross-references

- `docs/dungeon_plan.md` — Design Phase J depends on DP0 (icon batch) and DP1 (banked tokens); J1 writes back
  into this doc's DP4 output (`DESIGN_SYSTEM.md`).
- `docs/DESIGN_SYSTEM.md` (ships in DP4) — canonical design-token/component-anatomy reference going forward.
- `docs/ARCHITECTURE.md` — repointed at `DESIGN_SYSTEM.md` in DP4.

---

## Next:

All DP stages shipped. No further design-system stages queued. Future feature work that adds tokens or
patterns should update `DESIGN_SYSTEM.md` as part of that feature's commit.
