WORK ORDER 04 — Fix SpellBrowserPage Player assignment test race
GOAL: Make the "opens Manage Players with current spell assignments checked" test in `SpellBrowserPage.test.tsx` await the dialog's async data load before asserting checkboxes.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The test at line 128 in `SpellBrowserPage.test.tsx` mocks `listSpells`, `listPlayers`, `getSpellPlayers`, renders `SpellBrowserPage`, waits for "Cure Wounds" heading, clicks "Manage Players", then awaits the dialog and asserts `screen.getByRole('checkbox', { name: 'Mira' }).toBeChecked()`.
- `ManageSpellPlayersDialog` (SpellBrowserPage.tsx lines 33-138) calls `Promise.all([api.listPlayers(), api.getSpellPlayers(spell.id)])` in a `useEffect` on mount. The dialog renders a `<StatePanel status="loading" />` until the promise resolves, then renders checkboxes.
- The bug: `screen.findByRole('dialog', ...)` resolves as soon as the dialog DOM exists (immediately), but the checkboxes may not be rendered yet because the `Promise.all` microtasks haven't flushed. `screen.getByRole('checkbox', ...)` is synchronous — it races the data load.
- `@testing-library/react` provides `waitFor`, `waitForElementToBeRemoved`, and async `findBy*` queries. `findByRole` is the async version of `getByRole`.
- The `ManageAssignmentsDialog` tests in `PlayerAssignments.test.tsx` handle this correctly — they use `findByRole` for async queries.
- The test at line 144 ("filters Manage Players to No matches") has the same pattern — after clicking "Manage Players", it does `await screen.findByRole('checkbox', { name: 'Mira' })` to wait for data load. That test is already correct.

START IN:
- frontend/src/features/spells/__tests__/SpellBrowserPage.test.tsx
- frontend/src/features/spells/SpellBrowserPage.tsx

DO:
- In SpellBrowserPage.test.tsx line 128 test, after `expect(await screen.findByRole('dialog', ...)).toBeInTheDocument()`, change the first checkbox assertion from `screen.getByRole('checkbox', { name: 'Mira' })` to `await screen.findByRole('checkbox', { name: 'Mira' })` so the test waits for the async player data to load before asserting.
- Keep the second assertion (`Ari` not checked) as `screen.getByRole('checkbox', { name: 'Ari' })` — by that point the data is loaded and the synchronous query is safe.
- Do NOT change the dialog loading behavior in SpellBrowserPage.tsx — only the test.

STOP WHEN: `npm run test -- SpellBrowserPage` passes the "opens Manage Players with current spell assignments checked" test. The test uses `await screen.findByRole('checkbox', { name: 'Mira' })` and then `screen.getByRole('checkbox', { name: 'Ari' })`. Then stop — change nothing else.

STATUS:
