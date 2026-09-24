# Repository tools

- `full_test_process.py` — fail-fast, resumable runner for the complete
  local test, build, and quality process; see
  [`docs/FULL_TEST_PROCESS.md`](../docs/FULL_TEST_PROCESS.md).
- `export_db_seeds.py` and `generate_export_schema.py` — database seed export
  and schema-manifest tools.
- `generate_*_quick_rules.py` and `migrate_*.py` — seed-data authoring and
  legacy-data conversion tools.

Run modules from the repository root with `.venv/Scripts/python.exe -m
src.tools.<module>` (the module name is the file name without `.py`). Database
setup and schema migrations live under `backend/database/` and
`backend/migrations/`.
