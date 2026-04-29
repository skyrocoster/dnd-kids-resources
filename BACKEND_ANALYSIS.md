# D&D Kids Resources: Backend Endpoints Audit

## Executive Summary

Analysis of the Flask server (`server_flask.py`) identifies **7 missing CRUD endpoints** for core resource management:
- **Quests**: Missing PUT and DELETE (update/delete individual quests)
- **Dungeons**: Missing DELETE (delete dungeons)
- **Spells**: Missing DELETE (delete spells by ID)
- **Traps**: Missing POST, PUT, DELETE (all create/update/delete operations)

---

## Complete API Endpoint Inventory

### 1. SPELLS ENDPOINTS ✅ (4/5 operations)

| HTTP Method | Route | Status | Implementation |
|-----------|-------|--------|-----------------|
| **GET** | `/api/spells` | ✅ Implemented | `get_spells_api()` - Returns all spells with rich formatting (level-based colors, enriched rolls) |
| **GET** | `/api/spells/<title>` | ✅ Implemented | `get_spell_by_title(title)` - Query by spell name |
| **GET** | `/api/spells/id/<int:spell_id>/raw` | ✅ Implemented | `get_spell_by_id_raw(spell_id)` - Raw editable spell format |
| **POST** | `/api/spells` | ✅ Implemented | `create_spell_api()` - Create new spell with validation |
| **PUT** | `/api/spells/id/<int:spell_id>` | ✅ Implemented | `update_spell_by_id(spell_id)` - Update editable spell fields |
| **DELETE** | `/api/spells/<int:spell_id>` | ❌ **MISSING** | No endpoint to delete spells |

**Spell Editable Fields:**
```python
SPELL_EDITABLE_FIELDS = [
    'spell_name', 'icon', 'level', 'school', 'spell_text', 'spell_alt_text',
    'damage', 'heal', 'heal_at_spell_slots', 'range', 'higher_levels',
    'damage_at_higher_levels', 'casting_time', 'duration', 'concentration',
    'ritual', 'components', 'materials', 'attack_type', 'action', 
    'area_of_effect', 'classes', 'subclasses'
]
```

---

### 2. QUESTS ENDPOINTS ✅ (3/4 operations)

| HTTP Method | Route | Status | Implementation |
|-----------|-------|--------|-----------------|
| **GET** | `/api/quests` | ✅ Implemented | `get_quests_api()` - Returns all quest summaries (id, name, summary, location, dungeon_id) |
| **GET** | `/api/quests/<quest_id>` | ✅ Implemented | `get_quest_by_id(quest_id)` - Get full quest details by id or name |
| **POST** | `/api/quests` | ✅ Implemented | `create_quest_api()` - Create new quest (supports reward, objectives, details, notes) |
| **PUT** | `/api/quests/<quest_id>` | ❌ **MISSING** | No endpoint to update quests |
| **DELETE** | `/api/quests/<quest_id>` | ❌ **MISSING** | No endpoint to delete quests |

**Quest Data Storage:** JSON file-based (`data/quests.json` or `data/seeds/seed_quests.json`)

**Quest Fields:**
```json
{
  "id": 1,
  "name": "Quest Name",
  "summary": "Brief summary",
  "location": "Location",
  "dungeon_id": 1,
  "quest_giver": 1,
  "reward": ["gold", "items"],
  "objectives": ["objective 1", "objective 2"],
  "details": ["detail 1"],
  "notes": "Additional notes"
}
```

---

### 3. DUNGEONS ENDPOINTS ✅ (4/5 operations)

| HTTP Method | Route | Status | Implementation |
|-----------|-------|--------|-----------------|
| **GET** | `/api/dungeons` | ✅ Implemented | `list_dungeons()` - List all dungeons (id, title, created_at, updated_at) |
| **GET** | `/api/dungeons/<int:dungeon_id>` | ✅ Implemented | `get_dungeon(dungeon_id)` - Get full dungeon with parsed_json data |
| **POST** | `/api/dungeons` | ✅ Implemented | `create_dungeon()` - Create blank dungeon with basic structure |
| **POST** | `/api/dungeons/upload` | ✅ Implemented | `upload_dungeon()` - Upload and parse HTML dungeon file |
| **PUT** | `/api/dungeons/<int:dungeon_id>` | ✅ Implemented | `update_dungeon(dungeon_id)` - Update parsed_json data |
| **DELETE** | `/api/dungeons/<int:dungeon_id>` | ❌ **MISSING** | No endpoint to delete dungeons |

**Dungeon Structure:**
```json
{
  "id": 1,
  "title": "Dungeon Name",
  "original_html": "...",
  "parsed_json": {
    "general_info": {
      "title": "...",
      "size": null,
      "walls": null,
      "floor": null,
      "temperature": null,
      "illumination": null
    },
    "map_image": null,
    "corridors": [],
    "rooms": []
  },
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

---

### 4. TRAPS ENDPOINTS ⚠️ (2/5 operations - **LARGELY INCOMPLETE**)

| HTTP Method | Route | Status | Implementation |
|-----------|-------|--------|-----------------|
| **GET** | `/api/traps` | ✅ Implemented | `get_all_traps()` - List all traps (id, name, created_at) |
| **GET** | `/api/traps/<int:trap_id>` | ✅ Implemented | `get_trap_by_id(trap_id)` - Get single trap by ID |
| **POST** | `/api/traps` | ❌ **MISSING** | No endpoint to create traps |
| **PUT** | `/api/traps/<int:trap_id>` | ❌ **MISSING** | No endpoint to update traps |
| **DELETE** | `/api/traps/<int:trap_id>` | ❌ **MISSING** | No endpoint to delete traps |

**Trap Database Schema:**
- Only basic fields tracked: `id`, `name`, `created_at`
- No detailed fields for trap mechanics (DC, damage, trigger type, etc.)

---

## Comprehensive Endpoint Summary by Entity

### ✅ Fully Implemented (Complete CRUD)
1. **Encounters** - All 5 operations
   - GET /api/encounters
   - GET /api/encounters/<id>
   - POST /api/encounters
   - PUT /api/encounters/<id>
   - DELETE /api/encounters/<id>

2. **Players** - All 5 operations (plus nested spell/weapon management)
   - GET /api/players
   - GET /api/players/<id>
   - POST /api/players
   - PUT /api/players/<id>
   - DELETE /api/players/<id>

3. **NPCs** - All 5 operations
   - GET /api/npcs
   - GET /api/npcs/<id>
   - POST /api/npcs
   - PUT /api/npcs/<id>
   - DELETE /api/npcs/<id>

### ⚠️ Partially Implemented (3/5 or 4/5)
1. **Spells** - 5/6 operations (missing DELETE)
2. **Dungeons** - 4/5 operations (missing DELETE)
3. **Quests** - 3/4 operations (missing PUT, DELETE)
4. **Traps** - 2/5 operations (missing POST, PUT, DELETE)

### ✅ Fully Implemented (Read-Only)
1. **Classes** - GET all
2. **Monsters** - GET all, GET by title
3. **Weapons** - GET all, GET by title
4. **Skills** - GET all, GET by title
5. **Conditions** - GET all, GET by title
6. **Abilities** - GET all
7. **Spell Components** - GET all (distinct values)

---

## Missing Endpoints (7 Total)

### Priority 1: Core Resource Management

1. **PUT /api/quests/<quest_id>** (Quests Update)
   - Should update quest fields: name, summary, location, dungeon_id, quest_giver, reward, objectives, details, notes
   - Currently no update mechanism in code
   - Data stored in JSON file

2. **DELETE /api/quests/<quest_id>** (Quests Delete)
   - Should remove quest from JSON file
   - Currently no delete mechanism

3. **DELETE /api/dungeons/<int:dungeon_id>** (Dungeons Delete)
   - Should remove dungeon record from SQLite
   - Currently no delete mechanism

4. **DELETE /api/spells/<int:spell_id>** (Spells Delete)
   - Should remove spell from SQLite with cascade considerations
   - Currently no delete mechanism

### Priority 2: Trap Management (Complete CRUD Missing)

5. **POST /api/traps** (Traps Create)
   - No create endpoint; table structure exists but minimal (id, name, created_at)
   - Needs: name (required), and potentially trap mechanics fields

6. **PUT /api/traps/<int:trap_id>** (Traps Update)
   - No update endpoint for trap records

7. **DELETE /api/traps/<int:trap_id>** (Traps Delete)
   - No delete endpoint for trap records

---

## Backend Patterns & Conventions

### Error Handling
- **Consistent Pattern**: Try-except blocks returning JSON error messages with HTTP status codes
- **Common HTTP Status Codes**:
  - 200: Success (OK)
  - 201: Success (Created)
  - 400: Bad Request (validation errors)
  - 404: Not Found
  - 409: Conflict (duplicate entries)
  - 500: Server Error

**Example:**
```python
try:
    # operation
except Exception as e:
    return jsonify({"error": str(e)}), 500
```

### Response Format
- **Consistent JSON**: All endpoints return JSON via `jsonify()`
- **Data Conversion**: Helper functions convert database records to dictionaries for JSON serialization
- **Enrichment**: Roll objects, abilities, and damage types are enriched with metadata (emoji, color, names)

### Validation & Normalization
1. **Payload Validation**: `validate_player_payload()`, `sanitize_player_payload()`
2. **Type Coercion**: Integer conversion with try-except (dungeon_id, quest_giver)
3. **String Normalization**: `.strip()`, `.lower()` for case-insensitive matching
4. **Field Defaults**: Default values for optional fields

**Example (from Spells):**
```python
values.setdefault('spell_name', f"New Spell {datetime.now().strftime('%Y%m%d%H%M%S')}")
values.setdefault('icon', '✨')
values.setdefault('level', '0')
```

### Data Format Conversions
- **JSON Fields**: `parse_json_field()` and `parse_json_array_field()` for safe parsing
- **Spell Enrichment**: `convert_db_spell_to_api_format()`, `convert_db_spell_to_editor_format()`
- **Rich Formatting**: Damage types, ability scores, and saves enriched with emoji and color

### Database Connection Pattern
- **Connection Retrieval**: `get_db_connection()` function
- **Resource Cleanup**: `conn.close()` in finally blocks or after use
- **Transactions**: `conn.commit()` after INSERT/UPDATE/DELETE

**Pattern:**
```python
conn = get_db_connection()
cursor = conn.cursor()
try:
    cursor.execute(...)
    conn.commit()
finally:
    conn.close()
```

### Storage Backends
1. **SQLite Database**: Spells, Dungeons, Traps, Encounters, Players, NPCs, Weapons, Conditions, Skills, Abilities, Monsters, Classes
2. **JSON Files**: Quests (stored in `data/quests.json` or `data/seeds/seed_quests.json`)

---

## Database Schema Insights

### Spell Table
```sql
CREATE TABLE spells (
    id INTEGER PRIMARY KEY,
    spell_name TEXT,
    icon TEXT,
    level TEXT,
    school TEXT,
    spell_text TEXT,
    spell_alt_text TEXT,
    attack_type TEXT,  -- JSON
    damage TEXT,       -- JSON
    heal TEXT,         -- JSON
    heal_at_spell_slots TEXT,  -- JSON
    range TEXT,
    area_of_effect TEXT,
    higher_levels TEXT,     -- JSON
    damage_at_higher_levels TEXT,  -- JSON
    casting_time TEXT,
    duration TEXT,
    concentration INTEGER,  -- Boolean
    ritual INTEGER,         -- Boolean
    components TEXT,        -- JSON array
    materials TEXT,
    action TEXT,            -- JSON
    classes TEXT,           -- JSON array
    subclasses TEXT,        -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Dungeon Table
```sql
CREATE TABLE dungeons (
    id INTEGER PRIMARY KEY,
    title TEXT UNIQUE,
    original_html TEXT,
    parsed_json TEXT,  -- Stores structure with general_info, corridors, rooms
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Trap Table
```sql
CREATE TABLE traps (
    id INTEGER PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Quest Data (JSON File Structure)
- Stored as JSON array in `data/quests.json`
- Fields: id, name, summary, location, dungeon_id, quest_giver, reward, objectives, details, notes
- Loaded via `load_quests_data()`, saved via `save_quests_data(quests)`

---

## Recommendations for Implementation

### For Quest Endpoints (Priority 1)
1. Implement PUT by finding quest by id and updating fields in JSON array
2. Implement DELETE by filtering out quest from JSON array
3. Reuse `load_quests_data()` and `save_quests_data()` functions
4. Follow same JSON file pattern as POST

### For Dungeon Delete (Priority 1)
1. Simple SQL DELETE with cascade considerations
2. Check if dungeons are referenced by quests before deletion (optional foreign key check)
3. Return 404 if dungeon not found

### For Spell Delete (Priority 1)
1. Add `DELETE FROM spells WHERE id = ?`
2. Check player spell assignments for cascade handling
3. Follow encounter/player DELETE patterns already in code

### For Trap CRUD (Priority 2)
1. Enhance trap table schema (add fields for mechanics: dc, damage, trigger_type, description, etc.)
2. Implement POST with validation (name required, description optional)
3. Implement PUT with field selection (similar to spell update pattern)
4. Implement DELETE with simple SQL

---

## Additional Observations

### Related Nested Endpoints (Fully Implemented)
- **Player Spells**: GET, POST, DELETE all implemented
- **Player Weapons**: GET, POST, DELETE all implemented
- These demonstrate proper nested resource patterns

### Utility Endpoints
- `POST /api/rebuild-database` - Full database reset (init + seed)
- Useful for development but should be restricted in production

### Frontend Integration Points
- Spell cards rendered in `/spell-cards-list` and `/spell-cards-v2`
- Dungeon HTML parser integration via DungeonHTMLParser class
- Rich metadata enrichment for role-playing game display

---

## Conclusion

**7 missing endpoints** prevent full CRUD functionality for core resources:
- **Quests**: 2 missing (PUT, DELETE)
- **Dungeons**: 1 missing (DELETE)
- **Spells**: 1 missing (DELETE)
- **Traps**: 3 missing (POST, PUT, DELETE)

The codebase demonstrates consistent patterns for error handling, validation, and data conversion. Implementation should follow existing conventions closely. Trap endpoints require initial schema enhancement before full CRUD can be implemented.
