#!/usr/bin/env python3
"""
PHASE 1: Database Schema Initialization

This script creates the database tables with proper schema.
It does NOT populate data - use seed_database.py for that.

Workflow:
  1. python _dev/init_database.py        # Create tables
  2. python _dev/seed_database.py        # Load seed data from JSON files
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def init_database():
    """Create database tables only (schema setup)"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print("="*60)
    print("PHASE 1: DATABASE SCHEMA INITIALIZATION")
    print("="*60)
    
    # Disable foreign key constraints temporarily to allow table drops
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Drop all existing tables in reverse dependency order
    print("\nCleaning up existing tables...")
    tables_to_drop = [
        "statblock_jobs",
        "weapons",
        "wild_shapes",
        "creatures",
        "creature_types",
        "spells",
        "conditions",
        "damage_types",
        "abilities",
        "traps",
        "dungeons",
        "icons",
        "skills"
    ]
    
    for table in tables_to_drop:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
        except Exception as e:
            print(f"  [INFO]  Could not drop {table}: {e}")
    
    conn.commit()
    
    # Re-enable foreign key constraints
    cursor.execute("PRAGMA foreign_keys = ON")
    
    print("[OK] Cleaned up existing tables")
    print("\nCreating database schema...")
    print("  - Creating tables with new spell metadata fields (Option 1)...")
    print("  - Creating class system for spell availability...")

    # Create abilities table (with ID for seed_database.py compatibility)
    cursor.execute("""
        CREATE TABLE abilities (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'stat',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create damage_types table (with ID for seed_database.py compatibility)
    cursor.execute("""
        CREATE TABLE damage_types (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create spells table using the new staging schema
    cursor.execute("""
        CREATE TABLE spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spell_name TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            school TEXT,
            spell_text TEXT,
            spell_alt_text TEXT,
            damage TEXT,
            heal TEXT,
            heal_at_spell_slots TEXT,
            range TEXT,
            higher_levels TEXT,
            damage_at_higher_levels TEXT,
            casting_time TEXT,
            duration TEXT,
            concentration BOOLEAN DEFAULT 0,
            ritual BOOLEAN DEFAULT 0,
            components TEXT,
            materials TEXT,
            attack_type TEXT,
            area_of_effect TEXT,
            classes TEXT,
            subclasses TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)


    # Create classes table (new)

    cursor.execute("""
        CREATE TABLE classes (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create creature_types lookup table (with ID for seed_database.py compatibility)
    cursor.execute("""
        CREATE TABLE creature_types (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create creatures table
    cursor.execute("""
        CREATE TABLE creatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT,
            size TEXT,
            creature_type_id INTEGER,
            hp INTEGER,
            ac INTEGER,
            explanation TEXT,
            attack_to_hit TEXT,
            damage TEXT,
            special TEXT,
            stats TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creature_type_id) REFERENCES creature_types(id)
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_creatures_creature_type_id ON creatures(creature_type_id)")

    # [REMOVED - April 10, 2026] Old queue-based AI job system
    # Replaced with custom lightweight model approach

    # Create traps table
    cursor.execute("""
        CREATE TABLE traps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create dungeons table
    cursor.execute("""
        CREATE TABLE dungeons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            original_html TEXT NOT NULL,
            parsed_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create weapons table (legacy)
    cursor.execute("""
        CREATE TABLE weapons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL UNIQUE,
            type TEXT,
            hands TEXT,
            removable INTEGER,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
    """)

    # Create wild_shapes table (legacy)
    cursor.execute("""
        CREATE TABLE wild_shapes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL UNIQUE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
    """)

    # Create icons table (legacy)
    cursor.execute("""
        CREATE TABLE icons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            purpose TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    print("[OK] Tables created")
    
    conn.commit()
    conn.close()

    print(f"\n[SUCCESS] Database initialized: {DB_PATH}")
    print(f"   Size: {DB_PATH.stat().st_size / 1024:.1f} KB")
    print("\nNEW SCHEMA (Option 1) Features:")
    print("  [OK] Spells table: 23 columns (staging-based schema for 5eTools spell ingestion)")
    print("    - Staging schema: spell_name, icon, level, school, spell_text, spell_alt_text, damage, heal, heal_at_spell_slots, range, higher_levels")
    print("    - NEW: casting_time, duration, concentration, ritual, components, materials, attack_type, area_of_effect, classes (JSON), subclasses (JSON), damage_at_higher_levels")
    print("  [OK] Classes stored directly in spells table as JSON array (e.g., ['wizard', 'sorcerer'])")
    print("\n" + "="*60)
    print("NEXT STEP: Run seed_database.py to populate data")
    print("="*60)
    print("\nUsage:")
    print("  python _dev/seed_database.py              # Load all seed data")
    print("  python _dev/seed_database.py --spells     # Load only spells")
    print("  python _dev/seed_database.py --force      # Reload (clear existing data)")


if __name__ == '__main__':
    init_database()
