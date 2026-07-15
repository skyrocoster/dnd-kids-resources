# Seed Pipeline Fix Plan — Export/Import Consistency

This plan fixes bugs and gaps in the seed export/import pipeline (`init_database.py`, `seed_database.py`, `export_db_seeds.py`) that risk silent data loss during backup/restore cycles. All fixes are in `scripts/`; no schema changes, no API changes, no frontend changes.

> **Status:** S5 queued. S5 next. S0–S4 shipped.

---

## What this doc covers

The three-phase seed workflow (init schema → seed from JSON → export back to JSON) has several bugs that accumulated as the schema evolved. The most critical: `export_db_seeds.py` silently omits `items` and `loot_bundles`, meaning a full export→import round-trip loses those tables. Secondary bugs include a typo in the `npcs` schema default, stale path references in error messages, and dead code referencing a phantom `skills` table.

---

## Key facts

- **Three scripts, one workflow:** `init_database.py` (create schema) → `seed_database.py` (load JSON) → `export_db_seeds.py` (dump DB back to JSON). The export script is the backup tool.
- **Schema is defined once:** `init_database.py` is the sole source of truth for table DDL. The test `conftest.py` dynamically imports it — no duplication risk.
- **Column aliasing is by design:** Quest schema uses `title` but DB column is `name`; encounter schema uses `title`/`creatures` but DB has `name`/`units`. The routers alias via SQL `AS`. Both export and import scripts use the DB column names, so the round-trip works. This is not a bug.
- **Runtime-only tables (never seeded/exported):** `dungeons`, `map_layout`. These are API-authored and deleted via FK cascade.
- **Phantom `skills` table:** Listed in drop/clear lists but never created by `init_database.py`. Dead code in both scripts.

---

## Reusable pieces (do not rebuild)

- `scripts/export_db_seeds.py` — `EXPORT_DEFINITIONS` dict, `transform_record()` function, `load_json_schema()` helper
- `scripts/seed_database.py` — `populate_*()` functions, `serialize_for_db()`, `clear_all_tables()`
- `scripts/init_database.py` — `init_database()` function, `DB_PATH` constant

---

## Known debt / deferred (NOT built)

- **`items.name` lacks UNIQUE constraint** — unlike all other entity tables. Not in scope; would require a migration.
- **Encounter export writes `created_at`/`updated_at`; import ignores them** — harmless but asymmetric. Not fixing in this pass.
- **`seed_database.py` fallback to `parse_spells_to_db.py`** — dead code path being removed in S4; no replacement planned since `seed_spells.json` is the canonical source.
- **Schema aliasing (`name`↔`title`, `units`↔`creatures`)** — intentional design, not a bug. Would be a larger refactor to unify, deferred.

---

### Design Phase S — Seed Pipeline Fixes

Six targeted fixes across three scripts. No new files, no new tables, no API changes. Each stage is independently verifiable.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **S0 — Add items + loot_bundles to export** | Sonnet | Add missing `EXPORT_DEFINITIONS` entries and `transform_record` cases for `items` and `loot_bundle` tables. | `export_db_seeds.py` exports all 15 seed-backed tables. |
| **S1 — Fix DFEFAULT typo** | Haiku | Fix misspelled `DEFAULT` in `init_database.py` npcs schema. | `init_database.py` line 235 corrected. |
| **S2 — Fix stale `_dev/` paths** | Haiku | Replace `_dev/init_database.py` with `scripts/init_database.py` in all `seed_database.py` error messages. | No `_dev/` references remain in `seed_database.py`. |
| **S3 — Remove phantom `skills` table** | Haiku | Delete `"skills"` from `clear_all_tables()` in `seed_database.py` and from `tables_to_drop` in `init_database.py`. | Drop/clear lists match actual created tables. |
| **S4 — Remove dead spell parser fallback** | Haiku | Replace `parse_spells_to_db.py` fallback block in `populate_spells()` with a warning + return. | No subprocess import or fallback path remains. |
| **S5 — Full round-trip verification** | Sonnet | Init → seed → export dry-run → pytest. Confirm all 15 tables exported, all tests green. | Green pipeline end-to-end. |

**Sequencing:** S0 → S1 → S2 → S3 → S4 → S5 (sequential; each is small and independent but S5 must be last).

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage, in order. Delete a block and collapse it to a
     Shipped row the moment that stage ships; the remaining blocks stay until their own turn. ===== -->

#### S5 — Full round-trip verification (planned)

- **Build:** Run the full pipeline:
  1. `python scripts/init_database.py`
  2. `python scripts/seed_database.py --force`
  3. `python scripts/export_db_seeds.py --dry-run` — confirm all 15 tables listed
  4. `pytest` — all tests green
- **Inherits:** All prior stages (S0–S4) must be complete.
- **Tests:** This IS the test — end-to-end pipeline verification.
- **🚦 Gate:** `export_db_seeds.py --dry-run` lists 15 tables; `pytest` passes; no errors in init/seed/export output.

<!-- ============================================================================================= -->

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **S0** | Added `items` and `loot_bundles` to `EXPORT_DEFINITIONS` and `transform_record()` in `export_db_seeds.py`. Dry-run confirms 15 tables exported. |
| **S1** | Fixed `DFEFAULT` typo to `DEFAULT` in `init_database.py:235` npcs schema. |
| **S2** | Replaced all `_dev/init_database.py` references with `scripts/init_database.py` in `seed_database.py`. |
| **S3** | Removed phantom `skills` table from drop/clear lists in `init_database.py` and `seed_database.py`. |
| **S4** | Removed dead `parse_spells_to_db.py` fallback and `import subprocess` from `seed_database.py`. |

---

## Cross-references

- `scripts/init_database.py` — schema source of truth
- `scripts/seed_database.py` — JSON-to-DB loader
- `scripts/export_db_seeds.py` — DB-to-JSON exporter (this plan's primary target)
- `backend/tests/conftest.py` — dynamically imports `init_database.py` and `seed_database.py` for test DB setup

---

## Next:

S5 (full round-trip verification) — unblocked, ready to implement.
