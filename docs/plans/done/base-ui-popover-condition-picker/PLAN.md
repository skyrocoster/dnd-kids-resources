# Shared Popover - ConditionPicker uses one anchored interaction layer

> **Status:** done - both stages accepted.

- **Read trigger:** When implementing the selected FOUNDATION Popover outcome and its first ConditionPicker consumer.
- **Upstream:** `docs/master-plans/base-ui-migration.md` owns the selected slice boundaries and acceptance requirements. `docs/grilling-docs/2026-09-23-base-ui-full-migration.md` records the provisional ConditionPicker direction and approval history. `docs/shared-primitives-review.md` is read-only source evidence. The current user request authorizes this bounded outcome; older authorization text in the master plan is superseded only for this approved scope.

## Outcome

Provide a reusable Base UI-backed anchored Popover and use it for ConditionPicker, so the checkbox panel keeps its current arrangement and selection behavior while relying on shared overlay lifecycle and focus behavior.

## Scope

- **Included:** A shared anchored Popover with controlled and uncontrolled open state and consumer-specific dismissal ownership; ConditionPicker's first production use of it; focused tests for the shared behavior and consumer contract. Reuse the existing Base UI-backed `MultiSelectField` for the actual multi-selection, with feature-local styling only as needed to retain ConditionPicker's current layout.
- **Expected areas:** `frontend/src/components/Popover.tsx`, `frontend/src/components/__tests__/Popover.test.tsx`, `frontend/src/features/encounters/ConditionPicker.tsx`, `frontend/src/features/encounters/ConditionPicker.css`, and `frontend/src/features/encounters/__tests__/ConditionPicker.test.tsx`. `frontend/src/components/form/MultiSelectField.tsx` is a reuse candidate only; do not change its public API for this outcome.
- **Excluded:** Single-checkbox adapter work; either Dialog API; any other overlay consumer; general field/API changes; feature/domain changes; visual redesign; backend changes; new dependencies; and MapLab, Set HP, Loom, or glossary migrations. Preserve unrelated pre-existing worktree changes.

## Stages

1. **accepted - Add and prove the shared Popover contract.** Build the Base UI-backed anchored primitive and its focused tests. Support controlled or uncontrolled open state, anchoring, and caller control over outside-press/Escape dismissal; do not impose a blanket dismissal rule or take ownership away from consumers with ordered Escape behavior. For the ConditionPicker use, preserve Escape focus return without stealing focus after an outside pointer action. Keep this a non-modal panel, not a Dialog. **Proof:** from `frontend/`, run `timeout 120s npm test -- src/components/__tests__/Popover.test.tsx` with a 130000 ms tool timeout. **Acceptance:** tests demonstrate open-state control, anchored trigger/popup behavior, supported per-consumer dismissal, and the focus behavior used by ConditionPicker. **Breakpoint:** none; escalate if this contract requires a new dependency or global dismissal behavior.
2. **accepted - Migrate ConditionPicker and prove the combined behavior.** Replace its hand-managed panel lifecycle with the shared Popover. Reuse `MultiSelectField` for the true multi-select and adapt only ConditionPicker-local styling as needed. Preserve its controlled `selected`/`onChange` values, trigger summary, available options, selected custom/missing options from `mergeConditionOptions`, and the current outside/Escape close paths. **Proof:** from `frontend/`, run the supplied focused command with a 130000 ms tool timeout:

   ```bash
   timeout 120s npm test -- src/components/__tests__/Popover.test.tsx src/features/encounters/__tests__/ConditionPicker.test.tsx src/components/form/__tests__/MultiSelectField.test.tsx
   ```

   **Acceptance:** the integrated tests prove ConditionPicker opens and retoggles, outside click and Escape close it, Escape returns focus to the trigger, selected values and callbacks remain unchanged, and a selected custom/missing condition remains visible and checked. The panel layout remains visually consistent with the current presentation. **Breakpoint:** none unless preserving that layout would require redesign or a shared field API change; stop and escalate rather than force either change.

## Progress and decisions

- **Stage 1:** accepted - `timeout 120s npm test -- src/components/__tests__/Popover.test.tsx` passed (5 tests; `frontend/`, tool timeout 130000 ms). Controlled/uncontrolled state, anchoring, configured dismissal, Escape focus return and outside-pointer focus behavior were proved.
- **Stage 2:** accepted - `timeout 120s npm test -- src/components/__tests__/Popover.test.tsx src/features/encounters/__tests__/ConditionPicker.test.tsx src/components/form/__tests__/MultiSelectField.test.tsx` passed (3 files, 14 tests; `frontend/`, tool timeout 130000 ms). Retoggle, outside/Escape dismissal, focus return, controlled and custom selections passed with local styling retained.
- Use the repository's installed `@base-ui/react` dependency; no package change is selected.
- The existing `CheckboxField` remains outside this Plan. ConditionPicker is a multi-select and the existing `MultiSelectField` already supplies Base UI CheckboxGroup behavior.

## Proof

- Stage 1: `timeout 120s npm test -- src/components/__tests__/Popover.test.tsx` (workdir `frontend/`; command timeout 120 seconds; tool timeout 130000 ms).
- Stage 2: `timeout 120s npm test -- src/components/__tests__/Popover.test.tsx src/features/encounters/__tests__/ConditionPicker.test.tsx src/components/form/__tests__/MultiSelectField.test.tsx` (workdir `frontend/`; command timeout 120 seconds; tool timeout 130000 ms).
- Retain passing proof until a later change affects the command, inputs, exercised behavior, configuration, dependencies, or environment. Stage 2 runs the integrated focused command because it adds the production consumer.

## Escalation boundaries

- Stop if implementation requires changing ConditionPicker's public values/callback, its custom/missing-selection behavior, its close/focus behavior, or its current layout beyond local styling.
- Stop rather than adding a dependency, changing a shared field API, migrating another overlay, or imposing a global outside/Escape policy. Route any such newly required decision back to the coordinator; do not ask routine questions.
- Do not change Dialog, Set HP rules, MapLab Escape priority, or any domain behavior in this Plan.

## Visible result

> ConditionPicker keeps its current compact checkbox-panel behavior while using the shared Popover for anchoring, dismissal, and focus return.
