# File Structure Organization

This guide describes the current directory structure, key scripts, and conventions for the D&D Kids Resources repository. For the latest updates, see the main README.md and docs/README.md.


## Root Directory
Key entry points and scripts:
- `server_flask.py` — Main Flask server
- `dnd_kids_resources.db` — Local SQLite database
- `index.html` — Primary browser landing page
- `launcher_gui.py` — Local GUI launcher and monitor helper
- `requirements.txt` — Python dependencies
- `README.md` — Project overview and quick start
- `docs/` — Central documentation hub

## `/launchers`
Startup helpers:
- `launch_gui.bat` — Launch the GUI helper on Windows
- `launch_gui.ps1` — Launch the GUI helper in PowerShell
- `start-server.ps1` — Start the Flask server in PowerShell

## `/server`
Support code and server utilities for production or development

## `/logs`
Application logs (auto-generated at runtime):
- `server.log` — Flask server logs
- `flask_test.log` — Test logs
- `server_test.log` — Server test logs

## `/docs`
**Central documentation hub** (organized by topic):

### `/docs/guides`
- `README.md` — Docs index and navigation hub
- `FILE_STRUCTURE.md` — This file

### `/docs/development`
- (currently empty)

> Additional architecture and contributing docs are not currently available in this repository.

### `/docs/planning`
- (currently empty)

## `/pages`
Current browser pages and tools:
- `resources.html` — Main resource hub and admin page
- `spell-cards-list.html` — Spell cards list view
- `stat-block-parser.html` — AI parser and queue UI
- `character-sheet.html` — Printable character sheet
- `hp-tracker.html` — Health tracker
- `turn-order-tracker.html` — Initiative tracker
- `spell-slots.html` — Spell slot tracker
- `dungeons-library.html` — Dungeon upload/library

## `/js`
Client-side scripts:
- `card-generator.js` — Core rendering engine
- `spells-list.js` — Spell cards list view logic
- `spells-v2.js` — Alternate spell cards UI
- `bw-mode-toggle.js` — B&W print preview toggle
- `character-sheet.js` — Character sheet behavior
- `hp-tracker.js` — HP tracker logic
- `turn-order.js` — Initiative tracker logic
- `wild-shapes.js` — Wild shape card rendering
- `queue-helper.js` — Queue support utilities
- `spell-slots.js` — Spell slot tracker

## `/css`
- `styles.css` — Styling and print optimization for A4 card layout

## `/data`
Seed and source data files:
- `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json` — Spell metadata source
- `data/seeds/seed_conditions.json` — Condition card seeds
- `data/seeds/seed_creature_types.json` — Creature type metadata
- `data/seeds/seed_creatures.json` — Creature/wild-shape seeds
- `data/seeds/seed_damage_types.json` — Damage type metadata
- `data/seeds/seed_abilities.json` — Abilities, skills, and modifiers
- `data/seeds/seed_traps.json` — Trap definitions
- `data/seeds/seed_dungeons.json` — Dungeon module seeds
- `data/seeds/seed_actions.json` — Basic action definitions and rule explanations
- `data/seeds/seed_spells.json` — Optional spell seed fallback

Developer seed export workflow:
- `python _dev/export_db_seeds.py` — archive legacy `data/seed_*.json` files into `data/seeds/archive` and export current DB contents to `data/seeds/`

## `/_dev`
Development utilities for database and testing:
- `init_database.py` — Create the SQLite schema
- `seed_database.py` — Populate the database from JSON sources
- `extract_5eapi_spells.py` — Spell parsing helper
- `parse_spells_to_db.py` — Convert 5eTools spell JSON to app schema
- `reparse_dungeons.py` — Reparse dungeon HTML data
- `test_spell_parsing.py` — Parser test harness
- `view_abilities.py` — Ability metadata inspection

## `/lib`
Python library code:
- `parse_dungeon.py` — Dungeon HTML parser
- Other utility modules

## Hidden/System Directories

- `.venv/` — Python virtual environment (git-ignored)
- `.git/` — Git repository
- `.github/` — GitHub workflow files
- `.vscode/` — VS Code settings
- `__pycache__/` — Python bytecode cache
- `.gitignore` — Git ignore rules

## Quick Navigation

**To start the app:**
- `launchers/start-server.ps1`

**To see documentation:**
- `docs/README.md`

**To rebuild the database:**
- `python _dev/init_database.py`
- `python _dev/seed_database.py --force`

**To inspect the schema:**
- `tools/check_db_schema.py`

---

The repo is organized around a clear separation of concerns:
- **Frontend**: pages, js, css, data
- **Backend**: server_flask.py, lib/
- **Data**: data/, dnd_kids_resources.db
- **Developer tools**: _dev/, tools/, launchers/, tempscripts/
- **Documentation**: docs/

Use `tools/` for stable, reusable utilities and repo tooling. Use `tempscripts/` for temporary or experimental scripts that are not intended to remain long-term.
