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
- **Drop entirely:** all trackers (HP, spell-slot, turn-order, character sheet).
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

## Task 6 — Remaining backend routers ✅ DONE (2026-07-10)

**Goal:** Port the rest of the kept endpoints, copying the conventions from Task 5.

**Prereqs:** Task 5.

**What was done:**
- Created `backend/app/routers/monsters.py` — read-only GET endpoints for listing and fetching monsters by ID/name
- Created `backend/app/routers/weapons.py` — CRUD endpoints for weapons with JSON property parsing
- Created `backend/app/routers/npcs.py` — CRUD endpoints for NPCs
- Created `backend/app/routers/quests.py` — CRUD endpoints for quests
- Created `backend/app/routers/encounters.py` — CRUD endpoints for encounters with JSON creatures parsing
- Created `backend/app/routers/dungeons.py` — CRUD endpoints for dungeons with JSON data parsing
- Created `backend/app/routers/players.py` — CRUD endpoints for players + nested GET `/api/players/{id}/spells` and `/weapons` endpoints with POST/DELETE assignment
- Updated `backend/app/schemas.py` with all resource models (Monster, Weapon, NPC, Quest, Encounter, Dungeon, Player)
- Registered all routers in `backend/app/main.py`
- Created comprehensive tests in `backend/tests/routers/test_monsters.py`, `test_players.py`, `test_resources.py`
- Resolved schema-alignment issues between the simplified v2 router assumptions and the actual production DB columns (e.g. players table is `id, name, class, level`).

**Verification (2026-07-10):** `python -m pytest backend/tests/` from repo root — **45/45 tests pass**. (Must be run from repo root, not `backend/`, since `conftest.py` imports `backend.app.db` as an absolute package path.)

---

## Task 7 — Scaffold the React + Vite frontend ✅ DONE (2026-07-10)

**Goal:** Create the frontend app, shared layout/nav, router, and typed API client — the foundation every page sits on.

**Prereqs:** Task 5 (an API to call).

**What was done:**
- Scaffolded `frontend/` via `npm create vite@latest -- --template react-ts`; added `react-router-dom`.
- `frontend/vite.config.ts`: dev proxy `/api` → `http://127.0.0.1:8000` (used `127.0.0.1` explicitly, not `localhost` — Node's proxy resolving `localhost` to `::1` caused a Bad Gateway against uvicorn's IPv4-only bind).
- `src/api/types.ts`: TS interfaces mirroring every Pydantic model in `backend/app/schemas.py`.
- `src/api/client.ts`: typed fetch wrapper (`request`/`get`/`post`/`put`/`del` + `ApiError`) and one function per endpoint across all 9 routers (reference, spells, monsters, weapons, players incl. nested spell/weapon assignment, npcs, quests, encounters, dungeons).
- `src/layout/AppShell.tsx` (+ `.css`): header/nav/footer shell with nav grouped into Reference and Campaign sections.
- `src/router.tsx`: `createBrowserRouter` with a home route (`src/pages/HomePage.tsx`, does a live `getAbilities()` fetch as a connectivity check) and stub routes (`src/pages/StubPage.tsx`) for spells/monsters/weapons/players/npcs/quests/encounters/dungeons.
- Removed the default Vite `App.tsx`/`App.css`/`assets/`; simplified `index.css` to a plain reset (the old centered-column starter style conflicted with the full-width shell layout).
- **Verified live:** ran `uvicorn app.main:app` + `npm run dev`, drove it in a real browser — shell renders, nav links route to stub pages, and the home page's live fetch through the proxy renders real ability names from the DB.
- **Tests:** added vitest + React Testing Library (`npm run test` → `vitest run`), config in `vite.config.ts`'s `test` block, setup file `src/test/setup.ts` (jest-dom matchers + RTL `cleanup()` after each test — vitest doesn't auto-register that like Jest does). Tests: `src/layout/__tests__/AppShell.test.tsx` (nav renders, routed outlet content), `src/pages/__tests__/StubPage.test.tsx`, `src/pages/__tests__/HomePage.test.tsx` (mocks `api/client`, covers success + error paths), `src/api/__tests__/client.test.ts` (fetch wrapper: GET/POST/DELETE, JSON parsing, `ApiError` on non-OK). 10/10 passing.

**Done when:** the app boots, shows the shell, and can reach the API via the client.

---

## Task 8 — Shared UI components ✅ DONE (2026-07-10)

**Goal:** Build the reusable primitives the feature pages depend on.

**Prereqs:** Task 7.

**Context:** Port logic (not code) from v1: `pane-resize.js` → resizable split pane; `card-generator.js` → on-screen card rendering + inline dice-roll parsing/formatting; `data-utils.js` (`parseJsonValue`, `formatDisplayValue`) → display helpers. This is an online-only, at-the-table tool (used while running games), not a print/export product — no print stylesheet needed.

**Design system:** [`docs/design-system-dark-mode.md`](design-system-dark-mode.md) defines the Material Design 3 dark-mode token system (color roles, elevation via surface tone not shadow, type scale, the spell/monster/weapon accent mapping, the dice-pill signature motif for `DiceText`).

**What was done:**
- `frontend/src/theme.css`: the full M3 dark token set from the design doc (primary/secondary/tertiary/error/surface role pairs, elevation surfaces 0–5, type scale, `[data-variant]` accent mapping for spell/monster/weapon/neutral, global focus ring, `prefers-reduced-motion` handling). Imported from `index.css`; `index.html`'s `<html>` now carries `data-theme="dark"`.
- Refactored `AppShell.css` off flat `#333` borders onto the surface-tone system (header/footer = surface-2, nav = surface-1, active nav link = primary-container).
- `src/components/SplitPane.tsx` (+ css): resizable two-pane layout. Pointer-drag resize, `role="separator"` with arrow-key/Home/End keyboard resizing, width clamped to min/max props.
- `src/components/SearchList.tsx` (+ css): searchable list panel with a `variant` prop (`spell | monster | weapon | neutral`) driving `data-variant` for accent theming; filters by label substring, `role="listbox"`/`role="option"` semantics.
- `src/components/Card.tsx` (+ css) and `src/components/DiceText.tsx` (+ css): `Card` is the variant-themed detail-pane renderer (title/subtitle/tag/body/footer); `DiceText` regex-parses inline dice notation (`2d6+3`, `1d20`, etc.) and wraps matches in the gold monospace pill — the app's signature motif per the design doc, since dice notation is shared across spells/monsters/weapons.
- `src/components/form/`: `TextField` (incl. multiline/textarea mode), `SelectField`, `CheckboxField`, `MultiSelectField` (checkbox group with add/remove semantics, built for the Task 9 spell-editor classes multi-select) — all M3-token-styled, sharing `form.css`.
- `src/pages/ComponentDemoPage.tsx` at route `/demo` (not in the shipped nav): composes `SplitPane` + `SearchList` + `Card` + `DiceText` + all form primitives with sample spell/monster/weapon data for visual review.
- Added `@testing-library/user-event` dev dependency for interaction tests.
- **Tests:** one test file per component (`__tests__/`), covering rendering, filtering, keyboard resize, dice-notation edge cases (single/multiple/modifier/whitespace), variant theming, and controlled-input behavior. `npm run test` → **38/38 passing** across 12 files.

**Note:** `npm run build`'s `tsc -b` step fails on a pre-existing `vite.config.ts` type error from Task 7 (the `test` block isn't recognized by the base `UserConfigExport` overload) — confirmed via `git stash` that this predates Task 8. Not in scope here; `npm run test` is this repo's verification path until that's fixed.

**Done when:** components render in isolation (a scratch route or Storybook-style page) and are ready to compose. ✅ via `/demo`.

---

## Task 9 — Content browser pages (spells → monsters → weapons)

**Goal:** Build the three read/browse pages plus the spell edit/create modal.

**Prereqs:** Tasks 6, 8.

**Context:** Browser pattern = `SplitPane` (searchable list left, detail right) + `Card`. The spell edit modal is the one heavy piece — reimplement the structured editor from v1's `js/spells-list.js` (~1350 lines): classes multi-select, components checkboxes, area-of-effect, attack/damage roll rows with dice pickers, heal editor — as a React form posting to the spell CRUD endpoints.

**Components available from Task 8 (`frontend/src/components/`), use these, don't rebuild:**
- `SplitPane` (`left`, `right`, `leftLabel`, `defaultLeftWidth`/`minLeftWidth`/`maxLeftWidth`) — the list/detail shell for all three browsers.
- `SearchList<T>` (`items`, `getId`, `getLabel`, `getMeta`, `selectedId`, `onSelect`, `variant`, `searchPlaceholder`, `emptyMessage`) — generic, filters by label substring client-side. Pass `variant="spell" | "monster" | "weapon"` per browser to pick up the matching M3 accent (violet/teal/gold) from `theme.css`.
- `Card` (`title`, `subtitle`, `tag`, `variant`, `children`, `footer`) — the detail-pane renderer; `variant` must match the `SearchList` variant used alongside it.
- `DiceText` (`text`) — wrap any spell/monster/weapon prose that may contain dice notation (damage, healing, to-hit) so `2d6+3`-style expressions render as the gold pill. Regex-based, no dice-picker UI yet — the spell editor's "dice pickers" (step 3 below) are a separate, new piece of UI, not something `DiceText` provides.
- `form/`: `TextField` (has a `multiline` boolean for textarea mode), `SelectField`, `CheckboxField`, `MultiSelectField` (`options`, `selected: string[]`, `onChange`) — `MultiSelectField` was built specifically for the spell editor's classes multi-select, reuse it as-is.
- Live reference: run the app and open `/demo` (`frontend/src/pages/ComponentDemoPage.tsx`, not in the shipped nav) to see all of the above composed with sample spell/monster/weapon data before wiring real API data in.
- All components consume `frontend/src/theme.css` tokens (see `docs/design-system-dark-mode.md`) — don't introduce new hex colors; extend the token file if a role is missing.

**Steps:**
1. `features/spells/` — spell book: search, list, card detail using `SplitPane` + `SearchList` (`variant="spell"`) + `Card` + `DiceText`. Establish the browser pattern.
2. `features/monsters/` and `features/weapons/` — reuse the pattern with `variant="monster"` / `variant="weapon"` respectively.
3. `features/spells/SpellEditor` — the create/edit modal wired to POST/PUT `/api/spells`, built from the `form/` primitives (`MultiSelectField` for classes, `CheckboxField` for components/concentration/ritual). The dice-picker rows for attack/damage/heal are new UI this task must design — no existing primitive covers them.
4. Verify by driving the app (browser MCP or `/run`): search + open detail for each; create, edit, and delete a spell.

**Done when:** all three browsers work and spells are fully editable.

---

## Task 10 — Campaign CRUD & dungeons

**Goal:** Build the editable campaign pages and the custom-dungeon editor.

**Prereqs:** Tasks 6, 8 (and 9's form patterns).

**Context:** CRUD group = players (with assigned spells/weapons join tables), NPCs, quests, encounters — each backed by the Task 6 routers. Dungeons = browse the 2 seeded structured dungeons + create/edit hand-authored dungeons (rooms/entries) in the Task 3 shape; no upload/parse.

**Components available from Task 8/9:** these pages have no dedicated content-browser identity (per the design doc, campaign CRUD intentionally uses neutral surfaces only, no accent hue), so use `variant="neutral"` on `SearchList`/`Card` rather than picking a new color. All form work (player/NPC/quest/encounter/dungeon editors) should use the same `form/` primitives from Task 8 (`TextField`, `SelectField`, `CheckboxField`, `MultiSelectField`) that Task 9's `SpellEditor` establishes patterns for — check how Task 9 wired `MultiSelectField` and modal/form submission before inventing a new approach here, especially for the player↔spell/weapon assignment UI (conceptually a multi-select against a live API list rather than a static options array).

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

**Known issue to resolve here:** since Task 7, `npm run build` (`tsc -b && vite build`) has failed on a `vite.config.ts` type error — the `test` block isn't recognized by the base `UserConfigExport` overload (missing/misordered `/// <reference types="vitest/config" />`, or a `tsconfig` project-reference gap). It's never blocked work because `npm run test` (`vitest run`) doesn't go through `tsc -b`, but Task 11 requires an actual production build, so this must be fixed first.

**Steps:**
1. Fix the `tsc -b` / `vite.config.ts` build error (see above), then `vite build`; have `backend/app/main.py` serve the static `frontend/dist` bundle (SPA fallback for client routes).
2. Refresh `README.md`: v2 quick start (rebuild DB from seeds → run uvicorn / build+serve), the new layout, and the seed-editing workflow via `scripts/export_db_seeds.py`.
3. Confirm nothing references removed features (trackers, parser, traps).
4. Verify: from a clean checkout, rebuild DB, build frontend, run the server, and walk every page once.

**Done when:** v2 runs from one server serving the built app + API, docs match reality, and all kept features pass a full walkthrough.

---

## Open items (decide during the relevant task, not blockers)
- Exact structured `dungeons` shape (Task 3), finalized when building the editor (Task 10).
- Whether to keep the split Vite+uvicorn dev setup long-term or always serve the built bundle (Task 11).
