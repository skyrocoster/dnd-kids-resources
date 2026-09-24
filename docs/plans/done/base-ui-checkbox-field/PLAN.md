# Base UI CheckboxField - Single checkboxes keep their native form and event behavior

> **Status:** done - justified native retention and representative consumer behavior proved.

- **Read trigger:** Before implementing the selected FOUNDATION single-checkbox adapter or expanding its use.
- **Upstream:** `docs/master-plans/base-ui-migration.md` owns the FOUNDATION boundary and requires preserving public value and form behavior. The completed `docs/plans/done/base-ui-popover-condition-picker/PLAN.md` is precedent only; it explicitly excluded single-checkbox work and records that Base UI is already installed. This Plan authorizes only the bounded outcome below.

## Outcome

Preserve `CheckboxField`'s native checkbox because Base UI 1.8.0 does not expose the required React `ChangeEvent<HTMLInputElement>` contract. Prove its current event, label, form, disabled, and appearance behavior and SpellEditor's existing handlers; justified retention is a completed disposition under the master plan, not an unfinished migration.

## Scope

- **Included:** Focused behavior tests for the retained native single-checkbox field and a representative SpellEditor regression for Concentration and Ritual handlers and save behavior.
- **Expected areas:** `frontend/src/components/form/__tests__/CheckboxField.test.tsx` and `frontend/src/features/spells/__tests__/SpellEditor.test.tsx`. `CheckboxField.tsx` and `SpellEditor.tsx` are behavior targets; no production source change is selected.
- **Excluded:** Changes to callers or public contracts; checkbox groups and multiselects; other consumers or raw-checkbox sweeps; Dialog or other FOUNDATION components; feature/domain or save-mapping changes; new dependencies; visual redesign; backend work; and DND-EVALUATION. Preserve unrelated worktree changes.

## Stages

1. **pending - Prove native retention.** Keep the native `CheckboxField` implementation unchanged. Test its controlled/uncontrolled values, actual React change event, label association, disabled behavior, and native form `name`, `value`, `required`, and `form` participation, retaining its classes and presentation. **Proof:** from `frontend/`, run `timeout 120s npm test -- src/components/form/__tests__/CheckboxField.test.tsx` with a 130000 ms tool timeout.
2. **pending - Prove the representative SpellEditor behavior.** Extend the focused regression to toggle Concentration and Ritual through existing handlers and verify checked values flow through save. Do not change `SpellEditor`. **Proof:** from `frontend/`, run `timeout 120s npm test -- src/components/form/__tests__/CheckboxField.test.tsx src/features/spells/__tests__/SpellEditor.test.tsx` with a 130000 ms tool timeout.

## Progress and decisions

- **Stage 1:** accepted - native retention proved by `timeout 120s npm test -- src/components/form/__tests__/CheckboxField.test.tsx` (5 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). React event, controlled/uncontrolled, label, disabled and native form participation passed.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/components/__tests__/Dialog.test.tsx src/components/form/__tests__/CheckboxField.test.tsx src/features/spells/__tests__/SpellEditor.test.tsx` passed (3 files, 32 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Concentration/Ritual save regression passed; the same Spell Name focus assertion now waits for Base UI's asynchronous initial focus. Checkbox contract and legacy Dialog behavior passed together.
- Decision: reject a Base UI single-checkbox adapter for this contract. Base UI 1.8.0 supplies boolean `onCheckedChange` with native event details, not a React change event; its omitted `onChange` prop prevents forwarding the public API faithfully without fabrication. The master plan permits justified native retention. No dependency, source, or caller change is selected. Passing proof remains valid until an input or environment changes.

## Proof

- Stage 1: `timeout 120s npm test -- src/components/form/__tests__/CheckboxField.test.tsx` (`frontend/`; command timeout 120 seconds; tool timeout 130000 ms).
- Stage 2: `timeout 120s npm test -- src/components/form/__tests__/CheckboxField.test.tsx src/features/spells/__tests__/SpellEditor.test.tsx` (`frontend/`; command timeout 120 seconds; tool timeout 130000 ms). This is the approved combined proof for the adapter and representative consumer.
- Run only the focused behavioral commands above; no broad checks are part of this Plan.

## Escalation boundaries

- Stop if React `ChangeEvent<HTMLInputElement>` behavior or native form participation cannot be retained faithfully without changing the public contract, a caller, or fabricating an incompatible event.
- Stop rather than adding a dependency, changing SpellEditor behavior or save mapping, expanding to other consumers, or redesigning the existing presentation. Route any required new decision back to the coordinator; do not ask routine questions.

## Visible result

> SpellEditor’s single checkboxes keep their familiar appearance and existing checked, change-event, disabled, and form behavior with the shared Base UI-backed field.
