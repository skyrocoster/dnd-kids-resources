#!/usr/bin/env python3
"""
Phase 2: Seed System - Populate Database from JSON Files

This script loads seed data from JSON files and populates empty database tables.
It's designed to be safe and idempotent (can run multiple times).

Seed files (in data/seeds/):
- seed_abilities.json, seed_conditions.json, seed_damage_types.json, seed_weapon_properties.json
- seed_spells.json, seed_monsters.json, seed_weapons.json
- seed_npcs.json, seed_quests.json, seed_encounters.json, seed_dungeons.json
- seed_players.json, seed_player_spells.json, seed_player_weapons.json

Use `scripts/export_db_seeds.py` to re-export the current DB's tables back into data/seeds/.

Usage:
    python scripts/seed_database.py              # Load all seeds
    python scripts/seed_database.py --spells      # Load only spells
    python scripts/seed_database.py --force       # Force reload (delete existing data first)
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
         attack_type, action, area_of_effect, classes, subclasses)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            serialize_for_db(spell_data.get("action")),
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


def populate_quests(cursor, conn, force=False):
    """Populate quests table from seed_quests.json."""
    print("\n[QUEST] Loading quests...")
    try:
        cursor.execute("SELECT COUNT(*) FROM quests")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] Quests table already has {count} records. Skip (use --force to override)")
        return

    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM quests LIMIT 1")
        except Exception:
            print("  [ERROR] Quests table does not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_quests.json")
    if not seeds:
        print("  [WARNING]  No quest seeds found")
        return

    for quest in seeds:
        try:
            cursor.execute("""
                INSERT INTO quests
                (id, name, summary, reward, objectives, details, quest_giver, dungeon_id, location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                quest.get('id'),
                quest.get('name'),
                quest.get('summary'),
                serialize_for_db(quest.get('reward') or []),
                serialize_for_db(quest.get('objectives') or []),
                serialize_for_db(quest.get('details') or []),
                quest.get('quest_giver'),
                quest.get('dungeon_id'),
                quest.get('location')
            ))
            print(f"  [CHECK] {quest.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {quest.get('name')} - {e}")

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} quests")


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


def populate_weapons(cursor, conn, force=False):
    """Populate weapons table from seed_weapons.json."""
    print("[ARMS] Loading weapons...")

    if force:
        try:
            cursor.execute("DELETE FROM weapons")
            print("  [TRASH]  Cleared existing weapons data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing weapons data: {e}")
            print("  [ERROR]  weapons table may not exist. Run _dev/init_database.py first.")
            return
    else:
        try:
            cursor.execute("SELECT COUNT(*) FROM weapons")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  [INFO] Weapons table already has {count} records. Skip (use --force to override)")
                return
        except Exception:
            print("  [ERROR]  weapons table does not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_weapons.json")
    if not seeds:
        print("  [WARNING]  No weapon seeds found")
        return

    if isinstance(seeds, dict) and 'item' in seeds:
        records = seeds.get('item', [])
    else:
        records = seeds if isinstance(seeds, list) else []

    def parse_bool(value):
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, str):
            return int(value.strip().lower() in ['true', '1', '+1', 'yes'])
        return 0

    def serialize_json_field(value, default):
        if value is None:
            return json.dumps(default, ensure_ascii=False)
        return serialize_for_db(value)

    def get_field(*keys):
        for key in keys:
            if key in weapon:
                return weapon.get(key)
        return None

    for weapon in records:
        try:
            cursor.execute("""
                INSERT INTO weapons
                (name, base_weapon, baseitems, rarity, weapon_category, weight, req_attune,
                 sentient, curse, resist, property, focus, spells, attack, recharge, light,
                 entries, tier, grants_language, bonus_spell_attack, bonus_spell_save_dc,
                 bonus_ac, bonus_saving_throw, crit_threshold, ammo_type,
                 grants_proficiency, modify_speed, ability)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                serialize_for_db(get_field('name')),
                serialize_for_db(get_field('baseWeapon', 'base_weapon')),
                parse_bool(get_field('baseitems', 'base_items')),
                serialize_for_db(get_field('rarity')),
                serialize_for_db(get_field('weaponCategory', 'weapon_category')),
                get_field('weight'),
                serialize_for_db(get_field('reqAttune', 'req_attune')),
                int(bool(get_field('sentient', False))),
                int(bool(get_field('curse', False))),
                serialize_json_field(get_field('resist'), []),
                serialize_json_field(get_field('property'), []),
                serialize_json_field(get_field('focus'), []),
                serialize_json_field(get_field('spells'), []),
                serialize_json_field(get_field('attack'), []),
                serialize_json_field(get_field('recharge'), {}),
                serialize_json_field(get_field('light'), []),
                serialize_json_field(get_field('entries'), []),
                serialize_for_db(get_field('tier')),
                int(bool(get_field('grantsLanguage', 'grants_language', False))),
                get_field('bonusSpellAttack', 'bonus_spell_attack'),
                get_field('bonusSpellSaveDc', 'bonus_spell_save_dc'),
                get_field('bonusAc', 'bonus_ac'),
                get_field('bonusSavingThrow', 'bonus_saving_throw'),
                get_field('critThreshold', 'crit_threshold'),
                serialize_for_db(get_field('ammoType', 'ammo_type')),
                int(bool(get_field('grantsProficiency', 'grants_proficiency', False))),
                serialize_json_field(get_field('modifySpeed', 'modify_speed'), {}),
                serialize_json_field(get_field('ability'), {}),
            ))
            print(f"  [CHECK] {weapon.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {weapon.get('name')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM weapons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} weapons")


def populate_dungeons(cursor, conn, force=False):
    """Populate dungeons table from seed_dungeons.json (v2: structured dungeons only)"""
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

    if force:
        try:
            cursor.execute("DELETE FROM dungeons")
            print(f"  [TRASH]  Cleared existing dungeons")
        except Exception as e:
            print(f"  [WARNING]  Error clearing dungeons data: {e}")
            print("  [ERROR]  dungeons table may not exist. Run scripts/init_database.py first.")
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
            print("  [ERROR]  Dungeons table does not exist. Run scripts/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_dungeons.json")
    if not seeds:
        print("  [WARNING]  No dungeon seeds found")
        return

    for dungeon in seeds:
        try:
            # V2: structured dungeons with id, title, and data (JSON-encoded)
            cursor.execute("""
                INSERT INTO dungeons
                (id, title, data)
                VALUES (?, ?, ?)
            """, (
                dungeon.get('id'),
                dungeon.get('title'),
                serialize_for_db(dungeon.get('data', {}))
            ))
            print(f"  [CHECK] {dungeon.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {dungeon.get('title')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM dungeons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Dungeons table now has {final_count} records")


def populate_encounters(cursor, conn, force=False):
    """Populate encounter table from seed_encounters.json."""
    print("\n[ENCOUNTER] Loading encounters...")
    try:
        cursor.execute("SELECT COUNT(*) FROM encounter")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] Encounter table already has {count} records. Skip (use --force to override)")
        return

    if force:
        try:
            cursor.execute("DELETE FROM encounter")
            print("  [TRASH]  Cleared existing encounter data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing encounter data: {e}")
            print("  [ERROR]  encounter table may not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_encounters.json")
    if not seeds:
        print("  [WARNING]  No encounter seeds found")
        return

    for encounter in seeds:
        try:
            cursor.execute("""
                INSERT INTO encounter (id, name, units, active_index)
                VALUES (?, ?, ?, ?)
            """, (
                encounter.get('id'),
                encounter.get('name'),
                serialize_for_db(encounter.get('units', [])),
                encounter.get('active_index'),
            ))
            print(f"  [CHECK] {encounter.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {encounter.get('name')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM encounter")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} encounters")


def populate_players(cursor, conn, force=False):
    """Populate players table from seed_players.json."""
    print("\n[HERO] Loading players...")
    try:
        cursor.execute("SELECT COUNT(*) FROM players")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] Players table already has {count} records. Skip (use --force to override)")
        return

    if force:
        try:
            cursor.execute("DELETE FROM players")
            print("  [TRASH]  Cleared existing players data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing players data: {e}")
            print("  [ERROR]  players table may not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_players.json")
    if not seeds:
        print("  [WARNING]  No player seeds found")
        return

    for player in seeds:
        try:
            cursor.execute("""
                INSERT INTO players
                (id, name, class, level, total_spell_slots, current_spell_slots, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                player.get('id'),
                player.get('name'),
                player.get('class'),
                player.get('level'),
                serialize_for_db(player.get('total_spell_slots')),
                serialize_for_db(player.get('current_spell_slots')),
                player.get('created_at'),
                player.get('updated_at')
            ))
            print(f"  [CHECK] {player.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {player.get('name')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM players")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} players")


def populate_player_spells(cursor, conn, force=False):
    """Populate player_spells table from seed_player_spells.json."""
    print("\n[SPELLBOOK] Loading player spells...")
    try:
        cursor.execute("SELECT COUNT(*) FROM player_spells")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] Player spells table already has {count} records. Skip (use --force to override)")
        return

    if force:
        try:
            cursor.execute("DELETE FROM player_spells")
            print("  [TRASH]  Cleared existing player spells data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing player spells data: {e}")
            print("  [ERROR]  player_spells table may not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_player_spells.json")
    if not seeds:
        print("  [WARNING]  No player spell seeds found")
        return

    for entry in seeds:
        try:
            cursor.execute("""
                INSERT INTO player_spells
                (id, player_id, spell_id, at_will, added_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                entry.get('id'),
                entry.get('player_id'),
                entry.get('spell_id'),
                int(bool(entry.get('at_will', False))),
                entry.get('added_at')
            ))
            print(f"  [CHECK] Player {entry.get('player_id')} spell {entry.get('spell_id')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: player_id={entry.get('player_id')} spell_id={entry.get('spell_id')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM player_spells")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} player spells")


def populate_player_weapons(cursor, conn, force=False):
    """Populate player_weapons table from seed_player_weapons.json."""
    print("\n[ARMS] Loading player weapons...")
    try:
        cursor.execute("SELECT COUNT(*) FROM player_weapons")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        count = 0

    if count > 0 and not force:
        print(f"  [INFO] Player weapons table already has {count} records. Skip (use --force to override)")
        return

    if force:
        try:
            cursor.execute("DELETE FROM player_weapons")
            print("  [TRASH]  Cleared existing player weapons data")
        except Exception as e:
            print(f"  [WARNING]  Error clearing player weapons data: {e}")
            print("  [ERROR]  player_weapons table may not exist. Run _dev/init_database.py first.")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_player_weapons.json")
    if not seeds:
        print("  [WARNING]  No player weapon seeds found")
        return

    for entry in seeds:
        try:
            cursor.execute("""
                INSERT INTO player_weapons
                (id, player_id, weapon_id, added_at)
                VALUES (?, ?, ?, ?)
            """, (
                entry.get('id'),
                entry.get('player_id'),
                entry.get('weapon_id'),
                entry.get('added_at')
            ))
            print(f"  [CHECK] Player {entry.get('player_id')} weapon {entry.get('weapon_id')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: player_id={entry.get('player_id')} weapon_id={entry.get('weapon_id')} - {e}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM player_weapons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} player weapons")


# def reparse_all_dungeons():
#     """Re-parse all dungeons in the database to populate trap_ids and other references"""
#     try:
#         conn = sqlite3.connect(str(DB_PATH))
#         cursor = conn.cursor()
#
#         # Get all dungeons
#         cursor.execute('SELECT id, title, original_html FROM dungeons ORDER BY id')
#         dungeons = cursor.fetchall()
#
#         if not dungeons:
#             print("  [INFO] No dungeons found to re-parse")
#             conn.close()
#             return
#
#         print(f"\n  Found {len(dungeons)} dungeon(s) to re-parse\n")
#
#         for dungeon_id, title, original_html in dungeons:
#             print(f"  🔄 Re-parsing: {title} (ID: {dungeon_id})")
#
#             try:
#                 # Parse the HTML
#                 parser = DungeonHTMLParser(original_html)
#                 dungeon_data = parser.parse()
#
#                 # Convert to JSON
#                 json_output = json.dumps(dungeon_data.to_dict(), indent=2)
#
#                 # Update the database
#                 cursor.execute(
#                     'UPDATE dungeons SET parsed_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
#                     (json_output, dungeon_id)
#                 )
#                 conn.commit()
#
#                 print(f"    ✓ Successfully re-parsed and updated\n")
#
#             except Exception as e:
#                 print(f"    ✗ Error: {e}\n")
#                 conn.rollback()
#
#         conn.close()
#         print("  ✓ Re-parsing complete!")
#         
#     except Exception as e:
#         print(f"  [ERROR] Re-parsing failed: {e}")
#         import traceback
#         traceback.print_exc()
#

def clear_all_tables(cursor, conn):
    """Drop all tables in dependency order to avoid FK constraint violations"""
    print("\n[FORCE] Clearing all existing table data in dependency order...")

    # Disable FK constraints during table operations
    cursor.execute("PRAGMA foreign_keys = OFF")

    tables_to_clear = [
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
        "encounter",
        "skills"
    ]
    
    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM {table}")
            print(f"  [TRASH]  Cleared {table}")
        except Exception:
            # Table might not exist, that's okay
            pass
    
    # Reset AUTOINCREMENT counters so explicit IDs can be reused after force reload.
    try:
        cursor.execute("DELETE FROM sqlite_sequence")
        print("  [OK] Reset sqlite_sequence")
    except sqlite3.OperationalError:
        # sqlite_sequence does not exist until a table with AUTOINCREMENT is created
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
    parser.add_argument('--quests', action='store_true', help='Load only quests')
    parser.add_argument('--damage-types', action='store_true', help='Load only damage types')
    parser.add_argument('--weapon-properties', action='store_true', help='Load only weapon properties')
    parser.add_argument('--weapons', action='store_true', help='Load only weapons')
    parser.add_argument('--dungeons', action='store_true', help='Load only dungeons')
    parser.add_argument('--encounters', action='store_true', help='Load only encounters')
    parser.add_argument('--npcs', action='store_true', help='Load only NPCs')
    parser.add_argument('--players', action='store_true', help='Load only players')
    parser.add_argument('--player-spells', action='store_true', help='Load only player spell assignments')
    parser.add_argument('--player-weapons', action='store_true', help='Load only player weapon assignments')
    parser.add_argument('--force', action='store_true', help='Force reload (clear existing data first)')
    
    args = parser.parse_args()
    # If no specific tables selected, load all
    load_all = not any([
        args.abilities, args.spells, args.conditions, args.monsters, args.quests,
        args.npcs, args.players, args.player_spells, args.player_weapons,
        args.damage_types, args.weapon_properties, args.weapons,
        args.dungeons, args.encounters
    ])
    
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
        if load_all or args.weapons:
            populate_weapons(cursor, conn, args.force)
        if load_all or args.monsters:
            populate_monsters(cursor, conn, args.force)
        if load_all or args.npcs:
            populate_npcs(cursor, conn, args.force)
        if load_all or args.quests:
            populate_quests(cursor, conn, args.force)
        if load_all or args.spells:
            populate_spells(cursor, conn, args.force)
        if load_all or args.conditions:
            populate_conditions(cursor, conn, args.force)
        if load_all or args.dungeons:
            populate_dungeons(cursor, conn, args.force)
        if load_all or args.encounters:
            populate_encounters(cursor, conn, args.force)
        if load_all or args.players:
            populate_players(cursor, conn, args.force)
        if load_all or args.player_spells:
            populate_player_spells(cursor, conn, args.force)
        if load_all or args.player_weapons:
            populate_player_weapons(cursor, conn, args.force)
        
        conn.close()
        
        # Dungeon re-parsing has been disabled. Dungeon records are still loaded from seeds.
        # print("\n" + "="*60)
        # print("[REPARSE] Starting dungeon re-parsing...")
        # print("="*60)
        # reparse_all_dungeons()
        
        print("\n" + "="*60)
        print("[OK] PHASE 2 COMPLETE!")
        print("="*60)
        print("\nNext Steps:")
        print("  1. Edit seed files in data/seeds/ to add more data")
        print("  2. Run: python scripts/seed_database.py --force")
        print("  3. Build frontend and run FastAPI server")
        print("\nV2 Seed files (14 tables):")
        print("  - data/seeds/seed_abilities.json")
        print("  - data/seeds/seed_damage_types.json")
        print("  - data/seeds/seed_weapon_properties.json")
        print("  - data/seeds/seed_weapons.json")
        print("  - data/seeds/seed_spells.json")
        print("  - data/seeds/seed_conditions.json")
        print("  - data/seeds/seed_monsters.json")
        print("  - data/seeds/seed_npcs.json")
        print("  - data/seeds/seed_quests.json")
        print("  - data/seeds/seed_encounters.json")
        print("  - data/seeds/seed_dungeons.json")
        print("  - data/seeds/seed_players.json")
        print("  - data/seeds/seed_player_spells.json")
        print("  - data/seeds/seed_player_weapons.json")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
