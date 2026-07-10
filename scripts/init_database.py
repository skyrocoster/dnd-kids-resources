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
        "player_spells",
        "player_weapons",
        "players",
        "monsters",
        "npcs",
        "quests",
        "spells",
        "conditions",
        "damage_types",
        "weapon_properties",
        "weapons",
        "abilities",
        "dungeons",
        "skills",
        "encounter"
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

    # Create weapon_properties table for seed weapon property metadata
    cursor.execute("""
        CREATE TABLE weapon_properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create weapons table for normalized weapon storage
    cursor.execute("""
        CREATE TABLE weapons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            base_weapon TEXT,
            baseitems BOOLEAN NOT NULL DEFAULT 0,
            rarity TEXT,
            weapon_category TEXT,
            weight REAL,
            req_attune TEXT,
            sentient BOOLEAN NOT NULL DEFAULT 0,
            curse BOOLEAN NOT NULL DEFAULT 0,
            resist TEXT NOT NULL DEFAULT '[]',
            property TEXT NOT NULL DEFAULT '[]',
            focus TEXT NOT NULL DEFAULT '[]',
            spells TEXT NOT NULL DEFAULT '[]',
            attack TEXT NOT NULL DEFAULT '[]',
            recharge TEXT NOT NULL DEFAULT '{}',
            light TEXT NOT NULL DEFAULT '[]',
            entries TEXT NOT NULL DEFAULT '[]',
            tier TEXT,
            grants_language BOOLEAN NOT NULL DEFAULT 0,
            bonus_spell_attack INTEGER,
            bonus_spell_save_dc INTEGER,
            bonus_ac INTEGER,
            bonus_saving_throw INTEGER,
            crit_threshold INTEGER,
            ammo_type TEXT,
            grants_proficiency BOOLEAN NOT NULL DEFAULT 0,
            modify_speed TEXT NOT NULL DEFAULT '{}',
            ability TEXT NOT NULL DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            action TEXT,
            classes TEXT,
            subclasses TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create conditions table
    cursor.execute("""
        CREATE TABLE conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL DEFAULT '⚠️',
            explanation TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)


    # Create monsters table using the normalized merged structure
    cursor.execute("""
        CREATE TABLE monsters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            alias TEXT NOT NULL DEFAULT '[]',
            size TEXT,
            "group" TEXT NOT NULL DEFAULT '[]',
            alignment TEXT NOT NULL DEFAULT '[]',
            type TEXT NOT NULL DEFAULT '{}',
            ac TEXT NOT NULL DEFAULT '{}',
            hp TEXT NOT NULL DEFAULT '{}',
            speed TEXT NOT NULL DEFAULT '{}',
            stats TEXT NOT NULL DEFAULT '{}',
            save TEXT NOT NULL DEFAULT '{}',
            skill TEXT NOT NULL DEFAULT '{}',
            resist TEXT NOT NULL DEFAULT '[]',
            vulnerable TEXT NOT NULL DEFAULT '[]',
            senses TEXT NOT NULL DEFAULT '[]',
            languages TEXT NOT NULL DEFAULT '[]',
            action TEXT NOT NULL DEFAULT '[]',
            reaction TEXT NOT NULL DEFAULT '[]',
            traits TEXT NOT NULL DEFAULT '[]',
            spellcasting TEXT NOT NULL DEFAULT '[]',
            bonus TEXT NOT NULL DEFAULT '[]',
            legendary TEXT NOT NULL DEFAULT '[]',
            legendaryHeader TEXT,
            mythic TEXT NOT NULL DEFAULT '[]',
            mythicHeader TEXT,
            reactionRules TEXT NOT NULL DEFAULT '[]',
            soundClip TEXT NOT NULL DEFAULT '{}',
            cr TEXT,
            cr_details TEXT NOT NULL DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE npcs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            race TEXT,
            gender TEXT,
            background TEXT,
            size TEXT,
            stats JSON NOT NULL DEFAULT '{}',
            armor_class INTEGER,
            hit_points INTEGER,
            speed TEXT,
            saving_throws JSON DEFAULT '{}',
            skills JSON DEFAULT '{}',
            senses JSON DFEFAULT '[{}]',
            languages TEXT,
            appearance JSON DEFAULT '{}',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE quests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            summary TEXT,
            reward TEXT NOT NULL DEFAULT '[]',
            objectives TEXT NOT NULL DEFAULT '[]',
            details TEXT NOT NULL DEFAULT '[]',
            quest_giver INTEGER,
            dungeon_id INTEGER,
            location TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quest_giver) REFERENCES npcs(id) ON DELETE SET NULL
        )
    """)

    # Create encounter table for combat encounter management
    cursor.execute("""
        CREATE TABLE encounter (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            units      TEXT    NOT NULL DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr)"
    )

    # Create dungeons table (v2: structured hand-authored dungeons only, no HTML)
    cursor.execute("""
        CREATE TABLE dungeons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create players table for persistent character records
    cursor.execute("""
        CREATE TABLE players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT 'Unnamed Player',
            class TEXT,
            level INTEGER,
            total_spell_slots TEXT DEFAULT '{}',
            current_spell_slots TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create player_spells table for spell assignments
    cursor.execute("""
        CREATE TABLE player_spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            spell_id INTEGER NOT NULL,
            at_will BOOLEAN NOT NULL DEFAULT 0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(player_id, spell_id),
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY (spell_id) REFERENCES spells(id) ON DELETE CASCADE
        )
    """)

    # Create player_weapons table for weapon assignments
    cursor.execute("""
        CREATE TABLE player_weapons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            weapon_id INTEGER NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(player_id, weapon_id),
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY (weapon_id) REFERENCES weapons(id) ON DELETE CASCADE
        )
    """)

    print("[OK] Tables created")

    conn.commit()
    conn.close()

    print(f"\n[SUCCESS] Database initialized: {DB_PATH}")
    print(f"   Size: {DB_PATH.stat().st_size / 1024:.1f} KB")
    print("\nV2 SCHEMA - 14 tables (reduced from 18 for v2):")
    print("  [OK] abilities, damage_types, weapon_properties, weapons")
    print("  [OK] spells (23 columns: spell_name, icon, level, school, spell_text, etc.)")
    print("  [OK] conditions, monsters, npcs, quests, encounter")
    print("  [OK] dungeons (id, title, data JSON for structured hand-authored dungeons)")
    print("  [OK] players, player_spells, player_weapons")
    print("\n" + "="*60)
    print("NEXT STEP: Run seed_database.py to populate data")
    print("="*60)
    print("\nUsage:")
    print("  python scripts/seed_database.py              # Load all seed data")
    print("  python scripts/seed_database.py --spells     # Load only spells")
    print("  python scripts/seed_database.py --force      # Reload (clear existing data)")


if __name__ == '__main__':
    init_database()
