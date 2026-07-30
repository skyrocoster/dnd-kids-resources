# Architecture — D&D Kids Resources v2

This doc describes the folder structure, backend/frontend conventions, and request flow. Read this to understand where code lives and why before exploring the codebase.

## Stack

- **Backend:** FastAPI + SQLite (no ORM, raw SQL via `db.py`)
- **Frontend:** React + Vite + TypeScript, no global state library (local/component state only); the Loom uses a purpose-built static grid renderer
- **Database:** SQLite, gitignored and rebuilt from seed files; dungeons and Map Lab layouts are runtime-authored records

## Backend Layout

`backend/app/` — FastAPI application entry and router registration.

| File | Purpose |
|---|---|
| `main.py` | FastAPI app instance, CORS setup, router imports + registration, healthcheck endpoint |
| `db.py` | SQLite connection helper, resolves database path, enables foreign keys, and opens/closes a connection per `get_db()` use |
| `schemas.py` | Pydantic request/response models (Ability, Condition, Spell, Monster, Weapon, Item, LootBundle, Player, NPC, Encounter, Dungeon, MapLayoutBlob + their Create/Update variants) |

**`backend/app/routers/`** — 15 domain-specific routers, each mounted under `/api`:

| Router | Endpoint prefix | Purpose |
|---|---|---|
| `spells.py` | `/api/spells` | Spell CRUD, query by ID/title, reference data |
| `monsters.py` | `/api/monsters` | Monster CRUD, query by ID/name |
| `weapons.py` | `/api/weapons` | Weapon CRUD, query by ID/name |
| `items.py` | `/api/items` | Treasure item catalog CRUD |
| `loot.py` | `/api/loot-bundles` | Loot bundle CRUD with snapshotted JSON contents |
| `players.py` | `/api/players` | Player CRUD, player spell/weapon roster management |
| `npcs.py` | `/api/npcs` | NPC CRUD and details |
| `encounters.py` | `/api/encounters` | Encounter CRUD, creature rosters |
| `dungeons.py` | `/api/dungeons` | Runtime-created dungeon CRUD (room-reading data stored in `data` JSON column) |
| `layouts.py` | `/api/dungeons/{dungeon_id}/layout` | Dungeon map layout save/load (MapLayoutBlob) |
| `session_state.py` | `/api/dungeons/{dungeon_id}/session-state` | Door/stair/portal toggle persistence (play-mode) |
| `fog.py` | `/api/dungeons/{dungeon_id}/revealed-cells` | Fog-of-war revealed-cell ratchet (player app) |
| `at_the_table.py` | `/api/at-the-table` | Single-row dungeon pointer for the player app |
| `loom.py` | `/api/loom` | Ordered Thread story tracker |
| `reference.py` | `/api/abilities`, `/api/conditions`, `/api/damage_types`, `/api/weapon_properties`, `/api/skills`, `/api/spell-components` | Read-only reference data |

**Backend convention: no models/ or services/ directories.** Business logic lives directly in routers + `db.py`/`schemas.py`. This is intentional: routers are small (~100–300 lines each), and queries/mutations are straightforward enough to live inline without a separate models layer. If logic becomes complex later, extract it as router helper functions, not a separate file structure.

**`backend/tests/`** — test files mirror router structure. Each `backend/app/routers/X.py` has a corresponding `backend/tests/routers/test_X.py`. `conftest.py` sets up a test database from the real schema (`scripts/init_database.py`) + seed data (`data/seeds/*.json`), ensuring tests reflect production DB structure.

## Frontend Layout

`frontend/src/` — React application root.

| Folder | Purpose |
|---|---|
| `api/` | Single API client (`client.ts`) that speaks to the backend + centralized TypeScript type definitions (`types.ts`) |
| `components/` | Shared UI primitives (Card, ConfirmDialog, DiceText, FloatingWindow, SearchList, SplitPane) + subdirs for form inputs and icon components |
| `features/` | Domain modules — `dungeons/`, `encounters/`, `items/`, `loot/`, `monsters/`, `npcs/`, `players/`, `spells/`, `weapons/`. Each feature dir contains pages, editor forms, and local state management. |
| `model/` | Pure domain models shared by both the DM app and the Player app (`maplabModel.ts`). Modules here must import nothing from `components/`, `features/`, `layout/`, or `pages/` — enforced by the `no-restricted-imports` override in `frontend/.oxlintrc.json`, after a work order once lifted a helper here with a `features/` import and nothing caught it until reconcile. |
| `player/` | Player app shell, navigation, curtain (player-view transform), kid-facing components, and the `/play/map` live map renderer/data seam |
| `pages/` | Top-level router pages (HomePage, ComponentDemoPage, StubPage) — entry points for each route |
| `layout/` | AppShell.tsx — header, nav, footer layout that wraps all pages; navSections.ts — shared nav-section → route map consumed by AppShell's rail/drawer and HomePage's chapter tabs |
| `router.tsx` | React Router configuration; exports a `routes` array (dev-only `demo` route gated by `import.meta.env.DEV`) and the `router` built from it |
| `theme.css` | Material Design 3 dark-mode tokens (--md-primary, --md-surface-1, --type-headline, etc.) — design system; consume these, never hand-pick colors |
| `index.css` | Global resets and baseline styles |
| `main.tsx` | React app entry point (React.createRoot) |

**Frontend convention: Browser/View/Editor/Model pattern.** Each feature directory follows this shape:

```
features/dungeons/
├── DungeonBrowserPage.tsx      # list / create / delete
├── dungeonModel.ts             # read-only content model (rooms, entries, NPCs)
└── maplab/
    ├── DungeonShell.tsx         # layout route with view/edit mode toggle
    ├── MapLabPage.tsx           # viewer (read + encounter/NPC use)
    ├── MapLabEditorPage.tsx     # editor (geometry + content authoring)
    ├── maplabEditor.ts          # editor reducer (31 actions)
    ├── maplabPresentation.ts    # icon-bearing presentation helpers
    ├── useMapLabLayout.ts       # viewer layout fetch
    ├── useMapLabEditor.ts       # editor hook (dual-save)
    ├── RoomDetailsPanel.tsx     # viewer room-reading sidebar
    ├── RoomContentEditor.tsx    # editor content inspector
    ├── InspectorPanel.tsx       # fixture inspector (viewer)
    ├── ViewerRoomRail.tsx       # floor-grouped room navigation
    ├── MapCanvas.tsx            # SVG canvas renderer
    └── ... (markers, badges, CSS, tests)
```

This pattern is used across the nine feature domains. If building a new feature domain, follow the local shape that fits its UI.

**Frontend convention: no global state library, no hooks/ or types/ directories.** State is local to components or lifted to a Model layer (`dungeonModel.ts` pattern). TypeScript types live in `api/types.ts` (centralized, auto-synced with backend schemas.py in practice) or co-located with components as needed. This is intentional — the app is small enough that global state would be premature complexity.

**Frontend convention: validated reference text.** `components/referenceText.ts` owns the
framework-neutral parsed-node model, registry, authored-text validation, and context resolution.
Brace parsing is domain-agnostic; registered definitions own token metadata, value lookup, and readable
fallbacks. `DiceText` owns the shared rendered-rule-text pipeline: it presents dice notation and wraps
matched entries from the bundled rule glossary with the shared inline disclosure component.

**Frontend convention: standard browser routes.** Standard catalog browsers use `BrowserLayout` for the routed `PageHeader`, action slot, error alert, `SplitPane`, and optional editor/confirmation-dialog slots. They pass `listCollapsible` so the shared list rail exposes the persisted collapse/restore control on desktop. They model the collection request with `RemoteState<T>` and pass its loading/error status to `SearchList`; a selected item sets `detailOpen`, which at `520px` presents a detail-only view with an in-flow Back-to-list button. Feature routes keep their own sorting, selection, detail card, editor, and deletion behavior.

**Frontend convention: player route family.** `/play` is a top-level sibling of `/`, outside `AppShell`, and owns descendants such as `/play/map` inside `PlayerShell`. Player routes use native route targets, offer no route out of `/play`, and keep their data seams/renderers under `frontend/src/player/` rather than importing DM feature components.

## Data Flow

```
data/seeds/*.json (canonical reference and campaign data)
          ↓
    scripts/init_database.py (builds schema)
          ↓
    scripts/seed_database.py (loads seeds)
          ↓
    dnd_kids_resources.db (SQLite, gitignored, rebuilt not hand-edited)
          ↓
    backend/app/db.py (connection helper)
          ↓
    backend/app/routers/*.py (query/mutate)
          ↓
    frontend/src/api/client.ts (HTTP calls)
          ↓
    frontend/src/features/*/Model.ts (local state, re-renders)
```

`data/seeds/*.json` is canonical input for seed-backed domains, while normal API and UI operations read and write SQLite. Edit seeds, then rebuild the database with the two scripts to make seed changes live. Dungeons and layouts are runtime-created, so a rebuild starts with neither. See `DATA_MODEL.md` for the seed-to-table mapping.

## Scripts

Generated from each script's module docstring (or leading comment) — do not hand-edit. A script's
flags are its own `--help`; the invoke-only rule in [../CLAUDE.md](../CLAUDE.md) means you run that
rather than read the source.

<!-- GENERATED:ARCHITECTURE:SCRIPTS:START -->
| Script | What it does |
|---|---|
| `scripts/check_demo_database.py` | Validate that the local demo SQLite database matches required app columns. |
| `scripts/check_docs.py` | Documentation contract checker for the D&D Kids Resources repo. |
| `scripts/check_orders.py` | Work-order linter — enforce the compiling rules the telemetry log paid to learn. |
| `scripts/export_db_seeds.py` | Export current database tables into JSON files under data/seeds. |
| `scripts/generate_export_schema.py` | Derive the export schema from init_database.py instead of restating it by hand. |
| `scripts/generate_spell_quick_rules.py` | Draft conservative spell quick rules from canonical seed data. |
| `scripts/generate_weapon_quick_rules.py` | Draft conservative weapon quick rules from canonical seed data. |
| `scripts/init_database.py` | Create the canonical SQLite schema — the single source of truth every other table list derives from. |
| `scripts/large_read_guard.py` | Unbounded large-file read guard for the compiler role. |
| `scripts/migrate_loom_v2.py` | Migrate a Loom database from the flat-DAG schema (v1) to the ordered-threads schema (v2). |
| `scripts/migrate_map_obstacle_state.py` | Migrate map obstacle state to the new structured format. |
| `scripts/migrate_monsters.py` | Transform legacy 5etools monster seed rows to the M1 target shape. |
| `scripts/migrate_spells.py` | Transform legacy spell seed rows to the canonical target shape. |
| `scripts/new_order.py` | Emit a work order in the maximum shape a work order is allowed to have. |
| `scripts/order_check.py` | STOP WHEN wrapper: run an order's checks and print only what the executor can act on. |
| `scripts/order_telemetry.py` | Extract token telemetry for one completed work order and append it to the running log. |
| `scripts/read_guard.py` | Post-edit re-read guard, shared by every harness that runs a work order. |
| `scripts/seed_database.py` | Populate the database from the canonical JSON seeds in data/seeds. |
| `scripts/stage_check.py` | Run every reconcile-time check and print a summary short enough to read once. |
| `scripts/derive-kid-palette.mjs` | DP1: Kid-palette solver — deterministic bounded search for four kid-map family colours. |
| `scripts/generate-md3-tokens.mjs` | DP1: Material Design 3 color-token generator via material-color-utilities. |
| `scripts/demo_down.ps1` | Stops the demo backend and cloudflared tunnel started by demo_up.ps1. |
| `scripts/demo_up.ps1` | Starts a public demo: builds the frontend into frontend/dist, runs the backend (which serves that build directly, single process), and opens a cloudflared tunnel to it. |
| `scripts/open_responsive_checks.ps1` | Opens one Chrome window per viewport width from the VF4 gate's manual verification matrix (320px, 375px, 768px, and a desktop width), each pointed at the frontend dev server. |
| `scripts/opencode_remote.ps1` | Starts a headless opencode server bound to this machine's LAN address so you can drive it from a phone or tablet on the same network via a plain browser. |
| `scripts/start_server.ps1` | Starts both the frontend dev server (Vite @ 5173) and backend (FastAPI @ 8000) as background processes, so this terminal is free to keep using. |
| `scripts/stop_server.ps1` | Stops both the backend and frontend dev servers started by start_server.ps1. |
<!-- GENERATED:ARCHITECTURE:SCRIPTS:END -->

The database lifecycle scripts and their flags are documented in
[areas/infra.md](areas/infra.md#tooling).

## Where to Look Next

- **API endpoint inventory:** [`docs/API_REFERENCE.md`](API_REFERENCE.md)
- **Seed domains & table relationships:** [`docs/DATA_MODEL.md`](DATA_MODEL.md)
- **Test pass/fail contract:** [`docs/TESTING.md`](TESTING.md)
- **Area routing and active work:** [`docs/areas/`](areas/) — open the relevant area guide, then follow its active-plan link when present
- **Design system reference:** [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — color tokens, type scale, icons, component anatomy, accessibility floor

<!-- GENERATED:ARCHITECTURE:START -->
### Generated Registration Inventory

Backend routers registered in `main.py`: `reference.py`, `spells.py`, `monsters.py`, `weapons.py`, `items.py`, `loot.py`, `players.py`, `npcs.py`, `encounters.py`, `dungeons.py`, `layouts.py`, `session_state.py`, `knowledge.py`, `fog.py`, `at_the_table.py`, `loom.py`.

Frontend feature directories: `dungeons/`, `encounters/`, `items/`, `loom/`, `loot/`, `monsters/`, `npcs/`, `players/`, `spells/`, `weapons/`.
<!-- GENERATED:ARCHITECTURE:END -->
