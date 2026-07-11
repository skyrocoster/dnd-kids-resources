# Testing & regression rules

This is the contract for "does the code pass." Read it before adding a feature or
reviewing a change. The next build stage is expected to keep every rule green.

## TL;DR — the two commands

```bash
# Backend (run from the REPO ROOT, not backend/)
pytest

# Frontend (run from frontend/)
cd frontend && npm run test
```

A change **passes** only when both are green. `pytest` also enforces a coverage
gate (see below), so "green" means tests pass *and* coverage holds.

## Backend

### How it's wired
- Config lives in `pytest.ini` at the repo root. `pytest` with no arguments runs
  the whole backend suite with coverage.
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
2. **Coverage ≥ 90%** overall (`--cov-fail-under=90` in `pytest.ini`). Current
   baseline is ~91%. The gate sits just under actual so it ratchets against
   backsliding without failing on a single legitimately-added defensive branch.
   New feature code should land at **>80% on its own lines** (per `CLAUDE.md`) and
   not drag the total below 90.

   The uncovered ~9% is deliberate, not a backlog: `except → rollback → raise 400`
   DB-error branches (need contrived failure injection), the dead `if row is None`
   guards in the `_parse_*` helpers, the SPA fallback in `main.py` (needs a built
   `frontend/dist`, covered by live/e2e checks), and the import-time DB-path
   resolver in `db.py`. Don't contort tests to hit these — if you ever want the gate
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
pytest                                             # full gate (tests + coverage)
pytest backend/tests/routers/test_spells.py --no-cov  # one file, skip the gate
pytest -m integration --no-cov                     # only the real-data sweep
pytest -m "not integration"                        # skip the slower real-data build
```

## Frontend
- `cd frontend && npm run test` → vitest run. 88 tests across 27 files at last check.
- Component tests mock `api/client`, so they verify UI wiring, not backend
  serialization — that's the backend integration layer's job. Keep the two honest
  about their boundary: don't rely on frontend tests to catch API-shape drift.
- `npm run build` (`tsc -b && vite build`) must also succeed before shipping — it
  type-checks the whole app.

## Why this exists (the failure this prevents)
Every 500 this project has shipped was the same shape: a router's response model or
JSON parsing didn't match the *real* data, but the test DB's hand-written schema and
thin seed rows were too simplified to trigger it — so it passed CI and broke live
(`/api/monsters`, `/api/encounters`, `/api/players/{id}/spells`). Building test DBs
from the real schema + real seeds closes that gap. **If you find yourself editing a
CREATE TABLE statement inside `conftest.py`, stop** — the schema comes from
`scripts/init_database.py`, and the fixtures build from it.
