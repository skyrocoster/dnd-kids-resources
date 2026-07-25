# Backend Test Coverage — close the gap toward 100%

> **Status:** Complete. All 4 stages shipped (13 orders). Coverage raised from 90.96% to 97.12%; gate locked at 97%.

- **Area guide:** [Repo Infra](../../areas/repo-infra.md).

## What we're building & why

`pytest --cov` currently reports 90.96% coverage on `backend/app`, just above the 90% gate. The
uncovered lines are concentrated in a handful of predictable shapes across nearly every router:
DB-failure `except` branches that roll back and raise a 400, 404 branches on lookups by ID, a few
validation branches, and two genuinely environment-dependent branches (`db.py`'s path fallback and
`main.py`'s "frontend not built" branch). Closing this out means each router's test file gets a
handful of new cases that exercise the branch, not new production code. Where a branch turns out
to be truly unreachable or environment-exclusive, we record that instead of chasing an unrealistic
100%.

## Stages

1. **Router 404 and validation gaps** — add test cases for the straightforward missing branches in
   `dungeons.py`, `encounters.py`, `layouts.py`, `loot.py`, `monsters.py`, `npcs.py`, `players.py`,
   `spells.py`, and `weapons.py`: mostly 404-on-missing-ID paths and a few validation branches that
   existing tests don't hit yet.
2. **Router DB-failure branches** — add test cases (via monkeypatching the DB connection/cursor to
   raise) for the `except Exception ... rollback ... raise HTTPException(400, ...)` branches shared
   across most of the same routers, plus the remaining gaps in `loom.py`, which has the largest
   concentration of these.
3. **Shared infra and schema edge cases** — assess `db.py`'s path-fallback branch, `main.py`'s
   "frontend not built" branch, and the one remaining line in `schemas.py`. Cover what's reasonably
   testable (e.g. via monkeypatching `Path.cwd`/`FRONTEND_DIST`); for anything that's exclusive to
   an environment state a single test run can't produce both sides of, document why it's excluded
   rather than forcing it.
4. **Verify and record the gate** — run the full coverage report, confirm the achieved percentage,
   and decide whether `--cov-fail-under` in `pytest.ini` should be raised to lock in the new floor.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **S1 — WO 01** | Covered `_parse_*_row` None-guard branches in dungeons, encounters, monsters, npcs, and weapons routers — five one-line tests asserting `None` input returns `None`. |
| **S1 — WO 02** | Covered `_parse_player_row` with its None guard and both JSON-decoding branches (stats-only, skills-only, and both) via direct import tests. |
| **S1 — WO 03** | Covered `_cr_sort` edge cases (None, "Unknown", garbage string, division-by-zero) and the `_select_monster` 404 branch by calling it directly with a non-existent ID. |
| **S1 — WO 04** | Covered `_parse_loot_bundle_row` None-guard branch via direct import unit test, matching the pattern already in place for the other six parsers. |
| **S1 — WO 05** | Covered `update_spell` IntegrityError branch by creating two spells then updating one to collide with the other's name, asserting a 400 response. |
| **S2 — WO 06** | Covered DB-failure branches for create/delete in dungeons, encounters, npcs, and weapons — 8 monkeypatch tests in `test_resources.py`. |
| **S2 — WO 07** | Covered DB-failure branches for update in dungeons, encounters, npcs, and weapons — 4 monkeypatch tests in `test_crud_completeness.py`. |
| **S2 — WO 08** | Covered DB-failure branches for loot create/update/delete, layouts save, and spells delete — 5 monkeypatch tests across `test_loot.py`, `test_layouts.py`, and `test_spells.py`. |
| **S2 — WO 09** | Covered monsters DB-failure branches (2 generic Exception + 2 IntegrityError non-UNIQUE + 1 delete) — 5 monkeypatch tests in `test_monsters.py`. |
| **S2 — WO 10** | Covered players DB-failure CRUD branches (3 in `test_players.py`) and assignment fallthrough gaps (4 in `test_crud_completeness.py`) — 7 monkeypatch tests total. |
| **S3 — WO 11** | Covered `db.py` path-fallback branches (lines 17–22) via monkeypatch on `Path.exists` in `test_db_helpers.py` — two tests exercising cwd-fallback and neither-exists paths; `db.py` now at 100%. |
| **S3 — WO 12** | Covered `schemas.py` audio-path Windows-device-name validator (line 284) via `MonsterCreate` validation tests — `schemas.py` now at 100%. |
| **S3 — WO 13** | Covered `main.py` root endpoint else-branch (lines 73–76) via `test_main.py` — the if-branch (lines 67–70, SPA fallback) is documented as environment-dependent and excluded from unit coverage. |
| **S4** | Raised `--cov-fail-under` from 90 to 97 in `pytest.ini` and updated `TESTING.md` to lock in the new floor. 97.12% actual coverage holds the gate. |
