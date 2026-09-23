# Test / Lint / Format Tooling Parity with ChessMoveTrainer

Source of truth: `G:\ChessMoveTrainer`
(`frontend/package.json`, `pyproject.toml`, `frontend/vitest.config.ts`,
`frontend/eslint.config.js`, `frontend/.prettierrc.json`).

History: 2026-09-23 (part 1) installed the missing tools here (Prettier,
ESLint, Ruff, Vitest 4.1.11). Part 2 aligned **every shared version** to
ChessMoveTrainer's, including pip.

## ChessMoveTrainer versions (the target)

- Node: `>=24.15 <25` (this machine runs 24.19.0 — inside the range).
- Frontend: `react 19.3.0`, `react-dom 19.3.0`, `react-router-dom 7.18.4`,
  `lucide-react 1.47.0`, `vite 8.3.0`, `vitest 4.1.11`, `jsdom 30.1.0`,
  `typescript 6.0.3`, `@vitejs/plugin-react 6.1.1`,
  `@testing-library/jest-dom 7.0.1`, `@testing-library/react 16.3.3`,
  `@testing-library/user-event 14.6.7`,
  `@types/node 24.13.6`, `@types/react 19.3.0`, `@types/react-dom 19.3.0`,
  `playwright 1.63.0`, `prettier 3.9.8`, `eslint 10.11.0`,
  `@eslint/js 10.0.1`, `typescript-eslint 8.70.0`,
  `eslint-plugin-react-hooks 7.1.1`, `eslint-plugin-react-refresh 0.5.7`,
  Storybook `10.6.0` family.
- Python: `>=3.12,<3.13` (this repo's `.venv` runs 3.12.7 — inside the range).
  `fastapi 0.141.1`, `uvicorn[standard] 0.53.0`, `pydantic 2.13.5`,
  `httpx 0.28.1`, `pytest 9.1.1`, `ruff 0.16.8`.
- Ruff config: `line-length = 100`, `target-version = "py312"`, lint `E, F, I`.
- Prettier config: `semi: true`, `singleQuote: false`, `trailingComma: "all"`,
  `printWidth: 100`.

## What this repo now runs (all matching)

System tooling: **pip 24.2 -> 26.2.1** in `.venv`.

Backend (`backend/requirements.txt`):

- `fastapi==0.141.1` (was 0.104.1), `uvicorn[standard]==0.53.0` (was 0.24.0),
  `pydantic==2.13.5` (was 2.5.0), `httpx==0.28.1` (was 0.25.1),
  `pytest==9.1.1` (was 7.4.3), `pytest-cov==7.0.0` (was 7.1.0),
  `ruff==0.16.8` (new).
- Removed: `pytest-asyncio` (no test in the repo uses asyncio; Chess does not
  have it) and `python-multipart` (nothing imports it; Chess does not have it).
- `pytest-cov` is kept (Chess has no coverage gate, but `pyproject.toml` here
  enforces `--cov-fail-under=97`, which needs the plugin).
- Root `pyproject.toml` holds the `[tool.ruff]` settings copied from Chess and
  the pytest discovery/options in `[tool.pytest.ini_options]`, matching the
  reference project's configuration location while preserving this repo's coverage gate.

Frontend (`frontend/package.json`, exact pins like Chess):

- `react 19.3.0`, `react-dom 19.3.0`, `react-router-dom 7.18.4`,
  `lucide-react 1.47.0`, `vite 8.3.0`, `vitest 4.1.11`
  (with `@vitest/browser`, `@vitest/browser-playwright`,
  `@vitest/coverage-v8` all at 4.1.11), `jsdom 30.1.0`, `typescript 6.0.3`,
  `@vitejs/plugin-react 6.1.1`, testing-library `7.0.1 / 16.3.3 / 14.6.7`,
  `@types/node 24.13.6`, `@types/react 19.3.0`, `@types/react-dom 19.3.0`,
  `playwright 1.63.0` (was `latest`), `prettier 3.9.8`, `eslint 10.11.0`
  family, Storybook `10.6.0` family (already matched).
- New files: `frontend/.prettierrc.json`, `frontend/.prettierignore`,
  `frontend/eslint.config.js` (settings copied from Chess).
- New scripts: `format` (`prettier --write .`), `format:check`
  (`prettier --check .`), `lint:eslint` (`eslint .`). `lint` still means
  `oxlint`; it was not replaced.

Notes: the Vitest-related installs used `--legacy-peer-deps` because this
repo's Storybook addon peer chain pins the older Vitest line and npm's strict
resolver refuses the bump; the resulting tree was checked with `git diff` and
contains only the intended packages. Chess-only app libraries (pandas, numpy,
`chess`, SQLAlchemy, TanStack Query, FullCalendar, and similar) were not
ported — they belong to ChessMoveTrainer's app, not to shared tooling.

## Verification on 2026-09-23 (after the upgrade)

- Frontend `npm run test:check` — **1534 tests, 0 failing, PASS.**
- Frontend `tsc -b` — clean for every tracked file. The only 2 errors are in
  `frontend/src/stories/` (unused `React` imports), which are **untracked
  files from separate in-progress Storybook work**, left untouched.
- Backend `pytest` (full suite with the 97% coverage gate): **604 passed**,
  coverage **97.15% (gate met)**. 25 failures, all proven unrelated to the
  upgrade — each is a `FileNotFoundError` for files deleted from this checkout
  by the "removing useless stuff" commit (`docs/canonical/*.md`,
  `.opencode/agents/scout-case-test.md`, and similar). No router, app,
  persistence, migration, or integration test fails.
- Removed outright (2026-09-23, on request): the whole process-checker family.
  Deleted scripts: `scripts/check_docs.py`, `scripts/check_orders.py`,
  `scripts/stage_check.py`, `scripts/order_check.py`, `scripts/new_order.py`
  (the last one imported `check_orders.py` at module load, so it could not
  survive it). Deleted tests: `test_docs_contract.py`, `test_check_orders.py`,
  `test_check_wrappers.py`, `test_new_order.py`, the three
  `test_coordinator_test_*_contract.py` files,
  `test_experimental_order_authoring_contract.py`, and
  `test_work_order_packet_contract.py` — every test in those files was already
  failing with `FileNotFoundError` for workflow files deleted from this
  checkout. Removed the `pytest_sessionstart` docs-refresh gate from
  `backend/tests/conftest.py` and the 3 dead skill-contract tests from
  `test_browser_validation.py` (the live browser-runner tests in that file
  stay, as does `src/tools/browser_validation.py` itself). The ignored
  `.stage-check/` log litter went too. All deleted files were committed, so
  `git checkout` restores any of them.
- `prettier --check`, `eslint`, and `ruff check` all run at the new versions.
  No bulk reformat or auto-fix was executed, so no existing file was touched
  by the new tools.
