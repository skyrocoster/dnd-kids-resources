# Abilities System - Skills Integration & Type Flags

> **📋 HISTORICAL DOCUMENT** — Completed April 2026. This documents the integration of the abilities system with skills. For current state, see the abilities system real-time setup in [CONTRIBUTING.md](../development/CONTRIBUTING.md) and database schema in [SCHEMA_DESIGN.md](../architecture/SCHEMA_DESIGN.md).

## Overview
Successfully consolidated all game abilities (stats, modifiers, and skills) into a single `abilities` table with type categorization. All 26 D&D 5e abilities are now available in a unified system.

## Changes Made

### 1. Database Schema Migration
**File:** `_dev/migrate_abilities_type.py`
- Added `type` column to abilities table (DEFAULT 'stat')
- Preserved all existing data during migration
- Created backup: `dnd_kids_resources.backup.migration_abilities_type.db`

**Ability Types Defined:**
- `stat` - The 6 core D&D ability scores (STR, DEX, CON, INT, WIS, CHA)
- `modifier` - Calculated modifiers used in spell mechanics (SAM, SAD)
- `skill` - The 18 standard D&D 5e skills

### 2. Complete Abilities Seed Data
**File:** `data/seed_abilities.json` (26 total abilities)

**STATS (6):**
- STR (Strength) - 💪 - #e74c3c
- DEX (Dexterity) - ⚡ - #f39c12
- CON (Constitution) - ❤️ - #c0392b
- INT (Intelligence) - 🧠 - #3498db
- WIS (Wisdom) - 👁️ - #16a085
- CHA (Charisma) - ✨ - #8e44ad

**MODIFIERS (2):**
- SAM (Spellcasting Attack Modifier) - 🎯 - #9b59b6
- SAD (Spell Ability DC) - 🔮 - #9b59b6

**SKILLS (18):**
- Acrobatics (DEX) - 🤸 - #f39c12
- Animal Handling (WIS) - 🐾 - #16a085
- Arcana (INT) - 📿 - #3498db
- Athletics (STR) - 🏃 - #e74c3c
- Deception (CHA) - 🎭 - #8e44ad
- History (INT) - 📖 - #3498db
- Insight (WIS) - 💡 - #16a085
- Intimidation (CHA) - 😠 - #8e44ad
- Investigation (INT) - 🔍 - #3498db
- Medicine (WIS) - ⚕️ - #16a085
- Nature (INT) - 🌿 - #16a085
- Perception (WIS) - 👀 - #16a085
- Performance (CHA) - 🎪 - #8e44ad
- Persuasion (CHA) - 💬 - #8e44ad
- Religion (INT) - ⛪ - #3498db
- Sleight of Hand (DEX) - 🎩 - #f39c12
- Stealth (DEX) - 🥷 - #f39c12
- Survival (WIS) - 🏕️ - #16a085

### 3. Seed Loader Updates
**File:** `_dev/seed_database.py`
- Updated `populate_abilities()` to handle `type` field
- Added `--abilities` command-line flag
- Enhanced output showing breakdown by type
- User-friendly output showing counts for stat/modifier/skill

### 4. Spell & Creature References
**Updated Files:**
- `data/seed_spells.json` - References ability IDs in numerics arrays
- `data/seed_creatures.json` - References ability IDs in numerics arrays

Example structure:
```json
"numerics": [34, 39]  // IDs for DEX and SAM abilities
```

### 5. API Enrichment
**File:** `server_flask.py`
**Function:** `enrich_numerics_with_abilities()`
- Now includes `type` field in enriched ability objects
- Handles integer IDs, string codes, and dict objects
- Returns complete metadata: `id`, `code`, `type`, `name`, `emoji`, `color`

**Sample API Response:**
```json
{
  "id": 34,
  "code": "dex",
  "type": "stat",
  "name": "Dexterity",
  "emoji": "⚡",
  "color": "#f39c12"
}
```

## Current Ability IDs
After seeding, the database contains:
```
MODIFIERS:
  40: sad (Spell Ability DC)
  39: sam (Spellcasting Attack Modifier)

STATS:
  38: cha (Charisma)
  35: con (Constitution)
  34: dex (Dexterity)
  36: int (Intelligence)
  33: str (Strength)
  37: wis (Wisdom)

SKILLS:
  41-58: acrobatics through survival
```

## Usage

### Load All Abilities
```bash
python _dev/seed_database.py --abilities --force
```

### Load Everything
```bash
python _dev/seed_database.py --force
```

### Query Abilities by Type
```bash
# Get all skills
sqlite3 dnd_kids_resources.db "SELECT id, code, name FROM abilities WHERE type = 'skill' ORDER BY code"

# Get breakdown
sqlite3 dnd_kids_resources.db "SELECT type, COUNT(*) FROM abilities GROUP BY type"
```

### Reference Abilities in Seed Files
Use numeric IDs:
```json
{
  "roll": "1d20",
  "numerics": [34, 39],
  "save": false
}
```

Look up IDs:
```bash
sqlite3 dnd_kids_resources.db "SELECT id, code, type FROM abilities WHERE code IN ('dex', 'sam')"
```

## Benefits

✅ **Unified System** - All ability-like entities in one table
✅ **Type Categorization** - Easy filtering and display by ability type
✅ **Complete 5e Skills** - Full standard skill set available
✅ **ID-Based References** - Immutable, database-native identifiers
✅ **Rich Metadata** - Each ability has emoji, color, name, code, type
✅ **API Enrichment** - Automatic metadata inclusion in API responses
✅ **Backward Compatible** - Still accepts string codes for legacy data

## Migration Notes

- Old `skills` table still exists but is no longer used
- Can be archived/dropped once all systems are migrated if desired
- All new references should use abilities table with ID-based lookups
- Type field in seed files is required; defaults to 'stat' if missing

## Next Steps

1. Create ability-to-skill associations table (if detailed linking needed)
2. Migrate any remaining code/tools to use abilities table
3. Consider archiving old skills table
4. Add UI for filtering abilities by type
