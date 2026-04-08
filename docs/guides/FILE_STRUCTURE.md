# File Structure Organization

## Root Directory
Core application and entry points only:
- `server_flask.py` - Main Flask server
- `index.html` - Web application entry point
- `requirements.txt` - Python dependencies
- `README.md` - Project intro (points to /docs/)
- `dnd_kids_resources.db` - SQLite database

## `/launchers`
Startup scripts for the application:
- `start-server.ps1` - Start Flask server (PowerShell)
- `start_manual.bat` - Start queue worker manually (Batch)
- `launch_manager.bat` - Database manager app (Batch)
- `launch_queue_monitor.bat` - Start GUI queue monitor

## `/server`
Server utilities:
- `queue_monitor.py` - GUI application for monitoring/managing parsing queue

## `/tools`
Development utilities and testing scripts:
- `check_db_schema.py` - Inspect database schema
- `check_spell.py` - Query and test spell data
- `test_special_field.html` - HTML test page

## `/logs`
Application logs (auto-generated at runtime):
- `server.log` - Flask server logs
- `flask_test.log` - Test logs
- `server_test.log` - Server test logs

## `/docs`
**Central documentation hub** (organized by topic):

### `/docs/guides` - Getting Started
- `README.md` - Docs index and navigation hub
- `GETTING_STARTED.md` - Setup and running the project
- `FILE_STRUCTURE.md` - This file

### `/docs/architecture` - System Design
- `ARCHITECTURE.md` - Component overview and data flow
- `SCHEMA_DESIGN.md` - Database schema and data model
- `schema_view.txt` - Full SQL schema dump
- `DB_RESTRUCTURING_PLAN.md` - Database migration notes

### `/docs/development` - Contributing
- `CONTRIBUTING.md` - How to add new features and cards
- `COLORS.md` - Color system and styling reference

### `/docs/planning` - Project History
- `PHASE_1_2_COMPLETE.md` - Completed work summary
- `ABILITIES_WITH_SKILLS.md` - Skills integration notes
- `ABILITIES_ID_MIGRATION.md` - Database migration history
- `QUEUE_SYSTEM.md` - Job queue system design
- `SCALING_PLAN.md` - Future scaling strategies

## `/pages`
HTML templates for card types and tools:
- `spell-cards.html` - Spell card template
- `condition-cards.html` - Condition card template
- `creatures.html` - Creature card template
- `skill-cards.html` - Skill card template
- `weapon-cards.html` - Weapon card template
- `character-sheet.html` - Character sheet
- `hp-tracker.html` - HP tracking tool
- `turn-order-tracker.html` - Turn order tracker
- And others...

## `/js`
JavaScript for interactive features:
- `card-generator.js` - Core card rendering logic
- `spells.js` - Spell card initializer
- `conditions.js` - Condition card initializer
- `creatures.js` - Creature card initializer
- `skills.js` - Skill card initializer
- `weapons.js` - Weapon card initializer
- `bw-mode-toggle.js` - Black & white print preview toggle
- `character-sheet.js` - Character sheet functionality
- `hp-tracker.js` - HP tracker functionality
- `turn-order.js` - Turn order tracker functionality
- And other utilities...

## `/css`
Styling (all in one main file):
- `styles.css` - All styles (print-optimized for A4 9-card grid)

## `/data`
Seed data for database initialization:
- `seed_spells.json` - Spell definitions
- `seed_conditions.json` - Condition definitions
- `seed_creatures.json` - Creature definitions
- `seed_creature_types.json` - Creature types
- `seed_damage_types.json` - Damage types
- `seed_abilities.json` - Abilities and modifiers
- `seed_traps.json` - Trap definitions
- `seed_dungeons.json` - Dungeon definitions

## `/_dev`
Development utilities for database and testing:
- `init_database.py` - Create database schema
- `seed_database.py` - Load seed data
- `queue_worker.py` - Background job processor for AI parsing
- Migration scripts and testing utilities

## `/lib`
Python library code for parsing and utilities:
- `parse_statblock.py` - AI-powered stat block parser
- `parse_dungeon.py` - Dungeon parsing logic
- And other utilities

## `/models`
AI model files:
- `mistral-7b-instruct-v0.1.Q4_K_M.gguf` - Local LLM for parsing

## Hidden/System Directories

- `.venv/` - Python virtual environment (git-ignored)
- `.git/` - Git repository
- `.github/` - GitHub workflow files
- `.vscode/` - VS Code settings
- `__pycache__/` - Python bytecode cache
- `.gitignore` - Git ignore rules

## Quick Navigation

**To start the app:**
- `launchers/start-server.ps1` (PowerShell on Windows)

**To see documentation:**
- `docs/README.md` - Full documentation hub

**To manage database:**
- `_dev/init_database.py` - Create schema
- `_dev/seed_database.py` - Load data
- `tools/check_db_schema.py` - Inspect schema

**To add new spells:**
- Edit `data/seed_spells.json`
- Run `python _dev/seed_database.py --force`

---

All code is organized with a clear separation of concerns:
- **Frontend** (pages, js, css, data)
- **Backend** (server_flask.py, lib/)
- **Tools** (tools, launchers)
- **Development** (_dev)
- **Documentation** (docs)
