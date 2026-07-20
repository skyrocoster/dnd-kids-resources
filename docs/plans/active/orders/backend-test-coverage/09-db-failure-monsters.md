WORK ORDER 09 — Cover DB-failure + IntegrityError-fallback branches in test_monsters.py
GOAL: the `except sqlite3.IntegrityError` non-UNIQUE fallback and `except Exception` branches in monsters create/update, plus the `except Exception` in delete, are all exercised.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `test_monsters.py` (186 lines, 14 tests). Already imports `pytest` (line 3) and `MonsterCreate, MonsterUpdate` (line 5) from schemas. No `sqlite3` import yet.
- Monsters has TWO uncovered branch patterns per create/update endpoint:
  - `except sqlite3.IntegrityError as exc:` with UNIQUE check → 409 (lines 167–168 for create, 197–198 for update) — **already covered** by `test_create_monster_duplicate` and `test_update_monster_duplicate_name`.
  - `except sqlite3.IntegrityError as exc:` with NON-UNIQUE message → 400 (lines 169 for create, 200 for update) — **uncovered**. To trigger: raise `sqlite3.IntegrityError("NOT NULL constraint failed: monsters.name")`.
  - `except Exception as exc:` → 400 (lines 170–172 for create, 201–203 for update) — **uncovered**. To trigger: raise generic `Exception`.
  - Delete: `except Exception` → 400 (lines 220–222) — **uncovered**.
- The helper `_monster_payload()` at line 8 returns a complete valid monster dict. Use it.
- The monkeypatch target is `sqlite3.Connection.commit`. For IntegrityError tests, raise `sqlite3.IntegrityError("NOT NULL constraint failed: monsters.name")`. For generic Exception tests, raise `Exception("Simulated database failure")`.
- The full suite is green at 379 tests.

START IN:
- `backend/tests/routers/test_monsters.py` (lines 1–186 — whole file, especially lines 112–186 mutation section)
- `backend/app/routers/monsters.py` (lines 158–172, 190–203, 217–222)

DO:
- Add `import sqlite3` at the top of `test_monsters.py` (after existing imports).
- Add two module-level helpers:
  - `def _raise_db_failure(self): raise Exception("Simulated database failure")`
  - `def _raise_integrity_non_unique(self): raise sqlite3.IntegrityError("NOT NULL constraint failed: monsters.name")`
- Add these 5 tests near the existing mutation tests:
  1. `test_create_monster_db_failure` — monkeypatch commit with `_raise_db_failure`, POST `_monster_payload()`, assert 400. Covers lines 170–172.
  2. `test_create_monster_integrity_non_unique` — monkeypatch commit with `_raise_integrity_non_unique`, POST `_monster_payload()`, assert 400. Covers line 169.
  3. `test_update_monster_db_failure` — POST first (unpatched), monkeypatch with `_raise_db_failure`, PUT, assert 400. Covers lines 201–203.
  4. `test_update_monster_integrity_non_unique` — POST first (unpatched), monkeypatch with `_raise_integrity_non_unique`, PUT, assert 400. Covers line 200.
  5. `test_delete_monster_db_failure` — POST first, monkeypatch with `_raise_db_failure`, DELETE, assert 400. Covers lines 220–222.

STOP WHEN: `pytest backend/tests/routers/test_monsters.py -k "db_failure or integrity_non_unique" --cov=backend.app.routers.monsters --cov-report=term-missing` passes all 5 new tests and the uncovered lines 169, 170–172, 200, 201–203, and 220–222 each show 0 uncovered. Then stop — change nothing else.

STATUS:
