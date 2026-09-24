# Encounter Creature Row Disclosure - Creature rows expand with shared disclosure behavior

> **Status:** done - controlled row disclosure and exclusive statuses accepted.

- **Read trigger:** Before changing CreatureRowCard disclosure or status-choice behavior.
- **Upstream:** `docs/master-plans/base-ui-migration.md` - DISCLOSURES direction and acceptance guidance. No signed-off design artifact is declared.

## Outcome
Encounter creature rows use the shared Disclosure behavior while the editor continues to control each row independently. The four statuses remain exclusive, non-clearable choices with their current colors and callbacks; use ToggleGroup only if its existing API can preserve those contracts without a shared API change, otherwise retain the native status buttons.

## Scope
- **Included:** CreatureRowCard disclosure behavior and local styling; focused component and EncounterEditor regression proof for controlled, independent row expansion; a bounded fit check and proof of the existing four status choices.
- **Expected areas:** `frontend/src/features/encounters/CreatureRowCard.tsx`, `frontend/src/features/encounters/CreatureRowCard.css`, `frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx`, and `frontend/src/features/encounters/__tests__/EncounterEditor.test.tsx`. Existing shared `Disclosure` and `ToggleGroup` APIs are read-only constraints, not edit targets.
- **Excluded:** Set HP, CombatantCard, EncounterRunner and board behavior, ConditionPicker, other encounter controls, feature/business rules, generic shared API changes, new dependencies, and edits to EncounterEditor production code.

## Stages
1. **pending - Migrate row collapse to shared Disclosure.** Keep `collapsed` externally controlled and map Disclosure open changes to `onToggleCollapsed`; keep each row's state independent in the editor. Preserve the card/header layout, summary, fields, callbacks, and body visibility when collapsed. Keep status and remove controls outside the disclosure trigger. Add focused keyboard and independent-row assertions. Run the focused proof command. Escalate if the shared Disclosure cannot fit the existing row layout locally without changing ownership or redesigning it.
2. **pending - Verify the status-control fit and contract.** Check whether the existing ToggleGroup can express the four statuses with their distinct selected colors and preserve the non-clearable selection and callbacks, using local component styling only. If it can, use a single controlled selection, ignore empty changes, and prove all four choices, colors, callbacks, non-clearability, and the resulting keyboard behavior. If per-option styling or no-clear behavior requires a generic API change or cannot be preserved locally, retain the native buttons and record that justification: the current row uses per-status classes and selected color rules, while ToggleGroup exposes no per-option class field. In either case, add or adjust focused assertions for all four values, one selected value, callback behavior, styling hooks, and keyboard activation. Rerun the focused proof command. No user breakpoint is needed unless a new API or behavior decision becomes necessary.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- src/features/encounters/__tests__/CreatureRowCard.test.tsx src/features/encounters/__tests__/EncounterEditor.test.tsx` passed (2 files, 19 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Editor queries were updated to the portaled Base UI checkbox role and Dialog focus wait; row collapse remains independently controlled and keyboard-operable.
- **Stage 2:** accepted - `timeout 120s npm test -- src/features/encounters/__tests__/CreatureRowCard.test.tsx src/features/encounters/__tests__/EncounterEditor.test.tsx` passed (2 files, 21 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Shared ToggleGroup with local per-status styles and an empty-result guard preserves all four non-clearable choices and keyboard operation. Re-proved Stage 1.

## Proof
- From `frontend`, run `timeout 120s npm test -- src/features/encounters/__tests__/CreatureRowCard.test.tsx src/features/encounters/__tests__/EncounterEditor.test.tsx` with a **130000 ms tool timeout**. This covers component disclosure/status behavior and the editor's independent row expansion. Retain passing proof until a later change affects the command, inputs, exercised behavior, configuration, dependencies, or environment.

## Escalation boundaries
- Do not change the editor's independent row ownership, collapse policy, status values, selected-status callback contract, colors, or layout.
- Do not extend or modify shared Disclosure/ToggleGroup APIs. Retain native status buttons if the current ToggleGroup cannot meet the styling and no-clear contract locally.
- Stop if acceptance requires product, visual redesign, API, dependency, data, ownership, or scope decisions beyond this Plan.

## Visible result
> Each encounter creature row opens and closes independently with the shared disclosure behavior, while its four status choices keep their current colors and cannot be cleared.
