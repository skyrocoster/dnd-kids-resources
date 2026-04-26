# Copilot Instructions for D&D Kids Resources

## Build, Run, and Test

- **Install dependencies:**
  ```bash
  pip install -r requirements.txt
  ```
- **Start Flask server:**
  - Windows: `launchers/start-server.ps1` (PowerShell)
  - Manual: `python server_flask.py`
  - Server runs at http://localhost:8000
- **Launch GUI control panel:**
  - Windows: `launchers/launch_gui.ps1` or `launchers/launch_gui.bat`
- **Run a single test:**
  - Example: `python _dev/test_spell_parsing.py` (runs spell parsing workflow test)
- **Database setup:**
  - Init schema: `python _dev/init_database.py`
  - Seed data: `python _dev/seed_database.py --force`
  - Export seeds: `python _dev/export_db_seeds.py`

## High-Level Architecture

- **Frontend:** Static HTML (`pages/`), JS (`js/`), CSS (`css/`), and data files (`data/`).
- **Backend:** `server_flask.py` (Flask API), `lib/` (production Python modules, e.g., `parse_dungeon.py`).
- **Database:** SQLite file `dnd_kids_resources.db` (schema and seed managed via `_dev/` scripts).
- **Developer Tools:** `_dev/` (DB/test utilities), `tools/` (stable utilities), `launchers/` (startup scripts).
- **Docs:** `docs/` (see `docs/guides/FILE_STRUCTURE.md` for structure).

## Key Conventions

- **Production code** lives in `lib/` and is imported by the server and tools. Do not move these to `_dev/`.
- **Development/test scripts** go in `_dev/` (e.g., `*_test.py`, DB utilities).
- **Seed/data export:** Use `_dev/export_db_seeds.py` to archive/export DB seed files. Seeds are in `data/seeds/`.
- **Virtual environment:** Scripts expect `.venv/` in the repo root. Activate before running Python scripts.
- **Frontend/Backend separation:** Keep UI logic in `pages/`, `js/`, and `css/`; backend logic in `lib/` and `server_flask.py`.

---

For more details, see `README.md` and `docs/guides/FILE_STRUCTURE.md`.
