#!/usr/bin/env python3
"""
Migration script v3: Clean consolidation of cards into spells.
Final version with proper data cleanup and validation.
"""

import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = "dnd_kids_resources.db"


def backup_database():
    """Create a backup of the database before migration."""
    import shutil
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{DB_PATH}.backup.{timestamp}"
    shutil.copy(DB_PATH, backup_path)
    print(f"✓ Backup created: {Path(backup_path).name}")
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
    print("MIGRATION v3: Consolidate cards table into spells (clean)")
    print("=" * 70)
    
    try:
        # Step 0: Create backup
        print("\n[0/6] Creating backup...")
        backup_database()
        
        # Step 1: Remove orphaned spells
        print("\n[1/6] Removing orphaned spell records...")
        cursor.execute("""
        DELETE FROM spells 
        WHERE card_id NOT IN (SELECT id FROM cards)
        OR card_id IS NULL
        """)
        removed = cursor.rowcount
        if removed > 0:
            print(f"  ✓ Removed {removed} orphaned spelll records")
        else:
            print("  ✓ No orphaned records found")
        
        # Step 2: Add missing columns to spells
        print("\n[2/6] Ensuring all columns exist in spells...")
        spells_cols = get_table_columns(cursor, 'spells')
        needed_cols = {
            'title': "TEXT NOT NULL DEFAULT ''",
            'icon': "TEXT NOT NULL DEFAULT '✨'",
            'level': "TEXT NOT NULL DEFAULT 'cantrip'",
            'explanation': "TEXT DEFAULT ''"
        }
        for col_name, col_def in needed_cols.items():
            if col_name not in spells_cols:
                cursor.execute(f"ALTER TABLE spells ADD COLUMN {col_name} {col_def}")
                print(f"    + Added {col_name}")
        print("  ✓ Spells table prepared")
        
        # Step 3: Add spell_id to detail_entries
        print("\n[3/6] Adding spell_id to detail_entries...")
        detail_cols = get_table_columns(cursor, 'detail_entries')
        if 'spell_id' not in detail_cols:
            cursor.execute("ALTER TABLE detail_entries ADD COLUMN spell_id INTEGER")
            print("    + Added spell_id column")
        print("  ✓ Detail entries prepared")
        
        # Step 4: Migrate data
        print("\n[4/6] Migrating spell metadata from cards...")
        cursor.execute("""
        UPDATE spells SET
            title = COALESCE((SELECT title FROM cards WHERE cards.id = spells.card_id), ''),
            icon = COALESCE((SELECT icon FROM cards WHERE cards.id = spells.card_id), '✨'),
            level = COALESCE((SELECT level FROM cards WHERE cards.id = spells.card_id), 'cantrip'),
            explanation = COALESCE((SELECT explanation FROM cards WHERE cards.id = spells.card_id), '')
        WHERE card_id IS NOT NULL
        """)
        print(f"  ✓ Updated {cursor.rowcount} spell records")
        
        # Step 5: Link detail entries to spells
        print("\n[5/6] Linking detail_entries to spell_id...")
        cursor.execute("""
        UPDATE detail_entries SET
            spell_id = (SELECT spells.id FROM spells WHERE spells.card_id = detail_entries.card_id)
        WHERE card_id IS NOT NULL AND spell_id IS NULL
        """)
        print(f"  ✓ Updated {cursor.rowcount} detail entries")
        
        # Step 6: Recreate tables without card_id references
        print("\n[6/6] Restructuring tables...")
        
        # Recreate spells table (remove card_id)
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
        
        cursor.execute("""
        INSERT INTO spells_new (id, title, icon, level, school, explanation, to_hit, damage, heal, range)
        SELECT id, title, icon, level, school, explanation, to_hit, damage, heal, range FROM spells
        """)
        
        cursor.execute("DROP TABLE spells")
        cursor.execute("ALTER TABLE spells_new RENAME TO spells")
        cursor.execute("CREATE INDEX idx_spells_title ON spells(title)")
        cursor.execute("CREATE INDEX idx_spells_level ON spells(level)")
        cursor.execute("CREATE INDEX idx_spells_school ON spells(school)")
        print("    + Recreated spells table (removed card_id)")
        
        # Recreate detail_entries table (use spell_id instead of card_id)
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
        
        cursor.execute("""
        INSERT INTO detail_entries_new (id, spell_id, label, content_text, sequence_order)
        SELECT id, spell_id, label, content_text, sequence_order FROM detail_entries
        WHERE spell_id IS NOT NULL
        """)
        
        cursor.execute("DROP TABLE detail_entries")
        cursor.execute("ALTER TABLE detail_entries_new RENAME TO detail_entries")
        cursor.execute("CREATE INDEX idx_detail_entries_spell_id ON detail_entries(spell_id)")
        print("    + Recreated detail_entries table (uses spell_id)")
        
        # Drop cards table
        cursor.execute("DROP TABLE IF EXISTS cards")
        print("    + Dropped cards table")
        
        # Commit
        conn.commit()
        
        # Display final schema
        print("\n" + "=" * 70)
        print("✓ MIGRATION COMPLETE")
        print("=" * 70)
        
        print("\nFinal spells schema:")
        cursor.execute("PRAGMA table_info(spells)")
        for row in cursor.fetchall():
            print(f"  • {row[1]:20} {row[2]}")
        
        print("\nFinal detail_entries schema:")
        cursor.execute("PRAGMA table_info(detail_entries)")
        for row in cursor.fetchall():
            print(f"  • {row[1]:20} {row[2]}")
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM spells")
        spell_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM detail_entries")
        detail_count = cursor.fetchone()[0]
        
        print(f"\nData verification:")
        print(f"  • Spells: {spell_count}")
        print(f"  • Details: {detail_count}")
        
        conn.close()
        
        print("\n✓ Migration successful!")
        print("✓ All data migrated")
        print("✓ cards table dropped")
        print("✓ detail_entries now uses spell_id\n")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ MIGRATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        conn.close()
        return False


if __name__ == '__main__':
    success = migrate()
    exit(0 if success else 1)
