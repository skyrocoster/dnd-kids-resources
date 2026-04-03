# Database Migrations

Documentation of database schema changes and data migrations.

## Migration: Conditions to Database (April 2026)

**Status:** Completed

### Background
Conditions were originally stored in `data/conditions.json` and loaded via JavaScript. To align with the system architecture and improve maintainability, conditions were migrated to the SQLite database.

### Changes Made

#### 1. Database Schema
**Old schema (JSON):**
- Stored as array of condition objects with `title`, `icon`, `level`, `explanation`, `details`

**New schema (SQLite):**
```sql
CREATE TABLE conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,        -- Stored lowercase (e.g., "blinded")
    icon TEXT NOT NULL,                -- Emoji icon
    explanation TEXT NOT NULL,         -- Kid-friendly description
    details TEXT,                      -- JSON array of detail objects
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Data Normalization
- **Title case handling:** Titles stored in lowercase for consistency
  - Database: `"blinded"`
  - API response: `"Blinded"` (capitalized for display)
  - CSS class: `"blinded"` (used for card styling)
- **Removed `level` field:** No longer needed; derived from title
- **Details storage:** Complex detail objects stored as JSON text field

#### 3. API Endpoints
Added Flask API endpoints for conditions:
- `GET /api/conditions` - Returns all conditions
- `GET /api/conditions/<title>` - Returns specific condition (case-insensitive search)

**Response format:**
```json
{
  "title": "Blinded",
  "icon": "🙈",
  "level": "blinded",
  "explanation": "You can't see anything!",
  "details": [
    {"label": "", "content": "You automatically fail any check that needs sight"},
    {"label": "", "content": "Attacks against you have Advantage"},
    {"label": "", "content": "Your attacks have Disadvantage"}
  ]
}
```

#### 4. JavaScript Updates
- Updated `js/conditions.js` to fetch from `/api/conditions` instead of JSON file
- Matches pattern used by spells (database-driven)
- No changes needed to `js/card-generator.js`

#### 5. Database Population
**Script:** `_dev/reset_conditions_schema.py`
- Migrated 19 conditions from JSON to database
- Normalized titles to lowercase
- Preserved all details as JSON arrays
- Removed `data/conditions.json` file

### Backwards Compatibility
- ✅ Frontend unchanged - card display identical
- ✅ Print output unchanged - 9 cards per page
- ✅ Colors unchanged - CSS classes still work
- ❌ Old JSON file removed - not needed anymore

### Benefits
1. **Consistency:** Conditions follow same pattern as spells (database-driven)
2. **Maintainability:** Database schema is single source of truth
3. **Normalization:** Lowercase titles prevent case sensitivity bugs
4. **Extensibility:** Easy to add new fields or relationships in future
5. **Performance:** Direct database lookups faster than JSON parsing

### Testing
- ✅ 19 conditions successfully migrated
- ✅ API returns correct JSON structure
- ✅ Titles capitalized correctly in display
- ✅ CSS color classes work (level field derived from title)
- ✅ Print functionality unchanged

### Files Changed
**Database:**
- `dnd_kids_resources.db` - Conditions table recreated with new schema

**Backend:**
- `_dev/server_flask.py` - Added `/api/conditions` endpoints
- `_dev/reset_conditions_schema.py` - Migration script (documentation only, already run)

**Frontend:**
- `js/conditions.js` - Changed to fetch from API instead of JSON
- `pages/condition-cards.html` - No changes needed

**Removed:**
- `data/conditions.json` - Replaced by database storage

**Documentation:**
- `README.md` - Updated setup instructions
- `ARCHITECTURE.md` - Updated system diagram and data sources
- `.github/copilot-instructions.md` - Updated principles and workflow
- `CONTRIBUTING.md` - Updated file organization and card formats
