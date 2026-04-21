def populate_classes(cursor, conn, force=False):
    """Populate classes table from seed_classes.json. Requires schema created by init_database.py."""
    print("\n[HAT] Loading classes...")
    if force:
        try:
            cursor.execute("DELETE FROM classes")
            print("  [TRASH]  Cleared existing classes data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing classes data: {e}")
            print("  [ERROR]  classes table may not exist. Run _dev/init_database.py first.")
            return
    else:
        try:
            cursor.execute("SELECT COUNT(*) FROM classes")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Classes table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  Classes table does not exist. Run _dev/init_database.py first.")
            return
    seeds = load_json_file(SEEDS_DIR / "seed_classes.json")
    if not seeds:
        print("  [WARNING]  No class seeds found")
        return
    for cls in seeds:
        try:
            cursor.execute("""
                INSERT INTO classes (id, code, name, emoji, color)
                VALUES (?, ?, ?, ?, ?)
            """, (
                cls.get('id'),
                cls.get('code'),
                cls.get('name'),
                cls.get('emoji', '❓'),
                cls.get('color', '#95a5a6')
            ))
            print(f"  [CHECK] {cls.get('code').upper()} - {cls.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {cls.get('code')} - {e}")
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM classes")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Classes table now has {final_count} records")
#!/usr/bin/env python3
"""
Phase 2: Seed System - Populate Database from JSON Files

This script loads seed data from JSON files and populates empty database tables.
It's designed to be safe and idempotent (can run multiple times).

Seed files:
- data/seeds/seed_abilities.json
- data/seeds/seed_conditions.json
- data/seeds/seed_monsters.json
- data/seeds/seed_npcs.json
- data/seeds/seed_damage_types.json
- data/seeds/seed_traps.json
- data/seeds/seed_dungeons.json
- data/seeds/seed_actions.json
- data/seeds/seed_spells.json (optional, JSON fallback)

Seed files are now loaded from the new `data/seeds/` directory.
Legacy seed files under `data/` are still supported for compatibility, but new files should be stored in `data/seeds/`.
Use `_dev/export_db_seeds.py` to archive old root seed files into `data/seeds/archive` and export current DB tables as new seed JSON.

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
SEEDS_DIR = Path(__file__).parent.parent / "data" / "seeds"
LEGACY_SEEDS_DIR = Path(__file__).parent.parent / "data"

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from lib.parse_dungeon import DungeonHTMLParser

def load_json_file(filepath):
    """Load and parse a JSON seed file."""
    if not filepath.exists():
        alternate = LEGACY_SEEDS_DIR / filepath.name
        if alternate.exists():
            filepath = alternate
        else:
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


def serialize_for_db(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def insert_spell(cursor, spell_data):
    cursor.execute(
        """
        INSERT INTO spells
        (spell_name, icon, level, school, spell_text, spell_alt_text, damage, heal, heal_at_spell_slots, range,
         higher_levels, damage_at_higher_levels, casting_time, duration, concentration, ritual, components, materials,
         attack_type, area_of_effect, classes, subclasses)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            serialize_for_db(spell_data.get("spell_name")),
            serialize_for_db(spell_data.get("icon", "✨")),
            serialize_for_db(spell_data.get("level")),
            serialize_for_db(spell_data.get("school")),
            serialize_for_db(spell_data.get("spell_text")),
            serialize_for_db(spell_data.get("spell_alt_text")),
            serialize_for_db(spell_data.get("damage")),
            serialize_for_db(spell_data.get("heal")),
            serialize_for_db(spell_data.get("heal_at_spell_slots")),
            serialize_for_db(spell_data.get("range")),
            serialize_for_db(spell_data.get("higher_levels")),
            serialize_for_db(spell_data.get("damage_at_higher_levels")),
            serialize_for_db(spell_data.get("casting_time")),
            serialize_for_db(spell_data.get("duration")),
            int(bool(spell_data.get("concentration", False))),
            int(bool(spell_data.get("ritual", False))),
            serialize_for_db(spell_data.get("components")),
            serialize_for_db(spell_data.get("materials")),
            serialize_for_db(spell_data.get("attack_type")),
            serialize_for_db(spell_data.get("area_of_effect")),
            serialize_for_db(spell_data.get("classes")),
            serialize_for_db(spell_data.get("subclasses")),
        )
    )


def populate_spells(cursor, conn, force=False):
    """Populate spells table using the new 5eTools staging workflow or JSON seed fallback."""
    print("\n[BOOKS] Loading spells...")

    seed_file = SEEDS_DIR / "seed_spells.json"
    if seed_file.exists():
        try:
            cursor.execute("SELECT COUNT(*) FROM spells")
            count = cursor.fetchone()[0]
        except Exception:
            count = 0

        if count > 0 and not force:
            print(f"  [INFO] Spells table already has {count} records. Skip (use --force to override)")
            return

        if force:
            cursor.execute("DELETE FROM spells")
            print("  [TRASH]  Cleared existing spells data")

        print(f"  [INFO] Loading spell seeds from {seed_file}")
        seeds = load_json_file(seed_file)
        if not seeds:
            print("  [WARNING]  No spell seeds found")
            return

        for spell in seeds:
            try:
                insert_spell(cursor, spell)
                print(f"  [CHECK] {spell.get('spell_name')}")
            except sqlite3.IntegrityError as e:
                print(f"  [WARNING]  Duplicate or error: {spell.get('spell_name')} - {e}")

        conn.commit()
        print(f"  [OK] Loaded {len(seeds)} spells from JSON seed file")
        return

    print("  [INFO] No seed_spells.json file found; falling back to legacy 5eTools parser")
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


def populate_actions(cursor, conn, force=False):
    """Populate actions table from seed_actions.json"""
    print("\n[ACTION] Loading actions...")
    
    try:
        cursor.execute("SELECT COUNT(*) FROM actions")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0
    
    if count > 0 and not force:
        print(f"  [INFO]  Actions table already has {count} records. Skip (use --force to override)")
        return
    
    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM actions LIMIT 1")
        except Exception:
            print("  [ERROR]  Actions table does not exist. Run _dev/init_database.py first.")
            return
    
    seeds = load_json_file(SEEDS_DIR / "seed_actions.json")
    if not seeds:
        print("  [WARNING]  No action seeds found")
        return
    
    for action in seeds:
        try:
            details = json.dumps(action.get('details', [])) if action.get('details') else None
            
            cursor.execute("""
                INSERT INTO actions 
                (name, icon, category, explanation, details)
                VALUES (?, ?, ?, ?, ?)
            """, (
                action.get('name'),
                action.get('icon', '⚔️'),
                action.get('category', 'Action'),
                action.get('explanation', ''),
                details
            ))
            print(f"  [CHECK] {action.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {action.get('name')} - {e}")
    
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} actions")


def populate_monsters(cursor, conn, force=False):
    """Populate monsters table from seed_monsters.json using normalized monster data"""
    print("\n[DRAGON] Loading monsters...")
    try:
        cursor.execute("SELECT COUNT(*) FROM monsters")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0
    if count > 0 and not force:
        print(f"  [INFO]  Monsters table already has {count} records. Skip (use --force to override)")
        return
    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM monsters LIMIT 1")
        except Exception:
            print("  [ERROR]  Monsters table does not exist. Run _dev/init_database.py first.")
            return
    seeds = load_json_file(SEEDS_DIR / "seed_monsters.json")
    if not seeds:
        print("  [WARNING]  No monster seeds found")
        return
    def serialize(value):
        if value is None:
            return None
        if isinstance(value, (list, dict)):
            return json.dumps(value, ensure_ascii=False)
        return value

    for monster in seeds:
        try:
            cursor.execute("""
                INSERT INTO monsters
                (name, alias, size, "group", alignment, type, ac, hp, speed, stats, save, skill, resist, vulnerable,
                 senses, languages, action, reaction, traits, spellcasting, bonus, legendary, legendaryHeader, mythic,
                 mythicHeader, reactionRules, soundClip, cr, cr_details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                monster.get('name'),
                serialize(monster.get('alias', [])),
                serialize(monster.get('size')),
                serialize(monster.get('group', [])),
                serialize(monster.get('alignment', [])),
                serialize(monster.get('type', {})),
                serialize(monster.get('ac', {})),
                serialize(monster.get('hp', {})),
                serialize(monster.get('speed', {})),
                serialize(monster.get('stats', {})),
                serialize(monster.get('save', {})),
                serialize(monster.get('skill', {})),
                serialize(monster.get('resist', [])),
                serialize(monster.get('vulnerable', [])),
                serialize(monster.get('senses', [])),
                serialize(monster.get('languages', [])),
                serialize(monster.get('action', [])),
                serialize(monster.get('reaction', [])),
                serialize(monster.get('traits', [])),
                serialize(monster.get('spellcasting', [])),
                serialize(monster.get('bonus', [])),
                serialize(monster.get('legendary', [])),
                serialize(monster.get('legendaryHeader')),
                serialize(monster.get('mythic', [])),
                serialize(monster.get('mythicHeader')),
                serialize(monster.get('reactionRules', [])),
                serialize(monster.get('soundClip', {})),
                serialize(monster.get('cr')),
                serialize(monster.get('cr_details', {}))
            ))
            print(f"  [CHECK] {monster.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {monster.get('name')} - {e}")
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} monsters")


def populate_npcs(cursor, conn, force=False):
    """Populate npcs table from seed_npcs.json."""
    print("\n[NPC] Loading NPCs...")
    try:
        cursor.execute("SELECT COUNT(*) FROM npcs")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] NPCs table already has {count} records. Skip (use --force to override)")
        return

    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM npcs LIMIT 1")
        except Exception:
            print("  [ERROR] NPCs table does not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_npcs.json")
    if not seeds:
        print("  [WARNING]  No NPC seeds found")
        return

    for npc in seeds:
        try:
            cursor.execute("""
                INSERT INTO npcs
                (id, name, race, gender, background, size, stats, armor_class, hit_points, speed,
                 saving_throws, skills, senses, languages, appearance, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                npc.get('npc_id'),
                npc.get('name'),
                npc.get('race'),
                npc.get('gender'),
                npc.get('background'),
                npc.get('size'),
                serialize_for_db(npc.get('stats')),
                npc.get('armor_class'),
                npc.get('hit_points'),
                npc.get('speed'),
                serialize_for_db(npc.get('saving_throws')),
                serialize_for_db(npc.get('skills')),
                serialize_for_db(npc.get('senses')),
                npc.get('languages'),
                serialize_for_db(npc.get('appearance')),
                npc.get('notes')
            ))
            print(f"  [CHECK] {npc.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {npc.get('name')} - {e}")

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} NPCs")


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


def populate_weapon_properties(cursor, conn, force=False):
    """Populate weapon_properties table from seed_weapon_properties.json."""
    print("[ARMS] Loading weapon properties...")
    
    if force:
        try:
            cursor.execute("DELETE FROM weapon_properties")
            print("  [TRASH]  Cleared existing weapon_properties data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing weapon_properties data: {e}")
            print("  [ERROR]  weapon_properties table may not exist. Run _dev/init_database.py first.")
            return
    else:
        try:
            cursor.execute("SELECT COUNT(*) FROM weapon_properties")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO]  Weapon properties table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  weapon_properties table does not exist. Run _dev/init_database.py first.")
            return
    
    seeds = load_json_file(SEEDS_DIR / "seed_weapon_properties.json")
    if not seeds:
        print("  [WARNING]  No weapon property seeds found")
        return
    
    property_items = []
    if isinstance(seeds, dict):
        for code, payload in seeds.items():
            if not isinstance(payload, dict):
                continue
            property_items.append({
                'code': code,
                'name': payload.get('name'),
                'description': payload.get('description')
            })
    elif isinstance(seeds, list):
        property_items = seeds
    else:
        print("  [WARNING]  Unexpected seed format for weapon properties")
        return
    
    for prop in property_items:
        try:
            cursor.execute("""
                INSERT INTO weapon_properties
                (code, name, description)
                VALUES (?, ?, ?)
            """, (
                prop.get('code'),
                prop.get('name'),
                prop.get('description')
            ))
            print(f"  [CHECK] {prop.get('code').upper()}: {prop.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {prop.get('code')} - {e}")
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM weapon_properties")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Weapon properties table now has {final_count} records")


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
                serialize_for_db(dungeon.get('original_html', '')),
                serialize_for_db(dungeon.get('parsed_json', {}))
            ))
            print(f"  [CHECK] {dungeon.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {dungeon.get('title')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM dungeons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Dungeons table now has {final_count} records")


def populate_deities(cursor, conn, force=False):
    """Populate deities table from seed_deities.json"""
    print("[DIVINE] Loading deities...")

    try:
        cursor.execute("SELECT COUNT(*) FROM deities")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO]  Deities table already has {count} records. Skip (use --force to override)")
        return

    if force:
        try:
            cursor.execute("DELETE FROM deities")
            print("  [TRASH]  Cleared existing deities data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing deities data: {e}")
            print("  [ERROR]  deities table may not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_deities.json")
    if not seeds:
        print("  [WARNING]  No deity seeds found")
        return

    deity_records = seeds.get('deity') if isinstance(seeds, dict) else seeds
    if not deity_records:
        print("  [WARNING]  Deity seed file contains no records")
        return

    for deity in deity_records:
        try:
            cursor.execute("""
                INSERT INTO deities
                (name, pantheon, alignment, category, domains, symbol, title, alt_names, entries)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                serialize_for_db(deity.get('name')),
                serialize_for_db(deity.get('pantheon')),
                serialize_for_db(deity.get('alignment')),
                serialize_for_db(deity.get('category')),
                serialize_for_db(deity.get('domains')),
                serialize_for_db(deity.get('symbol')),
                serialize_for_db(deity.get('title')),
                serialize_for_db(deity.get('altNames')),
                serialize_for_db(deity.get('entries')),
            ))
            print(f"  [CHECK] {deity.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {deity.get('name')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM deities")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} deities")


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
        "monsters",
        "npcs",
        "creatures",
        "creature_types",
        "spells",
        "conditions",
        "actions",
        "damage_types",
        "weapon_properties",
        "abilities",
        "traps",
        "dungeons",
        "deities",
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
    parser.add_argument('--monsters', action='store_true', help='Load only monsters')
    parser.add_argument('--damage-types', action='store_true', help='Load only damage types')
    parser.add_argument('--weapon-properties', action='store_true', help='Load only weapon properties')
    parser.add_argument('--traps', action='store_true', help='Load only traps')
    parser.add_argument('--dungeons', action='store_true', help='Load only dungeons')
    parser.add_argument('--deities', action='store_true', help='Load only deities')
    parser.add_argument('--classes', action='store_true', help='Load only classes')
    parser.add_argument('--actions', action='store_true', help='Load only actions')
    parser.add_argument('--npcs', action='store_true', help='Load only NPCs')
    parser.add_argument('--force', action='store_true', help='Force reload (clear existing data first)')
    
    args = parser.parse_args()
    # If no specific tables selected, load all
    load_all = not any([args.abilities, args.spells, args.conditions, args.monsters, args.npcs, args.damage_types, args.weapon_properties, args.traps, args.dungeons, args.deities, args.classes, args.actions])
    
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
        if load_all or args.weapon_properties:
            populate_weapon_properties(cursor, conn, args.force)
        if load_all or args.monsters:
            populate_monsters(cursor, conn, args.force)
        if load_all or args.npcs:
            populate_npcs(cursor, conn, args.force)
        if load_all or args.spells:
            populate_spells(cursor, conn, args.force)
        if load_all or args.conditions:
            populate_conditions(cursor, conn, args.force)
        if load_all or args.actions:
            populate_actions(cursor, conn, args.force)
        if load_all or args.traps:
            populate_traps(cursor, conn, args.force)
        if load_all or args.dungeons:
            populate_dungeons(cursor, conn, args.force)
        if load_all or args.deities:
            populate_deities(cursor, conn, args.force)
        if load_all or args.classes:
            populate_classes(cursor, conn, args.force)
        
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
        print("  1. Edit seed files in data/seeds/ to add more data")
        print("  2. Run: python _dev/seed_database.py --force")
        print("  3. Check: Start Flask server and test API endpoints")
        print("\nSeed files:")
        print("  - data/seeds/seed_abilities.json")
        print("  - data/seeds/seed_monsters.json")
        print("  - data/seeds/seed_npcs.json")
        print("  - data/seeds/seed_deities.json")
        print("  - data/seeds/seed_spells.json")
        print("  - data/seeds/seed_conditions.json")
        print("  - data/seeds/seed_actions.json")
        print("  - data/seeds/seed_damage_types.json")
        print("  - data/seeds/seed_traps.json")
        print("  - data/seeds/seed_dungeons.json")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
