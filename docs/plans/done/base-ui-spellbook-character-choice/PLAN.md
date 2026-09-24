# Spellbook Character Choice - Character buttons expose their actual selection semantics

> **Status:** done - spellbook character choice and session retention accepted.

- **Read trigger:** Before changing PlayerSpellbookRoute character-selection semantics or its selected-state styling.
- **Upstream:** `docs/master-plans/base-ui-migration.md` - DISCLOSURES guidance to use semantics appropriate to actual content association. No signed-off design artifact is declared.

## Outcome
The spellbook character choices are announced as a named group of single-choice buttons, not as tabs without associated panels. Selecting a character continues to use the existing session state; no character panel, spell content, router behavior, or persistent storage is added.

## Scope
- **Included:** Character-selection semantics and selected-state CSS in PlayerSpellbookRoute; a new focused route test for selection and keyboard activation; regression proof of existing session retention.
- **Expected areas:** `frontend/src/player/PlayerSpellbookRoute.tsx`, `frontend/src/player/PlayerSpellbookRoute.css`, and new `frontend/src/player/__tests__/PlayerSpellbookRoute.test.tsx`. `frontend/src/player/PlayerSpellbookSession.tsx` is read-only. Existing `frontend/src/player/__tests__/PlayerSpellbookSession.test.tsx` is regression proof only.
- **Excluded:** Character panels, spell content or data, loading/error behavior, session ownership or selection rules, storage persistence, route/navigation changes, visual redesign, new dependencies, and edits to session source or its existing test.

## Stages
1. **pending - Correct character-selection semantics.** Replace `tablist`/`tab` and `aria-selected` with a named group of native buttons using `aria-pressed`, with at most one character pressed. Keep `selectCharacter(id)` and the existing in-memory session state unchanged. Preserve current layout and selected-state styling by targeting the new pressed state; do not add a tabpanel or associate the static “No spells assigned yet” message with a character. Add a focused route test for group/button semantics, exclusive selection, Enter/Space activation, and absence of tab/panel claims. Run the approved focused command. Escalate if this requires character content or a different state owner.
2. **pending - Verify session retention across route child remount.** Extend the new route test to select a character and remount the route child while the existing session provider remains mounted; verify the same character remains selected. Keep `PlayerSpellbookSession.tsx` and its existing test unchanged. Run the approved focused command again because Stage 2 adds coverage to the route test included in that command.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- src/player/__tests__/PlayerSpellbookRoute.test.tsx src/player/__tests__/PlayerSpellbookSession.test.tsx` passed (2 files, 4 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Named exclusive button group and Enter/Space selection no longer claim tabs/panels; session behavior passed.
- **Stage 2:** accepted - `timeout 120s npm test -- src/player/__tests__/PlayerSpellbookRoute.test.tsx src/player/__tests__/PlayerSpellbookSession.test.tsx` passed (2 files, 5 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Route-child remount retained selected character under the same session provider; Stage 1 proof was re-established by the combined run.

## Proof
- From `frontend`, run `timeout 120s npm test -- src/player/__tests__/PlayerSpellbookRoute.test.tsx src/player/__tests__/PlayerSpellbookSession.test.tsx` with a **130000 ms tool timeout**. This covers route semantics/keyboard behavior and session retention. Retain passing proof until a later change affects the command, inputs, exercised behavior, configuration, dependencies, or environment.

## Escalation boundaries
- Do not add tab panels, character-specific content, route changes, storage persistence, or new spell data.
- Do not change active-character selection, session ownership, initialization, or remount behavior.
- Stop if acceptance requires a visual redesign, API, dependency, data, ownership, or scope decision beyond this semantics-only outcome.

## Visible result
> The Spellbook character buttons announce which character is selected without claiming to control missing tabs or panels.
