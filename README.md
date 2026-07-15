# D&D Kids Resources — v2

**Online D&D 5th Edition tools and reference cards for kids, built for running games at the table.**

🎲 Spell cards • 🗺️ Dungeon tools • 🧙 Campaign manager

---

## v2 Stack

This is a **ground-up rebuild** running on:
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** FastAPI + SQLite
- **Data:** Frozen seeds in `data/seeds/` (canonical source of truth)

**Status:** v2 rebuild complete. See [`docs/v2-rebuild-plan.md`](docs/v2-rebuild-plan.md) for the staged task breakdown.

---

## Quick Start

### 1. Rebuild the database from frozen seeds
```bash
python scripts/init_database.py
python scripts/seed_database.py
```

### 2. Run the FastAPI backend
```bash
cd backend
pip install -r requirements.txt
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
- `seed_quests.json`, `seed_encounters.json` — campaign data
- `seed_conditions.json`, `seed_damage_types.json`, `seed_weapon_properties.json`

To export seed-backed DB changes back to seeds:
```bash
python scripts/export_db_seeds.py
```

Dungeons and Map Lab layouts are runtime-created and intentionally are not exported as seeds.

---

## Documentation

- [`docs/v2-rebuild-plan.md`](docs/v2-rebuild-plan.md) — Full task breakdown
- [`docs/design-system-dark-mode.md`](docs/design-system-dark-mode.md) — Material Design 3 dark-mode token system used by `frontend/src/theme.css` and every shared component in `frontend/src/components/`
- [`docs/`](docs/) — Additional guides and architecture notes

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
