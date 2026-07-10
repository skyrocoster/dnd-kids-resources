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
frontend/           React + Vite + TS
  src/ api/ layout/ components/ features/ router.tsx
  vite.config.ts    dev proxy /api -> :8000
scripts/            init_database.py, seed_database.py, export_db_seeds.py
data/seeds/         frozen canonical JSON
archive/ingestion/  quarantined parsers (kept in git, out of app)
```

---

## Task 1 — Branch v1 to GitHub, then set up the v2 working branch

**Goal:** Preserve the entire current state as a recoverable GitHub branch before any deletion; establish `main` as the v2 workspace.

**Prereqs:** none. Repo has uncommitted changes (see `git status`) and untracked `plan-missingData.prompt.md`, `test.md`.

**Context:** Git user `skyrocoster`. Current branch `main`. There is a GitHub remote (README references it). The 135 MB `dnd_kids_resources.db` is gitignored and must stay so.

**Steps:**
1. Commit or stash the current working-tree changes so the tree is clean (a "v1 final snapshot" commit is fine).
2. Create and push branch `v1-archive` capturing this exact state: `git branch v1-archive && git push -u origin v1-archive`. Verify it exists on GitHub.
3. Return to `main` (this is where v2 work happens).
4. Delete the scratch files `plan-missingData.prompt.md` and `test.md`.

**Done when:** `v1-archive` is visible on GitHub with the full v1 tree; `main` is clean and ready for cleanup.

---

## Task 2 — Crystallise data & archive ingestion scripts

**Goal:** Freeze the data set and quarantine everything that parses new/raw data. Prove the DB rebuilds from frozen seeds alone.

**Prereqs:** Task 1.

**Context:**
- Seeds live in `data/seeds/`. Keepers with record counts: `seed_spells.json` (525), `seed_monsters.json` (2734), `seed_weapons.json` (219), `seed_npcs.json` (26), `seed_encounters.json` (3), `seed_players.json` (2), `seed_player_spells.json` (17), `seed_player_weapons.json`, `seed_quests.json`, `seed_abilities.json`, `seed_conditions.json`, `seed_damage_types.json`, `seed_weapon_properties.json`.
- Empty/placeholder seeds (`[]` or near-empty) to remove: `seed_actions.json`, `seed_classes.json`, `seed_traps.json`, `seed_deities.json`, and legacy `seed_creatures*.json` under `data/seeds/archive/`.
- Ingestion scripts to archive: `_dev/parse_spells_to_db.py`, `_dev/extract_5eapi_spells.py`, `_dev/convert_weapon_attacks.py`, `_dev/reparse_dungeons.py`, `_dev/parse_spells_api.py`, and `lib/parse_dungeon.py` (+ `lib/README.md`).
- Raw source dumps: `data/5eTools/` (already gitignored) and `data/archive/5eAPI/`.
- Rebuild scripts to KEEP: `_dev/init_database.py` (schema), `_dev/seed_database.py` (JSON→DB loader), `_dev/export_db_seeds.py`.
- `data/seeds/archive/` holds 600+ timestamped backups — noise now.

**Steps:**
1. `git mv` the ingestion scripts listed above into `archive/ingestion/` (keep them in history, out of the app).
2. Move the kept rebuild scripts into a new top-level `scripts/` dir: `scripts/init_database.py`, `scripts/seed_database.py`, `scripts/export_db_seeds.py`. Fix their internal `DB_PATH`/`SEEDS_DIR` path constants for the new location.
3. Delete the empty/placeholder seeds and the legacy `data/seeds/archive/` backups (the seed files themselves are now the frozen record).
4. In `export_db_seeds.py`, remove the behaviour that auto-writes timestamped copies into `data/seeds/archive/` on every run.
5. Delete raw dumps `data/archive/5eAPI/`; leave `data/5eTools/` on disk but confirm it stays gitignored and unreferenced by v2.
6. Verify: delete the DB, run `python scripts/init_database.py && python scripts/seed_database.py`, confirm it succeeds reading only `data/seeds/` and row counts match the seeds above.

**Done when:** the DB rebuilds cleanly from frozen seeds with no ingestion script involved, and the archived parsers are out of the app tree.

---

## Task 3 — Trim the DB schema to v2 tables

**Goal:** Reduce the schema to only what v2 uses, shrinking the DB and removing dead surface.

**Prereqs:** Task 2.

**Context:** `scripts/init_database.py` creates 18 tables. v1 `dungeons` stores `original_html` + `parsed_json`; v2 uses hand-authored structured dungeons only (no HTML). Spell class-availability already lives in the `spells.classes` JSON column, so the empty `classes` table is redundant.

**Steps:**
1. In `scripts/init_database.py`, remove `CREATE TABLE` (and drop-list entries) for: `actions`, `traps`, `deities`, `classes`, `creatures`, `creature_types`, `statblock_jobs`. Keep: `abilities`, `damage_types`, `weapon_properties`, `weapons`, `spells`, `conditions`, `monsters`, `npcs`, `quests`, `encounter`, `dungeons`, `players`, `player_spells`, `player_weapons`.
2. Reshape the `dungeons` table: drop `original_html`; keep `title` + a `rooms`/`data` JSON column holding the structured dungeon (from what was `parsed_json`). Produce a `seed_dungeons.json` for the 2 existing dungeons by extracting their `parsed_json` into the new shape, and add a loader for it in `scripts/seed_database.py`.
3. Remove the corresponding `populate_*` functions in `scripts/seed_database.py` for dropped tables.
4. Verify: rebuild the DB from scratch; confirm only v2 tables exist and the DB size dropped substantially (dungeon HTML blobs gone).

**Done when:** a fresh rebuild yields exactly the v2 tables, dungeons load in the new structured shape, and no dropped-table code remains.

---

## Task 4 — Delete the v1 frontend & server

**Goal:** Remove the vanilla-JS site and Flask monolith so `main` contains only data + rebuild scripts, ready for v2 scaffolding.

**Prereqs:** Task 3 (DB rebuild proven independent of the old server).

**Context:** v1 app files to remove: `index.html`; `pages/` (all 16 HTML files); `js/` (all 22 modules); `css/styles.css`, `css/page-layout.css`, `css/spell-book-custom.css`, root `custom-overrides.css`; `server_flask.py`; `launcher_gui.py`, `launchers/`, `.launcher_pids/`; empty `server/` dir; `tools/browser_error_checker.py`. Dead JS already noted (`spells.js`, `queue-helper.js`, stub `turn-order.js`/`character-sheet.js`) is covered by removing `js/`.

**Steps:**
1. Delete the files/dirs listed above. (They remain recoverable on `v1-archive`.)
2. Clean up docs: reduce `docs/` and `README.md` to reflect v2 only — remove references to trackers, the stat-block parser, dungeon upload/parsing, and stale ingestion workflow. Delete `IMPLEMENTATION_COMPLETE.md` and outdated files under `docs/development_plans/` and `docs/guides/`.
3. Update `.gitignore` if needed (keep DB + `data/5eTools/` ignored; add `frontend/node_modules`, `frontend/dist`).
4. Verify: `python scripts/init_database.py && python scripts/seed_database.py` still works; the tree now holds only `data/`, `scripts/`, `archive/`, `docs/`, config files, and the DB.

**Done when:** v1 app/server code is gone from `main`, docs describe v2 only, and the data rebuild still passes.

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
