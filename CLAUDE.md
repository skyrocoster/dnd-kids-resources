# CLAUDE.md — D&D Kids Resources

Guidance for AI assistants working in this repo. Read this first.

## Current stage: v2 ground-up rebuild

This project is a printable D&D 5e resource site for kids. It has been **playtested** and is now being **rebuilt from the ground up**. Do not extend or patch the v1 app — work toward v2.

**The authoritative plan is [`docs/v2-rebuild-plan.md`](docs/v2-rebuild-plan.md).** It is broken into 11 self-contained tasks meant to be executed one at a time, in order. When asked to "do the next step" / "work on the rebuild," find the current task there and follow it. Do not skip ahead or combine tasks.

### The stack transition
- **Data:** FINAL and frozen. `data/seeds/*.json` is the canonical source of truth. The SQLite DB (`dnd_kids_resources.db`, gitignored) is **rebuilt from seeds** via `scripts/init_database.py` + `scripts/seed_database.py` (these move from `_dev/` to `scripts/` in Task 2). Never hand-edit the DB as a source of truth; edit seeds and rebuild.
- **Backend:** moving from `server_flask.py` (Flask, being deleted) → **FastAPI + SQLite** in `backend/`.
- **Frontend:** moving from `index.html` + `pages/*.html` + `js/*` (vanilla, being deleted) → **React + Vite + TypeScript** in `frontend/`.

### v1 preservation
- v1 is archived on the **`v1-archive`** git branch. `main` is the v2 workspace.
- v1 does **not** need to remain runnable. Delete v1 app/server code as the plan directs (it stays recoverable on the branch).

### Kept vs dropped features
- **Keep (rebuild):** content browsers (spells, monsters, weapons), campaign CRUD (players, NPCs, quests, encounters), dungeons.
- **Dropped:** all trackers (HP, spell slots, turn order, printable character sheet); the donjon dungeon-HTML parser (`lib/parse_dungeon.py`) — v2 has **custom dungeons only**, no upload/parse.

## Conventions
- Many DB columns are JSON-encoded text (e.g. spells' `damage`/`components`/`classes`, monsters' `ac`/`hp`/`action`) — `json.loads` on read, `json.dumps` on write.
- Ingestion/parsing scripts are archived under `archive/ingestion/` and must stay out of the running app.
- This is a Windows machine; the primary shell is PowerShell (a Bash tool is also available).
