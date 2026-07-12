# Encounters Feature — Expansion Plan

This document is the single reference for expanding the **encounter** feature beyond what shipped in
`dungeon_plan.md`'s Design Phase A (the live Encounter Runner, E1–E6). It follows the same staged
methodology as `dungeon_plan.md` (scaffold → implementation → design pass) and inherits that project's
design system, component anatomy, and reusable pieces — build on them rather than re-deriving.

> **Status:** Phase 1 (**Creation Overhaul**) is **in progress**. C0 and C1 shipped; C2–C3 below.

---

## Scope of this plan

The Encounter **Runner** (running combat live: HP steppers, turn order, status chips) is already shipped
and is **out of scope** here — do not rebuild or restyle it except where a Phase-1 change forces a shared
refactor. This plan is about the **creation/editing experience**: the `EncounterEditor` modal reached from
the Encounter Browser and used to author an encounter before it is ever run.

**Phase 1 fixes two concrete deficiencies in creation:**
1. **Stat propagation is broken.** Choosing a monster for a creature row copies only its *name*. HP and AC
   are left blank, so every authored creature must have its HP/AC typed in by hand — even though the app
   already knows the monster's default stats.
2. **Conditions are free text.** Conditions are entered as a comma-separated string, which is
   error-prone, inconsistent with the canonical condition list, and not kid-friendly. They should be
   **checkboxes** driven by the real condition data.

Later phases (initiative/CR propagation, encounter templates, difficulty budgeting) are noted under
**"Deferred / future phases"** and are **not** part of Phase 1.

---

## Key data facts (assume no other repo knowledge)

**The editor and its form model.**
- UI: `frontend/src/features/encounters/EncounterEditor.tsx` — a modal (`role="dialog"`) with a Title
  field and a repeatable **Creatures** section. Opened from `EncounterBrowserPage.tsx`.
- Form logic: `frontend/src/features/encounters/encounterForm.ts` — `EncounterFormState` +
  `EncounterCreatureRow` (all string-typed fields for inputs), plus the pure converters
  `emptyEncounterForm`, `addEncounterCreatureRow`, `encounterToFormState`, `formStateToEncounterInput`.
  Tests: `__tests__/encounterForm.test.ts`.

**The propagation bug.** `EncounterEditor.handlePickMonster` (≈`EncounterEditor.tsx:47`) sets only
`originalName` and `name` on the row; `hpCurrent`, `hpMax`, and `ac` stay empty. **The correct derivation
already exists** in `encounterRunner.ts:64`, `combatantFromMonster(monster)`:
- `hp_current = hp_max = monster.hp.average` when `monster.hp.average` is a number, else `null`.
- `ac = Number(firstKey(monster.ac))` when that first key parses to a finite number, else `null`.
- `monster.hp` is an object `{average, formula, minimum, maximum}`; `monster.ac` is a keyed object whose
  first key is the AC value (both are `Record<string, unknown> | null` on the `Monster` type in
  `api/types.ts`). Real data is messy — either can be absent; the derivation must degrade to `null`, never
  throw.

The runner's "add from monster" path is **already correct**; only the **editor** is wrong. Phase 1 must
make both consume **one** shared derivation helper rather than duplicating the logic.

**The wire model carries only HP + AC (plus name/status/conditions).** `EncounterCreature`
(`api/types.ts`): `{ monster_id, original_name, name, hp_current, hp_max, ac, status, conditions[] }`.
There is **no** initiative, CR, speed, or ability-score field. So "propagate default stats" in Phase 1
means **HP (current+max) and AC** — that is the whole set the model can hold. Propagating more requires a
model change and is explicitly deferred.

**Conditions data already exists end-to-end.**
- Backend: `GET /api/conditions` (`backend/app/routers/reference.py`) returns the `conditions` table as
  `Condition[] = { id, name, description? }` (the SQL aliases `title AS name`), ordered by title.
- Frontend client: `getConditions()` in `api/client.ts` already returns `Condition[]`.
- The runner's `CombatantCard` renders **status** as chips (`alive/unconscious/dead/fled`) but does **not**
  render conditions at all — conditions round-trip through the data untouched. Phase 1 only changes how
  conditions are **authored**; it does not add condition display to the runner (that is deferred).

**No backend change is required for Phase 1.** Conditions, creatures, HP/AC all already persist and
round-trip through `createEncounter`/`updateEncounter`. This is a pure frontend phase.

---

## Design system in force

Inherit the project design system exactly as documented in `dungeon_plan.md`'s "Design system in force"
section. The load-bearing points for this editor:
- **Tokens only.** Consume `--md-*` / `--type-*` from `frontend/src/theme.css`. Encounters/monsters are
  the **tertiary/teal** content role; the editor's accents (selected condition chips, primary save button)
  should use the monster/teal role via `data-variant` where a variant surface is appropriate — never
  hand-picked hex.
- **Type scale:** title (1rem/500) for field labels and section headings; body-sm for secondary detail;
  label/caption for chips and badges. No ad-hoc rem/px.
- **Icons:** local Lucide inline-SVG components in `components/icons/`. No emoji, no icon font, no CDN.
- **Accessibility floor:** visible focus rings; never hue-alone (checked state needs a check glyph + text,
  not just a color); `prefers-reduced-motion` honored; **≥48px touch targets** — the primary device is a
  Surface Pro and creation is touch-first, so the condition checkboxes must be finger-sized, not native
  16px boxes.

---

## Reusable pieces (do not rebuild)

- **`combatantFromMonster`** (`encounterRunner.ts`) — the existing, correct monster→stats derivation. C1
  factors its stat math into a shared helper; do not write a second derivation.
- **`getConditions()`** (`api/client.ts`) + **`GET /api/conditions`** — the condition source of truth.
- **`SelectField` / `TextField`** (`components/form/`) — the existing form primitives the editor already
  uses. Add a checkbox-group primitive only if one does not already exist; otherwise reuse.
- **`listMonsters()`** — already loaded and sorted by the editor for the monster picker.

---

## Phase 1 — Creation Overhaul (stages C0–C3)

### Stage C0 — Scaffolding (Haiku 4.5, one context)

Type declarations, stubs, placeholder CSS, and skipped test stubs. **No behavior change**; the editor must
still build, typecheck, and pass all existing tests.

**What to build:**
- **Shared derivation stub.** In `encounterForm.ts` (or a small shared `encounterStats.ts`), declare
  `deriveCreatureStats(monster: Monster): { hpAverage: number | null; ac: number | null }`. Stub returns
  `{ hpAverage: null, ac: null }`. Add a `// TODO C1` note that `combatantFromMonster` will be refactored
  to consume it.
- **Form-state shape for structured conditions.** Add `conditions: string[]` to `EncounterCreatureRow`
  (keeping the existing `conditionsText` field for now so nothing breaks), initialized to `[]` in
  `addEncounterCreatureRow` and populated in `encounterToFormState` from `c.conditions`. Do **not** yet
  remove `conditionsText` or change the converter output — C2 completes the switch.
- **Conditions fetch stub.** Add a `conditions` state slot (`Condition[]`) + `useEffect` calling
  `getConditions()` in `EncounterEditor.tsx`, populated but **not yet rendered**. On fetch failure, degrade
  to `[]` (mirror the existing `listMonsters` catch).
- **Placeholder CSS.** `.encounter-condition-grid` / `.encounter-condition-chip` classes in
  `EncounterEditor.css` with a TODO comment; not referenced by markup yet.
- **Skipped test stubs** (`it.skip`) in `__tests__/encounterForm.test.ts` and a new/existing
  `__tests__/EncounterEditor.test.tsx` covering: (C1) picking a monster fills HP current/max/AC from
  defaults, degrades to blank when the monster lacks them, and shares logic with `combatantFromMonster`;
  (C2) conditions render as checkboxes from `getConditions`, toggle into form state, and round-trip
  through `formStateToEncounterInput`.

**🚦 Gate:** all existing tests pass (new stubs skipped); `npm run build` (real typecheck — note
`tsc --noEmit` is a false green in this repo) clean; `pytest` unaffected.

---

### Stage C1 — Stat propagation (Sonnet)

Make choosing a monster populate the creature's default HP and AC, sharing one derivation with the runner.

**What to build:**
- Implement `deriveCreatureStats(monster)` with the exact logic currently inside `combatantFromMonster`
  (`hp.average` → `hp_current`/`hp_max`; first finite AC key → `ac`; both degrade to `null`).
- **Refactor `combatantFromMonster`** to call `deriveCreatureStats` so the runner and editor cannot drift.
  Runner behavior must be unchanged (its tests stay green).
- Update `handlePickMonster` in `EncounterEditor.tsx` to write the derived `hpCurrent`, `hpMax`, `ac`
  (stringified) into the row alongside `name`/`originalName`.
- **Overwrite semantics:** picking (or changing) the monster **replaces** that row's HP/AC with the new
  defaults — the row represents "an instance of this monster." A DM can still hand-edit HP/AC afterward;
  those edits persist until the monster is changed again. Document this choice in a code comment.
- Un-skip and implement the C1 tests: default fill, graceful blanks when `hp`/`ac` absent, and a test
  asserting editor + `combatantFromMonster` derive identical values for the same monster.

**🚦 Gate:** all tests green (unit: derivation + editor row fill; existing runner tests unchanged);
`npm run build` clean; `pytest` unaffected. Confirm via tests only — **no browser this stage.**

**What shipped:**
- `deriveCreatureStats(monster)` in `encounterStats.ts` implemented with the exact `hp.average`/first-finite-AC-key
  logic that previously lived only in `combatantFromMonster`.
- `combatantFromMonster` (`encounterRunner.ts`) refactored to call `deriveCreatureStats` — runner and editor now
  share one derivation; runner tests unchanged and green.
- `EncounterEditor.handlePickMonster` derives `hpCurrent`/`hpMax`/`ac` (stringified) from the picked monster and
  writes them into the row alongside `name`/`originalName`. Re-picking a monster overwrites the row's HP/AC with
  the new defaults (documented in a code comment); hand-edits persist until the monster is changed again.
- Un-skipped and implemented the 6 C1 tests (3 in `encounterForm.test.ts` for the pure derivation/runner parity,
  3 in `EncounterEditor.test.tsx` mounting the editor and driving the monster `<select>`).
- Verified: `npm run build` clean; full frontend suite green (430 passed, 8 skipped — the remaining C2 stubs).

---

### Stage C2 — Condition checkboxes (Sonnet)

Replace the comma-separated conditions text field with a checkbox group driven by real condition data.

**What to build:**
- Render the fetched `conditions` (from C0's `getConditions` wiring) as a **checkbox group** per creature
  row, replacing the `Conditions (comma-separated)` `TextField`. Each option toggles the condition's
  **name** in/out of the row's `conditions: string[]`. Use a real checkbox input (or an
  `aria-pressed`/`role="checkbox"` chip) — labelled, keyboard-operable, ≥48px target, with a visible
  check glyph so state is not hue-alone.
- **Preserve unknown/legacy conditions.** Existing encounters may carry condition strings not in the
  canonical list (or with different casing). Render any such value as an already-checked option (or a
  small "custom" chip) so editing an old encounter never silently drops data. Match case-insensitively
  when reconciling a stored condition against the fetched list.
- Update `formStateToEncounterInput` to emit `conditions` from the structured `string[]` (deduped,
  trimmed), and **remove `conditionsText`** from `EncounterCreatureRow` and the converters now that the
  checkbox path is the source of truth. Update `encounterToFormState` accordingly.
- Loading/empty states: if `getConditions()` returned `[]` (offline/failure), fall back gracefully — at
  minimum show the creature's already-set conditions as read-only chips rather than an empty void.
- Un-skip and implement the C2 tests: checkboxes render from `getConditions`; toggling updates form state;
  round-trip through `formStateToEncounterInput` preserves the exact set; legacy/unknown condition
  survives an edit; converter no longer references `conditionsText`.

**🚦 Gate:** all tests green; `npm run build` clean; `pytest` unaffected. Tests only — **no browser this
stage.**

---

### Stage C3 — Design pass (Sonnet) — **the only browser stage**

Front-end visual review, cohesion, accessibility, and zero-bug pass over the overhauled editor, verified
**live in the running app**. Per `CLAUDE.md`, this is the **one and only** stage in Phase 1 that drives the
Chrome browser; C0–C2 verify by test suite alone.

**What to review and fix (live):**
- **Stat propagation feels right:** picking a monster visibly fills HP/AC; the fields read as pre-filled
  defaults (not locked); changing the monster updates them; hand-edits survive until re-pick. Confirm a
  monster with no `hp.average`/`ac` leaves those blank without error.
- **Condition checkboxes:** grid wraps cleanly on the Surface Pro width; targets are finger-sized (≥48px);
  checked state is legible via glyph **and** the teal/monster accent, not color alone; focus rings visible;
  keyboard toggling works; a long condition list scrolls/wraps without breaking the modal layout.
- **Design-system conformance:** tokens only (no stray hex), correct type-scale roles, Lucide icons only,
  **no emoji**; the primary/save button uses the monster/teal role; modal spacing/rhythm matches the rest
  of the app.
- **Accessibility & motion:** `aria-modal` dialog semantics intact, labelled controls, `prefers-reduced-motion`
  honored on any transition, no focus traps or lost focus on add/remove creature.
- **Zero-bug sweep:** add several creatures, mix propagated and hand-edited stats, set conditions, save,
  reopen, and confirm everything round-trips; then run that encounter in the Runner and confirm the
  authored HP/AC/conditions arrive intact.
- Record a short **GIF trace** of the create → set conditions → save → reopen flow per the browser-automation
  guidance, and fix any real issue the pass surfaces (in the style of `dungeon_plan.md`'s design passes,
  which each fixed a genuine bug).

**🚦 Gate (live end-to-end, browser required):** the create-encounter flow works and looks right in the
running app on the Surface Pro viewport; propagation and condition checkboxes behave as specified;
authored data survives a save/reopen and shows correctly in the Runner; full test suite + `npm run build` +
`pytest` all green. Update this doc's status line and each stage with a "What shipped" note, then commit.

---

## Deferred / future phases (NOT in Phase 1)

- **Wider stat propagation** (initiative, CR, speed, ability scores) — requires extending the
  `EncounterCreature` wire model + backend; a model-change phase of its own.
- **Condition display in the Runner** — surfacing each combatant's conditions on `CombatantCard`
  (currently conditions round-trip but are invisible during play).
- **Encounter templates / difficulty budgeting** — party-size/CR-based XP budget, "build me an encounter"
  helpers.
- **Quick-add-by-quantity** — "add 4× Goblin" in the editor in one action.

---

## Verification (how to confirm the shipped phase end-to-end)

1. `pytest` from repo root (coverage gate ≥85%) and `npm run test` — all green.
2. `npm run build` — clean (the real typecheck; `tsc --noEmit` is a known false green here).
3. Live (C3 only): open the Encounter Browser → **Add New Encounter** → add a creature → pick a monster →
   HP/AC auto-fill → check a few conditions → save → reopen the encounter (values intact) → run it and
   confirm HP/AC/conditions carried into the Runner.
