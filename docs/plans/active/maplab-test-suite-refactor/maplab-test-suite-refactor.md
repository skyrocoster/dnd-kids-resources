# Map Lab test suite refactor — smaller, behavior-oriented test files

> **Status:** Planned — ready to begin against the shipped Map Obstacle State contracts.

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

## Touches
- `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/maplabModel.test.ts`
- `frontend/src/features/dungeons/maplab/__tests__/maplabEditor.test.ts`
- `frontend/src/features/dungeons/maplab/__tests__/*`
- `docs/TESTING.md`

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`, `MapLabEditorPage.test.tsx`, `maplabModel.test.ts`, and `maplabEditor.test.ts` — the four oversized or central Map Lab suites currently contain chronological `describe` sections and shared setup; their current sizes are approximately 2,206, 2,434, 1,281, and 992 lines respectively.
- **Verified tests:** `docs/TESTING.md` — frontend tests run through Vitest; the Map Lab directory is currently inventoried as 20 files and 602 test cases, and targeted checks use `npm run test:check -- <path>` from `frontend/`.
- **Settled contracts:** The refactor must preserve test behavior and coverage; extracted files remain colocated under the existing Map Lab `__tests__` directory; shared helpers are allowed only where they reduce repeated harness setup without hiding behavior-specific fixtures.
- **Constraints:** Preserve the shipped Map Obstacle State contracts; preserve unrelated worktree changes; do not use browser automation; update generated testing inventory only through the repository checker when the file tree changes.
- **Open questions:** Confirm the final behavior-to-file partition and identify any retired knowledge/preview sections against the shipped obstacle-state contract; record the pre-refactor targeted test result before moving tests.

### Stage 2
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx` — shared `renderMapLabPage`, `renderLoadedMapLabPage`, `flush`, route data fixture, and Vitest API setup are currently defined at the top of the file; the file contains distinct rendering, inspector, session, navigation, toolbar, density, and layer-control sections.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx` — all extracted files must continue to pass individually and through the Map Lab directory check.
- **Settled contracts:** Page tests should be grouped by observable behavior and surface responsibility, not by historical stage number; test names and assertions should remain stable where the covered behavior remains current.
- **Constraints:** Keep route/API mocking semantics equivalent; do not turn the helper into a universal fixture that obscures per-suite setup; remove tests for retired behavior only when the owning implementation has already removed that behavior.
- **Open questions:** Exact file names and section boundaries are resolved during `to-orders` from the post-dependency source state.

### Stage 3
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx` — the suite contains editor shell, zoom/pan, toolbar, layer, prop, ghost-floor, stair, portal, marker-layout, padding, density, and keyboard/tablet sections; `maplabModel.test.ts` contains geometry, presentation, inspector, session-state, marker-layout, NPC-marker, and token sections.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx` and `maplabModel.test.ts` — each extracted suite must run directly with the frontend test-check command.
- **Settled contracts:** Model tests remain pure/unit-focused; editor-page tests retain DOM interaction coverage; fixtures should be moved or shared without changing the public production modules.
- **Constraints:** Avoid changing production exports solely to make tests easier to split; preserve import boundaries and test setup; do not combine unrelated model and page behaviors into a new shared helper.
- **Open questions:** Exact partitions and whether any fixture belongs in a dedicated test-data module are resolved after the Stage 1 baseline.

### Stage 4
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/*` — existing colocated suites already demonstrate the repository convention of one focused component, hook, or model concern per test file.
- **Verified tests:** `docs/TESTING.md` generated test-location inventory and the frontend test-check command; full frontend checks include tests, lint, typecheck/build as applicable to the stage.
- **Settled contracts:** The final suite should be easier to target by filename and describe behavior in current vocabulary rather than historical implementation phases; no production behavior changes are part of this Plan.
- **Constraints:** Run the documentation checker after any documentation-impacting change; preserve and report unrelated dirty paths; reconcile only after targeted and full checks are green.
- **Open questions:** Whether `docs/TESTING.md` needs regeneration is determined by the checker after the final file layout is in place.
