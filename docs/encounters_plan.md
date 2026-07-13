# Encounters Feature — Expansion Plan

This document is the single reference for expanding the **encounter** feature beyond what shipped in
`dungeon_plan.md`'s Design Phase A (the live Encounter Runner, E1–E6). It follows the same staged
methodology as `dungeon_plan.md` (scaffold → implementation → design pass) and inherits that project's
design system, component anatomy, and reusable pieces — build on them rather than re-deriving.

> **Status:** Phase 1 (**Creation Overhaul**) **COMPLETE** ✓ (2026-07-13)
> - C0 (scaffolding): type stubs, form shape, conditions fetch wiring
> - C1 (stat propagation): shared `deriveCreatureStats`, editor auto-fill HP/AC
> - C2 (condition checkboxes): replaced text field with checkbox grid from canonical conditions
> - C3 (design pass): `CreatureRowCard` (collapsible), `ConditionPicker` (popover), MD3 conformance
> 
> **Live:** encounter creator auto-fills monster stats and renders condition checkboxes.
>
> **Queued next:**
> - **Phase 2 — Runner Conditions** (R0–R3): display + live-edit conditions on the combatant card during play. Design pass = the **Runner**.
> - **Phase 3 — Dungeon Map Link** (D0–D4): an on-map encounter marker (container/chest style) that opens the runner pop-out, plus Map Lab authoring to attach it. Design pass = the **Dungeon**.

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

## Phase 1 — Creation Overhaul

| Stage | Summary | Deliverables |
|-------|---------|--------------|
| **C0 — Scaffolding** | Type stubs, form-state shape, conditions fetch wiring, placeholder CSS. | `deriveCreatureStats` stub; `conditions: string[]` in `EncounterCreatureRow`; `getConditions()` wired; test stubs |
| **C1 — Stat propagation** | Shared derivation logic. `combatantFromMonster` refactored. Editor auto-fills HP/AC on monster pick (overwrite semantics; hand-edits persist until re-pick). | `deriveCreatureStats` in `encounterStats.ts`; `handlePickMonster` derives stats; 6 tests (derivation parity + editor fill); runner unchanged |
| **C2 — Condition checkboxes** | Comma-separated text field → checkbox group from canonical conditions. Helpers for case-insensitive matching. Legacy/unknown conditions preserved as custom options. | `mergeConditionOptions`, `isConditionSelected`, `toggleCondition` in `encounterForm.ts`; conditions sourced from `getConditions()`; 8 tests (logic + DOM); 438 tests passing |
| **C3 — Design pass** | Visual review, MD3 conformance, accessibility. New components: `CreatureRowCard` (collapsible summary + stats). `ConditionPicker` (popover trigger + checkbox grid). Touch targets ≥2.75rem; tokens only; Lucide icons; `aria-modal` intact. | `CreatureRowCard.tsx`/`.css`; `ConditionPicker.tsx`/`.css`; design conformance fixes (tokens, icons, sizing, role); 9 new tests; 447 tests passing; live verified |

---

## Phase 2 — Runner Conditions

> **Status:** Stage R0 (Scaffolding) **COMPLETE** ✓ (2026-07-13)
> - R0 (scaffolding): action + prop-threading stubs, placeholder CSS, test stubs
> - Next: R1–R3 for condition reducer, live edit, and design pass

The Runner is otherwise **out of scope** in this project (see "Scope of this plan"), but conditions are the one
gap that breaks live play: they are authored (Phase 1's `ConditionPicker`), stored as **condition-name strings**
on `EncounterCreature.conditions` (`api/types.ts:154`), and preserved through hydrate/save — but **never shown or
editable** while running combat. `CombatantCard.tsx:151-163` renders only the `status` pill row. This phase adds a
condition chip row **plus live add/remove**, reusing Phase 1's picker. **No backend change** (conditions already
round-trip through `units`).

**Reuse (do not rebuild):** `ConditionPicker.tsx` (`{ conditions, selected, onChange }`) + `encounterForm.ts`
helpers `mergeConditionOptions`/`isConditionSelected`/`toggleCondition`; `getConditions()` (`api/client.ts:62`);
the `setStatus` reducer case (`encounterRunner.ts:133-139`) as the model for the new action; the status-pill
markup/CSS (`.combatant-status-chip`) as the model for condition chips.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **R0 — Scaffolding** | Haiku | Action + prop-threading stubs, placeholder CSS, `it.skip` tests. | ✓ `{ type:'setConditions'; clientId; conditions:string[] }` added to `RunnerAction` (no-op case in reducer); `onSetConditions` + `conditions: Condition[]` prop signatures threaded `EncounterRunnerBoard → CombatantCard`; `.combatant-condition-chips` placeholder CSS mirroring `.combatant-status-chips`; condition render stub in CombatantCard; skipped test stubs; `useEncounterRunner` hook updated. |
| **R1 — Reducer + data flow** | Sonnet | Implement the action; feed the canonical condition list in. | `setConditions` reducer case (mirror `setStatus`) replacing `conditions` immutably for the matched `clientId`; canonical `Condition[]` fetched (mirror `EncounterEditor.tsx:38`) and threaded through the board; round-trip preserved. Tests: sets/clears conditions, order & other combatants untouched, `combatantsToCreatures` round-trip, hook fetch. |
| **R2 — Card display + live edit** | Sonnet | Chips + inline picker on the combatant card. | Condition chip row in `CombatantCard.tsx` after line 163 (reuse status-chip markup/CSS, teal/tertiary role); a `ConditionPicker` trigger whose `onChange` dispatches `setConditions`; legacy/custom names preserved. Tests via `EncounterRunnerPage.test.tsx`: chips render from data, toggling persists through debounce-save, empty state. |
| **R3 — Design pass (Runner)** | Sonnet | Visual/MD3/a11y review of the Runner. | Chip parity with status pills; teal/tertiary via `data-variant`; **≥48px touch targets**; focus rings; never hue-alone (glyph + text); `prefers-reduced-motion`; **compact mode (dungeon dock) doesn't overflow**; Lucide icons only. Live verified: author conditions → run → chips show → add/remove live → reopen round-trips. |

---

## Phase 3 — Dungeon Map Link

> **Status:** Stage D0 (Scaffolding) **COMPLETE** ✓ (2026-07-13)
> - D0 (scaffolding): encounter_id field, shared EncounterDock extraction, prop-kind stubs, test stubs
> - Next: D1–D4 for data persistence, marker rendering, authoring, and design pass

The runtime `DungeonViewPage` already launches the runner in a pop-out (`EncounterDock` = `FloatingWindow` +
`useEncounterRunner` + `EncounterRunnerBoard compact`) from a room feature-tile button. The **Map Lab** on-table
SVG viewer (`MapLabPage.tsx`) has **no on-map encounter marker** and no authoring for one. This phase adds an
on-map marker in the **container/chest prop style** (`PropMarker`) that, tapped in the session viewer, opens that
same pop-out — plus Map Lab editor authoring to attach an encounter. Launch needs **only a numeric encounter id**
→ `useEncounterRunner(id)`. Both stores are opaque JSON blobs, so **no backend/seed migration** is required
(`encounter_id` on `MapProp` round-trips through the `map_layout` blob exactly as props themselves shipped).

**Reuse (do not rebuild):** `FloatingWindow.tsx`; the inline `EncounterDock` from `DungeonViewPage`
(**extract to a shared component**); `PropMarker.tsx` + `PROP_KIND_ICONS`/`propsOnFloor` marker pattern; the
prop-authoring path `addProp` → `FixturePropertiesForm`/`PROP_FIELDS` → `updateFixtureFlags` → `useMapLabEditor`
autosave; `listEncounters()` for the picker.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **D0 — Scaffolding** | Haiku | Data field, shared-dock extraction, prop-kind + field-spec stubs, `it.skip` tests. | ✓ `encounter_id?: number \| null` added to `MapProp` (`maplabModel.ts`); new `'encounter'` prop kind in `PROP_KIND_ICONS`/`FIXTURE_TYPES` (SwordsIcon, neutral token); **extracted inline `EncounterDock` → shared `frontend/src/features/encounters/EncounterDock.tsx`** (DungeonViewPage re-imports, behavior unchanged); MapLabPage state + conditional render placeholder; `PROP_FIELDS` encounter_id entry (text field, showWhen kind='encounter'); placeholder CSS comment; skipped test stubs; SwordsIcon added to icons index. |
| **D1 — Data + shared dock in session viewer** | Sonnet | Persist the link; put the runner dock on the Map Lab viewer. | `encounter_id` parses/serializes through the `map_layout` blob (no backend change); shared `EncounterDock` consumed by both `DungeonViewPage` and **`MapLabPage`** (add `activeEncounterId` state + `<EncounterDock>` to the session viewer). Tests: `MapProp` round-trips `encounter_id`; MapLabPage opens/closes the dock for a given id. |
| **D2 — On-map marker + launch** | Sonnet | Tap an encounter marker → runner pop-out. | In the **session viewer**, an `'encounter'` prop with `encounter_id` renders via `PropMarker` (encounter icon + teal ring); its click/Enter calls `setActiveEncounterId(encounter_id)` → opens `EncounterDock` (in the editor it stays selectable, not launching). Tests: marker renders with encounter icon; activating launches the dock; a marker without `encounter_id` is inert. |
| **D3 — Authoring** | Sonnet | Attach an encounter to a marker in the Map Lab editor. | Editor places an `'encounter'` marker (`addProp`) and, in its `FixturePropertiesForm`, picks an encounter via a **custom picker control** populated by `listEncounters()` → writes `encounter_id` through `updateFixtureFlags(id,'prop',…)` → autosaves. Tests: attaching sets `encounter_id` and persists through save; picker lists encounters by title. |
| **D4 — Design pass (Dungeon)** | Sonnet | Visual/MD3/a11y review of the map link. | Marker token color = encounter/teal role, distinct icon + badge (never hue-alone), **≥48px hit area**, focus visible, `prefers-reduced-motion`; picker control MD3-conformant; session-viewer dock placement. **Live end-to-end**: author link in Map Lab editor → open session viewer → tap marker → runner opens in `FloatingWindow` with Phase-2 condition chips working. |

---

## Deferred / future phases (NOT in Phase 1)

- **Wider stat propagation** (initiative, CR, speed, ability scores) — requires extending the
  `EncounterCreature` wire model + backend; a model-change phase of its own.
- ~~**Condition display in the Runner**~~ — **promoted to Phase 2 (Runner Conditions), now display + live edit.**
- **Encounter templates / difficulty budgeting** — party-size/CR-based XP budget, "build me an encounter"
  helpers.
- **Quick-add-by-quantity** — "add 4× Goblin" in the editor in one action.

---

## Verification (Phase 1 LIVE — 2026-07-13)

1. `pytest` from repo root (110 passed, 90.73% coverage).
2. `npm run test` — 447 passed, 0 skipped.
3. `npm run build` — clean.
4. **Live verified** (Surface Pro): creature pick auto-fills HP/AC; condition picker toggles and persists; save/reopen round-trip intact; runner receives authored stats/conditions correctly.
