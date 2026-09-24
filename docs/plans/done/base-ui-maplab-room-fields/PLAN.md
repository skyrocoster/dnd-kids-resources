# MapLab room and feature fields - Room and feature fields use shared text/select controls without changing edit behavior

> **Status:** done - RoomContentEditor and selected-feature field adapters accepted with local layout parity CSS.

- **Read trigger:** Read before migrating `RoomContentEditor` fields or the selected-feature Kind/Title fields in `MapLabEditorSelection` to shared form adapters.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) — settled adapter direction, preservation requirements, and focused proof expectations. [MapLab editor popovers](../../done/base-ui-maplab-editor-popovers/PLAN.md) — completed ownership boundary for `MapLabEditorPage`, `MapLabEditorChrome`, and `MapLabEditor.css`; avoid overlapping those overlay changes. No signed-off design artifact is declared.

## Outcome

Room content and selected-feature text/static-select fields use the existing shared adapters while preserving their current labels, values, callbacks, staged edits, submission behavior, and layout. Native controls and the selection sheet's ownership remain unchanged.

## Scope
- **Included:** Stage 1 adapts `RoomContentEditor` text and static-select fields. Stage 2 adapts only the selected-feature Kind and Title fields in `MapLabEditorSelection`. Keep current callback values and field labels. Preserve room-entry draft state, submit behavior, and current absence of additional validation.
- **Expected areas:** `frontend/src/features/dungeons/maplab/RoomContentEditor.tsx`, `frontend/src/features/dungeons/maplab/__tests__/RoomContentEditor.test.tsx`, `frontend/src/features/dungeons/maplab/MapLabEditorSelection.tsx`, `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx`, and narrowly scoped adapter layout selectors in `frontend/src/features/dungeons/maplab/MapLabEditor.css`.
- **Excluded:** `FixturePropertiesForm` (handled separately); `InspectorPanel` (read-only descriptor and obstacle-state surface); numeric fields, checkboxes, and custom pickers; the selection-sheet wrapper, toggle, and selection actions; geometry, domain/data mapping, API behavior, and unrelated refactors. Do not edit `MapLabEditorChrome.tsx`, `MapLabEditorPage.tsx`, their tests, shared form APIs, or dependencies; do not change overlay CSS rules beyond narrow field layout parity.

## Stages
1. **pending - Adapt RoomContentEditor text and static-select fields.** Actions: (1) use `TextField` for room title and entry title, and its multiline mode for entry content; (2) use `SelectField` for wall kind and entry type while preserving their existing string values and labels; (3) preserve `entryDraft` updates, NPC checkbox behavior, submit handling, appended-entry callback, and draft reset; (4) add focused component tests for field labels/values, callbacks, and entry submission. **Proof:** run the Stage 1 command in Proof. **Escalate** if adapters cannot preserve the current room-field layout without a `MapLabEditor.css` change. **Breakpoint:** none.
2. **pending - Adapt selected-feature Kind and Title fields.** Actions: (1) use `SelectField` and `TextField` only for the selected-feature Kind and Title controls; (2) preserve the existing option values/labels and `updateFeatureMeta` callback values; (3) leave the selection-sheet wrapper, expanded state, actions, and all other selection branches untouched; (4) add focused tests for the feature fields and unchanged sheet controls. **Proof:** run the Stage 2 command in Proof. **Escalate** if this requires changing selection ownership or any page/chrome overlay behavior. **Breakpoint:** none.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/RoomContentEditor.test.tsx` passed (3 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Shared text/select fields retained draft/submit, labels, native NPC checkboxes, and side-by-side/multiline CSS parity.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx` passed (2 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Kind/Title values, callbacks and sheet controls passed; selector-specific CSS left Stage 1 room-field inputs unaffected, so its 3-test proof was retained.
- **Decision:** Existing adapters are read-only for this work. Keep native numeric, checkbox, and custom-picker behavior; no dependency, geometry, or data-mapping changes. The completed editor overlay Plan no longer owns active CSS edits. This necessary scope correction permits only local `MapLabEditor.css` selectors preserving the existing side-by-side `.maplab-field-row` and multiline presentation with adapter markup, not a redesign or overlay styling change.

## Proof

Run commands from `frontend/`. Each command has a 120-second command-level timeout; use a 130000 ms Bash tool timeout.

- **Stage 1 focused:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/RoomContentEditor.test.tsx`
- **Stage 2 focused:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx`
- The stages change disjoint component/test paths, so Stage 2 does not invalidate Stage 1 proof; no combined command is required. If a later change affects both stages, run: `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/RoomContentEditor.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorSelection.test.tsx`.

Passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment. Do not add broad lint, formatting, build, or aggregate checks for this Plan.

## Escalation boundaries
- Stop if local field-only CSS cannot preserve the existing label/control and multiline layouts without altering overlay rules or introducing a redesign; retain an affected native field rather than changing behavior.
- Stop before changing room draft/submit behavior, field validation, selection-sheet ownership, selected-feature data mapping, geometry, numeric/checkbox/custom-picker behavior, shared adapter contracts, dependencies, or the excluded page/chrome overlay surfaces.

## Visible result
> Room content and selected-feature text and choice fields keep their current edit behavior while using the shared field controls.
