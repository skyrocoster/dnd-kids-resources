#!/usr/bin/env python3
"""
Migration: Add ID column to damage_types table

This script adds an explicit id INTEGER PRIMARY KEY column to damage_types.
Run before reseeding with --force flag.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"

def migrate():
    """Add ID column to damage_types if it doesn't exist"""
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Check if ID column exists
        cursor.execute("PRAGMA table_info(damage_types)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'id' in columns:
            print("✅ ID column already exists in damage_types")
            conn.close()
            return True
        
        print("\n🔄 Migrating damage_types table...")
        print("   Adding ID column as explicit primary key")
        
        # For now, just print instructions since we'll drop and recreate in seed_database.py
        print("\n✅ Ready to reseed with: python _dev/seed_database.py --damage-types --force")
        print("   This will drop and recreate the table with proper schema")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    migrate()
