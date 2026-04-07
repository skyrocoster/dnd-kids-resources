# Development Utilities

Scripts and tools for development, testing, and database management. These are **not needed** for the webpages to operate—they're only for local development and data migration.

**⚠️ Production Code Location:** Core production modules like dungeon parsing are stored in `lib/`, NOT here. The `_dev` folder is exclusively for testing and utility scripts.

---

## Active Tools

### Flask Web Server
- **`server_flask.py`** ⭐ **PRIMARY TOOL** - Flask API server serving spells from SQLite database (located in root)
  - Runs on `http://localhost:8000`
  - Provides `/api/spells` endpoint with enriched metadata (emoji, colors)
  - Usage: `python server_flask.py`

### Testing & Validation
- `test_api.py` - Tests Flask API endpoints
- `debug_api.py` - Interactive debugging of API responses
- `test_variants.py` - Tests weapon variant logic
- `test_rendering.js` - Client-side card rendering tests
- `check_templates.py` - Validate JSON template structure
- `check_ranges.py` - Validate range data integrity

### Database Inspection
- `show_all_spells.py` - List all spells with details
- `verify_spells.py` - Verify spell data integrity
- `verify_spells_complete.py` - Check for missing spell data
- `update_spell_icons.py` - Batch update spell icons

### Standards
- `CONTENT_STANDARDS.md` - Guidelines for card content and formatting

### Dungeon Parsing Testing
- **`dungeon_parsing_test/`** - Test cases and examples for the dungeon HTML parser
  - Test HTML files: `The Secret Catacombs of Mepha 01.html`, `The_Forsaken_Dungeon_of_Annihilation_01.html`
  - Test outputs: JSON results of parsing
  - Debugging: `debug_entries.py` for entry-level debugging
  - **Note:** The core parser `parse_dungeon.py` is in `lib/` (production code used by Flask), this folder is for testing it

---

## Quality Assurance & Recent Fixes

### Validation Scripts
- `check_spell_grammar.py` - Grammar and content review for spell descriptions
- `check_ice_knife.py` - Verify multi-roll spell formatting
- `find_multi_rolls.py` - Locate and validate all spells with multiple roll entries
- `verify_roll_names.py` - Ensure multi-roll spells use standard A/B/C naming
- `check_heal_field.py` - Validate heal field structure consistency

### Recent Database Corrections
1. **Spell 55 (Wither and Bloom):** Removed non-standard `types` field from heal JSON to match other heal values
2. **Spell 21 (Ice Knife):** Fixed multi-roll naming from "primary"/"secondary" to "A"/"B" for proper number emoji display
3. **Damage type emoji rendering:** Fixed CSS property typo (`gaps` → `gap`) and added space before emoji in damage displays

---

## Archived Tools

All one-time-use scripts and legacy tools have been moved to `archive/`:

- **Migrations:** All `migrate_*.py` scripts (database is fully initialized)
- **Legacy utilities:** `abstract_rolls.py`, `refactor_modifiers.py`, `simplify_prefix.py`, `update_boxes.py`
- **Legacy server:** `server.py` (replaced by Flask)
- **Schema inspection:** `schema_inspection.txt`, `view_schema.py`

**Setup Tools (in `_dev/` for initialization only):**
- `init_database.py` - One-time database initialization script (only needed if rebuilding database from scratch)

See `archive/` if you need to reference historical migration logic or recover deleted functionality.

---

## Setup & Running

### Start Flask Server
```bash
python server_flask.py
# Server will run at http://localhost:8000
# API endpoint: GET /api/spells
```

### Test the API
```bash
python test_api.py
# or use debug_api.py for interactive testing
```

### Inspect Database
```bash
python show_all_spells.py
python verify_spells_complete.py
```

---

## Note

- The Flask server is the **primary development tool** for testing cards
- Migrations are archived for reference; no new migrations are needed unless schema changes
- All active tools require Python 3.12 and the Flask package
- The website itself runs without any of these tools—they're purely for development
