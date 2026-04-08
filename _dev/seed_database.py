#!/usr/bin/env python3
"""
Phase 2: Seed System - Populate Database from JSON Files

This script loads seed data from JSON files and populates empty database tables.
It's designed to be safe and idempotent (can run multiple times).

Seed files:
- data/seed_abilities.json
- data/seed_spells.json
- data/seed_conditions.json
- data/seed_creatures.json
- data/seed_damage_types.json
- data/seed_creature_types.json
- data/seed_traps.json
- data/seed_dungeons.json

Usage:
    python _dev/seed_database.py              # Load all seeds
    python _dev/seed_database.py --spells     # Load only spells
    python _dev/seed_database.py --traps      # Load only traps
    python _dev/seed_database.py --force      # Force reload (delete existing data first)
"""

import sqlite3
import json
from pathlib import Path
import argparse
import sys

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"
SEEDS_DIR = Path(__file__).parent.parent / "data"

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from lib.parse_dungeon import DungeonHTMLParser
from lib.spell_validators import normalize_spell_level

def load_json_file(filepath):
    """Load and parse a JSON seed file."""
    if not filepath.exists():
        print(f"[WARNING]  Seed file not found: {filepath}")
        return []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in {filepath}: {e}")
        return []

def populate_abilities(cursor, conn, force=False):
    """Populate abilities table from seed_abilities.json - drops and recreates if force"""
    print("\n[BRAIN] Loading abilities...")
    
    if force:
        # Drop the entire table and recreate fresh
        try:
            cursor.execute("DROP TABLE IF EXISTS abilities")
            print(f"  [TRASH]  Dropped existing abilities table")
        except Exception as e:
            print(f"  [WARNING]  Error dropping table: {e}")
        
        # Create fresh table with explicit ID column
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
        print("  [OK] Created fresh abilities table")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM abilities")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Abilities table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            # Table doesn't exist, create it
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
            print("  [OK] Created abilities table")
    
    seeds = load_json_file(SEEDS_DIR / "seed_abilities.json")
    if not seeds:
        print("  [WARNING]  No ability seeds found")
        return
    
    for ability in seeds:
        try:
            cursor.execute("""
                INSERT INTO abilities 
                (id, code, name, emoji, color, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                ability.get('id'),
                ability.get('code'),
                ability.get('name'),
                ability.get('emoji', '❓'),
                ability.get('color', '#95a5a6'),
                ability.get('type', 'stat')
            ))
            ability_type = ability.get('type', 'stat')
            ability_id = ability.get('id', '?')
            print(f"  [CHECK] ID {ability_id}: {ability.get('code').upper()} - {ability.get('name')} ({ability_type})")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {ability.get('code')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM abilities")
    final_count = cursor.fetchone()[0]
    
    # Show breakdown by type
    cursor.execute("SELECT type, COUNT(*) FROM abilities GROUP BY type ORDER BY type")
    type_counts = cursor.fetchall()
    print(f"  [OK] Abilities table now has {final_count} records:")
    for type_row in type_counts:
        ability_type = type_row[0]
        count = type_row[1]
        print(f"     • {ability_type.upper()}: {count}")


def populate_spells(cursor, conn, force=False):
    """Populate spells table from seed_spells.json"""
    print("\n[BOOKS] Loading spells...")
    
    # Check if already populated
    cursor.execute("SELECT COUNT(*) FROM spells")
    count = cursor.fetchone()[0]
    
    if count > 0 and not force:
        print(f"  [INFO]  Spells table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        cursor.execute("DELETE FROM spells")
        print(f"  [TRASH]  Cleared {count} existing spells")
    
    seeds = load_json_file(SEEDS_DIR / "seed_spells.json")
    if not seeds:
        print("  [WARNING]  No spell seeds found")
        return
    
    for spell in seeds:
        try:
            # Normalize and validate spell level
            raw_level = spell.get('level', 'cantrip')
            try:
                normalized_level = normalize_spell_level(raw_level)
            except ValueError:
                # Fallback if validation fails
                normalized_level = raw_level if raw_level else 'cantrip'
            
            # Convert lists to JSON strings
            to_hit = json.dumps(spell.get('to_hit')) if spell.get('to_hit') else None
            damage = json.dumps(spell.get('damage')) if spell.get('damage') else None
            heal = json.dumps(spell.get('heal')) if spell.get('heal') else None
            range_data = json.dumps(spell.get('range')) if spell.get('range') else None
            special = json.dumps(spell.get('special')) if spell.get('special') else None
            higher_levels = json.dumps(spell.get('higher_levels')) if spell.get('higher_levels') else None
            
            cursor.execute("""
                INSERT INTO spells 
                (title, icon, level, school, explanation, to_hit, damage, heal, range, special, higher_levels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                spell.get('title'),
                spell.get('icon', '✨'),
                normalized_level,
                spell.get('school', 'Evocation'),
                spell.get('explanation', ''),
                to_hit,
                damage,
                heal,
                range_data,
                special,
                higher_levels
            ))
            print(f"  [CHECK] {spell.get('title')} (level: {normalized_level})")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {spell.get('title')} - {e}")
    
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} spells")

def populate_conditions(cursor, conn, force=False):
    """Populate conditions table from seed_conditions.json"""
    print("\n[WARNING]  Loading conditions...")
    
    cursor.execute("SELECT COUNT(*) FROM conditions")
    count = cursor.fetchone()[0]
    
    if count > 0 and not force:
        print(f"  [INFO]  Conditions table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        cursor.execute("DELETE FROM conditions")
        print(f"  [TRASH]  Cleared {count} existing conditions")
    
    seeds = load_json_file(SEEDS_DIR / "seed_conditions.json")
    if not seeds:
        print("  [WARNING]  No condition seeds found")
        return
    
    for condition in seeds:
        try:
            details = json.dumps(condition.get('details', [])) if condition.get('details') else None
            
            cursor.execute("""
                INSERT INTO conditions 
                (title, icon, explanation, details)
                VALUES (?, ?, ?, ?)
            """, (
                condition.get('title'),
                condition.get('icon', '[WARNING]'),
                condition.get('explanation', ''),
                details
            ))
            print(f"  [CHECK] {condition.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {condition.get('title')} - {e}")
    
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} conditions")

def populate_creatures(cursor, conn, force=False):
    """Populate creatures table from seed_creatures.json using all provided data"""
    print("\n[LION] Loading creatures...")
    
    cursor.execute("SELECT COUNT(*) FROM creatures")
    count = cursor.fetchone()[0]
    
    if count > 0 and not force:
        print(f"  [INFO]  Creatures table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        cursor.execute("DELETE FROM creatures")
        print(f"  [TRASH]  Cleared {count} existing creatures")
    
    seeds = load_json_file(SEEDS_DIR / "seed_creatures.json")
    if not seeds:
        print("  [WARNING]  No creature seeds found")
        return
    
    for creature in seeds:
        try:
            # Get creature_type_id from code
            creature_type_code = creature.get('creature_type', 'humanoid')
            cursor.execute(
                "SELECT id FROM creature_types WHERE code = ?",
                (creature_type_code,)
            )
            type_row = cursor.fetchone()
            creature_type_id = type_row[0] if type_row else None
            
            # Serialize JSON fields
            attack_to_hit = json.dumps(creature.get('attack_to_hit')) if creature.get('attack_to_hit') else None
            damage = json.dumps(creature.get('damage')) if creature.get('damage') else None
            stats = json.dumps(creature.get('stats')) if creature.get('stats') else None
            
            cursor.execute("""
                INSERT INTO creatures 
                (title, icon, size, creature_type_id, hp, ac, explanation, attack_to_hit, damage, special, stats)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                creature.get('title'),
                creature.get('icon'),
                creature.get('size'),
                creature_type_id,
                creature.get('hp'),
                creature.get('ac'),
                creature.get('explanation'),
                attack_to_hit,
                damage,
                creature.get('special'),
                stats
            ))
            print(f"  [CHECK] {creature.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {creature.get('title')} - {e}")
    
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} creatures")

def populate_damage_types(cursor, conn, force=False):
    """Populate damage_types table from seed_damage_types.json - drops and recreates if force"""
    print("\n[BOOM] Loading damage types...")
    
    if force:
        # Drop the entire table and recreate fresh
        try:
            cursor.execute("DROP TABLE IF EXISTS damage_types")
            print(f"  [TRASH]  Dropped existing damage_types table")
        except Exception as e:
            print(f"  [WARNING]  Error dropping table: {e}")
        
        # Create fresh table with explicit ID column
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
        print("  [OK] Created fresh damage_types table")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM damage_types")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Damage types table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            # Table doesn't exist, create it
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
            print("  [OK] Created damage_types table")
    
    seeds = load_json_file(SEEDS_DIR / "seed_damage_types.json")
    if not seeds:
        print("  [WARNING]  No damage type seeds found")
        return
    
    for damage_type in seeds:
        try:
            cursor.execute("""
                INSERT INTO damage_types 
                (id, code, name, emoji, color)
                VALUES (?, ?, ?, ?, ?)
            """, (
                damage_type.get('id'),
                damage_type.get('code'),
                damage_type.get('name'),
                damage_type.get('emoji', '❓'),
                damage_type.get('color', '#95a5a6')
            ))
            dt_id = damage_type.get('id', '?')
            print(f"  [CHECK] ID {dt_id}: {damage_type.get('code').upper()} - {damage_type.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {damage_type.get('code')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM damage_types")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Damage types table now has {final_count} records")


def populate_traps(cursor, conn, force=False):
    """Populate traps table from seed_traps.json - drops and recreates if force"""
    print("\n[TRAP] Loading traps...")
    
    if force:
        # Drop the entire table and recreate fresh
        try:
            cursor.execute("DROP TABLE IF EXISTS traps")
            print(f"  [TRASH]  Dropped existing traps table")
        except Exception as e:
            print(f"  [WARNING]  Error dropping table: {e}")
        
        # Create fresh table
        cursor.execute("""
            CREATE TABLE traps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  [OK] Created fresh traps table")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM traps")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Traps table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            # Table doesn't exist, create it
            cursor.execute("""
                CREATE TABLE traps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("  [OK] Created traps table")
    
    seeds = load_json_file(SEEDS_DIR / "seed_traps.json")
    if not seeds:
        print("  [WARNING]  No trap seeds found")
        return
    
    for trap in seeds:
        try:
            cursor.execute("""
                INSERT INTO traps (name)
                VALUES (?)
            """, (
                trap.get('name'),
            ))
            print(f"  [CHECK] {trap.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {trap.get('name')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM traps")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Traps table now has {final_count} records")


def populate_creature_types(cursor, conn, force=False):
    """Populate creature_types table from seed_creature_types.json"""
    print("\n[LION] Loading creature types...")
    
    # Check if already populated
    cursor.execute("SELECT COUNT(*) FROM creature_types")
    count = cursor.fetchone()[0]
    
    if count > 0 and not force:
        print(f"  [INFO]  Creature types table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        # With FK constraints enabled, must delete creatures first (they reference creature_types)
        try:
            cursor.execute("SELECT COUNT(*) FROM creatures")
            creature_count = cursor.fetchone()[0]
            if creature_count > 0:
                cursor.execute("DELETE FROM creatures")
                print(f"  [TRASH]  Cleared {creature_count} creatures (referenced creature_types)")
        except Exception:
            pass  # creatures table may not exist yet
        
        cursor.execute("DROP TABLE IF EXISTS creature_types")
        print(f"  [TRASH]  Dropped existing creature_types table")
    
    if force:
        cursor.execute("""
            CREATE TABLE creature_types (
                id INTEGER PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                emoji TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_creature_types_code ON creature_types(code)")
        print("  [OK] Created fresh creature_types table")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM creature_types")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Creature types table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            # Table doesn't exist, create it
            cursor.execute("""
                CREATE TABLE creature_types (
                    id INTEGER PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    emoji TEXT NOT NULL,
                    color TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_creature_types_code ON creature_types(code)")
            print("  [OK] Created creature_types table")
    
    seeds = load_json_file(SEEDS_DIR / "seed_creature_types.json")
    if not seeds:
        print("  [WARNING]  No creature type seeds found")
        return
    
    for creature_type in seeds:
        try:
            cursor.execute("""
                INSERT INTO creature_types 
                (id, code, emoji, color)
                VALUES (?, ?, ?, ?)
            """, (
                creature_type.get('id'),
                creature_type.get('code'),
                creature_type.get('emoji', '?'),
                creature_type.get('color', '#95a5a6')
            ))
            print(f"  [CHECK] {creature_type.get('code').upper()}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {creature_type.get('code')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM creature_types")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Creature types table now has {final_count} records")


def populate_dungeons(cursor, conn, force=False):
    """Populate dungeons table from seed_dungeons.json"""
    print("\n[CASTLE] Loading dungeons...")
    
    # Check if already populated
    cursor.execute("SELECT COUNT(*) FROM dungeons")
    count = cursor.fetchone()[0]
    
    if count > 0 and not force:
        print(f"  [INFO]  Dungeons table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        cursor.execute("DELETE FROM dungeons")
        print(f"  [TRASH]  Cleared {count} existing dungeons")
    
    if force:
        cursor.execute("DROP TABLE IF EXISTS dungeons")
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
        print("  [OK] Created fresh dungeons table")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM dungeons")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Dungeons table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            # Table doesn't exist, create it
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
            print("  [OK] Created dungeons table")
    
    seeds = load_json_file(SEEDS_DIR / "seed_dungeons.json")
    if not seeds:
        print("  [WARNING]  No dungeon seeds found")
        return
    
    for dungeon in seeds:
        try:
            # Seed file already has the correct Flask schema format
            cursor.execute("""
                INSERT INTO dungeons 
                (id, title, original_html, parsed_json)
                VALUES (?, ?, ?, ?)
            """, (
                dungeon.get('id'),
                dungeon.get('title'),
                dungeon.get('original_html', ''),
                dungeon.get('parsed_json', '{}')  # Already JSON string in seed file
            ))
            print(f"  [CHECK] {dungeon.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {dungeon.get('title')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM dungeons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Dungeons table now has {final_count} records")


def reparse_all_dungeons():
    """Re-parse all dungeons in the database to populate trap_ids and other references"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        # Get all dungeons
        cursor.execute('SELECT id, title, original_html FROM dungeons ORDER BY id')
        dungeons = cursor.fetchall()

        if not dungeons:
            print("  [INFO] No dungeons found to re-parse")
            conn.close()
            return

        print(f"\n  Found {len(dungeons)} dungeon(s) to re-parse\n")

        for dungeon_id, title, original_html in dungeons:
            print(f"  🔄 Re-parsing: {title} (ID: {dungeon_id})")

            try:
                # Parse the HTML
                parser = DungeonHTMLParser(original_html)
                dungeon_data = parser.parse()

                # Convert to JSON
                json_output = json.dumps(dungeon_data.to_dict(), indent=2)

                # Update the database
                cursor.execute(
                    'UPDATE dungeons SET parsed_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (json_output, dungeon_id)
                )
                conn.commit()

                print(f"    ✓ Successfully re-parsed and updated\n")

            except Exception as e:
                print(f"    ✗ Error: {e}\n")
                conn.rollback()

        conn.close()
        print("  ✓ Re-parsing complete!")
        
    except Exception as e:
        print(f"  [ERROR] Re-parsing failed: {e}")
        import traceback
        traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description='Populate database from seed JSON files')
    parser.add_argument('--abilities', action='store_true', help='Load only abilities')
    parser.add_argument('--spells', action='store_true', help='Load only spells')
    parser.add_argument('--conditions', action='store_true', help='Load only conditions')
    parser.add_argument('--creatures', action='store_true', help='Load only creatures')
    parser.add_argument('--damage-types', action='store_true', help='Load only damage types')
    parser.add_argument('--creature-types', action='store_true', help='Load only creature types')
    parser.add_argument('--traps', action='store_true', help='Load only traps')
    parser.add_argument('--dungeons', action='store_true', help='Load only dungeons')
    parser.add_argument('--force', action='store_true', help='Force reload (clear existing data first)')
    
    args = parser.parse_args()
    
    # If no specific tables selected, load all
    load_all = not any([args.abilities, args.spells, args.conditions, args.creatures, args.damage_types, args.creature_types, args.traps, args.dungeons])
    
    print("="*60)
    print("PHASE 2: DATABASE SEEDING")
    print("="*60)
    
    if not DB_PATH.exists():
        print(f"[ERROR] Database not found: {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(str(DB_PATH))
        # DISABLE foreign keys during schema operations (dropping/creating tables)
        conn.execute('PRAGMA foreign_keys = OFF')
        cursor = conn.cursor()
        
        if args.force:
            print("\n[WARNING]  FORCE MODE: Will overwrite existing data\n")
        
        if load_all or args.abilities:
            populate_abilities(cursor, conn, args.force)
        if load_all or args.damage_types:
            populate_damage_types(cursor, conn, args.force)
        if load_all or args.creature_types:
            populate_creature_types(cursor, conn, args.force)
        if load_all or args.creatures:
            populate_creatures(cursor, conn, args.force)
        if load_all or args.spells:
            populate_spells(cursor, conn, args.force)
        if load_all or args.conditions:
            populate_conditions(cursor, conn, args.force)
        if load_all or args.traps:
            populate_traps(cursor, conn, args.force)
        if load_all or args.dungeons:
            populate_dungeons(cursor, conn, args.force)
        
        conn.close()
        
        # Re-parse dungeons to populate trap_ids and other references
        print("\n" + "="*60)
        print("[REPARSE] Starting dungeon re-parsing...")
        print("="*60)
        reparse_all_dungeons()
        
        print("\n" + "="*60)
        print("[OK] PHASE 2 COMPLETE!")
        print("="*60)
        print("\nNext Steps:")
        print("  1. Edit seed files in data/ to add more data")
        print("  2. Run: python _dev/seed_database.py --force")
        print("  3. Check: Start Flask server and test API endpoints")
        print("\nSeed files:")
        print("  - data/seed_abilities.json")
        print("  - data/seed_spells.json")
        print("  - data/seed_conditions.json")
        print("  - data/seed_creatures.json")
        print("  - data/seed_damage_types.json")
        print("  - data/seed_creature_types.json")
        print("  - data/seed_traps.json")
        print("  - data/seed_dungeons.json")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
