WORK ORDER 02 — Add kid touch-target CSS token and verify 64px floor
GOAL: The kid surfaces carry `--kid-control-height: 64px` and every interactive element meets the raised floor.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- UX decisions specify "64px floor for kid surfaces" (player-app-skeleton.md line 46). The app's general floor is `--control-height: 48px` (theme.css line 273).
- No `--kid-control-height` token exists anywhere.
- `PlayerHome` destination buttons use hardcoded `min-width: 160px; min-height: 96px` in `PlayerShell.css` lines 16–17 — already exceeds 64px.
- The kid map (`PlayerMapRenderer`) has no interactive touch targets yet (tapping rooms arrives in Plan 2). The viewport has `touch-action: none` and handles pan/zoom only.
- The no-exit audit is already implemented and tested: `PlayerShell.test.tsx` line 64 asserts `screen.queryByRole('link')` and `screen.queryByRole('button')` are both null on the map route. All 6 player shell tests pass.
- Empty copy ("No map yet."), error copy ("The map didn't load. Ask your DM."), and loading copy ("Loading map…") are already implemented in `PlayerMapRoute` and tested.
- All 16 player/ tests pass. Suite: 1245 passed, 6 skipped, 1 failed (unrelated).

START IN:
- frontend/src/theme.css
- frontend/src/player/PlayerShell.css
- frontend/src/player/__tests__/PlayerShell.test.tsx

DO:
- Add `--kid-control-height: 64px` to the `:root` in `theme.css` in the control-size scale section (near `--control-height` line 274). This is a raised floor for kid surfaces — not currently needed by existing elements (destination buttons are 96px, map has no interactive targets yet) but available for Plan 2 and beyond.
- Add one test in PlayerShell.test.tsx: verify `.player-destination` has `min-height >= 64px` (use `getComputedStyle` to read the actual computed value). This locks in the 64px floor contract.

STOP WHEN: `npx vitest run src/player/__tests__/PlayerShell.test.tsx` passes with the new test. Then stop — change nothing else.

STATUS: DONE
