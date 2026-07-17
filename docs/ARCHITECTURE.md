# Architecture — D&D Kids Resources v2

This doc describes the folder structure, backend/frontend conventions, and request flow. Read this to understand where code lives and why before exploring the codebase.

## Stack

- **Backend:** FastAPI + SQLite (no ORM, raw SQL via `db.py`)
- **Frontend:** React + Vite + TypeScript, no global state library (local/component state only); `@xyflow/react` (React Flow) for the Loom tapestry canvas
- **Database:** SQLite, gitignored and rebuilt from seed files; dungeons and Map Lab layouts are runtime-authored records

## Backend Layout

`backend/app/` — FastAPI application entry and router registration.

| File | Purpose |
|---|---|
| `main.py` | FastAPI app instance, CORS setup, router imports + registration, healthcheck endpoint |
| `db.py` | SQLite connection helper, resolves database path, enables foreign keys, and opens/closes a connection per `get_db()` use |
| `schemas.py` | Pydantic request/response models (Ability, Condition, Spell, Monster, Weapon, Item, LootBundle, Player, NPC, Encounter, Dungeon, MapLayoutBlob + their Create/Update variants) |

**`backend/app/routers/`** — 11 domain-specific routers, each mounted under `/api`:

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
    ├── maplabModel.ts           # coordinate/geometry model (MapLayout)
    ├── maplabEditor.ts          # editor reducer (21 actions)
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

**Frontend convention: standard browser routes.** Standard catalog browsers use `BrowserLayout` for the routed `PageHeader`, action slot, error alert, `SplitPane`, and optional editor/confirmation-dialog slots. They model the collection request with `RemoteState<T>` and pass its loading/error status to `SearchList`; a selected item sets `detailOpen`, which at `520px` presents a detail-only view with an in-flow Back-to-list button. Feature routes keep their own sorting, selection, detail card, editor, and deletion behavior.

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

| Script | Purpose |
|---|---|
| `scripts/init_database.py` | Creates SQLite schema (`CREATE TABLE` statements) in `dnd_kids_resources.db` |
| `scripts/seed_database.py` | Loads all `data/seeds/*.json` files into the database |
| `scripts/export_db_seeds.py` | Exports seed-backed tables back to `data/seeds/*.json`; run with `--dry-run` before overwriting files. Runtime dungeons are never exported. |
| `scripts/start_server.ps1` (Windows) | Starts the FastAPI dev server (localhost:8000) |
| `scripts/stop_server.ps1` (Windows) | Stops the server process |

## Where to Look Next

- **API endpoint inventory:** [`docs/API_REFERENCE.md`](API_REFERENCE.md)
- **Seed domains & table relationships:** [`docs/DATA_MODEL.md`](DATA_MODEL.md)
- **Test pass/fail contract:** [`docs/TESTING.md`](TESTING.md)
- **Area routing and active work:** [`docs/areas/`](areas/) — open the relevant area guide, then follow its active-plan link when present
- **Design system reference:** [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — color tokens, type scale, icons, component anatomy, accessibility floor

<!-- GENERATED:ARCHITECTURE:START -->
### Generated Registration Inventory

Backend routers registered in `main.py`: `reference.py`, `spells.py`, `monsters.py`, `weapons.py`, `items.py`, `loot.py`, `players.py`, `npcs.py`, `encounters.py`, `dungeons.py`, `layouts.py`, `loom.py`.

Frontend feature directories: `dungeons/`, `encounters/`, `items/`, `loom/`, `loot/`, `monsters/`, `npcs/`, `players/`, `spells/`, `weapons/`.
<!-- GENERATED:ARCHITECTURE:END -->
