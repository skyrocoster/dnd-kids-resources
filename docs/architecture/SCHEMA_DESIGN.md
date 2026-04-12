# Database Schema - Current Implementation

**Current Status:** Simplified implementation for D&D Kids Resources card generation  
**Database:** SQLite (`dnd_kids_resources.db`)

---

## Overview

The database stores card data and metadata for:
- **Spells** (319 spells available from `data/5eAPI/spells.json`)
- **Conditions** (15 status effects and conditions)
- **Creatures** (3 druid wild shape forms)
- **Skills** (18 skill reference cards)
- **Weapons** (42+ weapons, JSON-based)
- **Metadata** (abilities & damage types with emojis and colors)

---

## Core Tables

### `spells` — Spell card data (Database-Driven)

```sql
CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spell_name TEXT NOT NULL UNIQUE,    -- Spell name
  icon TEXT NOT NULL,                 -- Emoji icon (e.g., "🔥", "❄️")
  level TEXT NOT NULL,                -- CSS class: "cantrip", "level1"–"level9"
  school TEXT,                        -- Type: "Evocation", "Abjuration", "Transmutation", etc.
  spell_text TEXT,                    -- Kid-friendly spell description stored as JSON or text
  damage TEXT,                        -- JSON array of damage roll objects (or NULL)
  heal TEXT,                          -- JSON array of healing roll objects (or NULL)
  heal_at_higher_levels TEXT,         -- Optional scaling healing values
  range TEXT,                         -- JSON with range information (distance, unit, target)
  higher_levels TEXT,                 -- JSON string for higher-level scaling
  casting_time TEXT,
  duration TEXT,
  concentration BOOLEAN DEFAULT 0,
  ritual BOOLEAN DEFAULT 0,
  components TEXT,
  materials TEXT,
  attack_type TEXT,
  area_of_effect TEXT,
  classes TEXT,
  subclasses TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spells_title ON spells(title);
CREATE INDEX idx_spells_level ON spells(level);
CREATE INDEX idx_spells_school ON spells(school);
```

**Data Pattern:**
- Title stored as **lowercase** in database (e.g., "fire bolt")
- Capitalized in API response for display (e.g., "Fire Bolt")
- `level` uses lowercase CSS class names for styling
- Roll data stored as JSON arrays for flexibility

**Roll Object Format:**
```json
{
  "roll": "1d20",                     -- Dice notation string
  "numerics": [                       -- Abilities involved
    {
      "code": "sam",                  -- Ability code (lowercase)
      "name": "Spellcasting",         -- Display name (from abilities table)
      "emoji": "✨",                  -- Emoji icon (from abilities table)
      "color": "#8e44ad"              -- Color hex (from abilities table)
    }
  ],
  "types": [                          -- Damage types involved (for damage rolls only)
    {
      "code": "fire",                 -- Damage type code (lowercase)
      "name": "Fire",                 -- Display name (from damage_types table)
      "emoji": "🔥",                  -- Emoji icon (from damage_types table)
      "color": "#e74c3c"              -- Color hex (from damage_types table)
    }
  ],
  "save": false,                      -- True for save rolls, false for attack rolls
  "name": "A"                         -- Identifier (A, B, C, etc.) for pairing rolls
}
```

---

### `conditions` — Status effects and conditions (Database-Driven)

```sql
CREATE TABLE conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,         -- Condition name (stored lowercase)
  icon TEXT NOT NULL,                 -- Emoji icon
  explanation TEXT NOT NULL,          -- Description of the condition
  details TEXT,                       -- JSON array of detail objects (or NULL)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Data Pattern:**
- Title stored as **lowercase** in database (e.g., "blinded")
- Capitalized in API response for display (e.g., "Blinded")
- Details stored as JSON array when condition has multiple aspects
- `icon` field directly stores emoji characters

---

### `creatures` — Druid wild shape forms (Database-Driven)

```sql
CREATE TABLE creatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,         -- Creature name (stored lowercase)
  icon TEXT NOT NULL,                 -- Emoji icon
  size TEXT NOT NULL,                 -- Creature size (stored lowercase: "tiny", "small", etc.)
  creature_type_id INTEGER NOT NULL,  -- FK to creature_types table
  hp INTEGER NOT NULL,                -- Hit points
  ac INTEGER NOT NULL,                -- Armor class
  explanation TEXT NOT NULL,          -- Description of the creature
  attack_to_hit TEXT,                 -- JSON array of attack roll objects (or NULL)
  damage TEXT,                        -- JSON array of damage roll objects (or NULL)
  special TEXT,                       -- Special abilities or traits (plain text)
  stats TEXT,                         -- Ability scores (if included)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creature_type_id) REFERENCES creature_types(id)
);
```

**Data Pattern:**
- All text fields (title, size) stored as **lowercase** in database
- Capitalized in API response for display ("cat" → "Cat")
- Attack/damage rolls follow same JSON object format as spells
- `creature_type_id` references the `creature_types` lookup table
- Size values: tiny, small, medium, large, huge, gargantuan (lowercase in DB)

---

### `creature_types` — Lookup table for creature categories

```sql
CREATE TABLE creature_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,          -- "beast", "elemental", "fey", etc.
  emoji TEXT NOT NULL,                -- Type icon
  color TEXT NOT NULL                 -- CSS color or hex value
);
```

**Purpose:** Centralized storage of creature type metadata for reusability and consistency

---

### `skills` — Skill reference cards (Database-Driven)

```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                -- Skill name (stored lowercase)
  icon TEXT NOT NULL,                 -- Emoji icon
  level TEXT NOT NULL,                -- CSS class for styling
  explanation TEXT,                   -- Skill description
  details TEXT NOT NULL               -- JSON array of detail objects
);
```

**Data Pattern:**
- Title stored as **lowercase** in database
- Capitalized in API response for display
- Details stored as JSON array for flexibility

---

### `abilities` — Ability metadata with emojis and colors

```sql
CREATE TABLE abilities (
  code TEXT PRIMARY KEY,              -- "str", "dex", "con", "int", "wis", "cha", "sam", "sad"
  name TEXT NOT NULL,                 -- Display name ("Strength", "Dexterity", etc.)
  emoji TEXT NOT NULL UNIQUE,         -- Ability icon (💪, ⚡, etc.)
  color TEXT NOT NULL                 -- Hex color for styling (#ff5733, etc.)
);
```

**Purpose:** Stores metadata for ability modifiers and spellcasting modifiers  
**Used By:** Spell and creature rendering to display ability colors/emojis on cards  
**Codes:**
- **Standard abilities:** str, dex, con, int, wis, cha
- **Spellcasting modifiers:** sam (spellcasting attack modifier), sad (spellcasting ability difference)

---

### `damage_types` — Damage type metadata with emojis and colors

```sql
CREATE TABLE damage_types (
  code TEXT PRIMARY KEY,              -- "fire", "cold", "piercing", "slashing", "acid", etc.
  name TEXT NOT NULL,                 -- Display name ("Fire", "Cold", etc.)
  emoji TEXT NOT NULL,                -- Damage type icon (🔥, ❄️, etc.)
  color TEXT NOT NULL                 -- Hex color for styling
);
```

**Purpose:** Stores metadata for damage types used in spells and weapons  
**Used By:** Spell and creature rendering to display damage type colors/emojis on cards

---

## Legacy/Utility Tables

### `weapons` (Mostly Unused — Weapons Load from JSON)

```sql
CREATE TABLE weapons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  type TEXT,                          -- "Simple Melee", "Martial Ranged", etc.
  hands TEXT,                         -- "1-handed", "2-handed", "versatile"
  removable INTEGER,                  -- 0 or 1 (boolean)
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_weapons_card_id ON weapons(card_id);
```

**Note:** Weapons are primarily loaded from `data/weapons.json` file instead of this table. This table exists for potential future database-driven weapon management.

---

### `wild_shapes` (Mostly Unused — Uses creatures table instead)

```sql
CREATE TABLE wild_shapes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  creature_type TEXT,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_wild_shapes_card_id ON wild_shapes(card_id);
```

**Note:** Druid wild shapes are loaded from the `creatures` table. This table exists for legacy compatibility.

---

### `icons` (Unused — Icons stored directly as TEXT)

```sql
CREATE TABLE icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,        -- Emoji character
  description TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_icons_symbol ON icons(symbol);
CREATE INDEX idx_icons_purpose ON icons(purpose);
```

**Note:** Icons are stored directly in spell, condition, creature, and skill records as TEXT fields rather than using this lookup table.

---

### `users` (Future Use)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**Purpose:** Reserved for future authentication and user-specific custom cards

---

### `dungeons` (Dungeon Parser Integration)

```sql
CREATE TABLE dungeons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  original_html TEXT NOT NULL,        -- Original HTML input
  parsed_json TEXT NOT NULL,          -- Parsed and formatted JSON output
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Stores parsed dungeon room data from uploaded HTML documents  
**Used By:** Dungeon library system for organizing and retrieving room descriptions

---

## API Response Transformation Layer

**Location:** `_dev/server_flask.py`

When data is retrieved from database tables, it is transformed before returning to JavaScript:

### Text Capitalization
- Input: `title` stored as lowercase in database → `"fire bolt"`
- Output: Capitalized in API response → `"Fire Bolt"`
- Pattern: Capital first letter + preserve lowercase for the rest

### Metadata Enrichment
- Input: Ability codes (sam, dex, etc.) and damage codes (fire, cold, etc.)
- Output: Enriched with emoji and color from `abilities` and `damage_types` tables
- Example:
  ```json
  // Input (from database):
  { "code": "sam" }
  
  // Output (from API):
  { 
    "code": "sam",
    "name": "Spellcasting",
    "emoji": "✨",
    "color": "#8e44ad"
  }
  ```

### Roll Pairing (Spells Only)
- Spells with multiple to_hit and damage rolls can be paired
- Matching is based on the `name` field (A, B, C, etc.)
- When pairs match, they are interleaved in output: [to_hit_A, damage_A, to_hit_B, damage_B, ...]
- Emoji numbering: A → 1️⃣, B → 2️⃣, C → 3️⃣

---

## Data Storage Pattern (Consistency Across All Tables)

**All string fields that display on cards follow this pattern:**

1. **Storage in Database:** Lowercase (e.g. "blinded", "fox", "beast")
2. **Display in API Response:** Capitalize first letter (e.g. "Blinded", "Fox", "Beast")
3. **CSS Styling:** Use lowercase version as `level` field identifier
4. **Reason:** Prevents case-sensitivity bugs, maintains consistent styling, makes data predictable

**Applied to:**
- Conditions: `title` stored lowercase
- Creatures: `title`, `size`, `type` stored lowercase
- Skills: `title` stored lowercase
- Any future card types should follow this same pattern

---

## Development & Maintenance

### Adding New Card Types

1. **Create new table** for card-specific data (follow spells/conditions/creatures pattern)
2. **Store text fields as lowercase** in database
3. **Create API endpoint** that capitalizes text for display
4. **Create HTML page** in `pages/` folder
5. **Create JavaScript initializer** in `js/` folder that fetches from API
6. **Test API response** format matches existing patterns

### Adding New Abilities/Damage Types

1. Insert into `abilities` or `damage_types` table with emoji and color
2. Use in spell/creature JSON roll objects by code
3. API transformation will enrich with metadata automatically

### Testing Database Changes

```bash
# Start Flask server
python _dev/server_flask.py

# Check API endpoint
curl http://localhost:8000/api/spells
curl http://localhost:8000/api/conditions
curl http://localhost:8000/api/creatures
curl http://localhost:8000/api/skills

# Verify JSON formatting and field presence
```

---

## Database Integrity Notes

- **No FK constraints on cards table** (it doesn't exist in current implementation)
- **Direct storage of JSON** in text fields for flexibility
- **Lowercase convention enforced by code layer** (not database constraints)
- **Icons stored as TEXT** rather than using separate table for simplicity
- **Future normalization possible** if database grows significantly

---

## Reconstruction Examples

### Fire Bolt Spell

**Database content:**

```sql
-- Card record
SELECT c.* FROM cards c WHERE c.title = 'Fire Bolt';
→ id=1, card_type='spell', title='Fire Bolt', icon_id=5, level='cantrip', school='Evocation', ...

-- Detail entries (preserves JSON order via sequence_order)
SELECT de.* FROM detail_entries WHERE de.card_id = 1 ORDER BY de.sequence_order;

id=10, card_id=1, sequence_order=1, label='🎲 Roll:', content_type='template', 
template='{1}{d20}+{SAM}', roll_actor=NULL

id=11, card_id=1, sequence_order=2, label='💥 Damage:', content_type='template', 
template='{1}{d10}+{fire}', roll_actor=NULL

id=12, card_id=1, sequence_order=3, label='🎯 Range:', content_type='text', 
content_text='very long, single target', template=NULL, roll_actor=NULL

id=13, card_id=1, sequence_order=4, label='⬆️ Scaling:', content_type='template', 
template='{1}{d10} at higher levels', roll_actor=NULL
```

**Reconstructs to JSON (in application):**

```json
{
  "title": "Fire Bolt",
  "icon": "🔥",
  "level": "cantrip",
  "school": "Evocation",
  "explanation": "fling a streak of fire that zaps one target and might set things ablaze",
  "details": [
    {
      "label": "🎲 Roll:",
      "content": "{1}{d20}+{SAM}"
    },
    {
      "label": "💥 Damage:",
      "content": "{1}{d10}+{fire}"
    },
    {
      "label": "🎯 Range:",
      "content": "very long, single target"
    },
    {
      "label": "⬆️ Scaling:",
      "content": "{1}{d10} at higher levels"
    }
  ]
}
```

### Ice Knife Spell (Multiple Independent Rolls)

```sql
SELECT de.* FROM detail_entries WHERE de.card_id = 2 ORDER BY de.sequence_order;

id=20, card_id=2, sequence_order=1, label='🎲 Roll (Target):', content_type='template', 
template='{1}{d20}+{SAM}', roll_actor=NULL

id=21, card_id=2, sequence_order=2, label='💥 Damage (Target):', content_type='template', 
template='{1}{d10}+{pierce}', roll_actor=NULL

id=22, card_id=2, sequence_order=3, label='🎲 Roll (Area):', content_type='template', 
template='{1}{d20} save+{DEX}', roll_actor='target'

id=23, card_id=2, sequence_order=4, label='💥 Damage (Area):', content_type='template', 
template='{2}{d6}+{cold}', roll_actor=NULL
```

**JavaScript parsing flow:**
1. Query API: `/api/spells/1/details`
2. Receives array of detail entries in sequence order
3. For each `content_type='template'`, parse template string
4. Replace `{1}` with "1", `{d20}` with "d20", `{SAM}` with styled box, etc.
5. Render with correct label and styling
6. Display complete card

---

## Summary

| Table | Purpose | FK Relationships |
|-------|---------|------------------|
| `icons` | Icon registry (enforce uniqueness) | (standalone) |
| `users` | User auth (future) | (standalone) |
| `cards` | Core metadata (all types) | users(user_id), icons(icon_id) |
| `spells` | Spell-specific attrs | cards(card_id) |
| `weapons` | Weapon-specific attrs | cards(card_id) |
| `npcs` | NPC-specific attrs | cards(card_id) |
| `conditions` | Condition-specific attrs | cards(card_id) |
| `locations` | Location-specific attrs | cards(card_id) |
| `magic_items` | Magic item-specific attrs | cards(card_id) |
| `wild_shapes` | Wild shape-specific attrs | cards(card_id) |
| `actions` | Action-specific attrs | cards(card_id) |
| `detail_entries` | Details array decomposed (template-based) | cards(card_id) |

---

## Design Principles Applied

✅ **Icon centralization:** Separate icons table with UNIQUE symbol constraint prevents icon reuse  
✅ **Cascading icon updates:** Changing icon symbol in one place updates all card references  
✅ **No data collapse:** Roll modifiers stored as three separate columns, not JSON  
✅ **Preserves order:** `sequence_order` on detail_entries maintains array position  
✅ **No cascading JSON:** Details array decomposed to FK relationships  
✅ **Full reconstruction:** Application can rebuild original JSON without loss  
✅ **Delete protection:** ON DELETE RESTRICT on icons prevents orphaned references  
✅ **Indexing for performance:** FK fields and common queries indexed  
✅ **Future-proof:** Easy to add more type-specific attributes without schema redesign  

---

**Next Step:** Create blank database with these tables and verify access works.
