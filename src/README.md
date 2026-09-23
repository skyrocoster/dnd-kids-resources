# Python source

- `tools/` — repository-wide data and schema tooling
- `backend/` — FastAPI service, database setup, and database migrations
- `frontend/` — React/Vite client and its theme-token tools

Repository tools live in `src/tools/`, not in a root `scripts/` directory. Run
Python modules from the repository root, for example:

```powershell
.venv/Scripts/python.exe -m src.tools.generate_export_schema --check
```
