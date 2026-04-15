# D&D Kids Resources - Copilot Instructions

Guidelines for working with the D&D card generation system in this repository.

## Quick Reference

| Task | File |
|------|------|
| Getting started, setup, printing | [README.md](README.md) |
| Adding new card types or features | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Color codes and CSS classes | [COLORS.md](COLORS.md) |
| System architecture, data flow, JavaScript modules | [ARCHITECTURE.md](ARCHITECTURE.md) |

## System Architecture

**Data Flow:** JSON/Database → Flask API → JavaScript rendering → CSS styling

**Data Storage:**
- **SQLite database** (`dnd_kids_resources.db`): Spells, Conditions, Creatures, Abilities, Damage Types, Skills, Wild Shapes, Dungeons
- **JSON files** (`data/`): Seed and source data (spells, conditions, creatures, abilities, damage types, traps, dungeons)
- **Flask API** (`server_flask.py`): Runs on port 8000, endpoints at `/api/{spells,conditions,creatures,abilities,damage_types,dungeons,...}`

**Rendering:** Card generation is driven by `js/card-generator.js`, with page-specific initializers under `js/`.

**File Structure:**
- `pages/` - Browser-accessible tool pages (resources, spell list, parser, trackers)
- `js/` - Page logic and shared rendering helpers
- `css/` - Global styles and print layout
- `_dev/` - Development utilities for database setup, import, and testing
- `tools/` - Persistent repo utilities and stable development tools
- `tempscripts/` - Temporary or disposable scripts for experiments and one-off tasks

## Card Development Workflow

### Adding Database-Driven Cards (Spells, Conditions, Creatures)

**Data Storage Pattern:**
- Store normalized values in the database
- Use the API to fetch data for the browser pages
- Keep presentation styling separate from raw data

**Steps:**
1. Add or update seed/source data in `data/`
2. If needed, update `_dev/seed_database.py` to load the new data into SQLite
3. Create a `pages/` template or reuse an existing page
4. Add a page-specific initializer in `js/`
5. Test with `python server_flask.py`, then verify the page loads and renders correctly

### Adding JSON-Based Cards

1. Create JSON source in `data/`
2. Create an HTML page under `pages/`
3. Add a JS initializer that loads the JSON and renders cards
4. Add the page to navigation if needed
5. Test in a browser and check the JS console for errors

## Color System

**Card styling:** CSS classes in `css/styles.css` control header/footer colors. Use semantic class names such as `cantrip`, `level1`, `wizard`, `blinded`, etc.

**Ability & Damage Type Colors:** Stored in the database and used by the UI to enrich display.

## Print Optimization

This project is optimized for A4 printing.

**Features:**
- B&W preview toggle in supported pages
- `print-color-adjust: exact` for ink/color fidelity
- Page-safe card layout and print-friendly spacing
- Print-specific UI hiding for non-print controls

**To print:** enable background graphics and use A4 paper size.

## Common Tasks

Whenever a change affects repository conventions, folder layout, or developer workflows, ask whether the documentation should be updated and keep docs in sync.

Detailed workflows are in the repo docs:
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

Key files to avoid modifying carelessly:
- `js/card-generator.js` — core rendering
- `css/styles.css` — styling and print rules
- `index.html` — landing/navigation hub

## Windows Development Environment

**Environment Setup:**
- OS: Windows 10/11
- Python: 3.12.x
- Virtual environment: `.venv`
- Flask server: `server_flask.py`
- Database: `dnd_kids_resources.db`

**Activate venv (PowerShell):**
```powershell
& ".\.venv\Scripts\Activate.ps1"
```

**Activate venv (CMD):**
```cmd
.\.venv\Scripts\activate.bat
```

**Common commands:**
```powershell
python _dev/init_database.py
python _dev/seed_database.py
python server_flask.py
```

**Verify API:**
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/spells" -UseBasicParsing
```

## Windows-friendly guidance

**Works on Windows:**
- `Get-ChildItem`, `Test-Path`, `Move-Item`, `Remove-Item`
- `Invoke-WebRequest` (prefer over `curl` aliases)
- `python` for scripts
- `sqlite3` for DB inspection
- `.venv` activation via PowerShell or CMD
- File paths with backslashes and quotes

**Avoid on Windows:**
- Unix shell commands: `ls`, `cat`, `grep`, `head`, `tail`, `sed`
- Bash/sh syntax and Unix-specific redirection
- `curl` alias behavior in PowerShell
- shell redirections like `2>/dev/null` — use PowerShell `-ErrorAction` instead
- Execute python directly whenever possible

**PowerShell tips:**
- Use `Get-Content file.txt` instead of `cat`
- Use `Select-String -Pattern "term" file.txt` instead of `grep`
- Quote paths with spaces: `"C:\Path With Spaces\file.txt"`
- For background tasks, prefer `Start-Process` or terminal `isBackground=true`
