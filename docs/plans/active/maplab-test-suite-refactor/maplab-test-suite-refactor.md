# Map Lab test suite refactor — smaller, behavior-oriented test files

> **Status:** Stage 3 shipped — MapLab editor-page and model tests are split into focused suites with duplicate and placeholder coverage removed; ready for the final suite review.

- **Areas:** dungeons
- **Read trigger:** Splitting or reorganizing oversized Map Lab frontend tests without changing product behavior or reducing regression coverage.

## What we're building & why

The Map Lab frontend tests have grown as a chronological record of shipped stages rather than as a
navigable test suite. Several files now exceed 1,000 lines, and the two page tests exceed 2,000 lines,
which makes targeted AI maintenance, failure triage, and focused review unnecessarily expensive.

We will reorganize the existing tests into small behavior-oriented files, extract only genuinely shared
fixtures/render helpers, and preserve the current assertions and test coverage. This is a test-structure
change, not a product or test-contract change: no behavior is redesigned, no coverage is intentionally
removed, and obsolete tests are removed only when their underlying product path has already been deleted.

## Stages

1. Establish the post-Map-Obstacle-State test baseline and define the final file map, separating current behavior from retired knowledge/preview coverage.
2. Split `MapLabPage.test.tsx` into focused rendering, inspector, session, navigation, and layout-control suites while preserving its harness behavior.
3. Split `MapLabEditorPage.test.tsx` and `maplabModel.test.ts` by editor interaction and model responsibility, keeping fixtures close to their consumers.
4. Review `maplabEditor.test.ts` and the resulting Map Lab suite for duplicated setup, stale stage labels, discoverability, and coverage parity; update only the minimum testing documentation or generated inventory required by the resulting tree.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Recorded a clean Map Lab directory baseline (604 tests, 0 failures) and a four-suite baseline (392 tests, 0 failures). Defined the behavior-oriented destination files and identified two skipped reducer previews plus two no-op responsive placeholders as retired coverage that must not be carried into the split. |
| 2 | Split the monolithic MapLabPage suite into rendering, inspector, session, navigation, and layout-control files, preserving all current assertions and restoring six viewer tests initially omitted during extraction. The full stage gates passed: 1,472 frontend tests, backend coverage at 97.22%, lint, build, and documentation checks. |
| 3 | Split the editor page into eight focused suites and the model tests into five pure/unit suites, preserving current behavior while removing duplicated shell coverage and two no-op responsive placeholders. Full frontend, backend, lint, build, and typecheck gates passed. |

## Touches
- `frontend/src/features/dungeons/maplab/__tests__/maplabEditor.test.ts`
- `frontend/src/features/dungeons/maplab/__tests__/*`
- `docs/TESTING.md`

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx` (1,909 lines), `MapLabEditorPage.test.tsx` (2,434 lines), `maplabModel.test.ts` (1,115 lines), and `maplabEditor.test.ts` (992 lines). The four suites contain 386 declared test calls (the model suite expands two `it.each` calls), and the directory contains 20 files.
- **Verified tests:** `docs/TESTING.md` establishes Vitest and `npm run test:check -- <path>` from `frontend/`. On 2026-08-03, `npm run test:check -- src/features/dungeons/maplab/__tests__` passed with 604 tests and 0 failures; the four central suites together passed with 392 tests and 0 failures. The generated inventory's 574-case figure and the old handoff's 602-case figure are stale relative to this run.
- **Settled contracts:** The refactor must preserve current test behavior and regression coverage; extracted files remain colocated under the existing Map Lab `__tests__` directory; shared helpers are allowed only where they reduce repeated harness setup without hiding behavior-specific fixtures. The final map is:
  - `MapLabPage.rendering.test.tsx`, `.inspector.test.tsx`, `.session.test.tsx`, `.navigation.test.tsx`, and `.layout-controls.test.tsx` for viewer/session rendering, inspection, session state, navigation, and shell/layout controls respectively.
  - `MapLabEditorPage.shell.test.tsx`, `.canvas.test.tsx`, `.chrome.test.tsx`, `.props.test.tsx`, `.ghost-floor.test.tsx`, `.stairs-portals.test.tsx`, `.marker-layout.test.tsx`, and `.terrain-controls.test.tsx` for editor loading/autosave, canvas gestures/room authoring, navigation and tool chrome, props/encounters, ghost floors, stairs/portals, markers, and padding/density/layer/keyboard controls.
  - `maplabModel.geometry.test.ts`, `.presentation.test.ts`, `.session.test.ts`, `.markers.test.ts`, and `.persistence.test.ts` for geometry, inspector descriptors/tokens, effective session state, marker placement/NPC derivation, and normalization/round-trips/counters.
  - `maplabEditor.history.test.ts`, `.rooms.test.ts`, `.passages.test.ts`, `.objects.test.ts`, `.stairs-portals.test.ts`, and `.counters.test.ts` for reducer history, room/cell painting, doors, props, stairs/portals, and monotonic IDs.
- **Retired/preview coverage:** Do not extract the two `it.skip` reducer previews (`H0` stair/portal stubs and `H4` portal visual review) or the two `expect(true).toBe(true)` VT0 responsive placeholders in `MapLabEditorPage.test.tsx`; remove them during the owning split/review rather than presenting them as regression coverage. The MapLabPage assertion that retired prototype copy is absent remains current behavior and is retained.
- **Constraints:** Preserve the shipped Map Obstacle State contracts; preserve unrelated worktree changes; do not use browser automation; update generated testing inventory only through the repository checker when the file tree changes.
- **Open questions:** Stage 2 resolved its section boundaries and copied the shared page harness into each focused suite; Stage 3 resolved its editor/model partitions, kept pure model tests separate from DOM tests, and removed duplicate/placeholder coverage. Stage 4 should review the resulting tree for stale labels, duplicated setup, and discoverability.

### Stage 4
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/*` — existing colocated suites already demonstrate the repository convention of one focused component, hook, or model concern per test file.
- **Verified tests:** `docs/TESTING.md` generated test-location inventory and the frontend test-check command; full frontend checks include tests, lint, typecheck/build as applicable to the stage.
- **Settled contracts:** The final suite should be easier to target by filename and describe behavior in current vocabulary rather than historical implementation phases; no production behavior changes are part of this Plan.
- **Constraints:** Run the documentation checker after any documentation-impacting change; preserve and report unrelated dirty paths; reconcile only after targeted and full checks are green.
- **Open questions:** Whether `docs/TESTING.md` needs regeneration is determined by the checker after the final file layout is in place.
