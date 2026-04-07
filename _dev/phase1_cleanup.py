#!/usr/bin/env python3
"""
Phase 1: Database Cleanup & Index Optimization

This script:
1. Creates a backup of the database
2. Adds missing indexes for query optimization
3. Adds timestamps to spells and skills tables
4. Adds UNIQUE constraint to skills.title
5. Drops orphaned legacy tables (weapons, wild_shapes, icons)
6. Verifies all changes

Non-destructive: No data is modified, only schema improvements.
"""

import sqlite3
from pathlib import Path
from datetime import datetime
import shutil

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"

def backup_database():
    """Create a backup of the database before any changes."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DB_PATH.parent / f"dnd_kids_resources.db.backup.{timestamp}"
    shutil.copy(DB_PATH, backup_path)
    print(f"✅ Backup created: {backup_path.name}")
    return backup_path

def add_indexes(cursor, conn):
    """Add missing indexes for query optimization."""
    print("\n[1/4] Adding missing indexes...")
    
    indexes = [
        ("idx_creatures_type", "CREATE INDEX IF NOT EXISTS idx_creatures_type ON creatures(creature_type_id);"),
        ("idx_conditions_title", "CREATE INDEX IF NOT EXISTS idx_conditions_title ON conditions(title);"),
        ("idx_skills_title", "CREATE INDEX IF NOT EXISTS idx_skills_title ON skills(title);"),
        ("idx_skills_level", "CREATE INDEX IF NOT EXISTS idx_skills_level ON skills(level);"),
    ]
    
    for name, sql in indexes:
        try:
            cursor.execute(sql)
            print(f"  ✓ Created index: {name}")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  Index {name} may already exist: {e}")
    
    conn.commit()
    print("  ✓ Indexes committed")

def add_timestamps(cursor, conn):
    """Add created_at timestamps to spells and skills tables."""
    print("\n[2/4] Adding timestamps to spells and skills...")
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(spells)")
    spells_cols = {row[1] for row in cursor.fetchall()}
    
    cursor.execute("PRAGMA table_info(skills)")
    skills_cols = {row[1] for row in cursor.fetchall()}
    
    # Add to spells if missing
    if 'created_at' not in spells_cols:
        try:
            cursor.execute("""
                ALTER TABLE spells 
                ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            """)
            print("  ✓ Added created_at to spells")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  {e}")
    else:
        print("  ℹ️  spells.created_at already exists")
    
    # Add to skills if missing
    if 'created_at' not in skills_cols:
        try:
            cursor.execute("""
                ALTER TABLE skills 
                ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            """)
            print("  ✓ Added created_at to skills")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  {e}")
    else:
        print("  ℹ️  skills.created_at already exists")
    
    conn.commit()
    print("  ✓ Timestamps committed")

def add_unique_constraint(cursor, conn):
    """Add UNIQUE constraint to skills.title."""
    print("\n[3/4] Adding UNIQUE constraint to skills.title...")
    
    try:
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_title_unique 
            ON skills(title);
        """)
        print("  ✓ Created UNIQUE index on skills.title")
    except sqlite3.IntegrityError as e:
        print(f"  ⚠️  Constraint may already exist or duplicates found: {e}")
        # List any duplicates
        cursor.execute("""
            SELECT title, COUNT(*) as count 
            FROM skills 
            GROUP BY title 
            HAVING count > 1;
        """)
        dupes = cursor.fetchall()
        if dupes:
            print("  ⚠️  Duplicate skills found:")
            for title, count in dupes:
                print(f"     - '{title}': {count} times")
            print("  💡 Hint: Delete duplicates before applying constraint")
            return False
    except sqlite3.OperationalError as e:
        print(f"  ⚠️  {e}")
    
    conn.commit()
    print("  ✓ UNIQUE constraint committed")
    return True

def drop_orphaned_tables(cursor, conn):
    """Drop legacy tables that reference non-existent cards table."""
    print("\n[4/4] Dropping orphaned legacy tables...")
    
    orphaned = ["weapons", "wild_shapes", "icons"]
    
    for table in orphaned:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table};")
            print(f"  ✓ Dropped table: {table}")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  Error dropping {table}: {e}")
    
    conn.commit()
    print("  ✓ Orphaned tables removed")

def verify_changes(cursor):
    """Verify all changes were applied successfully."""
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    # Check indexes
    print("\n✅ Indexes:")
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name;
    """)
    for row in cursor.fetchall():
        print(f"  • {row[0]}")
    
    # Check table structure
    print("\n✅ Table Columns (spells & skills):")
    cursor.execute("PRAGMA table_info(spells)")
    print("  spells:")
    for row in cursor.fetchall():
        print(f"    • {row[1]} ({row[2]})")
    
    cursor.execute("PRAGMA table_info(skills)")
    print("  skills:")
    for row in cursor.fetchall():
        print(f"    • {row[1]} ({row[2]})")
    
    # Check remaining tables
    print("\n✅ Remaining Tables:")
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table'
        ORDER BY name;
    """)
    tables = [row[0] for row in cursor.fetchall()]
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  • {table} ({count} rows)")
    
    # Verify dropped tables
    print("\n✅ Orphaned Tables Removed:")
    for table in ["weapons", "wild_shapes", "icons"]:
        if table not in tables:
            print(f"  ✓ {table} - REMOVED")
        else:
            print(f"  ✗ {table} - STILL EXISTS (check manually)")

def main():
    print("="*60)
    print("PHASE 1: DATABASE CLEANUP & INDEX OPTIMIZATION")
    print("="*60)
    
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        return False
    
    try:
        # Backup first
        backup_database()
        
        # Connect and apply changes
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        print("\n🔄 Applying schema changes...\n")
        
        add_indexes(cursor, conn)
        add_timestamps(cursor, conn)
        add_unique_constraint(cursor, conn)
        drop_orphaned_tables(cursor, conn)
        
        # Verify
        verify_changes(cursor)
        
        conn.close()
        
        print("\n" + "="*60)
        print("✅ PHASE 1 COMPLETE!")
        print("="*60)
        print("\nNext Step: Phase 2 - Create Seed System")
        print("Run: python _dev/create_seed_system.py")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print(f"\n💡 A backup was created at: {backup_path}")
        print("   Restore with: Copy-Item dnd_kids_resources.db.backup.TIMESTAMP dnd_kids_resources.db")
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
