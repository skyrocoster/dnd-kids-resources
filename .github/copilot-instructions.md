# D&D Kids Resources - Copilot Instructions

Guidelines for working with the D&D card generation system.

## Documentation Reference

When helping with different tasks, consult these files:

| Task | Reference File |
|------|---|
| **Getting started, setup, printing** | [README.md](README.md) |
| **Adding new card types or features** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Color codes, hex values, CSS classes** | [COLORS.md](COLORS.md) |
| **System architecture, data flow, JavaScript modules** | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Navigation and doc overview** | [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md) |

## Architecture Principles

**Data-Driven Card System:** Data (SQL/JSON) → JavaScript rendering → CSS styling
- **Database-driven** (via Flask API): Spells, Conditions, Creatures
  - Stored in SQLite database (`dnd_kids_resources.db`)
  - Endpoint: `/api/spells`, `/api/conditions`, `/api/creatures`
- **JSON-driven**: Weapons
  - Stored in `data/` directory
  - Loaded directly by JavaScript initializers
- Card rendering is centralized in `js/card-generator.js`
- Colors come from: CSS classes (card headers/footers) + database (ability/damage metadata)
- All styles unified in `css/styles.css`

**File Organization:**
- `pages/` - HTML card templates (minimal—just load JS)
- `data/` - Card data only (JSON files, no logic)
- `js/` - One initializer per card type + shared generator
- `css/` - All styling (print-optimized)

## Card Development Workflow

### Data Storage Pattern (Consistent Across All Tables)

**All string fields that display on cards should follow this pattern:**
- **Storage**: Store as lowercase in database (e.g., "blinded", "fox", "beast")
- **Display**: Capitalize at the point of use via API response (e.g., "Blinded", "Fox", "Beast")
- **CSS**: Use lowercase version as the `level` field for CSS class selection

**Why?** This prevents case-sensitivity bugs, maintains consistent styling across card types, and makes the data more predictable.

**Applied to:**
- Conditions: `title` stored as lowercase, capitalized in API response
- Creatures: `title`, `size`, `type` stored as lowercase, capitalized in API response
- Any future database-driven cards should follow this same pattern

### For JSON-based cards (Weapons):
1. **Add card data** → Create JSON in `data/`
2. **Create page** → Copy template from `pages/` folder
3. **Create initializer** → Use template from [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Link in homepage** → Add to `index.html` tools grid
5. **Test** → Check browser console for errors, verify print layout

### For database-driven cards (Spells, Conditions, Creatures):
1. **Add card data** → Insert into appropriate database table
   - Store text fields as **lowercase** (title, size, type, etc.)
   - Store complex data as **JSON** (to_hit, damage in same format as spells)
2. **Create page** → Copy template from `pages/` folder
3. **Create initializer** → Fetch from `/api/endpoint` (see patterns for spells/conditions/creatures)
4. **Create conversion function** → In `server_flask.py`, add `convert_db_type_to_api_format()` that:
   - Capitalizes display fields (title, size, type, etc.) in API response
   - Uses lowercase version as `level` field for CSS
   - Enriches roll objects with ability/damage metadata
5. **Add API endpoints** → Get all + get by title (case-insensitive search)
6. **Link in homepage** → Add to `index.html` tools grid
7. **Test** → Run Flask server, verify API response format matches spell/condition pattern

## Color System

**Card styling colors:** [COLORS.md](COLORS.md) documents CSS class colors for card headers, footers, and backgrounds.

**Ability & Damage Type colors:** Now stored in the SQLite database:
- `abilities` table: Contains emoji and color for STR, DEX, CON, INT, WIS, CHA, SAM, SAD, etc.
- `damage_types` table: Contains emoji and color for fire, cold, slashing, piercing, acid, poison, etc.

Card colors applied via CSS:
1. Set `data.level` to CSS class name (e.g., `"wizard"`, `"level1"`)
2. CSS automatically applies header + footer color
3. See COLORS.md for card styling colors and database tables for ability/damage colors

## Print Optimization

All cards are designed for:
- **A4 paper** (9 cards per page, 3×3 grid)
- **Playing card dimensions** (63.5mm × 88.9mm)
- **Exact color preservation** (CSS has `color-adjust: exact`)
- **@media print** rules handle breaks automatically
- **Black & White preview mode** (fixed toggle button, persists preference)

### Print Features
- **B&W Mode Toggle:** Every card page has a "📄 Print B&W" button (top-right) to preview in grayscale
  - Click to convert page to 100% black & white
  - Perfect for checking ink savings or previewing B&W printouts
  - Preference saved to localStorage (remembers on next visit)
  - Button auto-hides when printing
- **Color accuracy:** Colors are preserved with `print-color-adjust: exact`
- **Page breaks:** CSS prevents card splitting across pages

When debugging print issues, check:
- Page size is A4
- "Background graphics" enabled in print dialog
- Card doesn't span across pages (CSS prevents this)
- B&W mode toggled correctly if applicable

## Common Tasks

**See [CONTRIBUTING.md](CONTRIBUTING.md) for:**
- Adding a new card type with step-by-step examples
- Card data format (JSON structure)
- HTML/JavaScript templates to copy

**See [ARCHITECTURE.md](ARCHITECTURE.md) for:**
- How the card-generator.js system works
- JavaScript module patterns
- NPC system implementation
- Deployment notes

## Key Files (Don't Modify Without Care)

- `js/card-generator.js` - Core rendering engine (used by all card types)
- `css/styles.css` - All styling (changes affect every card) + B&W mode toggle styling
- `js/bw-mode-toggle.js` - B&W print preview mode functionality
- `index.html` - Navigation hub

Adding new **JSON-based** card types does NOT require modifying these files—only adding new JSON + initializer. For **database-driven** cards, add data to the database and create a new initializer that fetches from the appropriate API endpoint.

## Recent Quality Improvements (April 2026)

**UI Enhancements:**
- Added B&W print preview toggle (page-wide grayscale filter with localStorage persistence)
- Implemented on all card pages: spells, conditions, creatures, skills, weapons

**Database Corrections:**
- **Spell 55 (Wither and Bloom):** Removed non-standard `types` field from heal JSON for consistency
- **Spell 21 (Ice Knife):** Fixed multi-roll naming from "primary"/"secondary" to "A"/"B" for proper emoji numbering

**Rendering Fixes:**
- **Damage types:** Fixed CSS property typo (`gaps` → `gap`) and added space before emoji for proper formatting (e.g., "🔥 fire" instead of "🔥fire")

**QA Tools Added** (in `_dev/`):
- Scripts to validate spell data consistency, heal field structure, and multi-roll naming conventions

## Development Setup

```bash
# Local testing
python -m http.server 8000
# Visit http://localhost:8000

# VS Code: Install "Live Server" extension
# Right-click index.html → "Open with Live Server"
```

## Testing Checklist

**For JSON-based cards:**
- [ ] JSON is valid (test in browser console with JSON.parse)
- [ ] Page loads without console errors
- [ ] Cards render with correct colors and emojis
- [ ] Print preview shows 9 cards per page
- [ ] Card header/footer colors match COLORS.md

**For database-driven cards (Spells, Conditions):**
- [ ] Flask server running (`python _dev/server_flask.py`)
- [ ] API endpoint returns data without errors
- [ ] Page loads without console errors
- [ ] Cards render with correct colors and emojis
- [ ] Titles are capitalized correctly for display
- [ ] Print preview shows 9 cards per page

**All cards:**
- [ ] Ability boxes show correct database colors/emojis
- [ ] Damage type colors match damage_types table

## Development Environment & Capabilities

**Operating System:** Windows 10/11 (PowerShell 5.1, Python 3.12)

### ✅ What Works
- **PowerShell cmdlets:** `Get-Process`, `Stop-Process`, `Move-Item`, `Get-ChildItem`, `Test-Path`, etc.
- **Invoke-WebRequest:** Use for HTTP requests (NOT `curl`)
- **Python:** Full compatibility with `python command`, including scripts and direct execution
- **SQLite3:** Direct CLI via `sqlite3 dnd_kids_resources.db` or Python sqlite3 module
- **Flask server:** Via `python _dev/server_flask.py`
- **Background processes:** Use `Start-Process` with `-NoNewWindow -RedirectStandardOutput` or set `isBackground=true` in terminals
- **File operations:** Move/rename with `Move-Item`, delete with `Remove-Item`, check with `Test-Path`
- **JSON handling:** `ConvertTo-Json` and `ConvertFrom-Json` PowerShell cmdlets
- **Quotation marks:** Use double quotes for paths with spaces and shell operators

### ❌ What Does NOT Work
- **curl command:** PowerShell interprets `curl` as alias for `Invoke-WebRequest`, breaking Unix-style usage
- **Unix heredocs:** `<< 'EOF'` syntax not supported - use Python scripts or text files instead
- **Unquoted ampersand (&):** Reserved character - wrap in quotes or use `Start-Process`
- **Bash/sh:** Not available - use PowerShell equivalents
- **Unix tools:** `head`, `tail`, `sed`, `grep`, `ls` not available directly
- **Shell redirections:** `2>/dev/null` fails - use PowerShell `-ErrorAction SilentlyContinue` instead
- **Pipe operators in complex chains:** Requires proper escaping and syntax

### 🔧 Common Windows PowerShell Patterns

**Instead of:**
```bash
python _dev/server_flask.py &
```
**Use:**
```powershell
Start-Process -NoNewWindow python -ArgumentList "_dev/server_flask.py"
```

**Instead of:**
```bash
curl http://localhost:8000/api/skills
```
**Use:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/skills" -UseBasicParsing
```

**Instead of:**
```bash
grep search_term file.txt
```
**Use:**
```powershell
Select-String -Pattern "search_term" file.txt
```

**Instead of:**
```bash
head -10 file.txt
```
**Use:**
```powershell
Get-Content file.txt -TotalCount 10
```

**Instead of:**
```bash
cat file.txt
```
**Use:**
```powershell
Get-Content file.txt
```

## Development Environment & Capabilities (Original)

**Key Learnings:**
1. **Encoding Issues:** Windows console uses CP1252 by default. Unicode emoji in print statements require wrapping sys.stdout with UTF-8 encoding wrapper
2. **Terminal Limitations:** Windows PowerShell ampersand (&) requires wrapping in quotes or using `Start-Process` for background jobs
3. **Flask Server:** 
   - Runs on port 8000 by default (configured in start_server)
   - Browser opening suppressed to prevent interruptions during development
   - Debug mode enabled for auto-reload on code changes
4. **Database:** SQLite with enriched metadata tables (abilities, damage_types) for emoji and color storage
5. **Python Environment:** Virtual environment located in `.venv/` with Flask, sqlite3, and other dev dependencies
6. **Git Integration:** Project uses version tags (e.g., 2.1) and remote origin for version control

**Tools Available:**
- Python 3.12 + venv
- SQLite3 CLI and Python sqlite3 module
- Flask web server (development only)
- VS Code with Pylance language server
- PowerShell terminal support

**Cannot Do:**
- Install new system packages via apt/brew (Windows doesn't have these)
- Modify protected system paths without admin privileges
- Directly interact with browser automation (webbrowser module suppressed for this reason)

## Development Tools Organization

**Active Tools in `_dev/`:**
- `server_flask.py` - ⭐ Primary Flask API server (spells database + enrichment)
- `test_api.py`, `debug_api.py` - API testing utilities
- `test_variants.py`, `test_rendering.js` - Card rendering tests
- `show_all_spells.py`, `verify_spells.py`, `verify_spells_complete.py` - Database inspection
- `check_templates.py`, `check_ranges.py` - Data validation
- `update_spell_icons.py` - Batch spell icon updates
- `CONTENT_STANDARDS.md` - Card content guidelines

**Archived in `_dev/archive/`:**
- All migration scripts - Database is fully initialized; no new migrations needed
- Database initialization scripts - Database already exists
- Legacy utility scripts - Old JSON/refactoring workflows
- Old HTTP server - Replaced by Flask server

See [_dev/README.md](_dev/README.md) and [_dev/archive/README.md](_dev/archive/README.md) for complete tool inventory and usage.
