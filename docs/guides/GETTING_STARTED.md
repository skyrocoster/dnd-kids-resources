# Getting Started Guide

## What Is This?

D&D Kids Resources is a web-based toolkit for creating printable D&D 5th Edition reference cards. All cards are designed for standard A4 printing (9 cards per page, 63.5mm × 88.9mm each).

Perfect for:
- Kids learning D&D mechanics
- Quick in-game reference cards  
- Cutout-and-keep card sets
- Interactive digital cards

## Prerequisites

- Python 3.8+ (with pip)
- A modern web browser
- Virtual environment (recommended)

## Quick Start

### 1. Set Up Python Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate

# On Mac/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Flask Server

```bash
python server_flask.py
# OR use the launcher:
launchers/start-server.ps1  (PowerShell on Windows)
```

Visit `http://localhost:8000` in your browser.

The Flask server provides:
- ✅ Spell cards (from database)
- ✅ Condition cards (from database)
- ✅ Creature cards (with stat blocks)
- ✅ Skill cards
- ✅ Weapon cards (JSON)
- ✅ Character sheet & trackers

### 4. (Optional) Start Queue Worker for AI Parsing

If you want to use the AI-powered stat block parser:

```bash
# Using launcher:
launchers/launch_queue_monitor.bat

# OR manually:
python _dev/queue_worker.py --verbose
```

This starts the GUI monitor for the parsing queue.

## Launching Without Flask

For basic features (weapons, character sheet, trackers) that don't need the database:

```bash
# Option 1: Python's built-in server
python -m http.server 8000

# Option 2: Node.js http-server
npx http-server

# Option 3: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:8000`

## Project Structure

For the complete file organization, see [File Structure](FILE_STRUCTURE.md)

Key directories:
- `pages/` - HTML card templates
- `js/` - Card generators and utilities
- `css/` - All styling (print-optimized)
- `data/` - Seed JSON files
- `_dev/` - Database initialization and utilities
- `launchers/` - Startup scripts
- `tools/` - Development utilities

## Database

The project uses SQLite (`dnd_kids_resources.db`):

**Initialize database:**
```bash
python _dev/init_database.py
python _dev/seed_database.py
```

**Add or modify spells** in `data/seed_spells.json`, then reseed:
```bash
python _dev/seed_database.py --force
```

## Troubleshooting

**Flask server won't start:**
- Check Python is installed: `python --version`
- Check virtual environment is activated
- Check port 8000 isn't in use: `lsof -i :8000` (Mac/Linux) or `netstat -ano | findstr :8000` (Windows)

**Cards not loading:**
- Make sure Flask server is running (`http://localhost:8000`)
- Check browser console for errors (F12)
- Verify database exists: `dnd_kids_resources.db`

**Need to reset everything:**
```bash
# Remove database and recreate
del dnd_kids_resources.db
python _dev/init_database.py
python _dev/seed_database.py
```

## Next Steps

- **Add spells:** Edit `data/seed_spells.json` and reseed
- **Customize colors:** See [Color Configuration](../development/COLORS.md)
- **Add features:** See [Contributing Guide](../development/CONTRIBUTING.md)
- **Understand architecture:** See [System Architecture](../architecture/ARCHITECTURE.md)

For full documentation, see [Documentation Hub](../README.md)
