WORK ORDER 06 — Cover DB-failure branches in test_resources.py (dungeons, encounters, npcs, weapons — create + delete)
GOAL: the `except Exception: conn.rollback(); raise HTTPException(400, …)` branch in every create and delete endpoint across dungeons, encounters, npcs, and weapons is hit by a test.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `test_resources.py` (215 lines, 16 tests) has no imports; it relies entirely on conftest fixture discovery.
- Dungeons create: lines 74–76 in `dungeons.py`. Delete: lines 129–131. Happy-path tests at `test_resources.py:194` (create) and `:208` (delete).
- Encounters create: lines 70–72 in `encounters.py`. Delete: lines 122–124. Happy-path tests at `test_resources.py:133` (create) and `:143` (delete — inside `test_encounter_crud`).
- NPCs create: lines 94–96 in `npcs.py`. Delete: lines 162–164. Happy-path tests at `test_resources.py:72` (create) and `:82` (delete — inside `test_npc_crud`).
- Weapons create: lines 98–100 in `weapons.py`. Delete: lines 161–163. Happy-path tests at `test_resources.py:13` (create) and `:23` (delete — inside `test_weapon_crud`).
- The monkeypatch pattern: `monkeypatch.setattr(sqlite3.Connection, "commit", _db_failure)` patches the class method so EVERY connection's `commit()` raises. The `monkeypatch` fixture is already available (pytest built-in) and `test_client` already uses `monkeypatch.setattr` at `conftest.py:269`.
- The full suite is green at 379 tests.

START IN:
- `backend/tests/routers/test_resources.py` (lines 1–215 — whole file)
- `backend/app/routers/dungeons.py` (lines 66–76, 126–131)
- `backend/app/routers/encounters.py` (lines 62–72, 116–124)
- `backend/app/routers/npcs.py` (lines 86–96, 154–164)
- `backend/app/routers/weapons.py` (lines 90–100, 154–163)

DO:
- Add `import sqlite3` at the top of `test_resources.py`.
- Add a module-level helper: `def _raise_db_failure(self): raise Exception("Simulated database failure")`.
- For each of the four routers (dungeons, encounters, npcs, weapons), add ONE create-DB-failure test and ONE delete-DB-failure test near the existing happy-path functions. Each test: call `monkeypatch.setattr(sqlite3.Connection, "commit", _raise_db_failure)`, POST (or POST-then-DELETE) with valid payload, assert `status_code == 400`.
- Example payloads: dungeons `{"title": "Fail", "data": {}}`, encounters `{"title": "Fail", "creatures": []}`, npcs `{"name": "Fail"}`, weapons `{"name": "Fail", "rarity": "common"}`.
- Delete tests must POST a valid entity first (before patching), then monkeypatch, then DELETE.
- Name each test `test_create_<entity>_db_failure` / `test_delete_<entity>_db_failure` following existing naming convention.

STOP WHEN: `pytest backend/tests/routers/test_resources.py -k "db_failure" --cov=backend.app.routers --cov-report=term-missing` passes all 8 new tests and the uncovered lines for dungeons (74-76, 129-131), encounters (70-72, 122-124), npcs (94-96, 162-164), and weapons (98-100, 161-163) each show 0 uncovered. Then stop — change nothing else.

STATUS:
