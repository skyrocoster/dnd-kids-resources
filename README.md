# D&D Kids Resources — v2

**Online D&D 5th Edition tools and reference cards for kids, built for running games at the table.**

🎲 Spell cards • 🗺️ Dungeon tools • 🧙 Campaign manager

---

## v2 Stack

This is a **ground-up rebuild** running on:
- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** FastAPI + SQLite
- **Data:** Frozen seeds in `data/seeds/` (canonical rebuild inputs)

**Status:** v2 rebuild complete. Current maintenance work is tracked in the [documentation manifest](docs/README.md).

---

## Quick Start

### 1. Rebuild the database from frozen seeds
```bash
python scripts/init_database.py
python scripts/seed_database.py
```

### 2. Install and run the FastAPI backend
```bash
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload
```

The API will be at `http://localhost:8000` with docs at `/docs`.

### 3. Run the React frontend (development)
```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to the backend and serves the app at `http://localhost:5173`.

### 4. Build and serve as one
```bash
cd frontend && npm run build
cd ../backend && uvicorn app.main:app
```

Serves the built SPA + API from `http://localhost:8000`.

---

## Features (v2)

### Content Browsers
- Spell cards with full metadata and editing
- Monster library with stat blocks
- Weapon reference

### Campaign Manager
- Create and manage player characters
- Assign spells and weapons to players
- NPC library and quest tracker
- Combat encounter builder

### Dungeons
- Create and edit custom dungeons in Map Lab (no upload/parse or prototype dungeon data)

**Dropped in v2:** HP tracker, spell slot tracker, turn order, character sheet, dungeon HTML parser.

---

## Data

Canonical seed files in `data/seeds/`:
- `seed_abilities.json` — abilities, skills, modifiers
- `seed_spells.json` — 525 spells with full metadata
- `seed_monsters.json` — 2700+ monsters
- `seed_weapons.json` — 200+ weapons
- `seed_npcs.json`, `seed_players.json` — characters
- `seed_encounters.json` — campaign data
- `seed_dungeons.json`, `seed_map_layouts.json`, `seed_map_session_state.json` — authored dungeons
- `seed_conditions.json`, `seed_damage_types.json`, `seed_weapon_properties.json`

To back the database up to seed files:
```bash
python scripts/export_db_seeds.py --dry-run   # review first
python scripts/export_db_seeds.py             # then write
```

`scripts/init_database.py` drops every table, so **anything you authored and did not export is lost on
the next rebuild.** All 20 tables are exported, including dungeons, Map Lab layouts, and map session
state. Restore them with `python scripts/seed_database.py --dungeons`.

Two safeguards: an empty table will not overwrite a populated seed file (pass `--allow-empty` when
that is genuinely what you want), and a column mismatch aborts the run instead of silently skipping
the table.

Column lists are generated, not hand-written:
```bash
python scripts/generate_export_schema.py --write      # after a schema change
python scripts/generate_export_schema.py --check      # CI runs this
python scripts/generate_export_schema.py --check-db   # drift vs. your live database
```

---

## Documentation

- [Documentation manifest](docs/README.md) — task routing, active-plan status, and the complete documentation inventory
- [AI instructions](CLAUDE.md) — authoritative workflow and documentation contract for AI contributors

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
