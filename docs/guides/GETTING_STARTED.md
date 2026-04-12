# Getting Started Guide

## What Is This?

D&D Kids Resources is a local web toolkit for generating printable D&D 5th Edition reference cards, trackers, and utilities aimed at younger players.

The app is built to work with both offline pages and a Flask-backed API for database-driven content.

## Prerequisites

- Python 3.8+ with pip
- A modern browser (Chrome, Edge, Firefox, Safari)
- Optional: a local Python virtual environment

## Quick Start

### 1. Create and activate a Python environment

```bash
python -m venv .venv
```

On Windows PowerShell:

```powershell
& ".\.venv\Scripts\Activate.ps1"
```

On Windows CMD:

```cmd
.venv\Scripts\activate.bat
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Initialize the database

```bash
python _dev/init_database.py
python _dev/seed_database.py
```

### 4. Run the Flask server

```bash
python server_flask.py
```

Then open `http://localhost:8000`.

### What works with the Flask server?

- ✅ Spell cards
- ✅ Condition cards
- ✅ Creature cards
- ✅ Skill/ability references
- ✅ Weapon cards
- ✅ Printable trackers and character sheet
- ✅ Dungeon library and stat-block parser pages

### 5. Open the app

- `index.html` — main entry point
- `pages/resources.html` — resource hub with quick links and admin actions
- `http://localhost:8000/spell-cards-list` — spell card list view
- `pages/stat-block-parser.html` — queue-based parser UI

## Development server alternatives

If you want to preview static pages without Flask:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Database sources

The project seeds data from:

- `data/5eAPI/spells.json` — spell metadata
- `data/seed_conditions.json` — conditions
- `data/seed_creatures.json` — creature/wild-shape data
- `data/seed_abilities.json` — abilities, skills, and modifiers
- `data/seed_damage_types.json` — damage type metadata

## Updating cards and data

To rebuild the database from the seed files:

```bash
python _dev/init_database.py
python _dev/seed_database.py --force
```

For spell data updates, edit `data/5eAPI/spells.json` or the seed file used by your workflow.

## Notes

- The canonical docs are in `/docs`.
- The `/docs/planning` section contains design and historical notes; not every file reflects the current runtime state.
- If you see broken routes or missing files, check `docs/guides/FILE_STRUCTURE.md` and `docs/architecture/ARCHITECTURE.md` for the current implementation.

## Troubleshooting

**Server fails to start**
- Confirm Python is installed: `python --version`
- Confirm virtual environment is active
- Confirm port 8000 is free on your machine

**Cards fail to load**
- Make sure the Flask server is running
- Check browser console for fetch errors
- Verify `dnd_kids_resources.db` exists after seeding

**Database reset**

```bash
del dnd_kids_resources.db
python _dev/init_database.py
python _dev/seed_database.py
```

## Next steps

- Add new card content via `data/` and `_dev/seed_database.py`
- See [docs/development/CONTRIBUTING.md](../development/CONTRIBUTING.md)
- See [docs/architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)

For the full documentation hub, see [../README.md](../README.md).
