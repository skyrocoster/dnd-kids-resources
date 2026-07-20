WORK ORDER 10 — Cover DB-failure branches in test_players.py and test_crud_completeness.py (players CRUD + assignment fallthroughs)
GOAL: the `except Exception` branches in players create/update/delete, plus the non-UNIQUE exception fallback in add_spell/add_weapon and the generic Exception in remove_spell/remove_weapon, are all exercised.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `test_players.py` (141 lines, 8 tests). No imports. Players create/deletes at lines 12 (`test_create_player`) and 81 (`test_delete_player`). Update at line 58 (`test_update_player`).
- `test_crud_completeness.py` (211 lines, 14 tests). No imports. Assignment lifecycle tests at lines 21–49. Helper `_make_player(client, name)` at line 15 creates a player and returns its ID.
- Uncovered branches in `players.py`:
  - create (75–77), update (105–107), delete (133–135): `except Exception` → 400.
  - `add_spell_to_player` (176–188): after `except Exception`, checks `"UNIQUE" in str(e)` → 400 (186–187, covered). The fallback `raise HTTPException(400, "Failed to assign spell: ...")` at line 188 is uncovered. To trigger: monkeypatch commit to raise an Exception that is NOT a UNIQUE constraint (a generic `Exception` is fine — the `"UNIQUE" in str(e)` check evaluates False for a non-IntegrityError).
  - `remove_spell_from_player` (213–215): `except Exception` → 400.
  - `add_weapon_to_player` (264–266): same pattern — UNIQUE check (264–265, covered), fallback (266, uncovered).
  - `remove_weapon_from_player` (291–293): `except Exception` → 400.
- The monkeypatch target is `sqlite3.Connection.commit`. For the assignment fallback tests (lines 188, 266), a generic `Exception` is sufficient — it won't match `"UNIQUE" in str(e)`.
- The full suite is green at 379 tests.

START IN:
- `backend/tests/routers/test_players.py` (lines 1–141 — whole file)
- `backend/tests/routers/test_crud_completeness.py` (lines 15–49 — assignment section, helper `_make_player`)
- `backend/app/routers/players.py` (lines 67–77, 97–107, 127–135, 178–188, 207–215, 256–266, 285–293)

DO:
- In `test_players.py`: add `import sqlite3` at top, add `def _raise_db_failure(self): raise Exception("Simulated database failure")`, then add 3 tests:
  1. `test_create_player_db_failure` — monkeypatch, POST `{"name": "Fail", "class_": "Wizard", "level": 1}`, assert 400.
  2. `test_update_player_db_failure` — POST first (unpatched), monkeypatch, PUT with valid payload, assert 400.
  3. `test_delete_player_db_failure` — POST first, monkeypatch, DELETE, assert 400.
- In `test_crud_completeness.py`: add `import sqlite3` at top, add same `_raise_db_failure` helper, then add 4 tests after the assignment lifecycle section (near line 49):
  4. `test_add_spell_to_player_db_failure` — create player & get a spell ID, monkeypatch, POST `f"/api/players/{pid}/spells/{sid}"`, assert 400. Covers line 188.
  5. `test_remove_spell_from_player_db_failure` — assign spell first (unpatched), monkeypatch, DELETE the assignment, assert 400. Covers lines 213–215.
  6. `test_add_weapon_to_player_db_failure` — create player & get weapon ID, monkeypatch, POST `/api/players/{pid}/weapons/{wid}`, assert 400. Covers line 266.
  7. `test_remove_weapon_from_player_db_failure` — assign weapon first, monkeypatch, DELETE, assert 400. Covers lines 291–293.

STOP WHEN: `pytest backend/tests/routers/test_players.py backend/tests/routers/test_crud_completeness.py -k "db_failure" --cov=backend.app.routers.players --cov-report=term-missing` passes all 7 new tests and the uncovered lines (75-77, 105-107, 133-135, 188, 213-215, 266, 291-293) each show 0 uncovered. Then stop — change nothing else.

STATUS:
