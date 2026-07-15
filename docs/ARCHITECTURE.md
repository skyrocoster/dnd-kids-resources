# Architecture — D&D Kids Resources v2

This doc describes the folder structure, backend/frontend conventions, and request flow. Read this to understand where code lives and why before exploring the codebase.

## Stack

- **Backend:** FastAPI + SQLite (no ORM, raw SQL via `db.py`)
- **Frontend:** React + Vite + TypeScript, no global state library (local/component state only)
- **Database:** SQLite, gitignored and rebuilt from seed files, never hand-edited as a source of truth

## Backend Layout

`backend/app/` — FastAPI application entry and router registration.

| File | Purpose |
|---|---|
| `main.py` | FastAPI app instance, CORS setup, router imports + registration, healthcheck endpoint |
| `db.py` | SQLite connection helper, resolves database path, connection pooling |
| `schemas.py` | Pydantic request/response models (Ability, Condition, Spell, Monster, Weapon, Item, LootBundle, Player, NPC, Quest, Encounter, Dungeon, MapLayoutBlob + their Create/Update variants) |

**`backend/app/routers/`** — 11 domain-specific routers, each mounted at `/{domain}`:

| Router | Endpoint prefix | Purpose |
|---|---|---|
| `spells.py` | `/spells` | Spell CRUD, query by ID/title, reference data |
| `monsters.py` | `/monsters` | Monster CRUD, query by ID/name |
| `weapons.py` | `/weapons` | Weapon CRUD, query by ID/name |
| `items.py` | `/items` | Treasure item catalog CRUD |
| `loot.py` | `/loot-bundles` | Loot bundle CRUD with snapshotted JSON contents |
| `players.py` | `/players` | Player CRUD, player spell/weapon roster management |
| `npcs.py` | `/npcs` | NPC CRUD and details |
| `quests.py` | `/quests` | Quest CRUD and details |
| `encounters.py` | `/encounters` | Encounter CRUD, creature rosters |
| `dungeons.py` | `/dungeons` | Dungeon CRUD (room navigation data stored in `data` JSON column) |
| `layouts.py` | `/dungeons/{dungeon_id}/layout` | Dungeon map layout save/load (MapLayoutBlob) |
| `reference.py` | `/abilities`, `/conditions`, `/damage_types`, `/weapon_properties`, `/skills`, `/spell-components` | Read-only reference data (abilities, conditions, damage types, weapon properties, skills, spell components) |

**Backend convention: no models/ or services/ directories.** Business logic lives directly in routers + `db.py`/`schemas.py`. This is intentional: routers are small (~100–300 lines each), and queries/mutations are straightforward enough to live inline without a separate models layer. If logic becomes complex later, extract it as router helper functions, not a separate file structure.

**`backend/tests/`** — test files mirror router structure. Each `backend/app/routers/X.py` has a corresponding `backend/tests/routers/test_X.py`. `conftest.py` sets up a test database from the real schema (`scripts/init_database.py`) + seed data (`data/seeds/*.json`), ensuring tests reflect production DB structure.

## Frontend Layout

`frontend/src/` — React application root.

| Folder | Purpose |
|---|---|
| `api/` | Single API client (`client.ts`) that speaks to the backend + centralized TypeScript type definitions (`types.ts`) |
| `components/` | Shared UI primitives (Card, ConfirmDialog, DiceText, FloatingWindow, SearchList, SplitPane) + subdirs for form inputs and icon components |
| `features/` | Domain modules — `dungeons/`, `encounters/`, `items/`, `loot/`, `monsters/`, `npcs/`, `players/`, `quests/`, `spells/`, `weapons/`. Each feature dir contains pages, editor forms, and local state management. |
| `pages/` | Top-level router pages (HomePage, ComponentDemoPage, StubPage) — entry points for each route |
| `layout/` | AppShell.tsx — header, nav, footer layout that wraps all pages |
| `router.tsx` | React Router configuration (routes, page-to-path mappings) |
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

This pattern is copied across all 8 feature domains. If building a new feature domain, follow the same structure.

**Frontend convention: no global state library, no hooks/ or types/ directories.** State is local to components or lifted to a Model layer (`dungeonModel.ts` pattern). TypeScript types live in `api/types.ts` (centralized, auto-synced with backend schemas.py in practice) or co-located with components as needed. This is intentional — the app is small enough that global state would be premature complexity.

## Data Flow

```
data/seeds/*.json (canonical truth)
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

**The database is never a source of truth.** Edit `data/seeds/*.json`, then rebuild the database via the two scripts. This keeps schema and data in sync with the codebase (not hand-edited DB state). See `docs/DATA_MODEL.md` for the seed-to-table mapping.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/init_database.py` | Creates SQLite schema (`CREATE TABLE` statements) in `dnd_kids_resources.db` |
| `scripts/seed_database.py` | Loads all `data/seeds/*.json` files into the database |
| `scripts/export_db_seeds.py` | Exports current database back to `data/seeds/*.json` (useful for one-off seed updates) |
| `scripts/start_server.ps1` (Windows) | Starts the FastAPI dev server (localhost:8000) |
| `scripts/stop_server.ps1` (Windows) | Stops the server process |

## Where to Look Next

- **API endpoint inventory:** [`docs/API_REFERENCE.md`](API_REFERENCE.md)
- **Seed domains & table relationships:** [`docs/DATA_MODEL.md`](DATA_MODEL.md)
- **Test pass/fail contract:** [`docs/TESTING.md`](TESTING.md)
- **Feature plan (current stage, next steps):** `docs/<feature>_plan.md` (e.g., `dungeon_plan.md`, `encounters_plan.md`)
- **Design system reference:** [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — color tokens, type scale, icons, component anatomy, accessibility floor
