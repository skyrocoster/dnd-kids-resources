#!/usr/bin/env python3
"""Export current database seed tables into JSON files under data/seeds.

Usage:
  python scripts/export_db_seeds.py
  python scripts/export_db_seeds.py --tables abilities,conditions,monsters
  python scripts/export_db_seeds.py --dry-run
"""

import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "dnd_kids_resources.db"
SEEDS_DIR = ROOT / "data" / "seeds"

EXPORT_DEFINITIONS = {
    "abilities": {
        "file": "seed_abilities.json",
        "query": "SELECT id, code, name, emoji, color, type FROM abilities ORDER BY id",
    },
    "conditions": {
        "file": "seed_conditions.json",
        "query": "SELECT id, title, icon, explanation, details FROM conditions ORDER BY title",
    },
    "monsters": {
        "file": "seed_monsters.json",
        "query": "SELECT id, name, aliases, sizes, family, alignment, creature_type, ac, hp, speed, abilities, saving_throws, skills, passive_perception, damage_resistances, damage_immunities, damage_vulnerabilities, condition_immunities, senses, languages, audio_path, features, cr, cr_sort, cr_note, experience_points FROM monsters ORDER BY name",
    },
    "npcs": {
        "file": "seed_npcs.json",
        "query": "SELECT id, name, race, gender, background, size, stats, armor_class, hit_points, speed, saving_throws, skills, senses, languages, appearance, notes FROM npcs ORDER BY id",
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
    "spells": {
        "file": "seed_spells.json",
        "query": "SELECT id, name, level, school, description, alternate_description, damage, healing, range, higher_levels, casting_times, duration, concentration, ritual, components, materials, attacks, area_of_effect FROM spells ORDER BY name",
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
    "encounters": {
        "file": "seed_encounters.json",
        "query": "SELECT id, name, units, created_at, updated_at FROM encounter ORDER BY name",
    },
    "items": {
        "file": "seed_items.json",
        "query": "SELECT id, name, value_gp, category, description FROM items ORDER BY name",
    },
    "loot_bundles": {
        "file": "seed_loot_bundles.json",
        "query": "SELECT id, name, gold, contents FROM loot_bundle ORDER BY name",
    },
    "loom_threads": {
        "file": "seed_loom_threads.json",
        "query": "SELECT id, name, color, description, origin_node_id FROM loom_threads ORDER BY id",
    },
    "loom_nodes": {
        "file": "seed_loom_nodes.json",
        "query": "SELECT id, thread_id, kind, title, body, session_id, position, carried_count, fulfilled_planned_title, fulfilled_at, banked_from_thread_id FROM loom_nodes ORDER BY id",
    },
    "loom_sessions": {
        "file": "seed_loom_sessions.json",
        "query": "SELECT id, ordinal, name, played_on, notes FROM loom_sessions ORDER BY id",
    },
}




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
    if table_name == "npcs":
        for field in ["stats", "saving_throws", "skills", "senses", "appearance"]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "monsters":
        for field in [
            "aliases", "sizes", "creature_type", "ac", "hp", "speed", "abilities", "saving_throws", "skills",
            "damage_resistances", "damage_immunities", "damage_vulnerabilities", "condition_immunities", "senses",
            "languages", "features"
        ]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "spells":
        for field in ["damage", "healing", "higher_levels", "casting_times", "components", "attacks", "area_of_effect"]:
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
    if table_name == "encounters":
        record["units"] = parse_json_value(record.get("units"))
        return record
    if table_name == "weapons":
        for field in [
            "resist", "property", "focus", "spells", "attack", "recharge",
            "light", "entries", "modify_speed", "ability"
        ]:
            record[field] = parse_json_value(record.get(field))
        return record
    if table_name == "items":
        return record
    if table_name == "loot_bundles":
        record["contents"] = parse_json_value(record.get("contents"))
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
    write_json_file(file_path, transformed, dry_run=dry_run)


def parse_table_list(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def main():
    parser = argparse.ArgumentParser(description="Export current database seed tables to data/seeds")
    parser.add_argument("--tables", type=parse_table_list, help="Comma-separated list of tables to export")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without writing files")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    SEEDS_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(str(DB_PATH)) as conn:
        cursor = conn.cursor()
        requested = args.tables or list(EXPORT_DEFINITIONS.keys())

        for table_name in requested:
            if table_name not in EXPORT_DEFINITIONS:
                raise ValueError(f"Unknown table: {table_name}")
            export_table(cursor, table_name, dry_run=args.dry_run)

    print("\nExport complete.")
    print(f"Seed files are written to: {SEEDS_DIR}")


if __name__ == "__main__":
    main()
