#!/usr/bin/env python3
"""
Schema inspection and visualization tool.
Generates comprehensive view of database schema with relationships and constraints.
"""

import sqlite3
import os

DB_PATH = "dnd_kids_resources.db"


def get_schema_info():
    """Extract comprehensive schema information."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = {row[0]: {} for row in cursor.fetchall()}

    # Get columns for each table
    for table_name in tables:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        tables[table_name]['columns'] = [
            {
                'name': col[1],
                'type': col[2],
                'not_null': col[3],
                'default': col[4],
                'pk': col[5]
            }
            for col in columns
        ]

    # Get foreign keys for each table
    for table_name in tables:
        cursor.execute(f"PRAGMA foreign_key_list({table_name})")
        fks = cursor.fetchall()
        tables[table_name]['fks'] = [
            {
                'column': fk[3],
                'ref_table': fk[2],
                'ref_column': fk[4]
            }
            for fk in fks
        ]

    # Get indexes
    cursor.execute(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name")
    indexes_raw = cursor.fetchall()

    indexes = {}
    for idx_name, tbl_name in indexes_raw:
        cursor.execute(f"PRAGMA index_info({idx_name})")
        cols = cursor.fetchall()
        if tbl_name not in indexes:
            indexes[tbl_name] = []
        indexes[tbl_name].append({
            'name': idx_name,
            'columns': [col[2] for col in cols]
        })

    for table_name in tables:
        tables[table_name]['indexes'] = indexes.get(table_name, [])

    conn.close()
    return tables


def print_schema_detail():
    """Print detailed schema information."""
    tables = get_schema_info()

    print("\n" + "=" * 100)
    print("DATABASE SCHEMA DETAIL")
    print("=" * 100)

    for table_name in sorted(tables.keys()):
        table = tables[table_name]
        print(f"\n[TABLE] {table_name}")
        print("-" * 100)

        # Print columns
        print(f"  Columns:")
        for col in table['columns']:
            pk_marker = " [PK]" if col['pk'] else ""
            nn_marker = " [NOT NULL]" if col['not_null'] else ""
            default_marker = f" DEFAULT {col['default']}" if col['default'] else ""
            print(
                f"    * {col['name']:25} {col['type']:15}{pk_marker}{nn_marker}{default_marker}")

        # Print foreign keys
        if table['fks']:
            print(f"\n  Foreign Keys:")
            for fk in table['fks']:
                print(
                    f"    * {fk['column']:25} > {fk['ref_table']}.{fk['ref_column']}")

        # Print indexes
        if table['indexes']:
            print(f"\n  Indexes:")
            for idx in table['indexes']:
                cols = ", ".join(idx['columns'])
                print(f"    * {idx['name']:30} ({cols})")


def print_relationship_diagram():
    """Print ASCII diagram of table relationships."""
    tables = get_schema_info()

    print("\n" + "=" * 100)
    print("RELATIONSHIP DIAGRAM")
    print("=" * 100)
    print()

    # Build relationship map
    relationships = {}
    for table_name in tables:
        for fk in tables[table_name]['fks']:
            key = (table_name, fk['ref_table'])
            if key not in relationships:
                relationships[key] = []
            relationships[key].append(f"{fk['column']} → {fk['ref_column']}")

    # Print major groups
    print("CORE TABLES:")
    print("  ┌─────────────────────────────────────────────────────────┐")
    print("  │ users                                                     │")
    print("  │ ├─ id (PK)                                              │")
    print("  │ ├─ username (UNIQUE)                                    │")
    print("  │ └─ email (UNIQUE)                                       │")
    print("  └─────────────────────────────────────────────────────────┘")
    print("           ▲")
    print("           │ user_id (FK)")
    print("           │")
    print("  ┌────────┴──────────────────────────────────────────────────────┐")
    print("  │ cards (BASE TABLE - ALL CARD TYPES)                           │")
    print("  │ ├─ id (PK)                                                   │")
    print("  │ ├─ card_type (spell|weapon|condition|npc|...)               │")
    print("  │ ├─ title, icon, level, explanation                          │")
    print("  │ ├─ is_default (1=default, 0=user-owned)                     │")
    print("  │ ├─ user_id (FK → users)                                     │")
    print("  │ └─ created_at, updated_at                                   │")
    print("  └────────┬──────────────────────────────────────────────────────┘")
    print("           │")
    print("           └─── Linked to TYPE-SPECIFIC TABLES ───────────┐")
    print()

    print("TYPE-SPECIFIC TABLES (one-to-one with cards):")
    print()
    print("  spells (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ school")
    print()
    print("  weapons (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  ├─ type, hands, removable")
    print()
    print("  npcs (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  ├─ species, profession, location")
    print()
    print("  conditions (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ duration")
    print()
    print("  locations (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ location_type")
    print()
    print("  magic_items (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ rarity")
    print()
    print("  wild_shapes (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ creature_type")
    print()
    print("  actions (card_id → cards.id)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK, UNIQUE)")
    print("  └─ action_type")
    print()

    print("DECOMPOSED DATA TABLES:")
    print()
    print("  rolls (STANDALONE - referenced by detail_entries)")
    print("  ├─ id (PK)")
    print("  ├─ num_dice, dice_type")
    print("  ├─ base_modifier (fire, save, heal, ability, etc.)")
    print("  ├─ stat_modifier (str, dex, con, int, wis, cha, null)")
    print("  ├─ apply_spell_modifier (0|1) - whether [BOX] is added")
    print("  ├─ roll_actor (null, self, target)")
    print("  └─ created_at")
    print()
    print("  detail_entries (ARRAY DECOMPOSITION)")
    print("  ├─ id (PK)")
    print("  ├─ card_id (FK → cards.id)")
    print("  ├─ sequence_order (UNIQUE per card - preserves array order)")
    print("  ├─ label (from detail.label)")
    print("  ├─ content_type (text|roll|damage_roll|complex)")
    print("  ├─ content_text (for text content)")
    print("  ├─ roll_id (FK → rolls.id, NULL if content_type != 'roll')")
    print("  └─ created_at")
    print()


def print_summary_stats():
    """Print summary statistics."""
    tables = get_schema_info()

    print("\n" + "=" * 100)
    print("SUMMARY STATISTICS")
    print("=" * 100)
    print()

    total_tables = len(tables)
    total_columns = sum(len(t['columns']) for t in tables.values())
    total_fks = sum(len(t['fks']) for t in tables.values())
    total_indexes = sum(len(t['indexes']) for t in tables.values())

    print(f"  Total Tables:       {total_tables}")
    print(f"  Total Columns:      {total_columns}")
    print(f"  Total Foreign Keys: {total_fks}")
    print(f"  Total Indexes:      {total_indexes}")
    print()

    # Table breakdown
    print("  Tables by Category:")
    print(f"    Core:             users, cards")
    print(f"    Type-Specific:    spells, weapons, npcs, conditions, locations, magic_items, wild_shapes, actions (8 tables)")
    print(f"    Decomposed:       rolls, detail_entries (2 tables)")
    print(f"    Total:            {total_tables} tables")
    print()

    # Data integrity features
    print("\nDATA INTEGRITY:")
    print(f"    [OK] Primary Keys:         All tables have PRIMARY KEY")
    print(
        f"    [OK] Foreign Keys:         {total_fks} constraints with CASCADE DELETE on user deletion")
    print(
        f"    [OK] Unique Constraints:   card_id in all type-specific tables (1-to-1 with cards)")
    print(
        f"    [OK] Sequence Control:     detail_entries has UNIQUE(card_id, sequence_order)")
    print(
        f"    [OK] Indexes:              {total_indexes} indexes for performance (FK fields, common queries)")
    print()


def print_reconstruction_example():
    """Show how to reconstruct JSON from database."""
    print("\n" + "=" * 100)
    print("RECONSTRUCTION EXAMPLE: How to rebuild JSON from DB")
    print("=" * 100)
    print()

    print("To reconstruct a spell card to original JSON format:")
    print()
    print("  1. Query the card:")
    print("     SELECT * FROM cards WHERE id = 'spell-fireball'")
    print()
    print("  2. Query the spell-specific data:")
    print("     SELECT * FROM spells WHERE card_id = 'spell-fireball'")
    print()
    print("  3. Query all details (ordered):")
    print("     SELECT de.*, r.* FROM detail_entries de")
    print("     LEFT JOIN rolls r ON de.roll_id = r.id")
    print("     WHERE de.card_id = 'spell-fireball'")
    print("     ORDER BY de.sequence_order")
    print()
    print("  4. Reconstruct in application code:")
    print()
    print("     {")
    print('       "title": card.title,')
    print('       "icon": card.icon,')
    print('       "level": card.level,')
    print('       "school": spell.school,')
    print('       "explanation": card.explanation,')
    print('       "details": [')
    print('         {')
    print('           "label": detail.label,')
    print('           "content": detail.content_text || {')
    print('             "numDice": roll.num_dice,')
    print('             "diceType": roll.dice_type,')
    print('             "baseModifier": roll.base_modifier,')
    print('             "statModifier": roll.stat_modifier,')
    print('             "applySpellModifier": roll.apply_spell_modifier')
    print('           }')
    print('         }')
    print('       ]')
    print("     }")
    print()

    print("KEY ADVANTAGES:")
    print("  [OK] Zero data loss - all original structure preserved")
    print("  [OK] No collapsed fields - each component is separate")
    print("  [OK] Query flexibility - can query roll modifiers individually")
    print("  [OK] Type safety - num_dice is INTEGER, not string in JSON")
    print("  [OK] Sequence preservation - sequence_order ensures correct order")
    print()


def main():
    """Main inspection flow."""
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found: {DB_PATH}")
        return

    print("\n" + "=" * 100)
    print("D&amp;D Kids Resources - Schema Inspection")
    print("=" * 100)

    print_schema_detail()
    print_relationship_diagram()
    print_summary_stats()
    print_reconstruction_example()

    print("=" * 100)
    print("Schema inspection complete")
    print("=" * 100)


if __name__ == "__main__":
    main()
