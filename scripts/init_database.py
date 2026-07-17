#!/usr/bin/env python3
"""
PHASE 1: Database Schema Initialization

This script creates the database tables with proper schema.
It does NOT populate data - use seed_database.py for that.

Workflow:
  1. python scripts/init_database.py        # Create tables
  2. python scripts/seed_database.py        # Load seed data from JSON files
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def init_database(db_path: Path | None = None):
    """Create database tables only (schema setup)"""
    db_path = db_path or DB_PATH
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    print("="*60)
    print("PHASE 1: DATABASE SCHEMA INITIALIZATION")
    print("="*60)
    
    # Disable foreign key constraints temporarily to allow table drops
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Drop all existing tables in reverse dependency order
    print("\nCleaning up existing tables...")
    tables_to_drop = [
        "loom_edges",
        "loom_node_threads",
        "loom_nodes",
        "loom_threads",
        "player_spells",
        "player_weapons",
        "players",
        "monsters",
        "npcs",
        "spells",
        "conditions",
        "damage_types",
        "weapon_properties",
        "weapons",
        "abilities",
        "map_layout",
        "dungeons",
        "encounter",
        "loot_bundle",
        "items",
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

    # Create spells table using the canonical target schema.
    cursor.execute("""
        CREATE TABLE spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            level INTEGER NOT NULL,
            school TEXT,
            description TEXT NOT NULL,
            alternate_description TEXT,
            damage TEXT NOT NULL DEFAULT '[]',
            healing TEXT NOT NULL DEFAULT '{"amount": null, "temp_hp": false, "max_hp": false}',
            range TEXT NOT NULL,
            higher_levels TEXT NOT NULL DEFAULT '{"text": null, "damage_by_slot": {}}',
            casting_times TEXT NOT NULL DEFAULT '[]',
            duration TEXT NOT NULL,
            concentration BOOLEAN NOT NULL DEFAULT 0,
            ritual BOOLEAN NOT NULL DEFAULT 0,
            components TEXT NOT NULL DEFAULT '[]',
            materials TEXT,
            attacks TEXT NOT NULL DEFAULT '[]',
            area_of_effect TEXT NOT NULL DEFAULT '{"shape": null, "size": null}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school)")

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


    # Create monsters table using the M2 authorable target projection
    cursor.execute("""
        CREATE TABLE monsters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            aliases TEXT NOT NULL DEFAULT '[]',
            sizes TEXT NOT NULL DEFAULT '[]',
            family TEXT,
            alignment TEXT,
            creature_type TEXT,
            ac TEXT,
            hp TEXT,
            speed TEXT NOT NULL DEFAULT '[]',
            abilities TEXT,
            saving_throws TEXT NOT NULL DEFAULT '{}',
            skills TEXT NOT NULL DEFAULT '{}',
            passive_perception INTEGER,
            damage_resistances TEXT NOT NULL DEFAULT '[]',
            damage_immunities TEXT NOT NULL DEFAULT '[]',
            damage_vulnerabilities TEXT NOT NULL DEFAULT '[]',
            condition_immunities TEXT NOT NULL DEFAULT '[]',
            senses TEXT NOT NULL DEFAULT '[]',
            languages TEXT NOT NULL DEFAULT '[]',
            audio_path TEXT,
            features TEXT NOT NULL DEFAULT '{}',
            cr TEXT,
            cr_sort REAL,
            cr_note TEXT,
            experience_points INTEGER,
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
            senses JSON DEFAULT '[{}]',
            languages TEXT,
            appearance JSON DEFAULT '{}',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE encounter (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT    NOT NULL,
            units        TEXT    NOT NULL DEFAULT '[]',
            active_index INTEGER,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value_gp REAL NOT NULL DEFAULT 0,
            category TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE loot_bundle (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gold REAL NOT NULL DEFAULT 0,
            contents TEXT NOT NULL DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_monsters_cr_sort ON monsters(cr_sort)"
    )

    # Runtime-created dungeon content; no dungeon seeds are loaded on rebuild.
    cursor.execute("""
        CREATE TABLE dungeons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Map Lab geometry belongs to its dungeon and is removed with it.
    cursor.execute("""
        CREATE TABLE map_layout (
            dungeon_id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
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

    # Create loom tables for the Tapestry Story-Thread Tracker
    cursor.execute("""
        CREATE TABLE loom_threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT 'thread-1',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE loom_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL CHECK (kind IN ('anchor', 'update')),
            title TEXT NOT NULL,
            body TEXT,
            status TEXT CHECK (
                (kind = 'update' AND status IS NULL)
                OR (kind = 'anchor' AND status IS NOT NULL
                    AND status IN ('planned', 'reached', 'abandoned'))
            ),
            session_tag TEXT,
            x REAL NOT NULL DEFAULT 0,
            y REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE loom_node_threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id INTEGER NOT NULL,
            thread_id INTEGER NOT NULL,
            UNIQUE (node_id, thread_id),
            FOREIGN KEY (node_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (thread_id) REFERENCES loom_threads(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE loom_edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            UNIQUE (source_id, target_id),
            CHECK (source_id != target_id),
            FOREIGN KEY (source_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES loom_nodes(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("CREATE INDEX idx_loom_edges_source ON loom_edges(source_id)")
    cursor.execute("CREATE INDEX idx_loom_edges_target ON loom_edges(target_id)")
    cursor.execute("CREATE INDEX idx_loom_node_threads_thread ON loom_node_threads(thread_id)")

    print("[OK] Tables created")

    conn.commit()
    conn.close()

    print(f"\n[SUCCESS] Database initialized: {db_path}")
    print(f"   Size: {db_path.stat().st_size / 1024:.1f} KB")
    print("\nV2 SCHEMA - 19 tables:")
    print("  [OK] abilities, damage_types, weapon_properties, weapons")
    print("  [OK] spells (18 canonical fields + created_at: name, level, school, description, etc.)")
    print("  [OK] conditions, monsters, npcs, encounter")
    print("  [OK] items, loot_bundle")
    print("  [OK] dungeons (id, title, data JSON for structured hand-authored dungeons)")
    print("  [OK] players, player_spells, player_weapons")
    print("  [OK] loom_threads, loom_nodes, loom_node_threads, loom_edges")
    print("\n" + "="*60)
    print("NEXT STEP: Run seed_database.py to populate data")
    print("="*60)
    print("\nUsage:")
    print("  python scripts/seed_database.py              # Load all seed data")
    print("  python scripts/seed_database.py --spells     # Load only spells")
    print("  python scripts/seed_database.py --force      # Reload (clear existing data)")


if __name__ == '__main__':
    init_database()
