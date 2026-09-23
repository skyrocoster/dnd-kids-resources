# Repository tools

- `export_db_seeds.py` and `generate_export_schema.py` — database seed export
  and schema-manifest tools.
- `generate_*_quick_rules.py` and `migrate_*.py` — seed-data authoring and
  legacy-data conversion tools.

Run modules from the repository root with `.venv/Scripts/python.exe -m
src.tools.<module>` (the module name is the file name without `.py`). Database
setup and schema migrations live under `backend/database/` and
`backend/migrations/`.
