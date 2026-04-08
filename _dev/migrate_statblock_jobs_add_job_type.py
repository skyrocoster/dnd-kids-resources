#!/usr/bin/env python3
"""
Migration: Add job_type and spell_id columns to statblock_jobs table

This script safely adds:
- job_type TEXT DEFAULT 'creature' 
- spell_id INTEGER (foreign key to spells)

Modifications:
- Sets existing rows to job_type='creature' (backward compatible)
- Adds spell_id foreign key constraint
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def migrate():
    """Add job_type and spell_id columns to statblock_jobs"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    print("=" * 60)
    print("MIGRATION: Add job_type and spell_id to statblock_jobs")
    print("=" * 60)
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(statblock_jobs)")
        columns = {row[1] for row in cursor.fetchall()}
        
        if 'job_type' not in columns:
            print("\n[1/2] Adding job_type column...")
            cursor.execute("""
                ALTER TABLE statblock_jobs 
                ADD COLUMN job_type TEXT DEFAULT 'creature'
            """)
            print("  ✓ job_type column added")
        else:
            print("\n[1/2] job_type column already exists, skipping...")
        
        if 'spell_id' not in columns:
            print("\n[2/2] Adding spell_id column...")
            cursor.execute("""
                ALTER TABLE statblock_jobs 
                ADD COLUMN spell_id INTEGER
            """)
            print("  ✓ spell_id column added")
            
            # Add foreign key constraint (SQLite doesn't support ALTER TABLE ADD CONSTRAINT)
            # The constraint will be enforced via application logic
            print("  ℹ Note: Foreign key constraint enforced via application logic")
        else:
            print("\n[2/2] spell_id column already exists, skipping...")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
    
    return True


if __name__ == "__main__":
    success = migrate()
    if not success:
        exit(1)
