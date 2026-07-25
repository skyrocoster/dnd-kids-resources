# Field-Test Readiness — make the first live session recoverable and fully green

> **Status:** Stage 2 shipped. Stage 3 partially shipped (viewport fixture, responsive nav/tests done; Player assignment race fix and skipped-test retirement remain). Stage 4 next after Stage 3 completes.

- **Area guide:** [Repo Infra](../../areas/repo-infra.md)

## What we're building & why

The first pre-session full run is not ready: backend pytest has 5 failures and misses its 97% gate
(96.66%); frontend Vitest has 16 failures; typecheck and build fail; the documentation contract
fails; and lint passes with 20 warnings. The generated export schema is the only additional gate
that is green. Most failures are drift in tests after seed export and responsive CSS changes, but
one is a live-session blocker: the kid map stops polling after an empty response, a 404, or a
transient error, so a tablet opened before the DM chooses a dungeon never recovers.

This plan restores trustworthy signals rather than weakening them. It also hardens the DM-to-tablet
handoff already being prepared in the working tree, preserves the existing surface contracts owned
by Player App, Dungeons, Loom, Visual Design, and the catalog areas, and ends with the same commands
that exposed these defects.

## UX decisions — live map handoff

Surface:      Kid map (`/play/map`, Player App) and the Map Lab session-view handoff (Dungeons)
Mode:         play for both
Operator:     kid on the map; DM on the handoff control
Focal:        The transformed live map fills the kid surface; the DM's map remains the session-view focal point
Route shape:  bespoke viewer surfaces; no route or layout change
Edit style:   direct “Put at the table” control on the DM surface; the kid surface stays read-only
Save:         the DM action persists immediately; polling reflects it without a kid refresh action
Empty:        Kid map keeps the exact copy “No map yet.”
Filtered empty: not applicable — neither surface has a filter
No selection: not applicable — the kid never chooses a dungeon
Load failure: Kid map keeps “The map didn't load. Ask your DM.”
Action failure: inline beside “Put at the table”, role="status", with “Couldn't put this map at the table. Try again.”
Destructive:  none
Keyboard:     native Tab then Enter/Space activates the DM control; neither surface adds shortcuts
Touch:        the kid map keeps its 64px floor; the DM control keeps the 48px floor

## Stages

1. **Keep the live map alive.** Make polling continue after empty, not-found, retained-last-frame,
   and error results; keep wake-up polling and request cancellation safe; resolve the browser timer
   type failure; and prove recovery from every state. Give the DM handoff action honest pending and
   inline failure feedback.
2. **Realign backend contracts.** Make monster and spell migration checks accept the timestamp
   metadata required by the canonical export round trip without weakening domain validation; replace
   the obsolete Player `stats` parser cases with the current ability/skill contract; load the now
   canonical dungeon seeds in the real-data fixture so its detail sweep no longer skips them; and add
   behavior-focused reference-resolution coverage so the real 97% gate passes with no backend skips.
3. **Make responsive tests truthful and isolated.** Give Vitest a resettable viewport/media fixture,
   run catalog Back controls, mobile navigation, and the Loom inspector at the breakpoints where
   those controls are accessible, and make the Player assignment test await loaded detail rather
   than racing it. Preserve the established Back, drawer, Escape, and staged-Cancel behavior, and
   replace or retire the six placeholder skipped frontend tests so the final count is explicit.
4. **Restore a clean static signal.** Resolve every current lint warning, treating missing Hook
   dependencies as behavior risks and the remaining warnings as signal noise, then make typecheck
   and the production build green without suppressing diagnostics.
5. **Close the readiness gate.** Repair the malformed real-session work order so the documentation
   contract can validate it, then run backend tests with coverage, the complete frontend suite,
   lint, typecheck, build, documentation validation, and generated-schema validation together.
   Proceed to the physical tablet session only when every gate is green.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Fixed `pollTimer` type to `number | null` to resolve the TS `Timeout`/`number` mismatch with `window.setTimeout`. |
| 1 | Added `scheduleNext()` before every early return (empty, 404, retained-last-frame) so polling never stalls. |
| 1 | Added 5 tests proving recovery from every poll state: 404 from either API, initial error, error-to-ready recovery, and retained-frame continuity. |
| 1 | Added `atTableError` state, catch block, and inline `role="status"` error message in the DM handoff button so action failure is visible. |
| 2 | Added `created_at`/`updated_at` to `MonsterFields` Pydantic model so monster migration tests pass with export-round-trip timestamps. |
| 2 | Added `created_at` to `CANONICAL_SEED_FIELDS` and `CanonicalSpell` so canonical spell seed validation accepts the export timestamp. |
| 2 | Replaced `stats` with `abilities` in two parse-helper tests to match the current `JSON_COLUMNS` contract. |
| 2 | Added `populate_dungeons` call to the real-data fixture so `/api/dungeons/{id}` detail endpoint no longer skips. |
| 2 | Added 4 reference-resolution tests covering known/unknown/fallback/duplicate-token paths; `reference_text.py` at 100% coverage. |
| 3 | Created `frontend/src/test/viewport.ts` with `setViewport`/`resetViewport`/`setMatchMedia` fixture used by all responsive tests. |
| 3 | AppShell mobile nav tests now run at the 768px CSS breakpoint using the viewport fixture, verifying the "Open navigation" button and "Site navigation" dialog at narrow width. |
| 3 | Representative Back-control responsive tests added for SpellBrowserPage and WeaponBrowserPage at the 520px narrow breakpoint. |
| 3 | LoomPage inspector drawer toggle, close, and Escape tests now run at the 520px narrow breakpoint. |
