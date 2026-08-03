# Map Lab test suite refactor — smaller, behavior-oriented test files

> **Status:** Complete — the Map Lab frontend test tree is split into focused behavior-oriented suites and the retired reducer previews are removed.

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
| 4 | Split the reducer tests into six focused suites, removed the retired H0/H4 previews and monolithic reducer file, and refreshed stale suite labels/references without changing assertions or product behavior. The Map Lab suite passed with 597 tests, plus typecheck and lint. |

## Touches
- `frontend/src/features/dungeons/maplab/__tests__/*`
- `docs/TESTING.md`
