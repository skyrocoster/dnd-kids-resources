# D&D Kids Resources — v2 Rebuild Plan (staged)

## Context

v1 is a working, playtested vanilla-JS + Flask/SQLite app (`index.html` + 16 pages in `pages/`, 22 JS modules, a 150 KB `server_flask.py` monolith, 135 MB SQLite DB). It grew alongside data-ingestion experiments (5eTools dumps, dnd5eapi, donjon dungeon-HTML parsing), leaving parsing scripts, dead JS, empty tables, and stale docs mixed into the live app.

The **data is now final**. v2 will: (1) crystallise the data — freeze the seed JSONs as the source of truth and archive every script that parses new/raw data; (2) rebuild the app ground-up on a modern stack.

### Locked decisions
- **v1 does NOT stay runnable.** It is preserved only as a GitHub branch. `main` becomes the v2 workspace and gets cleaned aggressively — delete dead code, old docs, parsers, empty seeds.
- **Frontend:** React 18 + Vite + react-router (TypeScript, Vite `react-ts` template).
- **Backend:** FastAPI + SQLite (replaces `server_flask.py`). Same DB; typed models + auto `/docs`.
- **Data:** seeds are the frozen source of truth; DB rebuilt from them via `init_database.py` + `seed_database.py`. No data lost.
- **Keep (rebuild ground-up):** content browsers (spells, monsters, weapons), campaign CRUD (players, NPCs, quests, encounters), dungeons.
- **Drop entirely:** all trackers (HP, spell-slot, turn-order, printable character sheet).
- **Dungeons:** custom/hand-authored only. Archive the donjon HTML parser (`lib/parse_dungeon.py`); no upload/parse in v2.

### How to use this plan
Each **Task** below is a self-contained work packet sized for a single context window, to be handed to a model one at a time in order. Each lists its **Goal**, **Prereqs**, **Context** (paths/shapes needed — assume the executor has NOT seen the rest of the repo), **Steps**, and **Done when**. Do tasks strictly in sequence unless noted as parallel-safe.

### v2 target repo layout (built up across tasks)
```
backend/            FastAPI
  app/
    main.py         app + CORS + serves built frontend
    db.py           sqlite3 connection (Row factory), DB_PATH
    schemas.py      Pydantic models
    routers/        reference.py spells.py monsters.py weapons.py
                    players.py npcs.py quests.py encounters.py dungeons.py
  tests/
    conftest.py     pytest fixtures (seeded test DB, fixtures)
    test_example.py example tests
    routers/        test_spells.py test_monsters.py (mirror source structure)
  requirements.txt
frontend/           React + Vite + TS
  src/ api/ layout/ components/ features/ router.tsx
  vite.config.ts    dev proxy /api -> :8000
scripts/            init_database.py, seed_database.py, export_db_seeds.py
data/seeds/         frozen canonical JSON
archive/ingestion/  quarantined parsers (kept in git, out of app)
```

---

## Task 1 — Branch v1 to GitHub, then set up the v2 working branch ✅ DONE (2026-07-10)

**Goal:** Preserve the entire current state as a recoverable GitHub branch before any deletion; establish `main` as the v2 workspace.

**What was done:**
- v1 final snapshot committed (`8704239`) and branched to **`v1-archive`**, pushed to `origin` (https://github.com/skyrocoster/dnd-kids-resources). v1 is fully recoverable there.
- `main` advanced with a signpost/cleanup commit (`c23acdb`): added `CLAUDE.md` + this plan, README v2 banner, removed scratch files (`test.md`, `plan-missingData.prompt.md`), and removed the vendored `.claude/skills/` + `.cursor/skills/` tool files (736 files) that had been committed by mistake — now gitignored.
- `main` is synced with `origin/main`.

**Note for later tasks:** the `.gitignore` already excludes `.claude/skills/` and `.cursor/skills/`; the scratch-file deletion that Task 4 mentioned is already handled here.

---

## Task 2 — Crystallise data & archive ingestion scripts - ✅ DONE (2026-07-10) 

**Goal:** Freeze the data set and quarantine everything that parses new/raw data. Prove the DB rebuilds from frozen seeds alone.

**What was done:**
- **Moved rebuild scripts to `scripts/`:** `scripts/init_database.py`, `scripts/seed_database.py`, `scripts/export_db_seeds.py` (with corrected paths for `DB_PATH` and `SEEDS_DIR`).
- **Archived ingestion parsers to `archive/ingestion/`:** `parse_spells_to_db.py`, `extract_5eapi_spells.py`, `convert_weapon_attacks.py`, `reparse_dungeons.py`, `parse_spells_api.py`, `parse_dungeon.py`, and supporting files.
- **Removed empty/placeholder seeds:** Deleted `seed_actions.json`, `seed_classes.json`, `seed_traps.json`, `seed_deities.json`, legacy `seed_creatures*.json`, and `data/seeds/archive/` (600+ timestamped backups).
- **Removed auto-archiving behavior:** Deleted code in `export_db_seeds.py` that created timestamped seed copies.
- **Cleaned raw source dumps:** Deleted `data/archive/5eAPI/`; `data/5eTools/` remains gitignored (no v2 reference).

**Verification (re-tested in Task 4):**
Rebuilt DB from scratch with no ingestion scripts involved:
```bash
python scripts/init_database.py && python scripts/seed_database.py
```
✅ All 14 frozen seeds loaded correctly (spells=525, monsters=2734, weapons=219, npcs=26, encounters=3, players=2, quests=1, dungeons=2, conditions=15, abilities=41, damage_types=13, weapon_properties=10, player_spells=17, player_weapons=5). DB is now the sole source of truth from frozen JSON seeds.

---

## Task 3 — Trim the DB schema to v2 tables ✅ DONE (2026-07-10)

**Goal:** Reduce the schema to only what v2 uses, shrinking the DB and removing dead surface.

**What was done:**
- **Removed 4 CREATE TABLE statements** from `scripts/init_database.py` for: `actions`, `traps`, `deities`, `classes` (also removed `creatures`, `creature_types`, `statblock_jobs` from drop list).
- **Reshaped `dungeons` table** in schema: removed `original_html` column, renamed `parsed_json` → `data` (v2: structured hand-authored dungeons only, no HTML blobs).
- **Extracted 2 existing dungeons** from the old DB (Isly Castle, Greenhouse) and created `data/seeds/seed_dungeons.json` with the new shape (id, title, data).
- **Updated `scripts/seed_database.py`**: removed `populate_actions()`, `populate_traps()`, `populate_deities()`, `populate_classes()`; updated `populate_dungeons()` to use new (id, title, data) schema.
- **Verified fresh rebuild:** DB now has exactly **14 v2 tables** (down from 18): abilities, damage_types, weapon_properties, weapons, spells, conditions, monsters, npcs, quests, encounter, dungeons, players, player_spells, player_weapons. All row counts match seeds (spells=525, monsters=2734, weapons=219, npcs=26, etc.). DB is 9.1 MB.

---

## Task 4 — Delete the v1 frontend & server ✅ DONE (2026-07-10)

**Goal:** Remove the vanilla-JS site and Flask monolith so `main` contains only data + rebuild scripts, ready for v2 scaffolding.

**What was done:**
- **Deleted all v1 app files:** `index.html`, `server_flask.py`, `launcher_gui.py`, `custom-overrides.css`; entire `pages/`, `js/`, `launchers/`, `.launcher_pids/`, `server/`, `css/`, `lib/`, `tools/`, `_dev/` directories.
- **Cleaned up docs:** Rewrote `README.md` for v2 (React + FastAPI quick start, dropped trackers/parser). Deleted `IMPLEMENTATION_COMPLETE.md`, `docs/development_plans/`, v1-specific guides (CSS theming, page checklist, spell-book migration), and `docs/unparsed_attack_note_patterns.md`. Kept `docs/FILE_STRUCTURE.md` for repo orientation.
- **Updated `.gitignore`:** Added explicit entries for v2 frontend artifacts (`frontend/node_modules`, `frontend/dist`); kept DB and `data/5eTools/` ignored.
- **Verified rebuild:** Fresh `init_database.py && seed_database.py` still succeeds with all seed data loaded (525 spells, 2734 monsters, etc.). Repo now contains only: `data/` (seeds), `scripts/` (init/seed/export), `archive/` (ingestion parsers), `docs/` (v2 plan), config files (CLAUDE.md, .gitignore, pyproject.toml, etc.), and `.git`.

---

## Task 4.5 — Testing infrastructure

**Goal:** Set up pytest for the backend and establish testing patterns before building endpoints.

**Prereqs:** Task 4. Python 3.10+, pytest installed.

**Context:** v2 is built with testing as a first-class concern. Every feature (endpoint, component, utility) must have tests. Backend uses pytest with a seeded test database; frontend will use vitest + React Testing Library (Task 7 scaffolds that).

**What's been set up:**
- `backend/requirements.txt`: pytest, pytest-asyncio, httpx for async test requests.
- `backend/tests/conftest.py`: pytest fixtures for test DB creation, seeding, and connection access.
- `backend/tests/test_example.py`: example tests showing JSON column parsing, DB relationships, and seeded-data assertions.

**Steps:**
1. Install backend dependencies: `pip install -r backend/requirements.txt` (in a venv).
2. Run the example tests: `pytest backend/tests/` — should pass 3 tests (weapons, spells, JSON parsing, relationships).
3. Read `CLAUDE.md` (testing section) for conventions: test files mirror source paths, aim for >80% coverage on new code.

**Done when:** `pytest backend/tests/` passes with all 3 example tests green. From Task 5 onward, every endpoint and non-trivial function will include its own tests.

---

## Task 5 — Scaffold the FastAPI backend

**Goal:** Stand up a FastAPI app reading the existing SQLite DB, with the connection layer and the first two routers (reference + spells).

**Prereqs:** Task 4. DB present at repo-root `dnd_kids_resources.db`.

**Context:** v1's DB access pattern (to mirror): `sqlite3.connect` with `sqlite3.Row` row factory. Many columns are JSON-encoded text (e.g. spells' `damage`, `components`, `classes`; monsters' `ac`, `hp`, `action`) and must be `json.loads`-ed in responses. Old spell read routes were at `server_flask.py` lines 2521 (`GET /api/spells`), 2595 (`GET /api/spells/<title>`), 2846/2867 (raw + PUT by id), 2558 (POST), 3805 (DELETE).

**Steps:**
1. Create `backend/` per the layout above. Add deps to `requirements.txt`: `fastapi`, `uvicorn[standard]`, `pydantic`.
2. `backend/app/db.py`: `DB_PATH` → repo-root DB; `get_conn()` with `Row` factory; a helper to parse JSON columns.
3. `backend/app/main.py`: FastAPI app, CORS for the Vite dev origin, include routers.
4. `backend/app/routers/reference.py`: `GET /api/abilities`, `/api/conditions`, `/api/damage_types`, `/api/skills`, `/api/spell-components` (port from `server_flask.py` lines 3029, 2971, 3069, 2903, 53).
5. `backend/app/routers/spells.py`: full spell CRUD + `/raw` with Pydantic models; establish the JSON-column and error conventions the other routers will copy.
6. `backend/tests/`: a pytest smoke test hitting the spell + reference endpoints. (`archive/`/old `_dev/test_all_endpoints.py` is a useful checklist of expected fields.)
7. Verify: `uvicorn app.main:app`; open `/docs`; confirm spells + reference endpoints return correctly parsed JSON.

**Done when:** FastAPI serves reference + spell endpoints from the real DB with typed responses and passing smoke tests.

---

## Task 6 — Remaining backend routers

**Goal:** Port the rest of the kept endpoints, copying the conventions from Task 5.

**Prereqs:** Task 5.

**Context — map from `server_flask.py`:**
- `monsters.py`: `GET /api/monsters` (line 75), `GET /api/monsters/<title>` (3091).
- `weapons.py`: `GET /api/weapons` (2475), `GET /api/weapons/<title>` (2497).
- `players.py`: CRUD `/api/players` (2626–2690) + nested `/api/players/<id>/spells` (2753–2800) and `/weapons` (2800–2846).
- `npcs.py`: CRUD `/api/npcs` (2690–2753).
- `quests.py`: CRUD `/api/quests` (3138, 3161, 3201, 3688, 3748).
- `encounters.py`: CRUD `/api/encounters` (3537–3688).
- `dungeons.py`: CRUD only — `GET`/`POST`/`GET by id`/`PUT`/`DELETE` (3183, 3261, 3310, 3388, 3776). **Do NOT** port `/api/dungeons/upload` (3336) or any parser call; use the new structured shape from Task 3.
- **Skip:** all `/api/traps*`, `/api/rebuild-database`, and static-page routes (`/`, `/<path>`, `/spell-cards-list`) — Vite handles routing; rebuild is a CLI step.

**Steps:** create one router per resource above with Pydantic models and JSON-column handling; register in `main.py`; extend the pytest smoke suite to cover each. Verify each via `/docs`, spot-checking a rich record (monster with legendary actions; player with assigned spells).

**Done when:** every kept endpoint is served by FastAPI with tests green, and no dropped route exists.

---

## Task 7 — Scaffold the React + Vite frontend

**Goal:** Create the frontend app, shared layout/nav, router, and typed API client — the foundation every page sits on.

**Prereqs:** Task 5 (an API to call).

**Context:** v1's `js/api.js` (`ApiService`) is the reference for the endpoint surface; reimplement as a typed client. v1's `page-shell.js` + `page-layout.css` are the reference for the shell/nav look.

**Steps:**
1. `npm create vite@latest frontend -- --template react-ts`; add `react-router-dom`.
2. `frontend/vite.config.ts`: dev proxy `/api` → `http://localhost:8000`.
3. `src/api/client.ts`: typed fetch wrapper + per-resource functions mirroring the endpoints from Tasks 5–6.
4. `src/layout/AppShell.tsx`: header/nav/footer; `src/router.tsx`: routes for the pages built in Tasks 9–10 (stub routes for now).
5. Verify: `npm run dev` with uvicorn running; shell renders; a test fetch (e.g. abilities) succeeds through the proxy.

**Done when:** the app boots, shows the shell, and can reach the API via the client.

---

## Task 8 — Shared UI components

**Goal:** Build the reusable primitives the feature pages depend on.

**Prereqs:** Task 7.

**Context:** Port logic (not code) from v1: `pane-resize.js` → resizable split pane; `card-generator.js` → printable card rendering + inline dice-roll parsing/formatting; `data-utils.js` (`parseJsonValue`, `formatDisplayValue`) → display helpers.

**Steps:** build `src/components/`: `SplitPane`, `SearchList` (searchable list panel), `Card` + `DiceText` (dice-aware card renderer), and shared form inputs used by editors. Add a lightweight print stylesheet for cards.

**Done when:** components render in isolation (a scratch route or Storybook-style page) and are ready to compose.

---

## Task 9 — Content browser pages (spells → monsters → weapons)

**Goal:** Build the three read/browse pages plus the spell edit/create modal.

**Prereqs:** Tasks 6, 8.

**Context:** Browser pattern = `SplitPane` (searchable list left, detail right) + `Card`. The spell edit modal is the one heavy piece — reimplement the structured editor from v1's `js/spells-list.js` (~1350 lines): classes multi-select, components checkboxes, area-of-effect, attack/damage roll rows with dice pickers, heal editor — as a React form posting to the spell CRUD endpoints.

**Steps:**
1. `features/spells/` — spell book: search, list, card detail. Establish the browser pattern.
2. `features/monsters/` and `features/weapons/` — reuse the pattern.
3. `features/spells/SpellEditor` — the create/edit modal wired to POST/PUT `/api/spells`.
4. Verify by driving the app (browser MCP or `/run`): search + open detail for each; create, edit, and delete a spell.

**Done when:** all three browsers work and spells are fully editable.

---

## Task 10 — Campaign CRUD & dungeons

**Goal:** Build the editable campaign pages and the custom-dungeon editor.

**Prereqs:** Tasks 6, 8 (and 9's form patterns).

**Context:** CRUD group = players (with assigned spells/weapons join tables), NPCs, quests, encounters — each backed by the Task 6 routers. Dungeons = browse the 2 seeded structured dungeons + create/edit hand-authored dungeons (rooms/entries) in the Task 3 shape; no upload/parse.

**Steps:**
1. `features/players/` — player manager incl. assigning spells and weapons.
2. `features/npcs/`, `features/quests/`, `features/encounters/` — CRUD editors.
3. `features/dungeons/` — dungeon library browse + structured custom-dungeon editor.
4. Verify: create/edit/delete for each; assign a spell to a player; author and edit a custom dungeon.

**Done when:** all kept features work end-to-end against FastAPI.

---

## Task 11 — Production wiring & final cleanup

**Goal:** Serve the built frontend from FastAPI, update docs, and confirm a clean single-command run.

**Prereqs:** Tasks 9–10.

**Steps:**
1. `vite build`; have `backend/app/main.py` serve the static `frontend/dist` bundle (SPA fallback for client routes).
2. Refresh `README.md`: v2 quick start (rebuild DB from seeds → run uvicorn / build+serve), the new layout, and the seed-editing workflow via `scripts/export_db_seeds.py`.
3. Confirm nothing references removed features (trackers, parser, traps).
4. Verify: from a clean checkout, rebuild DB, build frontend, run the server, and walk every page once.

**Done when:** v2 runs from one server serving the built app + API, docs match reality, and all kept features pass a full walkthrough.

---

## Open items (decide during the relevant task, not blockers)
- Exact structured `dungeons` shape (Task 3), finalized when building the editor (Task 10).
- Whether to keep the split Vite+uvicorn dev setup long-term or always serve the built bundle (Task 11).
