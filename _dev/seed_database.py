#!/usr/bin/env python3
"""
Phase 2: Seed System - Populate Database from JSON Files

This script loads seed data from JSON files and populates empty database tables.
It's designed to be safe and idempotent (can run multiple times).

Seed files:
- data/seed_abilities.json
- data/seed_conditions.json
- data/seed_creatures.json
- data/seed_damage_types.json
- data/seed_creature_types.json
- data/seed_traps.json
- data/seed_dungeons.json

Spell data is now loaded from the new 5eTools staging workflow via `_dev/parse_spells_to_db.py`.

Usage:
    python _dev/seed_database.py              # Load all seeds
    python _dev/seed_database.py --spells     # Load only spells
    python _dev/seed_database.py --traps      # Load only traps
    python _dev/seed_database.py --force      # Force reload (delete existing data first)
"""

import sqlite3
import json
import subprocess
from pathlib import Path
import argparse
import sys

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"
SEEDS_DIR = Path(__file__).parent.parent / "data"

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from lib.parse_dungeon import DungeonHTMLParser

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
    """Populate abilities table from seed_abilities.json. Requires schema created by init_database.py."""
    print("\n[BRAIN] Loading abilities...")
    
    if force:
        # Clear existing abilities data, but do not manage schema here
        try:
            cursor.execute("DELETE FROM abilities")
            print("  [TRASH]  Cleared existing abilities data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing abilities data: {e}")
            print("  [ERROR]  abilities table may not exist. Run _dev/init_database.py first.")
            return
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM abilities")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Abilities table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Abilities table does not exist. Run _dev/init_database.py first.")
            return
    
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
    """Populate spells table using the new 5eTools staging workflow."""
    print("\n[BOOKS] Loading spells using the new 5eTools staging workflow...")

    parser_script = Path(__file__).parent / "parse_spells_to_db.py"
    if not parser_script.exists():
        print(f"  [ERROR] Missing parser: {parser_script}")
        return

    command = [sys.executable, str(parser_script)]
    if force:
        command.append("--force")

    result = subprocess.run(command, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError(f"Spell import failed with exit code {result.returncode}")


def populate_conditions(cursor, conn, force=False):
    """Populate conditions table from seed_conditions.json"""
    print("\n[WARNING]  Loading conditions...")
    
    try:
        cursor.execute("SELECT COUNT(*) FROM conditions")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0
    
    if count > 0 and not force:
        print(f"  [INFO]  Conditions table already has {count} records. Skip (use --force to override)")
        return
    
    # Conditions schema must be created by init_database.py
    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM conditions LIMIT 1")
        except Exception:
            print("  [ERROR]  Conditions table does not exist. Run _dev/init_database.py first.")
            return
    
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
    
    try:
        cursor.execute("SELECT COUNT(*) FROM creatures")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0
    
    if count > 0 and not force:
        print(f"  [INFO]  Creatures table already has {count} records. Skip (use --force to override)")
        return
    
    # Create creatures table if it doesn't exist (or recreate if force)
    if force or count == 0:
        # Creatures schema must be created by init_database.py
        try:
            cursor.execute("SELECT 1 FROM creatures LIMIT 1")
        except Exception:
            print("  [ERROR]  Creatures table does not exist. Run _dev/init_database.py first.")
            return
    
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
    """Populate damage_types table from seed_damage_types.json. Requires schema created by init_database.py."""
    print("\n[BOOM] Loading damage types...")
    
    if force:
        # Clear existing damage types data, but do not manage schema here
        try:
            cursor.execute("DELETE FROM damage_types")
            print("  [TRASH]  Cleared existing damage_types data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing damage_types data: {e}")
            print("  [ERROR]  damage_types table may not exist. Run _dev/init_database.py first.")
            return
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM damage_types")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Damage types table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Damage types table does not exist. Run _dev/init_database.py first.")
            return
    
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
    """Populate traps table from seed_traps.json. Requires schema created by init_database.py."""
    print("\n[TRAP] Loading traps...")
    
    if force:
        # Clear existing traps data, but do not manage schema here
        try:
            cursor.execute("DELETE FROM traps")
            print("  [TRASH]  Cleared existing traps data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing traps data: {e}")
            print("  [ERROR]  traps table may not exist. Run _dev/init_database.py first.")
            return
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM traps")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Traps table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Traps table does not exist. Run _dev/init_database.py first.")
            return
    
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
    try:
        cursor.execute("SELECT COUNT(*) FROM creature_types")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        # Table doesn't exist, that's fine
        count = 0
    
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
    
    if force or count == 0:
        # Creature types schema must be created by init_database.py
        try:
            cursor.execute("SELECT 1 FROM creature_types LIMIT 1")
        except Exception:
            print("  [ERROR]  Creature types table does not exist. Run _dev/init_database.py first.")
            return
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM creature_types")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Creature types table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Creature types table does not exist. Run _dev/init_database.py first.")
            return
    
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
    try:
        cursor.execute("SELECT COUNT(*) FROM dungeons")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0
    
    if count > 0 and not force:
        print(f"  [INFO]  Dungeons table already has {count} records. Skip (use --force to override)")
        return
    
    if force and count > 0:
        cursor.execute("DELETE FROM dungeons")
        print(f"  [TRASH]  Cleared {count} existing dungeons")
    
    if force:
        try:
            cursor.execute("DELETE FROM dungeons")
            print(f"  [TRASH]  Cleared {count} existing dungeons")
        except Exception as e:
            print(f"  [WARNING]  Error clearing dungeons data: {e}")
            print("  [ERROR]  dungeons table may not exist. Run _dev/init_database.py first.")
            return
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM dungeons")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Dungeons table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Dungeons table does not exist. Run _dev/init_database.py first.")
            return
    
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


def clear_all_tables(cursor, conn):
    """Drop all tables in dependency order to avoid FK constraint violations"""
    print("\n[FORCE] Clearing all existing table data in dependency order...")
    
    # Disable FK constraints during table operations
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    tables_to_clear = [
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
    
    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM {table}")
            print(f"  [TRASH]  Cleared {table}")
        except Exception:
            # Table might not exist, that's okay
            pass
    
    conn.commit()
    # Re-enable FK constraints
    cursor.execute("PRAGMA foreign_keys = ON")
    print("[OK] All table data cleared")


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
            # Clear all tables in dependency order first to avoid FK constraint issues
            clear_all_tables(cursor, conn)
        
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
        print("  - data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json")
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
