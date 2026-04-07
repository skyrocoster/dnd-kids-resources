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
    print("\nCreating database schema...")

    # Create abilities table (with ID for seed_database.py compatibility)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS abilities (
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
        CREATE TABLE IF NOT EXISTS damage_types (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create spells table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
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

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_title ON spells(title)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school)")

    # Create conditions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            explanation TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create creature_types lookup table (with ID for seed_database.py compatibility)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS creature_types (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create creatures table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS creatures (
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

    # Create statblock_jobs table (for queue-based AI parsing)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS statblock_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT DEFAULT 'pending',
            statblock TEXT NOT NULL,
            model_path TEXT,
            parsed_data TEXT,
            raw_ai_output TEXT,
            creature_id INTEGER,
            error_message TEXT,
            progress_percent INTEGER DEFAULT 0,
            elapsed_seconds INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            completed_at DATETIME,
            FOREIGN KEY (creature_id) REFERENCES creatures(id)
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_statblock_jobs_status ON statblock_jobs(status)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_statblock_jobs_created_at ON statblock_jobs(created_at)")

    # Create traps table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create skills table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            explanation TEXT,
            details TEXT NOT NULL
        )
    """)

    # Create dungeons table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dungeons (
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
        CREATE TABLE IF NOT EXISTS weapons (
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
        CREATE TABLE IF NOT EXISTS wild_shapes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL UNIQUE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
    """)

    # Create icons table (legacy)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS icons (
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
    print("\n" + "="*60)
    print("NEXT STEP: Run seed_database.py to populate data")
    print("="*60)
    print("\nUsage:")
    print("  python _dev/seed_database.py              # Load all seed data")
    print("  python _dev/seed_database.py --spells     # Load only spells")
    print("  python _dev/seed_database.py --force      # Reload (clear existing data)")


if __name__ == '__main__':
    init_database()
