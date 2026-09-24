# MapLab editor fields and inspector controls - Fixture and selection controls keep their current behavior

> **Status:** done - all three dispositions and focused proof accepted.

- **Read trigger:** Read before changing MapLab fixture fields, the obstacle inspector controls, or the selection sheet's stair-direction and expansion controls.
- **Upstream:** [Base UI migration master plan](../../../master-plans/base-ui-migration.md) governs the migration direction and acceptance boundaries; [the grilling record](../../../grilling-docs/2026-09-23-base-ui-full-migration.md) records proposed MapLab dispositions. Both are read-only evidence. [MapLab room and feature fields](../../../plans/done/base-ui-maplab-room-fields/PLAN.md) is completed, read-only upstream; this Plan covers only its explicit exclusions and remaining fixture controls. No signed-off design artifact is declared.

## Outcome

MapLab's fixture fields, obstacle-state inspector, and selection controls each have a justified Base UI/shared or native/specialized disposition. Migrate only controls that fit without changing layout, labels, callbacks, current number conversion, disabled behavior, or geometry/state ownership.

## Scope

- **Included:** Sequentially disposition `FixturePropertiesForm` boolean, numeric, static-select, and live-picker controls; `InspectorPanel` obstacle checkboxes and Reset action; and `MapLabEditorSelection` stair-direction checkboxes and selection-sheet expansion control. Preserve authored/session adapter ownership, current value mapping, layout, field visibility, labels, and disabled rules. Keep native or specialized controls where a shared API does not fit.
- **Expected areas:** Stage 1: `frontend/src/features/dungeons/maplab/FixturePropertiesForm.tsx`, `frontend/src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx`, and read-only encounter-picker integration proof in `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx`. Stage 2: `frontend/src/features/dungeons/maplab/InspectorPanel.tsx`, new `frontend/src/features/dungeons/maplab/__tests__/InspectorPanel.test.tsx`, and read-only page regression in `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.session.test.tsx`. Stage 3: `frontend/src/features/dungeons/maplab/MapLabEditorSelection.tsx`, `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx`, and read-only integration proof in `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.stairs-portals.test.tsx`. `frontend/src/features/dungeons/maplab/MapLabEditor.css` may be changed only for narrowly scoped layout parity if an existing shared wrapper requires it.
- **Excluded:** Geometry, marker placement, destination/cell calculations, domain rules, state ownership, owning page production source, shared component APIs, dependencies, MapLab toolbar trays, other actions or fields, and styling redesign. Do not change the completed room-fields Plan, master plan, or grilling record. Preserve unrelated work.

## Stages

1. **accepted - Disposition the fixture fields and pickers.**
   - Inspect the existing boolean, numeric, static-select, encounter, NPC, loot-bundle, and destination branches. Use an existing shared control only where its controlled value/callback contract, label association, enabled state, and layout match without a new shared API. Otherwise record and retain the native/specialized control.
   - Preserve the native number field's current conversion: empty input reports `undefined`, non-empty numeric input reports `Number(value)`, and the current native `type="number"` intermediate-input behavior is not replaced with a different editing contract. Base UI `NumberField` emits `number | null` and adds a stepper, so it is not a drop-in replacement; do not force it.
   - Preserve static option values and labels; live picker loading/empty behavior and ID/null/object mappings; `showWhen` gates; destination floor/room choice and free-cell selection; and the current `maplab-field-row` layout. Add focused assertions for boolean and numeric mapping (including blank and representable intermediate input), the static select, and live picker contracts not already covered.
   - **Edit paths:** `FixturePropertiesForm.tsx`, `FixturePropertiesForm.test.tsx`; `MapLabEditor.css` only if required for local layout parity.
   - **Proof:** run both Stage 1 commands in Proof. `MapLabEditorPage.props.test.tsx` is filtered to the encounter-picker options, selection, and persisted value.
   - **Breakpoint:** none for the existing contracts. Stop if matching a shared control requires changing values, event mapping, intermediate input, labels, layout, or geometry/data behavior.

2. **accepted - Disposition the obstacle matrix and Reset action.**
   - Add a focused `InspectorPanel` regression for the Open control; Concealment/Lock/Trap Armed controls; Lock/Trap Shown controls; and Reset to authored. Prove accessible names, current checked values, callback mapping, disabled behavior, and Reset rendering/enabled state follow the existing adapter props. Use shared `CheckboxField`/`Button` only if their wrapper markup preserves the current matrix layout and native disabled/label semantics; otherwise retain the native control with the reason recorded in this Plan's progress.
   - Preserve the distinct legacy `controls` fallbacks, per-obstacle enabled rules, DM Edit versus DM View adapter ownership, and current reset callback. Do not move writes into `InspectorPanel` or alter session/authored data behavior.
   - **Edit paths:** `InspectorPanel.tsx`, new `InspectorPanel.test.tsx`. The existing `MapLabPage.session.test.tsx` is read-only regression proof.
   - **Proof:** run Stage 2 in Proof. The new focused component test proves the control-level contract; existing page tests retain session-write and inspector-rendering behavior.
   - **Breakpoint:** none unless preserving callback ownership, disabled behavior, accessible names, or matrix layout requires a behavior/API/ownership decision.

3. **accepted - Disposition stair-direction and selection expansion controls.**
   - Preserve the stair-direction controls' native checked state, changing floor-aware labels, disabled state when the adjacent floor or selected stair cell is absent, and `setStairDirection(activeZ, selectedStairCell, direction, checked)` callback. Retain native checkboxes if a shared group changes those labels or disabled semantics; do not force `CheckboxGroup`.
   - Check whether the existing shared `Disclosure` can preserve the selection sheet's externally controlled expansion, current trigger names/`aria-expanded`/`aria-controls`, always-visible supplied selection actions, keyboard behavior, and layout. Use it only if those contracts fit without shared API changes or layout redesign; otherwise retain the current native expansion button and record the fit reason. Leave the selected-feature Kind/Title fields and their completed outcome unchanged.
   - **Edit paths:** `MapLabEditorSelection.tsx`, `MapLabEditorSelection.test.tsx`; `MapLabEditor.css` only for narrowly scoped layout parity if needed. `MapLabEditorPage.stairs-portals.test.tsx` is read-only integration proof.
   - **Proof:** run Stage 3a in Proof. If the selection-sheet composition changes, also rerun Stage 1b because that change can affect the encounter-picker integration assertion.
   - **Breakpoint:** none unless a fitting disclosure cannot preserve the current controlled ownership and layout; retain the native control rather than changing behavior.

Stages are sequential. Keep passing proof until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment; rerun only invalidated or newly required proof.

## Progress and decisions

- **Stage 1:** accepted - from `frontend/`, `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx` passed (1 file, 14 tests) and `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx -t "lists encounters by title|Encounter picker only shows"` passed (2 tests, 9 skipped); each command timeout 120 seconds, Bash tool timeout 130000 ms. Booleans use shared `CheckboxField`; static and live encounter/NPC/loot choices use shared `SelectField`. Native number input retains blank-to-`undefined`/nonblank-to-`Number(value)` conversion and editing; the geometry/destination picker remains specialized. Scoped CSS preserves field rows. Breakpoint: none.
- **Stage 2:** accepted - from `frontend/`, `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/InspectorPanel.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.session.test.tsx` passed (2 files, 22 tests; command timeout 120 seconds, Bash tool timeout 130000 ms). Adapter-owned values, callbacks, disabled rules, legacy fallbacks and Reset were proved. Reset uses shared `Button`; Open and the obstacle matrix retain native checkboxes because a shared `CheckboxField` wrapper disrupts the direct-child row/grid layout. The earlier room-fields Plan's “read-only” description did not cover these interactive controls; ownership is unchanged. Breakpoint: none.
- **Stage 3:** accepted - from `frontend/`, `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.stairs-portals.test.tsx` passed (2 files, 12 tests; command timeout 120 seconds, Bash tool timeout 130000 ms). Native stair checkboxes retain floor-aware labels, checked/disabled rules and `setStairDirection` arguments; the controlled native expansion trigger retains its `aria-controls`, always-visible actions, layout and keyboard activation because shared `Disclosure` cannot preserve them without API/layout change. Selection-sheet composition was unchanged, so the conditional filtered integration recheck was not needed. Breakpoint: none.
- **Decision:** no shared API or dependency change is selected. In particular, do not reintroduce the rejected CheckboxGroup substitution or change native number, stair-direction, or disabled behavior to make a primitive fit.

## Proof

Run each command from `frontend/`. Every command has a 120-second command-level timeout and requires a 130000 ms Bash tool timeout.

- **Stage 1a:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx`
- **Stage 1b:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx -t "lists encounters by title|Encounter picker only shows"`
- **Stage 2:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/InspectorPanel.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.session.test.tsx`
- **Stage 3:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.stairs-portals.test.tsx`
- **Stage 3 integration recheck, only if selection-sheet composition changes:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx -t "lists encounters by title|Encounter picker only shows"`

No broad test, build, lint, or formatting checks are part of acceptance.

## Escalation boundaries

- Stop if preserving any current value/callback contract, number-input behavior, field visibility, enabled/disabled state, accessible label, selection-sheet ownership, authored/session write ownership, or layout requires changing product behavior or a public/shared API.
- Stop before changing geometry, cell selection, marker placement, domain calculations, owning page source, toolbar trays, dependencies, or visual direction. Do not force a shared control when its API does not fit; record the native/specialized disposition and its focused proof instead.

## Visible result

> MapLab's fixture fields, obstacle controls, and stair/selection controls keep the same behavior and layout, with each control using a fitting shared primitive or a documented native/specialized alternative.
