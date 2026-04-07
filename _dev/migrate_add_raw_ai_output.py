#!/usr/bin/env python3
"""
Migration: Add raw_ai_output column to statblock_jobs table
Run this if you have an existing database without the raw_ai_output column
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def migrate():
    """Add raw_ai_output column if it doesn't exist"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(statblock_jobs)")
        columns = {row[1] for row in cursor.fetchall()}
        
        if 'raw_ai_output' in columns:
            print("[OK] raw_ai_output column already exists")
            return
        
        # Add the column
        print("[MIGRATE] Adding raw_ai_output column to statblock_jobs...")
        cursor.execute("""
            ALTER TABLE statblock_jobs
            ADD COLUMN raw_ai_output TEXT
        """)
        conn.commit()
        print("[OK] Column added successfully")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        return False
    finally:
        conn.close()
    
    return True


if __name__ == '__main__':
    print(f"Database: {DB_PATH}")
    migrate()
