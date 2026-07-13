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
> **Phase 2 (Runner Conditions)** and **Phase 3 (Dungeon Map Link)** are now both **COMPLETE** ✓ (2026-07-13),
> including their design-pass stages (R3, D4). See each phase's own status block below for what shipped.

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

> **Status:** Phase 2 (Runner Conditions) **COMPLETE** ✓ (2026-07-13)
> - R0 (scaffolding): action + prop-threading stubs, placeholder CSS, test stubs
> - R1 (reducer + data flow): `setConditions` reducer case implemented; canonical condition list fetched in the hook
> - R2 (card display + live edit): condition chip row + `ConditionPicker` trigger wired into `CombatantCard`
> - R3 (design pass): status-chip touch target fixed, dock/compact spacing tightened, picker panel grouped for a11y

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
| **R1 — Reducer + data flow** | Sonnet | Implement the action; feed the canonical condition list in. | ✓ `setConditions` reducer case in `encounterRunner.ts` (mirrors `setStatus`) replacing `conditions` immutably for the matched `clientId`; canonical `Condition[]` fetched in `useEncounterRunner.ts` (mirrors `EncounterEditor.tsx:38` via `getConditions()`) and exposed as `runner.conditions`; round-trip preserved through `combatantsToCreatures`. Fixed two pre-existing R0 build errors (`onSetConditions` unused destructure, `combatant.conditions` possibly-null access) to keep `npm run build` clean. Tests: 3 reducer tests (sets/clears conditions, order & other combatants untouched) + 1 round-trip test + 2 hook tests (fetch success/failure); 453 frontend tests passing (4 skipped, unaffected), `npm run build` clean, 110 backend tests unaffected. |
| **R2 — Card display + live edit** | Sonnet | Chips + inline picker on the combatant card. | ✓ Condition chip row in `CombatantCard.tsx` (reuses status-chip markup pattern, teal/tertiary role via `--md-tertiary-container`/`--md-on-tertiary-container`); reused `ConditionPicker` (Phase 1) wired as the edit trigger, `onChange` dispatches `runner.setConditions(clientId, next)`; canonical `Condition[]` threaded `EncounterRunnerBoard → CombatantCard` via `runner.conditions`; legacy/custom names preserved (picker's `mergeConditionOptions` already handles this). Tests via `EncounterRunnerPage.test.tsx`: empty-state (no chip row, "No conditions" trigger text), toggling a condition renders a chip, toggle persists through debounce-save (`updateEncounter` payload carries `conditions: ['Prone']`). 456 frontend tests passing (2 skipped — unrelated D-phase stubs), `npm run build` clean, 110 backend tests unaffected (90.73% coverage). |
| **R3 — Design pass (Runner)** | Sonnet | Visual/MD3/a11y review of the Runner. | ✓ `.combatant-status-chip` `min-height` raised `2rem` → `2.75rem` (`CombatantCard.css`) — it's a real `<button>` with `aria-pressed`, unlike the condition `<span>` chips, so it was the one interactive control under the project's touch-target floor. Added `.encounter-runner-board.compact` overrides for `.combatant-card`/`.combatant-status-chips`/`.combatant-condition-chips`/`.combatant-condition-row`/`.condition-picker-trigger` that tighten padding/gap for the 380px `FloatingWindow` dock — spacing shrinks, the 2.75rem interactive floor does not. `ConditionPicker`'s checkbox panel gained `role="group" aria-label="Condition options"` (distinct from the chip row's own `"Conditions"` label, avoiding an `aria-label` collision caught by the test suite) for correct grouping semantics. Condition chips kept text-only (no added glyph) — condition names are short, legible words, not a color-only state, so no icon was needed to avoid hue-alone signaling. Tokens, global focus rings, and `prefers-reduced-motion` were already correct — no changes needed there. Tests: 464 passing (no new tests; pure CSS/markup, one existing test's `aria-label` query updated for the new distinct label). `npm run build` clean, `pytest` unaffected (110 passed, 90.73% coverage). 🚦 **Live verified 2026-07-13**: standalone runner (`/encounters/4/run`, "Goblin Ambush") shows finger-sized status pills and condition chips (Blinded, Charmed); same encounter opened via the dungeon dock (`FloatingWindow`, ~310px rendered width) shows the compact spacing fitting both chip rows and the picker trigger without crowding or overflow. |

---

## Phase 3 — Dungeon Map Link

> **Status:** Phase 3 (Dungeon Map Link) **COMPLETE** ✓ (2026-07-13)
> - D0 (scaffolding): encounter_id field, shared EncounterDock extraction, prop-kind stubs, test stubs
> - D1 (data + shared dock): confirmed `encounter_id` round-trips through the opaque `map_layout` blob (no backend change needed); `EncounterDock` now live on the Map Lab session viewer via `activeEncounterId`
> - D2 (marker + launch): clicking/Enter-ing an `'encounter'`-kind prop with an `encounter_id` opens the dock in the session viewer (`MapLabPage`); a marker without an `encounter_id` is inert; `PropMarker` gives encounter markers the tertiary/teal token by default
> - D3 (authoring): new `encounterPicker` field type in `FixturePropertiesForm` — a `<select>` populated by `listEncounters()` (titles, not raw ids) — replaces the placeholder text field on the encounter marker's `encounter_id`; writes through the existing `updateFixtureFlags` → autosave path unchanged
> - D4 (design pass): styled the previously-unstyled `<select>` fields, cleaned up a stale TODO comment, confirmed marker focus/sizing conventions inherited from Phase F

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
| **D1 — Data + shared dock in session viewer** | Sonnet | Persist the link; put the runner dock on the Map Lab viewer. | ✓ Confirmed `encounter_id` round-trips through the `map_layout` blob untouched — the backend (`layouts.py`) and frontend (`api/client.ts`) both treat `MapLayout`/`props` as an opaque JSON blob with no field-picking, and `normalizeLayout` (`maplabModel.ts`) passes `encounter_id` through unchanged; **no backend change required**, confirming the plan's premise. `activeEncounterId` state + `<EncounterDock>` render in `MapLabPage.tsx` (already scaffolded in D0) finalized — TODO comment narrowed to D2's remaining click-wiring scope only. Tests: 3 new `maplabModel.test.ts` unit tests (`encounter_id` survives JSON round-trip, survives `normalizeLayout`, `null` is preserved for an unlinked marker); un-skipped `MapLabPage.test.tsx`'s `'encounter marker round-trips encounter_id through save/load'` stub (mocks `getDungeonLayout` with an `'encounter'`-kind prop, confirms it loads and renders through the full `useMapLabLayout` → `normalizeLayout` → `propsOnFloor` → `PropMarker` pipeline). The sibling stub `'encounter marker renders and opens the dock'` stays skipped — its own D0 comment assigns it to D2 (click/Enter wiring on the marker), so it wasn't pulled forward. 460 frontend tests passing (1 skipped — the D2 stub), `npm run build` clean, 110 backend tests unaffected (90.73% coverage). |
| **D2 — On-map marker + launch** | Sonnet | Tap an encounter marker → runner pop-out. | ✓ In the **session viewer** (`MapLabPage.tsx`), an `'encounter'` prop with `encounter_id` renders via `PropMarker` (encounter icon + teal `--md-tertiary` ring, overriding the generic neutral "unlocked" token — trapped/locked/hidden states still take precedence); its click/Enter calls `setActiveEncounterId(encounter_id)` → opens the existing `EncounterDock`. The **editor** (`MapLabEditorPage.tsx`) is untouched — its prop click still only calls `selectProp` (selectable, not launching). Tests: marker renders with the encounter icon and opens the dock bound to the right encounter id on click; a marker without `encounter_id` is inert (no dock, `getEncounter` not called). 462 frontend tests passing (0 skipped), `npm run build` clean. |
| **D3 — Authoring** | Sonnet | Attach an encounter to a marker in the Map Lab editor. | ✓ Editor places an `'encounter'` marker (existing `addProp` + the Kind `select`'s `'encounter'` option) and, in its `FixturePropertiesForm`, picks an encounter via a new **`encounterPicker`** field type — a `<select>` populated by `listEncounters()`, rendered by a dedicated `EncounterPickerField` component — replacing the placeholder text field from D0. Selecting an option writes `encounter_id` through the existing `updateFixtureFlags(id,'prop',…)` → autosave path unchanged. Tests: picker lists encounters by title (`No encounter` + each `Encounter.title`); selecting one sets `encounter_id` and persists it through `saveDungeonLayout`; the picker only renders for `kind==='encounter'` markers (a chest shows no `Encounter` field). 464 frontend tests passing (0 skipped), `npm run build` clean. |
| **D4 — Design pass (Dungeon)** | Sonnet | Visual/MD3/a11y review of the map link. | ✓ Added `.maplab-field-row select` styling (`MapLabEditor.css`) matching the existing `input[type='text']`/`input[type='number']` treatment (36px min-height, border, background, token colors, `focus-visible` outline) — previously **every** `<select>` field type (including the new `encounterPicker`) fell back to unstyled browser-default chrome next to styled text inputs in the same form; this was the single largest visible gap found. Removed a stale `MapLabPage.css` TODO comment describing an unimplemented `data-variant`-attribute approach for encounter marker coloring that D3 didn't actually build (it uses an inline `style` token instead, which was already correct). **No change** to `PropMarker`'s focus-visible stroke-based ring or its `CELL_SIZE * 0.32` radius — confirmed both are existing, intentional Phase C/D/F precedent for SVG-canvas glyphs (stroke ring hugs the shape where CSS `outline` wouldn't; radius matches the shared stair/prop marker convention rather than the touch-first 48px toolbar floor), not a regression to fix. Icon (`SwordsIcon`), color precedence (state > kind, teal only when `unlocked`), corner badges, dashed-hidden outline, and `aria-label` were already correct — no hue-alone violation, no emoji, no hardcoded hex found. Tests: 464 passing (no new tests; pure CSS, no component behavior changed). `npm run build` clean, `pytest` unaffected (110 passed, 90.73% coverage). 🚦 **Live verified 2026-07-13**: placed a test encounter marker in the Map Lab editor — Kind/Attach-to-wall/Encounter selects now render as three visually consistent styled controls; picked "Goblin Ambush", autosaved; opened the session viewer, the teal `SwordsIcon` marker was visually distinct from the Armoury's gold-locked chest; tapping it opened the runner in a `FloatingWindow` with Phase-2's fixed condition chips fitting cleanly (ties R3 and D4 together in one end-to-end check). Test marker removed afterward, dev DB left as found. |

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

## Verification (Phases 2 + 3 LIVE — 2026-07-13, R3 + D4 design passes)

1. `pytest` from repo root (110 passed, 90.73% coverage) — unaffected, no backend touched.
2. `npm run test` — 464 passed, 0 skipped.
3. `npm run build` — clean (the real typecheck gate; `tsc --noEmit` alone is a false-green in this repo).
4. **Live verified** (Surface Pro): Runner status pills and condition chips are finger-sized and fit
   cleanly in both the standalone route (`/encounters/:id/run`) and the ~310px-wide dungeon dock
   (`FloatingWindow`, compact mode) with two conditions authored. Map Lab editor's Kind/Attach-to-wall/
   Encounter `<select>` fields render as three visually consistent controls; authoring an encounter link
   end-to-end (place marker → pick encounter → autosave → session viewer → tap marker → dock opens with
   working condition chips) round-trips correctly. `git status` confined to
   `frontend/src/features/encounters/` and `frontend/src/features/dungeons/maplab/` CSS/TSX plus this doc.
