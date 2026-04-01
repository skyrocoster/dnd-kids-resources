# Normalized Database Schema Design

**Principle:** Decompose all JSON elements into proper relational tables. Reconstruct on demand, never collapse.

---

## Core Tables

### `icons` (Icon registry - one icon per purpose)

Centralized icon management. Prevents duplicate icon definitions and allows cascading icon updates.

```sql
CREATE TABLE icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,        -- The actual icon character (✨, ⚔️, etc.)
  description TEXT NOT NULL,          -- What this icon represents (e.g., 'Fire Spell', 'Melee Weapon')
  purpose TEXT NOT NULL,              -- Category (spell, weapon, npc, condition, location, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_icons_symbol ON icons(symbol);
CREATE INDEX idx_icons_purpose ON icons(purpose);
```

**Design decisions:**
- `symbol UNIQUE` ensures no duplicate icons in the system
- `purpose` tracks what each icon is used for (prevents misuse)
- Changing an icon cascades to all cards via ON UPDATE CASCADE
- ON DELETE RESTRICT prevents accidental icon deletion while in use

---

### `cards` (Base table for all card types)

Stores common metadata for every card in the system.

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_type TEXT NOT NULL,            -- 'spell', 'weapon', 'condition', 'npc', 'location', 'magic-item', 'wild-shape', 'action'
  title TEXT NOT NULL,
  icon_id INTEGER NOT NULL,           -- FK to icons table (was: icon TEXT)
  level TEXT NOT NULL,                -- CSS class for colors (e.g., 'cantrip', 'wizard', 'simple-melee')
  explanation TEXT,
  is_default INTEGER DEFAULT 1,       -- 1 = available to all, 0 = user-owned
  user_id INTEGER,                    -- NULL = default/system card, otherwise owner's ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (icon_id) REFERENCES icons(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_is_default ON cards(is_default);
CREATE INDEX idx_cards_level ON cards(level);
CREATE INDEX idx_cards_icon_id ON cards(icon_id);
```

**Changes from original:**
- `icon TEXT NOT NULL` → `icon_id TEXT NOT NULL` (FK to icons)
- Added FK constraint with ON DELETE RESTRICT (prevent orphaned icons)
- Added index on icon_id for performance

**Why separate table:**
- Enforces icon uniqueness globally
- Prevents same icon representing different concepts
- Allows updating icon symbol with one query (cascades to all cards)

---

### `spells` (Type-specific attributes for spells)

```sql
CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  school TEXT,                        -- 'Evocation', 'Abjuration', etc.
  to_hit TEXT,                        -- Attack roll template(s): "{1}{d20}+{SAM}..." or NULL
  damage TEXT,                        -- Damage roll template(s): "{1}{d10}+{fire}|{1}{d8}+{cold}" or NULL
  heal TEXT,                          -- Healing roll template(s): "{1}{d4}+{INT}" or NULL
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_spells_card_id ON spells(card_id);
```

**Design:**
- `to_hit`, `damage`, `heal` are NULL if spell has no rolls in that category
- Multiple effects for same category separated by pipe: `"{1}{d8}+{fire}|{1}{d4}+{cold}"`
- Templates use same placeholder syntax: `{dice_count}{dice_type}+{modifiers}`
- Range, scaling, and other descriptive text remain in `detail_entries` table
- One spell per card (UNIQUE constraint on card_id)

---

### `weapons` (Type-specific attributes for weapons)

```sql
CREATE TABLE weapons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  type TEXT,                          -- 'Simple Melee', 'Martial Ranged', etc.
  hands TEXT,                         -- '1-handed', '2-handed'
  removable INTEGER,                  -- 0 or 1 (boolean)
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_weapons_card_id ON weapons(card_id);
```

---

### `npcs` (Type-specific attributes for NPCs)

```sql
CREATE TABLE npcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  species TEXT,
  profession TEXT,
  location TEXT,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_npcs_card_id ON npcs(card_id);
```

---

### `conditions` (Type-specific attributes for conditions)

```sql
CREATE TABLE conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  duration TEXT,                      -- Store the 'school' field from JSON (e.g., 'Until cured or the spell ends')
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_conditions_card_id ON conditions(card_id);
```

---

### `locations` (Type-specific attributes for locations)

```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  location_type TEXT,                 -- 'building', 'wilderness', etc.
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_locations_card_id ON locations(card_id);
```

---

### `magic_items` (Type-specific attributes for magic items)

```sql
CREATE TABLE magic_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  rarity TEXT,                        -- May be in level or details
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_magic_items_card_id ON magic_items(card_id);
```

---

### `wild_shapes` (Type-specific attributes for wild shapes)

```sql
CREATE TABLE wild_shapes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  creature_type TEXT,                 -- May be in level or details
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_wild_shapes_card_id ON wild_shapes(card_id);
```

---

### `actions` (Type-specific attributes for actions)

```sql
CREATE TABLE actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL UNIQUE,
  action_type TEXT,                   -- Subtype if needed
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_actions_card_id ON actions(card_id);
```

---

## Details Decomposition

### `detail_entries` (Breaks down the `details` array with template-based rolls)

Instead of storing `details` as JSON, each entry becomes a row with flexible template-based roll storage.

```sql
CREATE TABLE detail_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,    -- Preserves original order in array
  label TEXT,                         -- "🎲 Roll:", "💥 Damage:", "🎯 Range:", etc
  content_type TEXT NOT NULL,         -- 'text' or 'template'
  content_text TEXT,                  -- For simple text content (range, description, etc.)
  template TEXT,                      -- For roll templates: "{1}{d20}+{SAM}" or "{2}{d8}+{fire}"
  roll_actor TEXT,                    -- NULL, 'self', or 'target' - who performs the roll
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_detail_entries_card_id ON detail_entries(card_id);
CREATE INDEX idx_detail_entries_sequence ON detail_entries(card_id, sequence_order);
CREATE UNIQUE INDEX idx_detail_entries_order ON detail_entries(card_id, sequence_order);
```

**Design approach:** 
- **Template-based rolls** stored as strings with placeholder syntax: `{dice_count}{dice_type}` + `{modifier}"`
- **Flexible and future-proof** - no schema changes needed to add new roll types
- **Single text field** - template string is parsed and rendered by JavaScript
- **Preserves label context** - label tells you what the roll is for (Roll vs. Damage vs. Scaling, etc.)
- **Sequence order reconstructs** original array order from JSON
- **Simple content stays simple** - text details use content_text, template details use template field

---

## Template Syntax Reference

### Roll Template Format

Roll templates use curly bracket placeholders parsed and rendered by JavaScript:

```
{dice_count}{dice_type}+{modifier1}+{modifier2}
```

**Placeholder Types:**

| Placeholder | Renders As | Examples | Notes |
|---|---|---|---|
| `{1}`, `{2}`, `{3}`, etc | Dice count (number) | `1d20`, `2d8` | Just the number value |
| `{d4}`, `{d6}`, `{d8}`, `{d12}`, `{d20}` | Dice type (no styling) | `d20`, `d8` | D&D dice notation |
| `{DEX}`, `{STR}`, `{CON}`, `{INT}`, `{WIS}`, `{CHA}` | **Ability + emoji** | 🔵 **DEX**, 💪 **STR** | Uppercase = styled ability score |
| `{fire}`, `{cold}`, `{thunder}`, `{pierce}`, etc | Damage type (italics) | *fire*, *cold* | Lowercase = passive type |
| `{SAM}`, `{SAB}` | **Blue modifier box** | [SAM] | Spell Attack Modifier box |
| `{BtH}` | **Orange modifier box** | [BtH] | Bonus to Hit box (weapons) |
| `{save}` | Just text | save | Plain text |

**Examples:**

```
Fire Bolt (attack):        "{1}{d20}+{SAM}"
Create Bonfire (save):     "{1}{d20} save+{DEX}"
Thunderwave (damage):      "{2}{d8}+{thunder}"
Cure Wounds (heal):        "heal {1}{d8}+{SAM}"
Ice Knife (area save):     "{1}{d20} save+{DEX}"
```

**Design advantages:**
- **Human-readable in database** - you can look at the value and see what it renders as
- **No schema changes needed** - add new spell types without modifying tables
- **Flexible for custom content** - DMs/kids can define their own spell templates
- **Parser lives in JavaScript** - rendering logic stays where styling happens

---

## User Management

### `users` (For future authentication)

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
