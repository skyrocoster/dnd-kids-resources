WORK ORDER 05 — Retire or replace the six skipped tests and three placeholder assertions
GOAL: Eliminate every `it.skip` and `expect(true).toBe(true)` placeholder so the final test count is explicit — zero skipped, zero trivially-passing.
DEPENDS ON: 01

KNOWN STATE (already true — do NOT redo or re-derive):
- 6 `it.skip` tests:
  1. `maplabEditor.test.ts:424` — "H0: stair/portal fields are stubbed" (comment: "H0 scaffolding: type additions complete, reducer cases stubbed") — these reducer cases are now fully implemented (H1-H5 tests pass below it).
  2. `maplabEditor.test.ts:712` — "H4: portal marker reads as distinct from door/stair/prop" (comment: "H4 design pass: visual/interaction review") — a `PortalMarker` component exists and renders; marker rendering is verified by `StairPortalMarker.test.tsx` and integration tests.
  3. `MonsterBrowserPage.test.tsx:206` — "hides sections when data is absent" (comment: "X1: a bare beast hides Actions and Lore sections")
  4. `MonsterBrowserPage.test.tsx:268` — "createMonster sends POST and returns the created monster" (comment: "M3: stub becomes real when CRUD endpoints land")
  5. `MonsterBrowserPage.test.tsx:272` — "updateMonster sends PUT and returns updated fields" (comment: "M3: stub becomes real when CRUD endpoints land")
  6. `MonsterBrowserPage.test.tsx:276` — "deleteMonster sends DELETE and removes the monster" (comment: "M3: stub becomes real when CRUD endpoints land")
- 3 `expect(true).toBe(true)` placeholder assertions:
  1. `EncounterRunnerPage.test.tsx:414` — "compact dock mode controls meet the 48px touch-target floor (VT1 dock targets)"
  2. `MapLabEditorPage.test.tsx:1807` — "viewer room rail and details panel are reachable at 520px (VT2 viewer responsive)"
  3. `MapLabEditorPage.test.tsx:1814` — "encounter dock FloatingWindow is reachable and resizable at narrow widths (VT1 dock responsive)"
- Monster CRUD: `api/client.ts` exports `createMonster`, `updateMonster`, `deleteMonster`. `MonsterEditor` component calls them. The MonsterEditor tests (`MonsterEditor.test.tsx`) already cover create/edit/delete behavior through the editor UI.
- Stair/portal authoring: all reducer cases (H1-H5) in `maplabEditor.test.ts` have real implementations and passing tests. "H0" was scaffolding — it's now obsolete.
- H4 portal marker: `PortalMarker` renders with `className="maplab-portal-marker"`. The `StairPortalMarker.test.tsx` file already tests portal marker rendering. The H4 skipped test is a visual-review stub — not a code test.
- The viewport fixture from Order 01 is available for making the two MapLabEditorPage responsive placeholders real.

START IN:
- frontend/src/features/dungeons/maplab/__tests__/maplabEditor.test.ts
- frontend/src/features/monsters/__tests__/MonsterBrowserPage.test.tsx
- frontend/src/features/monsters/MonsterBrowserPage.tsx
- frontend/src/api/client.ts
- frontend/src/features/encounters/__tests__/EncounterRunnerPage.test.tsx
- frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx

DO:
- For `maplabEditor.test.ts` H0 (line 424): delete the `it.skip` block entirely. The scaffolding described in its comment no longer exists — the reducer cases are real and tested by the tests below it.
- For `maplabEditor.test.ts` H4 (line 712): delete the `it.skip` block entirely. Portal marker rendering is covered by `StairPortalMarker.test.tsx`. A visual review isn't a unit test.
- For `MonsterBrowserPage.test.tsx` X1 (line 206): either write a real test that renders a monster with no actions/lore and asserts those sections don't appear, OR delete the `it.skip` block if the `MonsterStatBlock` component already handles absent sections (check the component). Do not leave as skip.
- For `MonsterBrowserPage.test.tsx` M3 (lines 268, 272, 276): delete all three `it.skip` blocks. Monster CRUD is already tested through `MonsterEditor.test.tsx` which covers the UI workflow that calls those API functions.
- For `EncounterRunnerPage.test.tsx` (line 414): delete the `it()` block containing `expect(true).toBe(true)`. The compact dock is not yet implemented — having a trivially-passing test is worse than no test.
- For `MapLabEditorPage.test.tsx` VT2 (line 1807): replace the `expect(true).toBe(true)` with a real responsive assertion using the viewport fixture: set viewport to 520×768, render the viewer shell, verify the room rail element (`.maplab-viewer-rail-container`) and details panel (`.maplab-sidebar`) are in the document.
- For `MapLabEditorPage.test.tsx` VT1 (line 1814): delete the `it()` block. The FloatingWindow encounter dock responsive behavior is not yet implemented — a placeholder test provides false confidence.

STOP WHEN: `npm run test` reports exactly 0 skipped tests (currently 6). No test file contains `it.skip`, `test.skip`, `describe.skip`, `xit`, `xdescribe`, `xtest`, or `expect(true).toBe(true)`. No new test failures beyond the 21 pre-existing failures. Then stop — change nothing else.

STATUS:
