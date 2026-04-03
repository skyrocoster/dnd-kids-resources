#!/usr/bin/env python3
"""
Migration script: Consolidate cards table into spells table.
Moves all card metadata (title, icon, level, explanation) into spells table.
Updates detail_entries table to reference spell_id instead of card_id.
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


def migrate():
    """Execute the consolidation migration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\n" + "=" * 70)
    print("MIGRATION: Consolidate cards table into spells table")
    print("=" * 70)

    try:
        # Step 1: Backup database
        print("\n[1/6] Backing up database...")
        backup_database()

        # Step 2: Add new columns to spells table
        print("\n[2/6] Adding columns to spells table...")
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN title TEXT NOT NULL DEFAULT ''
        """)
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN icon TEXT NOT NULL DEFAULT '✨'
        """)
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN level TEXT NOT NULL DEFAULT 'cantrip'
        """)
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN explanation TEXT DEFAULT ''
        """)
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN created_at TEXT
        """)
        cursor.execute("""
        ALTER TABLE spells ADD COLUMN updated_at TEXT
        """)
        print("  ✓ Added: title, icon, level, explanation, created_at, updated_at")

        # Step 3: Migrate data from cards to spells
        print("\n[3/6] Migrating data from cards → spells...")
        cursor.execute("""
        UPDATE spells SET
            title = (SELECT title FROM cards WHERE cards.id = spells.card_id),
            icon = (SELECT icon FROM cards WHERE cards.id = spells.card_id),
            level = (SELECT level FROM cards WHERE cards.id = spells.card_id),
            explanation = (SELECT explanation FROM cards WHERE cards.id = spells.card_id),
            created_at = (SELECT created_at FROM cards WHERE cards.id = spells.card_id),
            updated_at = (SELECT updated_at FROM cards WHERE cards.id = spells.card_id)
        WHERE EXISTS (SELECT 1 FROM cards WHERE cards.id = spells.card_id)
        """)
        affected = cursor.rowcount
        print(f"  ✓ Migrated {affected} spell records")

        # Step 4: Update detail_entries to reference spell_id
        print("\n[4/6] Converting detail_entries references...")
        cursor.execute("""
        UPDATE detail_entries SET
            spell_id = (
                SELECT spells.id FROM spells 
                WHERE spells.card_id = detail_entries.card_id
            )
        WHERE card_id IS NOT NULL AND spell_id IS NULL
        """)
        affected = cursor.rowcount
        print(f"  ✓ Updated {affected} detail entries")

        # Step 5: Drop card_id foreign key from spells and detail_entries
        print("\n[5/6] Removing card_id references...")

        # Create new spells table without card_id
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
            range TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Copy data to new table
        cursor.execute("""
        INSERT INTO spells_new (id, title, icon, level, school, explanation, 
                                to_hit, damage, heal, range, created_at, updated_at)
        SELECT id, title, icon, level, school, explanation, 
               to_hit, damage, heal, range, created_at, updated_at FROM spells
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE spells")
        cursor.execute("ALTER TABLE spells_new RENAME TO spells")

        # Recreate indexes
        cursor.execute("""
        CREATE INDEX idx_spells_title ON spells(title)
        """)
        cursor.execute("""
        CREATE INDEX idx_spells_level ON spells(level)
        """)
        cursor.execute("""
        CREATE INDEX idx_spells_school ON spells(school)
        """)
        print("  ✓ Removed card_id from spells")
        print("  ✓ Recreated indexes")

        # Step 6: Update detail_entries table
        print("\n[6/6] Updating detail_entries table...")

        # Create new detail_entries table
        cursor.execute("""
        CREATE TABLE detail_entries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spell_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            content_text TEXT,
            sequence_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (spell_id) REFERENCES spells(id) ON DELETE CASCADE
        )
        """)

        # Copy data to new table
        cursor.execute("""
        INSERT INTO detail_entries_new (id, spell_id, label, content_text, 
                                        sequence_order, created_at, updated_at)
        SELECT id, spell_id, label, content_text, sequence_order, 
               created_at, updated_at FROM detail_entries
        WHERE spell_id IS NOT NULL
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE detail_entries")
        cursor.execute(
            "ALTER TABLE detail_entries_new RENAME TO detail_entries")

        # Recreate indexes
        cursor.execute("""
        CREATE INDEX idx_detail_entries_spell_id ON detail_entries(spell_id)
        """)
        print("  ✓ Updated detail_entries to reference spells directly")
        print("  ✓ Recreated detail_entries indexes")

        # Commit changes
        conn.commit()

        print("\n" + "=" * 70)
        print("✓ MIGRATION COMPLETE")
        print("=" * 70)
        print("\nSummary:")
        print("  • cards table → removed (all data moved to spells)")
        print("  • spells table → now contains: id, title, icon, level, school,")
        print("                                 explanation, to_hit, damage, heal, range")
        print("  • detail_entries table → now references spell_id (not card_id)")
        print("\nNext steps:")
        print("  1. Update _dev/server_flask.py to query spells table directly")
        print("  2. Update ARCHITECTURE.md to reflect new schema")
        print("  3. Update CONTRIBUTING.md with new schema documentation")
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
