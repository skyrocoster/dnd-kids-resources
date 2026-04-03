#!/usr/bin/env python3
"""
Migration script v2: Consolidate cards table into spells table.
More robust version that checks for existing columns first.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = "dnd_kids_resources.db"


def backup_database():
    """Create a backup of the database before migration."""
    import shutil
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{DB_PATH}.backup.{timestamp}"
    shutil.copy(DB_PATH, backup_path)
    print(f"✓ Database backed up to: {backup_path}")
    return backup_path


def get_table_columns(cursor, table_name):
    """Get all column names for a table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def migrate():
    """Execute the consolidation migration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\n" + "=" * 70)
    print("MIGRATION v2: Consolidate cards table into spells table")
    print("=" * 70)

    try:
        # Step 1: Check current schema
        print("\n[1/7] Checking current schema...")
        spells_cols = get_table_columns(cursor, 'spells')
        detail_cols = get_table_columns(cursor, 'detail_entries')
        print(f"  Spells table columns: {sorted(spells_cols)}")
        print(f"  Detail entries columns: {sorted(detail_cols)}")

        # Step 2: Backup
        print("\n[2/7] Backing up database...")
        backup_database()

        # Step 3: Add missing columns to spells table
        print("\n[3/7] Adding missing columns to spells table...")
        if 'title' not in spells_cols:
            cursor.execute(
                "ALTER TABLE spells ADD COLUMN title TEXT NOT NULL DEFAULT ''")
        if 'icon' not in spells_cols:
            cursor.execute(
                "ALTER TABLE spells ADD COLUMN icon TEXT NOT NULL DEFAULT '✨'")
        if 'level' not in spells_cols:
            cursor.execute(
                "ALTER TABLE spells ADD COLUMN level TEXT NOT NULL DEFAULT 'cantrip'")
        if 'explanation' not in spells_cols:
            cursor.execute(
                "ALTER TABLE spells ADD COLUMN explanation TEXT DEFAULT ''")
        print("  ✓ All necessary columns present")

        # Step 4: Add spell_id to detail_entries if not present
        print("\n[4/7] Adding spell_id to detail_entries...")
        if 'spell_id' not in detail_cols:
            cursor.execute(
                "ALTER TABLE detail_entries ADD COLUMN spell_id INTEGER")
            print("  ✓ Added spell_id column")
        else:
            print("  ✓ spell_id column already exists")

        # Step 5: Migrate data from cards to spells
        print("\n[5/7] Migrating data from cards → spells...")
        cursor.execute("""
        UPDATE spells SET
            title = (SELECT title FROM cards WHERE cards.id = spells.card_id),
            icon = (SELECT icon FROM cards WHERE cards.id = spells.card_id),
            level = (SELECT level FROM cards WHERE cards.id = spells.card_id),
            explanation = (SELECT explanation FROM cards WHERE cards.id = spells.card_id)
        WHERE card_id IS NOT NULL
        """)
        affected = cursor.rowcount
        print(f"  ✓ Updated {affected} spell records")

        # Step 6: Populate spell_id in detail_entries
        print("\n[6/7] Populating spell_id in detail_entries...")
        cursor.execute("""
        UPDATE detail_entries SET
            spell_id = (
                SELECT spells.id FROM spells 
                WHERE spells.card_id = detail_entries.card_id
            )
        WHERE card_id IS NOT NULL AND spell_id IS NULL
        """)
        affected = cursor.rowcount
        print(f"  ✓ Updated {affected} detail entries with spell_id")

        # Step 7: Recreate spells and detail_entries tables without card_id
        print("\n[7/7] Removing card_id references...")

        # Backup existing data
        cursor.execute("SELECT * FROM spells")
        spells_data = cursor.fetchall()
        cursor.execute("SELECT * FROM detail_entries")
        detail_data = cursor.fetchall()

        # Get column info for new tables
        cursor.execute("PRAGMA table_info(spells)")
        spells_info = cursor.fetchall()
        spells_columns = [col[1] for col in spells_info]

        # Create new spells table without card_id
        spells_cols_no_card = ', '.join([f"{col} {[col_info[2] for col_info in spells_info if col_info[1] == col][0]}"
                                         for col in spells_columns if col != 'card_id'])

        # Simple approach: drop and recreate
        cursor.execute("DROP TABLE IF EXISTS spells_new")
        cursor.execute("""
        CREATE TABLE spells_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            school TEXT,
            explanation TEXT,
            to_hit TEXT,
            damage TEXT,
            heal TEXT,
            range TEXT
        )
        """)

        # Copy data
        cursor.execute("""
        INSERT INTO spells_new (id, title, icon, level, school, explanation, to_hit, damage, heal, range)
        SELECT id, title, icon, level, school, explanation, to_hit, damage, heal, range 
        FROM spells
        """)

        # Replace old table
        cursor.execute("DROP TABLE spells")
        cursor.execute("ALTER TABLE spells_new RENAME TO spells")

        # Recreate indexes
        cursor.execute("CREATE INDEX idx_spells_title ON spells(title)")
        cursor.execute("CREATE INDEX idx_spells_level ON spells(level)")
        cursor.execute("CREATE INDEX idx_spells_school ON spells(school)")

        print("  ✓ Recreated spells table without card_id")

        # Update detail_entries table
        cursor.execute("DROP TABLE IF EXISTS detail_entries_new")
        cursor.execute("""
        CREATE TABLE detail_entries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spell_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            content_text TEXT,
            sequence_order INTEGER DEFAULT 0,
            FOREIGN KEY (spell_id) REFERENCES spells(id) ON DELETE CASCADE
        )
        """)

        # Copy data
        cursor.execute("""
        INSERT INTO detail_entries_new (id, spell_id, label, content_text, sequence_order)
        SELECT id, spell_id, label, content_text, sequence_order 
        FROM detail_entries
        WHERE spell_id IS NOT NULL
        """)

        # Replace old table
        cursor.execute("DROP TABLE detail_entries")
        cursor.execute(
            "ALTER TABLE detail_entries_new RENAME TO detail_entries")

        # Recreate indexes
        cursor.execute(
            "CREATE INDEX idx_detail_entries_spell_id ON detail_entries(spell_id)")

        print("  ✓ Recreated detail_entries table with spell_id reference")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 70)
        print("✓ MIGRATION COMPLETE")
        print("=" * 70)
        print("\nNew Schema:")
        print("  spells table:")
        cursor.execute("PRAGMA table_info(spells)")
        for row in cursor.fetchall():
            print(f"    • {row[1]:20} {row[2]}")

        print("\n  detail_entries table:")
        cursor.execute("PRAGMA table_info(detail_entries)")
        for row in cursor.fetchall():
            print(f"    • {row[1]:20} {row[2]}")

        print("\nNext steps:")
        print("  1. Update _dev/server_flask.py to query spells table directly")
        print("  2. Update ARCHITECTURE.md to reflect new schema")
        print("  3. Drop the cards table (after verifying migration)")
        print("\n")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ MIGRATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        conn.close()

    return True


if __name__ == '__main__':
    success = migrate()
    exit(0 if success else 1)
