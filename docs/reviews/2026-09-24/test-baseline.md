# Test baseline

**Review date:** 2026-09-24  
**Scope:** Automated test entrypoints, coverage areas, prerequisites, and one finite sequential run per selected surface. Lint, formatting, type-checking, builds, dependency audits, and the aggregate runner were excluded.

## Summary

The recorded runs passed: **333 backend**, **1,701 frontend**, **15 API-client**, and **7 E2E** tests. These are per-entrypoint counts, not a unique-test total: the API suite overlaps the default frontend suite, and Storybook is already part of the default Vitest configuration.

The commands, environment, and results below are historical evidence. They were not rerun for the editorial consolidation and are not a stable performance benchmark. A suite pass also does not settle every source-level risk in the [backend and data review](backend-and-data.md). See the [overview](README.md#how-to-read-the-findings) for shared evidence definitions.

## Test entrypoints

| Surface | Entry point and configuration | Coverage |
| --- | --- | --- |
| Backend | From the repository root: `.venv/Scripts/python.exe -m pytest`. Discovery is `backend/tests/`; pytest's configured options include quiet output, strict markers/config, coverage for `backend/app`, and a 97% coverage minimum (`pyproject.toml`). | 27 test modules. The suite includes app boot and error contracts, database helpers and cache behavior, schema/persistence/seeding, reference text and parsing, migrations, and router/API behavior. `backend/tests/test_integration_real_data.py` is marked `integration` but remains in the default run. Its fixture builds a temporary database from the frozen seeds and checks read-only real-data serialization, including collection rows and details. |
| Frontend default Vitest suite | From `frontend/`: `npm run test:check` applies the known-failure comparison to the default `vitest run` suite. `npm test` is the direct Vitest entrypoint. `frontend/vitest.config.ts` defines a jsdom `unit` project and a headless Chromium `storybook` project; both are in the default config. The unit project uses up to six workers and excludes only `src/api/__tests__/healthClient.test.ts`. | 153 source test files matching the configured `*.test.ts`, `*.test.tsx`, and `*.test.mjs` patterns. Tests span feature models/forms/pages, shared components, routing, and client-side state. The Storybook project supplies browser-based story tests. |
| Dedicated API-client suite | From `frontend/`: `npm run test:api`. `frontend/vitest.api.config.ts` selects `src/api/**/*.test.ts` in the Node environment. | Five API test files cover the generated-client facade, query invalidation, static contract checks, and `healthClient.test.ts`, which creates a temporary database and starts a bounded Uvicorn process for a real API call. This entrypoint overlaps some client tests in the default Vitest suite. |
| Isolated Storybook suite | From `frontend/`: `npm run test:storybook`. | Runs only the Storybook Vitest project in headless Chromium. It is already included in the default Vitest project configuration, so it was not run separately for this baseline. |
| Browser E2E suite | From `frontend/`: `npm run test:e2e`. Playwright uses `tests/e2e/playwright.config.ts`. | Four specs exercise field-guide navigation, a live backend health request, weapon search/detail and CRUD/validation flows, and one Storybook accessibility check. The config uses two workers and a 15-second test timeout; its web-server configuration can reuse services already listening on ports 8000, 5173, or 6006. |
| Known-failure checker | From `frontend/`: `npm run test:check` (optionally `-- --strict` when reconciling stale known failures). | Runs the default Vitest projects and compares failures with `frontend/known-test-failures.json`. The checked-in list documents one flaky test; this run reported no failures, known or new. This checker is a result policy around Vitest, not another distinct test suite. |

The backend test modules are:

- Root: `test_app_boot.py`, `test_b1_persistence.py`, `test_caching.py`, `test_db_helpers.py`,
  `test_integration_real_data.py`, `test_migrate_loom_v2.py`, `test_migrate_map_obstacle_state.py`,
  `test_migrate_monsters.py`, `test_migrate_spells.py`, `test_parse_helpers.py`, and `test_reference_text.py`.
- Routers: `test_at_the_table.py`, `test_crud_completeness.py`, `test_fog.py`, `test_items.py`,
  `test_layouts.py`, `test_loom.py`, `test_loot.py`, `test_monsters.py`, `test_players.py`,
  `test_reference.py`, `test_resources.py`, `test_session_state.py`, `test_spells.py`,
  `test_spells_target_api.py`, `test_spells_target_contract.py`, and `test_weapons.py`.

## Dependencies and preconditions

- Python test runtime: Python 3.12.7; pytest 9.1.1, pytest-cov 7.0.0, FastAPI 0.141.1, httpx 0.28.1, and
  Uvicorn were importable from `.venv`. `pyproject.toml` requires Python `>=3.12,<3.13`.
- Frontend runtime: Node v24.19.0 and npm 11.17.0. Vitest and its Storybook/browser plugins were resolvable
  from `frontend/`.
- E2E dependencies are split across manifests: root `package.json` declares `@playwright/test` 1.63.0 and
  `@axe-core/playwright` 4.13.0; `frontend/package.json` declares Playwright 1.63.0. These E2E imports resolved
  in this checkout. Chromium was present at the path reported by Playwright; no browser or dependency install
  was performed.
- The required `data/seeds/*.json` files were present. Backend fixtures create their own temporary SQLite
  databases; the API-client test uses a temporary database and a free ephemeral port.
- Before frontend/E2E execution, ports 47111, 8000, 5173, and 6006 were checked and had no listening sockets.
  They were checked again after E2E and remained free. E2E started its own short-lived backend; no existing
  service was stopped or replaced.
- The frontend package includes `@vitest/coverage-v8`, but the inspected Vitest config and scripts do not
  configure a frontend coverage report or threshold. The 97% threshold applies to the backend `backend/app`
  coverage target only.

## Measured finite run

Commands were run sequentially, once per surface, with the command-level timeout shown and a larger finite Bash
tool timeout for each invocation. Elapsed times below are the Bash `time` wall-clock result; Vitest/pytest report
durations are noted separately when available. These are single-run observations, not repeated samples or a
stable performance benchmark.

| Surface | Exact command (working directory) | Command timeout | Bash tool timeout | Result and elapsed time |
| --- | --- | ---: | ---: | --- |
| Backend pytest | `time timeout --kill-after=10s 900s .venv/Scripts/python.exe -m pytest` (repository root) | 900s + 10s kill grace | 915000 ms | **PASS** — 333 passed; pytest reported 65.51s, Bash wall time 67.389s. Coverage: 97.20% (2,711 statements; 76 missed), above the 97% minimum. |
| Frontend default projects and known-failure comparison | `time timeout --kill-after=10s 1800s npm run test:check` (`frontend/`) | 1800s + 10s kill grace | 1815000 ms | **PASS** — 1,701 tests, 0 failing, 0 known failures; Bash wall time 175.833s. |
| Dedicated API-client suite | `time timeout --kill-after=10s 300s npm run test:api -- --bail 1` (`frontend/`) | 300s + 10s kill grace | 315000 ms | **PASS** — 5 files and 15 tests passed; Vitest duration 4.95s, Bash wall time 6.738s. |
| Playwright E2E | `time timeout --kill-after=10s 1800s npm run test:e2e -- --max-failures 1` (`frontend/`) | 1800s + 10s kill grace | 1815000 ms | **PASS** — 7 tests passed; Playwright reported 22.4s, Bash wall time 24.814s. |

The host was Windows (`win32`). Test versions and runtime versions are listed above. Runs were sequential, not
parallel; no server was running on the checked ports before the browser suites. No test command timed out.

## Reproduction and interpretation

Run the table's exact commands from their stated working directories in Git Bash, preserving each finite command
timeout and Bash tool timeout. Run surfaces sequentially to avoid CPU contention and port reuse. Keep the same
locked dependencies, seed data, runtime versions, and timeout values; record each wall time and runner-reported
duration separately. Do not clear caches or install dependencies as part of a comparison. A later repeated
benchmark should report every sample and an aggregate such as the median rather than treating this single run as
a stable performance claim.

## Scope limits

No isolated Storybook run was needed because the default Vitest run included that project. No aggregate full-test run was performed: it includes checks outside this baseline's test-only scope. The [documentation finding](findings-and-next-actions.md#full-test-guide-drift) records the guide's stale runner and inventory claims; neither that guide nor the runner was changed here.

Dependency resolution was demonstrated only in the existing checkout, not through a fresh install. The recorded backend coverage threshold does not apply to the frontend. Future measurements should answer a specific question and use the bounded approach in [findings and next actions](findings-and-next-actions.md#5-measure-performance-only-for-a-defined-decision), rather than treating these single-run times as targets.
