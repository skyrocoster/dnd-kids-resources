# Database Restructuring Plan

> **📋 HISTORICAL DOCUMENT** — Completed April 2026. This documents schema cleanup work that was performed. For current schema, see [SCHEMA_DESIGN.md](SCHEMA_DESIGN.md).

## Executive Summary

Your database has a **good foundation** with proper lookup tables and JSON fields for complex data. However, several tables are orphaned/unused, and there are minor inconsistencies in naming and structure. The plan is to **clean up without breaking existing functionality**.

---

## 1. CURRENT STATE ANALYSIS

### Schema Overview

```
✓ Populated & Active:
├── abilities (8 rows)           [lookup: ability codes → metadata]
├── damage_types (13 rows)       [lookup: damage codes → metadata]  
├── creature_types (6 rows)      [lookup: creature type → emoji/color]
└── dungeons (2 rows)            [parsed dungeon data]

✗ Empty & Waiting for Data:
├── spells (0)                   [main card type - HIGH PRIORITY]
├── conditions (0)               [main card type - HIGH PRIORITY]
├── creatures (0)                [main card type - HIGH PRIORITY]
├── skills (0)                   [main card type - HIGH PRIORITY]
├── weapons (0)                  [legacy - CANDIDATE FOR REMOVAL]
├── wild_shapes (0)              [legacy - CANDIDATE FOR REMOVAL]
└── icons (0)                    [legacy - CANDIDATE FOR REMOVAL]
```

### API Integration Map

| Endpoint | Source Table | Key Fields Used | Issues |
|----------|-------------|-----------------|--------|
| `/api/spells` | spells | id, title, icon, level, school, explanation, to_hit (JSON), damage (JSON), heal (JSON), range (JSON) | ✓ None - well designed |
| `/api/conditions` | conditions | id, title, icon, explanation, details (JSON) | ✓ None - well designed |
| `/api/creatures` | creatures | id, title, icon, size, creature_type_id, hp, ac, explanation, attack_to_hit (JSON), damage (JSON), stats (JSON) | ⚠️ Need creature_type FK index |
| `/api/skills` | skills | id, title, icon, level, explanation, details (string) | ✓ None - well designed |

### Inconsistencies Identified

1. **Column Naming**: 
   - `level` used for both spell levels AND skill categories (OK - context dependent)
   - `icon` vs using emoji directly (✓ consistent through codebase)
   - `explanation` vs `description` (all using `explanation` ✓)

2. **Details Field Type Mismatch**:
   - `conditions.details` → JSON array
   - `creatures.attack_to_hit`, `damage`, `stats` → JSON objects
   - `skills.details` → TEXT string
   - **Decision**: This is fine - different types need different structures

3. **Orphaned Tables** (foreign key references to non-existent `cards` table):
   - `weapons` → references `cards(id)`
   - `wild_shapes` → references `cards(id)`
   - `icons` → no FK but not integrated

4. **Missing Relationships**:
   - `dungeons.parsed_json` stores room objects with creature names (strings)
   - Should be able to link to `creatures(id)` via dungeon parser (already implemented!)

---

## 2. EFFICIENCY ASSESSMENT

### Current Design (Good Parts)

✅ **Lookup Tables Pattern**: abilities, damage_types, creature_types
- Allows centralized metadata management
- Clean enrichment in API layer
- Emoji/color system works well

✅ **JSON for Complex Nested Data**: to_hit, damage, heal, range, stats
- Avoids normalizing rolls into separate tables
- Maintains flexibility for spell variants
- Easy to serialize/deserialize

✅ **Indexing Strategy**
- `spells` has indexes on title, level, school
- `creatures` and `conditions` lack obvious search indexes

### Current Design (Problem Areas)

⚠️ **No Unique Constraints Check**:
- `conditions.title` is UNIQUE ✓
- `spells.title` is UNIQUE ✓
- `skills.title` is NOT unique (should be based on usage)
- `creatures.title` is UNIQUE ✓

⚠️ **Timestamps Inconsistent**:
- `creatures.created_at` ✓
- `conditions.created_at` ✓
- `spells` - none
- `skills` - none

⚠️ **Orphaned Columns**:
- `creatures.special` → defined but never populated/used in API

⚠️ **Foreign Key Not Indexed**:
- `creatures.creature_type_id` is FK but has no INDEX

---

## 3. RESTRUCTURING PLAN (Non-Destructive)

### Phase 1: Cleanup & Index Optimization (IMMEDIATE)

**1.1 Add Missing Indexes** (improves query speed)
```sql
CREATE INDEX idx_conditions_title ON conditions(title);
CREATE INDEX idx_skills_title ON skills(title);
CREATE INDEX idx_skills_level ON skills(level);
CREATE INDEX idx_creatures_type ON creatures(creature_type_id);
```

**1.2 Add Timestamps to spells & skills** (optional but good practice)
```sql
ALTER TABLE spells ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE skills ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

**1.3 Add UNIQUE constraint to skills** (why not?)
```sql
CREATE UNIQUE INDEX idx_skills_title_unique ON skills(title);
```

**1.4 Drop Orphaned Tables** (clean up legacy code)
```sql
DROP TABLE IF EXISTS weapons;
DROP TABLE IF EXISTS wild_shapes;
DROP TABLE IF EXISTS icons;
```

**Rationale**: These reference a non-existent `cards` table and aren't used by current API.

---

### Phase 2: Data Population Strategy (PARALLEL)

**2.1 Create Seed System** (prevents data loss)
```
_dev/
├── seed_spells.json         [spell data]
├── seed_conditions.json     [condition data]
├── seed_creatures.json      [creature data]
├── seed_skills.json         [skill data]
└── seed_database.py         [populates from JSON]
```

**2.2 Update init_database.py**
```python
def init_database():
    # Create tables
    create_all_tables()
    
    # Populate lookup tables (abilities, damage_types, creature_types)
    populate_lookup_tables()
    
    # Populate game data from seed files
    populate_spells()
    populate_conditions()
    populate_creatures()
    populate_skills()
```

**2.3 Git Strategy**
```
dnd_kids_resources.db  → .gitignore (remove binary tracking)
data/                  → Add seed JSON files here
_dev/                  → Add seed_database.py here
```

---

### Phase 3: Schema Improvements (OPTIONAL)

**3.1 Consider: Spell School Lookup Table** (currently string)
```sql
CREATE TABLE spell_schools (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL
);

-- Then: ALTER TABLE spells CHANGE school school_id TEXT;
-- With FK to spell_schools(code)
```
**Reason**: Allows consistent emoji/color styling. Optional - only if wanted.

**3.2 Consider: Size as Lookup** (currently string in creatures)
Current: `size TEXT` = "Small", "Medium", "Large"
**Keep as-is** unless you need to add metadata (emoji, color, etc.)

**3.3 Consider: Creature Abilities Association**
Currently: `creatures.stats` is JSON with ability scores
**Keep as-is** because:
- Not all creatures need stats
- Flexibility for variants
- JSON is cleaner than joining

---

## 4. PRIORITY ROADMAP

### 🔴 HIGH PRIORITY (Do First)
1. ✅ Add missing indexes (Phase 1.1) - *5 min, big perf gain*
2. ✅ Drop orphaned tables (Phase 1.4) - *1 min, cleaner schema*
3. ✅ Create seed system (Phase 2.1-2.2) - *30 min, prevents future data loss*
4. 📋 Populate spells, conditions, creatures, skills from seeds

### 🟡 MEDIUM PRIORITY (Nice to Have)
1. Add timestamps to spells/skills (Phase 1.2) - *not critical*
2. Add UNIQUE constraint to skills (Phase 1.3) - *only if needed*
3. Spell schools lookup (Phase 3.1) - *only for consistency*

### 🟢 LOW PRIORITY (Future)
1. Consider migrating more to lookup tables (Phase 3.2-3.3)

---

## 5. IMPLEMENTATION STEPS

### Step 1: Backup Everything
```powershell
Copy-Item dnd_kids_resources.db dnd_kids_resources.db.backup
git add -A && git commit -m "Backup before DB restructuring"
```

### Step 2: Run Phase 1 (Cleanup)
- Execute indexes and drop orphaned tables
- No data affected

### Step 3: Create Seed System
- Extract spell/condition/creature/skill data from external sources
- Create `seed_spells.json`, etc.
- Write `seed_database.py`

### Step 4: Populate Data
- Run `python _dev/seed_database.py`
- Verify via Flask API endpoints

### Step 5: Update .gitignore
```
# Databases (seed from code instead)
dnd_kids_resources.db
*.db
```

### Step 6: Commit
```powershell
git add -A
git commit -m "Database restructuring: cleanup, indexes, seed system"
```

---

## 6. BEFORE/AFTER COMPARISON

### Before
```
📊 Tables: 11 (3 used, 8 useless/empty)
🔍 Indexes: 3 (spells only)
🏗️ Schema: Mixed timestamp usage
🚀 Restored Data: Manual file manipulation
```

### After
```
📊 Tables: 8 (all active)
🔍 Indexes: 8+ (optimized for all queries)
🏗️ Schema: Consistent structure
🚀 Restored Data: Run single seed script
```

---

## Questions?

This plan is **flexible**. Do you want to:
1. **Proceed with Phase 1 & 2?** (Recommended)
2. **Do Phase 3 schema improvements first?**
3. **Start building the seed system?**

Pick a phase and I'll implement it! 🚀
