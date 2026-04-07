# D&D Kids Resources - Copilot Instructions

Guidelines for working with the D&D card generation system.

## Quick Reference

| Task | File |
|------|------|
| Getting started, setup, printing | [README.md](README.md) |
| Adding new card types or features | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Color codes and CSS classes | [COLORS.md](COLORS.md) |
| System architecture, data flow, JavaScript modules | [ARCHITECTURE.md](ARCHITECTURE.md) |

## System Architecture

**Data Flow:** Database/JSON → Flask API → JavaScript rendering → CSS styling

**Data Storage:**
- **SQLite database** (`dnd_kids_resources.db`): Spells, Conditions, Creatures, Abilities, Damage Types, Skills, Wild Shapes, Dungeons
- **JSON files** (`data/`): Weapons (currently empty—cards are HTML/JS driven)
- **Flask API** (`server_flask.py`): Runs on port 8000, endpoints at `/api/{spells,conditions,creatures,abilities,damage_types,etc}`

**Rendering:** Card generation centralized in `js/card-generator.js`, styling in `css/styles.css`

**File Structure:**
- `pages/` - HTML templates (load JS initializers)
- `js/` - Card initializers + `card-generator.js` (shared), `bw-mode-toggle.js` (print preview)
- `css/` - All styling (print-optimized, A4 9-card grid)
- `_dev/` - Dev utilities: `init_database.py` (schema setup), `reparse_dungeons.py`

## Card Development Workflow

### Adding Database-Driven Cards (Spells, Conditions, Creatures)

**Data Storage Pattern:**
- Store text fields as **lowercase** in database (e.g., "blinded", "wizard", "frost")
- API response capitalizes for display (e.g., "Blinded", "Wizard", "Frost")
- Use lowercase version as `level` field for CSS class selection (prevents case-sensitivity bugs)

**Steps:**
1. Insert data into appropriate table (`spells`, `conditions`, `creatures`, etc)
2. Create `.html` template in `pages/` (copy existing, modify title)
3. Create `.js` initializer in `js/` to fetch from `/api/endpoint`
4. Add to `index.html` tools grid
5. Test: Start Flask server (`python server_flask.py`), verify API response format, check rendering and print layout

### Adding JSON-Based Cards (Weapons)

1. Create JSON file in `data/` directory
2. Create `.html` template in `pages/`
3. Create `.js` initializer to load JSON data
4. Add to `index.html` tools grid
5. Test: Check browser console, verify rendering, print layout

## Color System

**Card styling:** CSS classes in `css/styles.css` control header/footer colors. Set `data.level` to class name (e.g., `"wizard"`, `"level1"`).

**Ability & Damage Type colors:** Stored in database (`abilities` and `damage_types` tables) with emoji and hex color values.

## Print Optimization

All cards are A4 9-card grid optimized (63.5mm × 88.9mm per card).

**Features:**
- B&W preview toggle: Click "📄 Print B&W" button to preview grayscale. Preference saved to localStorage.
- Color accuracy: CSS uses `print-color-adjust: exact` to preserve colors
- Page breaks: CSS prevents card splitting across pages
- Availability: Button implemented on all card pages (spells, conditions, creatures, skills, weapons)

**To print:** Enable "Background graphics" in browser print dialog, use A4 paper size.

## Common Tasks

Detailed workflows: See [CONTRIBUTING.md](CONTRIBUTING.md) for adding card types, data formats, and templates.

Architecture details: See [ARCHITECTURE.md](ARCHITECTURE.md) for card-generator.js, JavaScript patterns, and deployment.

Key files to avoid modifying carelessly:
- `js/card-generator.js` - Core rendering (affects all cards)
- `css/styles.css` - All styling (affects all cards)
- `index.html` - Navigation hub

## Development Environment (Windows PowerShell)

**Environment Setup:**
- OS: Windows 10/11
- Python: 3.12.7 (installed)
- Virtual environment: `.venv/` (activate with `& ".venv\Scripts\Activate.ps1"`)
- Flask: Development server on port 8000
- Database: SQLite3 (`dnd_kids_resources.db`)

**Start Development:**
1. Activate venv: `& ".venv\Scripts\Activate.ps1"`
2. Run server: `python server_flask.py`
3. Open browser: `http://127.0.0.1:8000`
4. Test API: `Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/spells" -UseBasicParsing`

**Works on Windows:**
- PowerShell cmdlets: `Get-ChildItem`, `Test-Path`, `Move-Item`, `Remove-Item`
- `Invoke-WebRequest` for HTTP requests (NOT `curl`)
- `python` command for scripts
- `sqlite3` CLI for database queries
- Virtual environments and pip packages
- File operations native to PowerShell

**Does NOT work:**
- Unix tools: `ls`, `cat`, `grep`, `head`, `tail`, `sed`
- Bash/sh syntax or Unix heredocs
- `curl` command (PowerShell aliases it differently)
- Shell redirections like `2>/dev/null` (use PowerShell `-ErrorAction` instead)

**PowerShell Tips:**
- Use `Get-Content file.txt` instead of `cat`
- Use `Select-String -Pattern "term" file.txt` instead of `grep`
- Use double quotes for paths with spaces: `"C:\Path With Spaces\file.txt"`
- For background processes use `isBackground=true` in terminal or `Start-Process` cmdlet
