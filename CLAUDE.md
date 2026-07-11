# CLAUDE.md — D&D Kids Resources

Guidance for AI assistants working in this repo. Read this first.

## Current stage: post-rebuild feature work

The v2 ground-up rebuild (Flask+vanilla-JS → **FastAPI + SQLite** backend, **React + Vite + TypeScript**
frontend) is **complete**. `docs/v2-rebuild-plan.md` (the 11-task rebuild plan) has served its purpose and been
removed; do not look for it. This project is an online D&D 5e resource site for kids, designed for **running
games** (live at the table) rather than exclusively pre-session prep.

**The authoritative plan for the dungeon room-navigation feature and its follow-on design phases is
[`docs/dungeon_plan.md`](docs/dungeon_plan.md).** Original build (Stages 1–11) and Design Phase A (Encounter
Runner, Stages E1–E6) and Design Phase B (NPC Dossier, Stages N1–N6) are **all shipped**. New design phases get
appended under that doc's "Next: front-end design planning" section — when asked to "do the next step," find the
current/next stage there and follow it; each stage lists exactly what to build, what it inherits, and how to
verify it. Do not skip ahead or combine stages.

### The stack
- **Data:** FINAL and frozen. `data/seeds/*.json` is the canonical source of truth. The SQLite DB (`dnd_kids_resources.db`, gitignored) is **rebuilt from seeds** via `scripts/init_database.py` + `scripts/seed_database.py`. Never hand-edit the DB as a source of truth; edit seeds and rebuild.
- **Backend:** **FastAPI + SQLite** in `backend/`.
- **Frontend:** **React + Vite + TypeScript** in `frontend/`. Design tokens live in `frontend/src/theme.css`
  (`--md-*`/`--type-*`, Material Design 3 dark theme) — consume them, never hand-pick colors; see
  `docs/dungeon_plan.md`'s "Design system in force" section for the full contract (palette, type scale, icons,
  accessibility floor).

### v1 preservation
- v1 is archived on the **`v1-archive`** git branch. `main` is the v2 workspace.
- v1 does **not** need to remain runnable. Delete v1 app/server code as the plan directs (it stays recoverable on the branch).

### Kept vs dropped features
- **Keep (rebuild):** content browsers (spells, monsters, weapons), campaign CRUD (players, NPCs, quests, encounters), dungeons.
- **Dropped:** all trackers (HP, spell slots, turn order, character sheet); the donjon dungeon-HTML parser (`lib/parse_dungeon.py`) — v2 has **custom dungeons only**, no upload/parse.

## Testing

**All feature code must include tests.** This is not optional. See [`docs/TESTING.md`](docs/TESTING.md) for the full pass/fail contract (commands, layers, coverage gate).

**Backend test DBs are built from the real `scripts/init_database.py` schema + `data/seeds/*.json` — never a hand-written schema in `conftest.py`.** Two hand-copied schemas previously drifted from production and hid live 500s. Run backend tests with `pytest` **from the repo root**; it enforces a coverage gate (≥85%). If you're editing a `CREATE TABLE` inside `conftest.py`, stop — that's the anti-pattern this rule exists to kill.

- **Backend (FastAPI):** pytest. Use fixtures from `backend/tests/conftest.py` (seeded test DB, connection mocking). Every API endpoint gets a smoke test; routers with business logic get unit tests.
- **Frontend (React):** vitest + React Testing Library. Components get render tests; hooks/utilities get unit tests.
- **Run tests before committing:** `pytest` (backend) and `npm run test` (frontend, when task 7+).
- **Coverage:** aim for >80% on new code. Coverage reports are checked locally (CI can enforce this later).

Test files live alongside code: `backend/app/routers/spells.py` → `backend/tests/routers/test_spells.py`; `frontend/src/components/Card.tsx` → `frontend/src/components/__tests__/Card.test.tsx`.

Task 4.5 set up pytest infrastructure and fixtures. Tasks 5+ inherit these patterns and are expected to add tests as they write endpoints/components.

## Conventions
- Many DB columns are JSON-encoded text (e.g. spells' `damage`/`components`/`classes`, monsters' `ac`/`hp`/`action`) — `json.loads` on read, `json.dumps` on write.
- Ingestion/parsing scripts are archived under `archive/ingestion/` and must stay out of the running app.
- This is a Windows machine; the primary shell is PowerShell (a Bash tool is also available).
