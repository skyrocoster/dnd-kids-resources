# Testing & regression rules

This is the contract for "does the code pass." Read it before adding a feature or
reviewing a change. The next build stage is expected to keep every rule green.

## TL;DR — the two commands

```bash
# Backend (run from the REPO ROOT, not backend/; prefer the repo-local venv)
.venv\Scripts\python.exe -m pytest

# Frontend (run from frontend/)
cd frontend && npm run test
```

A change **passes** only when both are green. `pytest` also enforces a coverage
gate (see below), so "green" means tests pass *and* coverage holds.

On POSIX shells, replace `.venv\Scripts\python.exe` with `.venv/bin/python`. Prefer the repo-local virtualenv for Python-backed checks in this repo, including `pytest` and `scripts/check_docs.py`, so the commands run with the backend dependencies the project actually expects.

## Backend

### How it's wired
- Config lives in `pytest.ini` at the repo root. Running `pytest` via the repo-local
  virtualenv (`.venv\Scripts\python.exe -m pytest` on Windows, `.venv/bin/python -m pytest`
  on POSIX) runs the whole backend suite with coverage.
- Pytest refreshes generated documentation first by running
  `scripts/check_docs.py --write-generated`; a failed refresh stops the suite before test
  collection. This keeps the standard test run from merely reporting generated-doc drift.
- **Run from the repo root.** `backend/tests/conftest.py` imports the app as the
  absolute package `backend.app.*`; running from `backend/` breaks the import.
- Test DBs are built from the **real** `scripts/init_database.py` schema — never a
  hand-copied one. This is deliberate: two hand-written schema copies previously
  drifted from production and hid live 500s (see "Why this exists" below).

### Two test layers
| Layer | Fixture | Data | Scope | Use for |
|-------|---------|------|-------|---------|
| **Unit** | `test_client` | Real schema + a few curated, JSON-rich rows | function (fresh, mutable) | CRUD, validation, error branches |
| **Integration** | `real_client` | Real schema + the full frozen `data/seeds/*.json` | session (shared, **read-only**) | proving real data serializes |

The unit layer is fast and safe to mutate. The integration layer
(`backend/tests/test_integration_real_data.py`, marked `@pytest.mark.integration`)
is the regression backbone: it pages through every browsable collection and hits
every seeded player's nested endpoints, asserting **no configured GET endpoint may
500 against real data, and every row must serialize.**

### The pass rules (what "passing" means)
1. **All tests green.** No skips masking failures.
2. **Coverage ≥ 97%** overall (`--cov-fail-under=97` in `pytest.ini`). Current
   baseline is ~97%. The gate sits under actual so it ratchets against
   backsliding without failing on a single legitimately-added defensive branch.
   New feature code should land at **>80% on its own lines** (per `AGENTS.md`) and
   not drag the total below 90.

   The remaining uncovered ~3% is in two places: the `except → rollback → raise 400`
   DB-error branches in `loom.py` (the largest remaining cluster), and the SPA
   fallback `if`-branch in `main.py:67-70` (requires a built `frontend/dist` at
   import time, covered by live/e2e checks). All router CRUD error branches, parser
   guards, `schemas.py` edge cases, and the `db.py` path-fallback resolver are now
   covered. Don't contort tests to hit the remaining gaps — if you ever want the gate
   higher, mark them `# pragma: no cover` rather than writing hollow tests.
3. **Every new endpoint gets both** a unit test (happy path + 404/400 branch) and,
   if it returns seeded data, coverage by the integration sweep (usually automatic —
   just add its path to the relevant list in `test_integration_real_data.py`).
4. **Any router that reads a JSON-encoded column** must be exercised against real
   data, not just curated rows. Thin curated data is how the players 500 slipped
   through — the curated `Firebolt Test` spell now populates every JSON column to
   guard the fast path too.

### Handy invocations
```bash
.venv\Scripts\python.exe -m pytest                                             # full gate (tests + coverage)
.venv\Scripts\python.exe -m pytest backend/tests/routers/test_spells.py --no-cov  # one file, skip the gate
.venv\Scripts\python.exe -m pytest -m integration --no-cov                     # only the real-data sweep
.venv\Scripts\python.exe -m pytest -m "not integration"                        # skip the slower real-data build
.venv\Scripts\python.exe scripts/stage_check.py --timeout 900                  # full gate, kill checks over 15 minutes
```

`stage_check.py` runs the independent gates concurrently, keeps successful output out of the
console, and stores full logs under `.stage-check/` only for investigation. Each check has a hard
15-minute default timeout (`--timeout` changes it); timed-out checks are failed and their isolated
process trees are terminated, including npm/Vitest descendants on Windows.

## Frontend
- `cd frontend && npm run test` → vitest run. Test totals are intentionally not recorded here; run the command for the current count.
- `cd frontend && npm run lint` → oxlint. Run it with `npm run typecheck` and `npm run build` before shipping frontend changes.
- Component tests mock `api/client`, so they verify UI wiring, not backend
  serialization — that's the backend integration layer's job. Keep the two honest
  about their boundary: don't rely on frontend tests to catch API-shape drift.
- Player app tests live under `frontend/src/player/__tests__/` and cover the curtain transform and
  its effective-state/field-removal contract, the `player/` import boundary, the live map data seam,
  the player-owned renderer, and shell/map route states. Router tests in `frontend/src/__tests__/router.test.tsx` assert `/play` and `/play/map`
  remain outside `AppShell`.
- `npm run build` (`tsc -b && vite build`) must also succeed before shipping — it
  type-checks the whole app. Use `npm run typecheck` (`tsc -b`) for a fast type-only
  check without the Vite build step.
- `frontend/src/test/setup.ts` provides shared jsdom geometry shims (`ResizeObserver`,
  `DOMMatrixReadOnly`, and element `offsetWidth`/`offsetHeight`) for components that observe or measure layout.
  Loom grid tests cover session columns, cell states, and page wiring in jsdom; layout interactions and
  drag-style interactions belong in focused unit helpers plus the live browser gate for their owning stages.

- **Do not use `tsc --noEmit` as a gate.** The root `frontend/tsconfig.json` has
  `"files": []` (it only exists to reference the app/node sub-projects), so
  `tsc --noEmit` silently checks *nothing* and reports success even with real type
  errors in the tree — a false green that hid ~40 errors during the Phase E recovery
   (see `plans/done/phase-e-recovery-plan/phase-e-recovery-plan.md`). `tsc -b` (`npm run typecheck` /
  `npm run build`) is the only real check — it builds the referenced sub-projects.

## Known failures: `npm run test:check`
Some tests fail on `main` and are carried deliberately. They live in
`frontend/known-test-failures.json`, one entry per test with a reason and a date, and
`npm run test:check` judges a run against that list: it exits 0 when every failure is
already known and 1 the moment a **new** one appears.

- `npm run test:check -- <path>` — the shape a work order's STOP WHEN uses. The executor
  gets a clean verdict with no list of pre-existing failures to reason about.
- `npm run test:check -- --strict` — also fails when a listed test now *passes*, so the
  stage that fixed it prunes the entry. `reconcile` runs this once per stage.

**A path argument is a filter matched relative to `frontend/`**, so pass
`src/player/__tests__/x.test.tsx`, never the repo-relative `frontend/src/player/...`. A filter
that matches nothing now **fails** rather than reporting a pass over an empty run: until
2026-07-27 the repo-relative form printed `0 tests` and `PASS`, which is a false green of the
same family as `tsc --noEmit` above, and one a work order's STOP WHEN would have accepted. The
script also fails a non-zero vitest exit that no failing test explains — a config error or an
unhandled rejection is not a green run either.

Before this existed, every work order carried the failures verbatim in a KNOWN TEST
FAILURES block and every reconcile compared them by hand, name for name — a step easy to
skip, easy to get wrong, and silently stale as tests were fixed. Add an entry only with a
reason; remove one the moment it passes.

## Why this exists (the failure this prevents)
Every 500 this project has shipped was the same shape: a router's response model or
JSON parsing didn't match the *real* data, but the test DB's hand-written schema and
thin seed rows were too simplified to trigger it — so it passed CI and broke live
(`/api/monsters`, `/api/encounters`, `/api/players/{id}/spells`). Building test DBs
from the real schema + real seeds closes that gap. **If you find yourself editing a
CREATE TABLE statement inside `conftest.py`, stop** — the schema comes from
`scripts/init_database.py`, and the fixtures build from it.

## Documentation Contract CI
- GitHub Actions runs `Documentation Contract` for every pull request and every push to `main`.
- The workflow uses Python 3.12, installs `requirements.txt`, runs `python scripts/generate_export_schema.py --check`, then `python scripts/check_docs.py --check`, and on pull requests also runs `python scripts/check_docs.py --check --base <base-sha>`.
- `generate_export_schema.py --check` fails when `data/generated/export_schema.json` no longer matches the `CREATE TABLE` statements in `scripts/init_database.py`. Fix it by running `--write` and committing the result — never by editing the manifest. Use `--check-db` locally to diagnose drift between the schema and your live database.
- Local runs should prefer the repo-local virtualenv instead: `.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX.
- `documentation-contract` must be enabled as a required branch-protection check in GitHub repository settings. The workflow cannot enforce that repository setting itself.
- Use the PR template to record that a fresh reader can route the change from `AGENTS.md` through `docs/README.md` to the owning plan's minimum context.

## Where the tests live

Generated from the test tree — do not hand-edit. The rules above say what a passing run means; this
says only where the files are.

<!-- GENERATED:TESTING:LOCATIONS:START -->
| Location | Files | Test cases |
|---|---|---|
| `backend/tests/` | 16 | 392 |
| `backend/tests/routers/` | 16 | 264 |
| `frontend/src/__tests__/` | 1 | 4 |
| `frontend/src/api/__tests__/` | 1 | 5 |
| `frontend/src/components/__tests__/` | 14 | 152 |
| `frontend/src/components/form/__tests__/` | 4 | 11 |
| `frontend/src/features/dungeons/__tests__/` | 2 | 31 |
| `frontend/src/features/dungeons/maplab/__tests__/` | 24 | 574 |
| `frontend/src/features/encounters/__tests__/` | 9 | 115 |
| `frontend/src/features/items/__tests__/` | 3 | 15 |
| `frontend/src/features/loom/__tests__/` | 9 | 123 |
| `frontend/src/features/loot/__tests__/` | 5 | 22 |
| `frontend/src/features/monsters/__tests__/` | 3 | 35 |
| `frontend/src/features/npcs/__tests__/` | 10 | 85 |
| `frontend/src/features/players/__tests__/` | 8 | 58 |
| `frontend/src/features/spells/__tests__/` | 4 | 34 |
| `frontend/src/features/weapons/__tests__/` | 3 | 25 |
| `frontend/src/layout/__tests__/` | 1 | 12 |
| `frontend/src/map/__tests__/` | 3 | 44 |
| `frontend/src/pages/__tests__/` | 2 | 5 |
| `frontend/src/player/__tests__/` | 6 | 73 |
<!-- GENERATED:TESTING:LOCATIONS:END -->

<!-- GENERATED:TESTING:START -->
### Generated Test Configuration

- Pytest paths: `backend/tests`.
- Pytest coverage threshold: `97%`.
- Pytest default options: `-q --tb=short --strict-markers --strict-config --cov=backend/app --cov-report=term-missing --cov-fail-under=97`.
- Frontend scripts:
  - `npm run build`: `tsc -b && vite build`
  - `npm run dev`: `vite`
  - `npm run lint`: `oxlint`
  - `npm run preview`: `vite preview`
  - `npm run test`: `vitest run --silent=passed-only`
  - `npm run test:check`: `node scripts/test-check.mjs`
  - `npm run typecheck`: `tsc -b`
<!-- GENERATED:TESTING:END -->
