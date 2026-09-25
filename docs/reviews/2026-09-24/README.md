# Repository review — 2026-09-24

**Review date:** 2026-09-24  
**Scope:** Application structure, data flows, maintenance tools, tests, and cleanup candidates. This is a bounded review, not a complete runtime, security, data, or dead-code audit.

## Summary

The application is a React/Vite client backed by FastAPI and SQLite. Frontend features primarily own request state in local hooks; backend routers execute SQL through shared database helpers. The persistent SQLite database is the runtime source of truth. Seed files, exports, and migrations are maintenance paths, not operations performed by normal service startup.

Database reset/import safety is the highest-priority follow-up. Pagination and nested player-spell projections need behavioral verification; the full-test guide has confirmed documentation drift. No unused maintenance script was established. The recorded test runs passed, but they do not resolve these risks or establish deployment safety.

## Reading guide

| Document | Purpose |
| --- | --- |
| **This overview** | Repository layout, service and command entrypoints, evidence definitions, and review boundaries. |
| [Frontend data flow](frontend-data-flow.md) | Routes, component/state ownership, API client, request-to-render examples, and frontend code candidates. |
| [Backend and data](backend-and-data.md) | API-to-SQLite lifecycle, schema, seed authoring/export/import, reset risks, provenance, and cross-layer contracts. |
| [Test baseline](test-baseline.md) | Historical environment, test inventory, exact finite commands, results, and reproduction limits. |
| [Findings and next actions](findings-and-next-actions.md) | One prioritized follow-up list, documentation evidence, required decisions, and script-preservation boundaries. |

Detailed technical evidence lives in the relevant application document. The findings list links to it rather than maintaining a second copy. The test baseline remains a separate record of what actually ran.

## How to read the findings

- **Verified:** a cited source, result, or configuration directly establishes the fact. Source evidence alone does not establish a runtime or user-visible defect.
- **Inferred:** an interpretation supported by cited structure or a bounded search, rather than a demonstrated result.
- **Risk:** a plausible failure or harm supported by static evidence but not demonstrated in the deployed environment or against live data.
- **Unknown:** a fact the review did not establish. Do not fill the gap with an assumption.

Confidence describes evidence strength, not potential severity. Findings and source line references describe the **2026-09-24 snapshot**; this editorial consolidation does not revalidate the application or refresh the baseline. Source lines may move, so use the named file and symbol to locate evidence.

The source reviews did not inspect live SQLite data, seed/corpus contents, credentials, dependency directories, generated builds, or user-owned `scratch/`. Data filenames were inventoried, but their contents and Git tracking were not audited. Test results are historical observations, not tests run for this consolidation.

## Repository layout

| Area | Role and useful entrypoints |
| --- | --- |
| `backend/` | Python API, database setup, migrations, and backend tests. See the [backend README](../../../backend/README.md#backend). |
| `frontend/` | React/Vite client, Storybook, frontend tools, and package scripts. See the [frontend README](../../../frontend/README.md#frontend) and [package manifest](../../../frontend/package.json). |
| `src/tools/` | Repository-wide Python tools, not a root `scripts/` directory. The [source README](../../../src/README.md#python-source) and [tools README](../../../src/tools/README.md#repository-tools) document module invocation and tool categories. |
| `tests/` | Repository-level Playwright E2E tests; the frontend `test:e2e` script points to `tests/e2e/playwright.config.ts`. Backend tests live separately under `backend/tests/`. See the [tests README](../../../tests/README.md#tests). |
| `data/` | Seed and generated-schema areas used by maintenance tools; see the [tools README](../../../src/tools/README.md#repository-tools) and `.gitignore:44-58`. |
| `docs/`, `.opencode/` | Operational guides, review/workflow records, and Coordinator assets. `AGENTS.md:46-70` distinguishes God and Coordinator modes. Completed Plans, grilling records, and master plans are history, not cleanup targets. |
| `scratch/`, `experiments/` | `scratch/` is user-owned. Early mock-ups and prototypes belong in `experiments/` ([workspace rules](../../../AGENTS.md#workspaces)). |

## Service lifecycle and operational entrypoints

The supported persistent development-service path is root [`dev.ps1`](../../../dev.ps1), which wraps [`compose.yaml`](../../../compose.yaml). Actions are `start`, `stop`, `restart`, `rebuild`, `status`, and `logs`; targets are `all`, `backend`, `frontend`, `storybook`, and `datasette` (`dev.ps1:1-8,54-73`). Compose provides API port `8000`, frontend `5173`, Storybook `6007`, and Datasette `8667` (`compose.yaml:3-92`). Local Compose binds services to loopback; this does not establish another deployment's exposure.

The [root quick start](../../../README.md#quick-start) and [development-services guide](../../DEVELOPMENT_SERVICES.md#first-start-and-everyday-commands) document PowerShell usage. `start` checks for an existing database and does not initialize it (`README.md:15-19`; `dev.ps1:36-41,54-60`). Do not remove the live volume or use `docker compose down -v`: initialization drops tables and force-seeding deletes rows. See [reset-path evidence](backend-and-data.md#destructive-and-incomplete-reset-paths).

**Storybook ports are launch-context-specific:** Compose uses `6007`, while the local frontend script and Playwright profile use `6006` (`compose.yaml:52-68`; `frontend/package.json:24`; `tests/e2e/playwright.config.ts:55-60`). This is not a confirmed port defect. E2E has its own short-lived server configuration; it is not the persistent development-service path.

## Commands and maintenance tools

- **Python setup and checks:** root `requirements.txt` includes `backend/requirements.txt`; `pyproject.toml` configures Ruff and pytest. The [root README](../../../README.md#python-dependency-audit) documents a manual `pip-audit` check.
- **Full local process:** `src/tools/full_test_process.py` is a manually invoked, fail-fast, resumable test/build/quality runner. Its 18 checks cover Compose/dependencies, Python/frontend checks, service health, a real-backend API test, builds, Storybook, and E2E (`:64-86`). It is not focused feature proof. Its invocation is documented in the [tools README](../../../src/tools/README.md#repository-tools); the separate full-test guide has [confirmed drift](findings-and-next-actions.md#full-test-guide-drift).
- **Data maintenance:** `src/tools/` contains schema-manifest/export tools, quick-rules generators, and legacy-data converters. The source README demonstrates `generate_export_schema --check`; [backend and data](backend-and-data.md#data-tooling-pipeline) explains what these operations do and their safety limits. Database setup and one-time migrations live under `backend/database/` and `backend/migrations/`.
- **Frontend command catalog:** `frontend/package.json:9-25` defines development/build commands `dev`, `preview`, `build`, `storybook`, and `build-storybook`; checks `lint`, `lint:eslint`, `format:check`, `typecheck`, `test`, `test:api`, `test:storybook`, `test:e2e`, and `test:check`; and file-writing commands `format` and `generate:api`.
- **E2E install boundary:** the root manifest has no scripts but declares `@playwright/test` and `@axe-core/playwright`; the frontend manifest supplies the invocation pointing to the root-level config. Existing-checkout resolution passed, but the fresh-install sequence remains [unverified](findings-and-next-actions.md#e2e-install-ownership).

The README describes `pip-audit` as local maintenance, not automatic CI (`README.md:33-45`). No `.github/workflows/` files surfaced in the review. This does not rule out automation elsewhere or imply that CI should be added.

## Recorded test snapshot

| Surface | Recorded result | Single-run Bash wall time |
| --- | ---: | ---: |
| Backend pytest | 333 passed | 67.389 s |
| Frontend default Vitest projects | 1,701 passed | 175.833 s |
| Dedicated API-client suite | 15 passed | 6.738 s |
| Playwright E2E | 7 passed | 24.814 s |

These are overlapping per-entrypoint counts and **single-sample times, not a stable benchmark**. The [test baseline](test-baseline.md#measured-finite-run) retains exact commands, versions, coverage, runner-reported durations, and prerequisites.

## Boundaries and use

This collection recommends follow-up; it does not authorize application changes, database operations, exports, migrations, dependency changes, service startup, or code/script deletion. Settle material behavior, data, security, provenance, and ownership questions with the user or responsible owner. Preserve campaign data, manual tools, and historical workflow records. Sparse references or absent app imports do not establish that a tool is unused.
