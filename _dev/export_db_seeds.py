#!/usr/bin/env python3
"""Export current database seed tables into JSON files under data/seeds.

This script archives any existing seed JSON files into data/seeds/archive with a
timestamped filename, then exports current DB rows to new seed files.

Usage:
  python _dev/export_db_seeds.py
  python _dev/export_db_seeds.py --tables abilities,conditions,creatures
  python _dev/export_db_seeds.py --dry-run
"""

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "dnd_kids_resources.db"
SEEDS_DIR = ROOT / "data" / "seeds"
ARCHIVE_DIR = SEEDS_DIR / "archive"
LEGACY_DATA_DIR = ROOT / "data"

EXPORT_DEFINITIONS = {
    "abilities": {
        "file": "seed_abilities.json",
        "query": "SELECT id, code, name, emoji, color, type FROM abilities ORDER BY id",
    },
    "classes": {
        "file": "seed_classes.json",
        "query": "SELECT id, code, name, emoji, color FROM classes ORDER BY id",
    },
    "conditions": {
        "file": "seed_conditions.json",
        "query": "SELECT id, title, icon, explanation, details FROM conditions ORDER BY title",
    },
    "actions": {
        "file": "seed_actions.json",
        "query": "SELECT id, name, icon, category, explanation, details FROM actions ORDER BY name",
    },
    "monsters": {
        "file": "seed_monsters.json",
        "query": "SELECT id, name, alias, size, \"group\", alignment, type, ac, hp, speed, stats, save, skill, resist, vulnerable, senses, languages, action, reaction, traits, spellcasting, bonus, legendary, legendaryHeader, mythic, mythicHeader, reactionRules, soundClip, cr, cr_details FROM monsters ORDER BY name",
    },
    "npcs": {
        "file": "seed_npcs.json",
        "query": "SELECT id, name, race, gender, background, size, stats, armor_class, hit_points, speed, saving_throws, skills, senses, languages, appearance, notes FROM npcs ORDER BY id",
    },
    "quests": {
        "file": "seed_quests.json",
        "query": "SELECT id, name, summary, reward, objectives, details, quest_giver, dungeon_id, location FROM quests ORDER BY id",
    },
    "damage_types": {
        "file": "seed_damage_types.json",
        "query": "SELECT id, code, name, emoji, color FROM damage_types ORDER BY id",
    },
    "weapon_properties": {
        "file": "seed_weapon_properties.json",
        "query": "SELECT id, code, name, description FROM weapon_properties ORDER BY code",
    },
    "weapons": {
        "file": "seed_weapons.json",
        "query": "SELECT id, name, base_weapon, baseitems, rarity, weapon_category, weight, req_attune, sentient, curse, resist, property, focus, spells, attack, recharge, light, entries, tier, grants_language, bonus_spell_attack, bonus_spell_save_dc, bonus_ac, bonus_saving_throw, crit_threshold, ammo_type, grants_proficiency, modify_speed, ability FROM weapons ORDER BY name",
    },
    "traps": {
        "file": "seed_traps.json",
        "query": "SELECT id, name FROM traps ORDER BY name",
    },
    "dungeons": {
        "file": "seed_dungeons.json",
        "query": "SELECT id, title, original_html, parsed_json FROM dungeons ORDER BY id",
    },
    "deities": {
        "file": "seed_deities.json",
        "query": "SELECT id, name, pantheon, alignment, category, domains, symbol, title, alt_names, entries FROM deities ORDER BY name",
    },
    "spells": {
        "file": "seed_spells.json",
        "query": "SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text, damage, heal, heal_at_spell_slots, range, higher_levels, damage_at_higher_levels, casting_time, duration, concentration, ritual, components, materials, attack_type, action, area_of_effect, classes, subclasses FROM spells ORDER BY spell_name",
    },
    "players": {
        "file": "seed_players.json",
        "query": "SELECT id, name, class, level, total_spell_slots, current_spell_slots, created_at, updated_at FROM players ORDER BY name",
    },
    "player_spells": {
        "file": "seed_player_spells.json",
        "query": "SELECT id, player_id, spell_id, at_will, added_at FROM player_spells ORDER BY player_id, added_at",
    },
    "player_weapons": {
        "file": "seed_player_weapons.json",
        "query": "SELECT id, player_id, weapon_id, added_at FROM player_weapons ORDER BY player_id, added_at",
    },
}


def ensure_directories():
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


def timestamped_archive_name(file_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return ARCHIVE_DIR / f"{file_path.stem}_{timestamp}{file_path.suffix}"


def archive_file(file_path: Path, dry_run=False):
    target = timestamped_archive_name(file_path)
    if dry_run:
        print(f"[DRY RUN] Archive {file_path} -> {target}")
        return target
    print(f"Archiving {file_path} -> {target}")
    file_path.replace(target)
    return target


def archive_existing_seeds(dry_run=False):
    if not SEEDS_DIR.exists():
        return

    for source_dir in [SEEDS_DIR, LEGACY_DATA_DIR]:
        for seed_file in source_dir.glob("seed_*.json"):
            if seed_file.is_file():
                archive_file(seed_file, dry_run=dry_run)


def load_json_schema(cursor, query, file_name):
    try:
        cursor.execute(query)
    except sqlite3.OperationalError as exc:
        if file_name == 'seed_player_spells.json' and 'at_will' in str(exc):
            fallback_query = query.replace('spell_id, at_will, added_at', 'spell_id, added_at')
            try:
                cursor.execute(fallback_query)
            except sqlite3.OperationalError as exc2:
                print(f"[WARNING] Skipping export for {file_name}: {exc2}")
                return None
        else:
            print(f"[WARNING] Skipping export for {file_name}: {exc}")
            return None
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    results = [dict(zip(columns, row)) for row in rows]
    return results


def parse_json_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def transform_record(record, table_name):
    if table_name == "conditions":
        record["details"] = parse_json_value(record.get("details"))
        return record
    if table_name == "creatures":
        for field in ["attack_to_hit", "damage", "stats"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "npcs":
        for field in ["stats", "saving_throws", "skills", "senses", "appearance"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "monsters":
        for field in [
            "alias", "size", "group", "alignment", "type", "ac", "hp", "speed", "stats", "save", "skill",
            "resist", "vulnerable", "senses", "languages", "action", "reaction", "traits", "spellcasting",
            "bonus", "legendary", "legendaryHeader", "mythic", "mythicHeader", "reactionRules", "soundClip", "cr", "cr_details"
        ]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "dungeons":
        record["parsed_json"] = parse_json_value(record.get("parsed_json"))
        return record
    if table_name == "deities":
        for field in ["alignment", "domains", "alt_names", "entries"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "quests":
        for field in ["reward", "objectives", "details"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "spells":
        for field in ["damage", "classes", "subclasses", "attack_type"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "player_spells":
        if 'at_will' not in record:
            record['at_will'] = False
        return record
    if table_name == "players":
        for field in ["total_spell_slots", "current_spell_slots"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "weapons":
        for field in [
            "resist", "property", "focus", "spells", "attack", "recharge",
            "light", "entries", "modify_speed", "ability"
        ]:
            record[field] = parse_json_value(record.get(field))
        return record
    return record


def write_json_file(file_path: Path, data, dry_run=False):
    if dry_run:
        print(f"[DRY RUN] Would write {file_path} ({len(data)} entries)")
        return
    with file_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {file_path} ({len(data)} entries)")


def export_table(cursor, table_name, dry_run=False):
    definition = EXPORT_DEFINITIONS[table_name]
    file_path = SEEDS_DIR / definition["file"]
    rows = load_json_schema(cursor, definition["query"], definition["file"])
    if rows is None:
        return
    transformed = [transform_record(row, table_name) for row in rows]
    data = {"deity": transformed} if table_name == "deities" else transformed
    write_json_file(file_path, data, dry_run=dry_run)


def parse_table_list(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def main():
    parser = argparse.ArgumentParser(description="Export current database seed tables to data/seeds")
    parser.add_argument("--tables", type=parse_table_list, help="Comma-separated list of tables to export")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without writing files")
    parser.add_argument("--no-archive", action="store_true", help="Skip archiving existing seed files")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    ensure_directories()

    if not args.no_archive:
        archive_existing_seeds(dry_run=args.dry_run)

    with sqlite3.connect(str(DB_PATH)) as conn:
        cursor = conn.cursor()
        requested = args.tables or list(EXPORT_DEFINITIONS.keys())

        for table_name in requested:
            if table_name not in EXPORT_DEFINITIONS:
                raise ValueError(f"Unknown table: {table_name}")
            export_table(cursor, table_name, dry_run=args.dry_run)

    print("\nExport complete.")
    print(f"Seed files are written to: {SEEDS_DIR}")
    print(f"Archive location: {ARCHIVE_DIR}")


if __name__ == "__main__":
    main()
