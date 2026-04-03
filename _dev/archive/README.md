# Archived Development Tools

One-time-use scripts and legacy tools. **Not needed for current development.**

---

## Database Initialization

Scripts for originally creating the database schema. The database already exists and is fully initialized.

- `init_database.py` - Original database creation
- `init_database_new.py` - Updated database creation

---

## Database Migrations

All migrations have been completed and the database is fully normalized. These are kept for reference only.

**Key migrations that were run:**
- `migrate_create_damage_types.py` - Created damage_types table with emoji/color
- `migrate_add_ability_colors.py` - Added color column to abilities table
- `migrate_separate_sam_sad.py` - Separated SAM/SAD with unique icons
- `migrate_abilities_table.py` - Created abilities reference table
- `migrate_remove_css_class.py` - Cleaned up database schema
- `migrate_remove_detail_entries.py` - Migrated detail_entries to spell columns
- `migrate_consolidate_final.py` - Final consolidation cleanup
- `migrate_consolidate_v2.py` - Earlier consolidation attempt
- `migrate_spells_consolidate.py` - Earlier consolidation attempt
- `migrate_spells.py` - Original spell migration

---

## Legacy Utilities

Tools for old JSON-based workflow or previous development phases. **Not used with current Flask+SQLite system.**

- `abstract_rolls.py` - JSON roll abstraction
- `refactor_modifiers.py` - Spell modifier refactoring (old approach)
- `simplify_prefix.py` - Card prefix simplification
- `update_boxes.py` - SAM/BtH box styling (old approach)
- `schema_inspection.txt` - Manual schema notes (old)
- `view_schema.py` - Database schema viewer (old)
- `server.py` - Legacy HTTP server (replaced by Flask)

---

## When to Use

Refer to these files only if:
- Debugging historical issues or understanding how the database evolved
- Recovering deleted functionality or data structures
- Understanding the migration path from JSON to SQLite

For current development, use the active tools in `../ (parent directory)`.
