WORK ORDER 07 — Cover DB-failure update branches in test_crud_completeness.py (dungeons, encounters, npcs, weapons — update only)
GOAL: the `except Exception: conn.rollback(); raise HTTPException(400, …)` branch in every update endpoint across dungeons, encounters, npcs, and weapons is hit by a test.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `test_crud_completeness.py` (211 lines, 14 tests) has no imports; it relies entirely on conftest fixture discovery.
- Dungeons update: lines 104–106 in `dungeons.py`. Happy-path test at `test_crud_completeness.py:190` (`test_dungeon_update_round_trip`).
- Encounters update: lines 100–102 in `encounters.py`. Happy-path test at `test_crud_completeness.py:139` (`test_encounter_update_round_trip`).
- NPCs update: lines 140–142 in `npcs.py`. Happy-path test at `test_crud_completeness.py:114` (`test_npc_update_round_trip`).
- Weapons update: lines 140–142 in `weapons.py`. Happy-path test at `test_crud_completeness.py:81` (`test_weapon_update_round_trip`).
- The monkeypatch pattern: `monkeypatch.setattr(sqlite3.Connection, "commit", _raise_db_failure)`. Same as WO 06.
- The full suite is green at 379 tests.

START IN:
- `backend/tests/routers/test_crud_completeness.py` (lines 1–211 — whole file)
- `backend/app/routers/dungeons.py` (lines 96–106)
- `backend/app/routers/encounters.py` (lines 90–102)
- `backend/app/routers/npcs.py` (lines 130–142)
- `backend/app/routers/weapons.py` (lines 132–142)

DO:
- Add `import sqlite3` at the top of `test_crud_completeness.py`.
- Add a module-level helper: `def _raise_db_failure(self): raise Exception("Simulated database failure")`.
- For each of the four routers (dungeons, encounters, npcs, weapons), add ONE update-DB-failure test near the existing update-round-trip function. Each test: POST a valid entity to get an ID, `monkeypatch.setattr(sqlite3.Connection, "commit", _raise_db_failure)`, PUT with a valid update payload, assert `status_code == 400`.
- Use the same valid payloads as the neighbouring round-trip tests (copy the update dict from those tests).
- Name each test `test_update_<entity>_db_failure` following the existing convention.

STOP WHEN: `pytest backend/tests/routers/test_crud_completeness.py -k "db_failure" --cov=backend.app.routers --cov-report=term-missing` passes all 4 new tests and the uncovered lines for dungeons (104-106), encounters (100-102), npcs (140-142), and weapons (140-142) each show 0 uncovered. Then stop — change nothing else.

STATUS:
