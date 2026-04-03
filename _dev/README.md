# Development Utilities

Scripts and tools for development, testing, and database management. These are **not needed** for the webpages to operate—they're only for local development and data migration.

---

## Active Tools

### Flask Web Server
- **`server_flask.py`** ⭐ **PRIMARY TOOL** - Flask API server serving spells from SQLite database
  - Runs on `http://localhost:5000`
  - Provides `/api/spells` endpoint with enriched metadata (emoji, colors)
  - Usage: `python _dev/server_flask.py`

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

---

## Archived Tools

All one-time-use scripts and legacy tools have been moved to `archive/`:

- **Database initialization:** `init_database.py`, `init_database_new.py`
- **Migrations:** All `migrate_*.py` scripts (database is fully initialized)
- **Legacy utilities:** `abstract_rolls.py`, `refactor_modifiers.py`, `simplify_prefix.py`, `update_boxes.py`
- **Legacy server:** `server.py` (replaced by Flask)
- **Schema inspection:** `schema_inspection.txt`, `view_schema.py`

See `archive/` if you need to reference historical migration logic or recover deleted functionality.

---

## Setup & Running

### Start Flask Server
```bash
python _dev/server_flask.py
# Server will run at http://localhost:5000
# API endpoint: GET /api/spells
```

### Test the API
```bash
python _dev/test_api.py
# or use debug_api.py for interactive testing
```

### Inspect Database
```bash
python _dev/show_all_spells.py
python _dev/verify_spells_complete.py
```

---

## Note

- The Flask server is the **primary development tool** for testing cards
- Migrations are archived for reference; no new migrations are needed unless schema changes
- All active tools require Python 3.12 and the Flask package
- The website itself runs without any of these tools—they're purely for development
