WORK ORDER 08 — Cover DB-failure branches in test_loot.py, test_layouts.py, test_spells.py
GOAL: the `except Exception: conn.rollback(); raise HTTPException(400, …)` branch in loot create/update/delete, layouts save, and spells delete is hit by a test.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `test_loot.py` (80 lines, 3 tests). Loot create: lines 65–67 in `loot.py`. Update: 95–97. Delete: 115–117. Happy-path tests at lines 31–72 (`test_loot_bundle_crud_round_trips_mixed_snapshot_contents`) — a combined CRUD test that POSTs, PUTs, and DELETEs.
- `test_layouts.py` (58 lines, 5 tests). Layouts save: lines 37–39 in `layouts.py`. Happy-path test at line 7 (`test_save_and_get_dungeon_layout`) — creates a dungeon then PUTs layout.
- `test_spells.py` (265 lines, 16 tests). Spells delete: lines 177–179 in `spells.py`. Happy-path test at line 234 (`test_delete_spell`) — POSTs then DELETEs.
- Neither `test_loot.py` nor `test_layouts.py` nor `test_spells.py` imports `sqlite3`. None use monkeypatch.
- The monkeypatch pattern: `monkeypatch.setattr(sqlite3.Connection, "commit", _raise_db_failure)`. Same as WO 06/07.
- The full suite is green at 379 tests.

START IN:
- `backend/tests/routers/test_loot.py` (lines 1–80 — whole file)
- `backend/tests/routers/test_layouts.py` (lines 1–58 — whole file)
- `backend/tests/routers/test_spells.py` (lines 234–265 — delete section)
- `backend/app/routers/loot.py` (lines 60–67, 90–97, 110–117)
- `backend/app/routers/layouts.py` (lines 30–39)
- `backend/app/routers/spells.py` (lines 174–179)

DO:
- In `test_loot.py`: add `import sqlite3` at top, add `def _raise_db_failure(self): raise Exception("Simulated database failure")`, then add one test for create DB-failure, one for update DB-failure, one for delete DB-failure. For create: monkeypatch, POST valid payload, assert 400. For update: POST first (unpatched), then monkeypatch, PUT, assert 400. For delete: POST first, then monkeypatch, DELETE, assert 400. Valid payload: `{"name": "Fail Test", "gold": 10, "contents": []}`. Name them `test_create_loot_bundle_db_failure`, `test_update_loot_bundle_db_failure`, `test_delete_loot_bundle_db_failure`.
- In `test_layouts.py`: same pattern — add import + helper, then one test. POST a dungeon (unpatched) to get an ID, monkeypatch, PUT `/api/dungeons/{id}/layout` with `{"data": {}}`, assert 400. Name it `test_save_layout_db_failure`.
- In `test_spells.py`: same pattern — add import + helper at top of file, then one test. POST a spell (unpatched) to get an ID, monkeypatch, DELETE, assert 400. Name it `test_delete_spell_db_failure`. Place near `test_delete_spell` at line 234.

STOP WHEN: `pytest backend/tests/routers/test_loot.py backend/tests/routers/test_layouts.py backend/tests/routers/test_spells.py -k "db_failure" --cov=backend.app.routers --cov-report=term-missing` passes all 5 new tests and the uncovered lines for loot (65-67, 95-97, 115-117), layouts (37-39), and spells (177-179) each show 0 uncovered. Then stop — change nothing else.

STATUS:
