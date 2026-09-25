#!/usr/bin/env python3
"""
Populate the database from the canonical JSON seeds in data/seeds.

This script loads seed data from JSON files and populates empty database tables.
It's designed to be safe and idempotent (can run multiple times).

Seed files (in data/seeds/):
- seed_abilities.json, seed_conditions.json, seed_damage_types.json, seed_weapon_properties.json
- seed_spells.json, seed_monsters.json, seed_weapons.json
- seed_npcs.json, seed_encounters.json
- seed_items.json, seed_loot_bundles.json
- seed_players.json, seed_player_spells.json, seed_player_weapons.json
- seed_revealed_cells.json, seed_at_the_table.json

Use `src/tools/export_db_seeds.py` to re-export the current DB's tables back into data/seeds/.

Usage:
    docker compose exec backend python -m backend.database.seed_database
        # Load all seeds
    docker compose exec backend python -m backend.database.seed_database --spells
        # Load only spells
    docker compose exec backend python -m backend.database.seed_database --force
        # Replace all default seed groups (Loom remains excluded)
    docker compose exec backend python -m backend.database.seed_database --spells --force
        # Replace only the spells table
"""

import argparse
import json
import sqlite3
from pathlib import Path

from backend.app.db import DB_PATH
from backend.app.reference_text import (
    spell_value_reference_registry,
    validate_reference_text,
    weapon_value_reference_registry,
)

SEEDS_DIR = Path(__file__).resolve().parents[2] / "data" / "seeds"

# A forced group reload replaces only the tables owned by that selected group.
# The state tables are part of the dungeon group because they refer to dungeons.
SEED_GROUPS = {
    "abilities": {
        "argument": "abilities",
        "tables": ("abilities",),
        "files": ("seed_abilities.json",),
    },
    "damage_types": {
        "argument": "damage_types",
        "tables": ("damage_types",),
        "files": ("seed_damage_types.json",),
    },
    "weapon_properties": {
        "argument": "weapon_properties",
        "tables": ("weapon_properties",),
        "files": ("seed_weapon_properties.json",),
    },
    "weapons": {
        "argument": "weapons",
        "tables": ("weapons",),
        "files": ("seed_weapons.json",),
    },
    "items": {"argument": "items", "tables": ("items",), "files": ("seed_items.json",)},
    "monsters": {
        "argument": "monsters",
        "tables": ("monsters",),
        "files": ("seed_monsters.json",),
    },
    "npcs": {"argument": "npcs", "tables": ("npcs",), "files": ("seed_npcs.json",)},
    "spells": {
        "argument": "spells",
        "tables": ("spells",),
        "files": ("seed_spells.json",),
    },
    "conditions": {
        "argument": "conditions",
        "tables": ("conditions",),
        "files": ("seed_conditions.json",),
    },
    "encounters": {
        "argument": "encounters",
        "tables": ("encounter",),
        "files": ("seed_encounters.json",),
    },
    "loot_bundles": {
        "argument": "loot_bundles",
        "tables": ("loot_bundle",),
        "files": ("seed_loot_bundles.json",),
    },
    "players": {
        "argument": "players",
        "tables": ("players",),
        "files": ("seed_players.json",),
    },
    "player_spells": {
        "argument": "player_spells",
        "tables": ("player_spells",),
        "files": ("seed_player_spells.json",),
    },
    "player_weapons": {
        "argument": "player_weapons",
        "tables": ("player_weapons",),
        "files": ("seed_player_weapons.json",),
    },
    "dungeons": {
        "argument": "dungeons",
        "tables": (
            "revealed_cells",
            "at_the_table",
            "map_session_state",
            "map_layout",
            "dungeons",
        ),
        "files": (
            "seed_dungeons.json",
            "seed_map_layouts.json",
            "seed_map_session_state.json",
            "seed_revealed_cells.json",
            "seed_at_the_table.json",
        ),
    },
    "loom": {
        "argument": "loom",
        "tables": ("loom_nodes", "loom_threads", "loom_sessions"),
        "files": (
            "seed_loom_threads.json",
            "seed_loom_sessions.json",
            "seed_loom_nodes.json",
        ),
    },
}
_PRELOADED_SEEDS: dict[str, object] | None = None


class _DeferredCommitConnection:
    """Keep legacy population helpers from committing inside the CLI transaction."""

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def commit(self) -> None:
        # main() owns the single commit after every selected group has succeeded.
        return None


def load_json_file(filepath):
    """Load and parse a JSON seed file."""
    if _PRELOADED_SEEDS is not None and filepath.name in _PRELOADED_SEEDS:
        return _PRELOADED_SEEDS[filepath.name]
    if not filepath.exists():
        raise FileNotFoundError(f"Seed file not found: {filepath}")

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {filepath}: {e}") from e


def _validate_seed_data(filename: str, data: object) -> None:
    """Reject invalid top-level shapes before a forced reload starts deleting rows."""
    if filename == "seed_weapon_properties.json":
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict) and all(isinstance(value, dict) for value in data.values()):
            return
        else:
            raise ValueError(f"Expected a list or object in {filename}")
    elif filename == "seed_weapons.json" and isinstance(data, dict):
        records = data.get("item")
        if not isinstance(records, list):
            raise ValueError(f"Expected an item list in {filename}")
    else:
        if not isinstance(data, list):
            raise ValueError(f"Expected a list in {filename}")
        records = data

    if any(not isinstance(record, dict) for record in records):
        raise ValueError(f"Expected every record in {filename} to be an object")
    if filename == "seed_at_the_table.json" and len(records) > 1:
        raise ValueError("seed_at_the_table.json may contain at most one row")


def _preload_seed_inputs(groups: list[str]) -> dict[str, object]:
    """Read and structurally validate every selected input before any delete begins."""
    filenames = dict.fromkeys(
        filename for group in groups for filename in SEED_GROUPS[group]["files"]
    )
    loaded = {}
    for filename in filenames:
        data = load_json_file(SEEDS_DIR / filename)
        _validate_seed_data(filename, data)
        loaded[filename] = data
    return loaded


def populate_abilities(cursor, conn, force=False):
    """Populate abilities from seed_abilities.json.

    Requires the schema created by init_database.py.
    """
    print("\n[BRAIN] Loading abilities...")

    if force:
        # Clear existing abilities data, but do not manage schema here
        cursor.execute("DELETE FROM abilities")
        print("  [TRASH]  Cleared existing abilities data")
    else:
        # Check if table exists and has data
        try:
            cursor.execute("SELECT COUNT(*) FROM abilities")
            count = cursor.fetchone()[0]
            if count > 0:
                print(
                    f"  [INFO]  Abilities table already has {count} records. "
                    "Skip (use --force to override)"
                )
                return
        except Exception as e:
            raise RuntimeError("Failed to read the abilities table") from e

    seeds = load_json_file(SEEDS_DIR / "seed_abilities.json")
    if not seeds:
        print("  [WARNING]  No ability seeds found")
        return

    for ability in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO abilities 
                (id, code, name, emoji, color, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    ability.get("id"),
                    ability.get("code"),
                    ability.get("name"),
                    ability.get("emoji", "❓"),
                    ability.get("color", "#95a5a6"),
                    ability.get("type", "stat"),
                ),
            )
            ability_type = ability.get("type", "stat")
            ability_id = ability.get("id", "?")
            print(
                f"  [CHECK] ID {ability_id}: {ability.get('code').upper()} - "
                f"{ability.get('name')} ({ability_type})"
            )
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {ability.get('code')} - {e}")
            raise

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


def serialize_json_field(value, default):
    if value is None:
        return json.dumps(default, ensure_ascii=False)
    return serialize_for_db(value)


def insert_spell(cursor, spell_data):
    quick_rules = spell_data.get("quick_rules")
    if quick_rules is not None:
        validation = validate_reference_text(quick_rules, spell_value_reference_registry)
        if not validation["valid"]:
            raise ValueError(
                f"Invalid quick_rules for {spell_data.get('name')}: {validation['errors']}"
            )

    cursor.execute(
        """
        INSERT INTO spells
        (id, name, level, school, categories, description, quick_rules,
         alternate_description, damage, healing, range, higher_levels,
         casting_times, duration, concentration, ritual, components, materials,
         attacks, area_of_effect)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            spell_data["id"],
            spell_data["name"],
            spell_data["level"],
            spell_data.get("school"),
            serialize_for_db(spell_data.get("categories", [])),
            spell_data["description"],
            quick_rules,
            spell_data.get("alternate_description"),
            serialize_for_db(spell_data.get("damage", [])),
            serialize_for_db(
                spell_data.get("healing", {"amount": None, "temp_hp": False, "max_hp": False})
            ),
            spell_data["range"],
            serialize_for_db(spell_data.get("higher_levels", {"text": None, "damage_by_slot": {}})),
            serialize_for_db(spell_data.get("casting_times", [])),
            spell_data["duration"],
            int(bool(spell_data.get("concentration", False))),
            int(bool(spell_data.get("ritual", False))),
            serialize_for_db(spell_data.get("components", [])),
            serialize_for_db(spell_data.get("materials")),
            serialize_for_db(spell_data.get("attacks", [])),
            serialize_for_db(spell_data.get("area_of_effect", {"shape": None, "size": None})),
        ),
    )


def populate_spells(cursor, conn, force=False):
    """Populate the spells table from seed_spells.json."""
    print("\n[BOOKS] Loading spells...")

    seed_file = SEEDS_DIR / "seed_spells.json"
    cursor.execute("SELECT COUNT(*) FROM spells")
    count = cursor.fetchone()[0]
    if count > 0 and not force:
        print(f"  [INFO] Spells table already has {count} records. Skip (use --force to override)")
        return

    print(f"  [INFO] Loading spell seeds from {seed_file}")
    seeds = load_json_file(seed_file)
    if not seeds:
        print("  [WARNING]  No spell seeds found")
        return

    for spell in seeds:
        try:
            insert_spell(cursor, spell)
            print(f"  [CHECK] {spell.get('name')}")
        except ValueError as e:
            print(f"  [ERROR]  Invalid spell quick_rules: {spell.get('name')} - {e}")
            raise
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {spell.get('name')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} spells from JSON seed file")


def populate_conditions(cursor, conn, force=False):
    """Populate conditions table from seed_conditions.json"""
    print("\n[WARNING]  Loading conditions...")

    try:
        cursor.execute("SELECT COUNT(*) FROM conditions")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the conditions table") from e

    if count > 0 and not force:
        print(
            f"  [INFO]  Conditions table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    # Conditions schema must be created by init_database.py
    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM conditions LIMIT 1")
        except Exception as e:
            print(
                "  [ERROR]  Conditions table does not exist. "
                "Run backend/database/init_database.py first."
            )
            raise RuntimeError("Failed to inspect the conditions table") from e

    seeds = load_json_file(SEEDS_DIR / "seed_conditions.json")
    if not seeds:
        print("  [WARNING]  No condition seeds found")
        return

    for condition in seeds:
        try:
            details = json.dumps(condition.get("details", [])) if condition.get("details") else None

            cursor.execute(
                """
                INSERT INTO conditions 
                (title, icon, explanation, details)
                VALUES (?, ?, ?, ?)
            """,
                (
                    condition.get("title"),
                    condition.get("icon", "[WARNING]"),
                    condition.get("explanation", ""),
                    details,
                ),
            )
            print(f"  [CHECK] {condition.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {condition.get('title')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} conditions")


def populate_monsters(cursor, conn, force=False):
    """Populate monsters table from seed_monsters.json using normalized monster data"""
    print("\n[DRAGON] Loading monsters...")
    try:
        cursor.execute("SELECT COUNT(*) FROM monsters")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the monsters table") from e
    if count > 0 and not force:
        print(
            f"  [INFO]  Monsters table already has {count} records. Skip (use --force to override)"
        )
        return
    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM monsters LIMIT 1")
        except Exception as e:
            print(
                "  [ERROR]  Monsters table does not exist. "
                "Run backend/database/init_database.py first."
            )
            raise RuntimeError("Failed to inspect the monsters table") from e
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
            cursor.execute(
                """
                INSERT INTO monsters
                (id, name, aliases, sizes, family, alignment, creature_type,
                 ac, hp, speed, abilities, saving_throws, skills,
                 passive_perception, damage_resistances, damage_immunities,
                 damage_vulnerabilities, condition_immunities, senses, languages,
                 audio_path, features, cr, cr_sort, cr_note, experience_points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?)
            """,
                (
                    monster.get("id"),
                    monster.get("name"),
                    serialize(monster.get("aliases", [])),
                    serialize(monster.get("sizes", [])),
                    monster.get("family"),
                    monster.get("alignment"),
                    serialize(monster.get("creature_type")),
                    serialize(monster.get("ac")),
                    serialize(monster.get("hp")),
                    serialize(monster.get("speed", [])),
                    serialize(monster.get("abilities")),
                    serialize(monster.get("saving_throws", {})),
                    serialize(monster.get("skills", {})),
                    monster.get("passive_perception"),
                    serialize(monster.get("damage_resistances", [])),
                    serialize(monster.get("damage_immunities", [])),
                    serialize(monster.get("damage_vulnerabilities", [])),
                    serialize(monster.get("condition_immunities", [])),
                    serialize(monster.get("senses", [])),
                    serialize(monster.get("languages", [])),
                    monster.get("audio_path"),
                    serialize(monster.get("features", {})),
                    serialize(monster.get("cr")),
                    monster.get("cr_sort"),
                    monster.get("cr_note"),
                    monster.get("experience_points"),
                ),
            )
            print(f"  [CHECK] {monster.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {monster.get('name')} - {e}")
            raise
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} monsters")


def populate_npcs(cursor, conn, force=False):
    """Populate npcs table from seed_npcs.json."""
    print("\n[NPC] Loading NPCs...")
    try:
        cursor.execute("SELECT COUNT(*) FROM npcs")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the NPCs table") from e

    if count > 0 and not force:
        print(f"  [INFO] NPCs table already has {count} records. Skip (use --force to override)")
        return

    if force or count == 0:
        try:
            cursor.execute("SELECT 1 FROM npcs LIMIT 1")
        except Exception as e:
            print(
                "  [ERROR] NPCs table does not exist. Run backend/database/init_database.py first."
            )
            raise RuntimeError("Failed to inspect the NPCs table") from e

    seeds = load_json_file(SEEDS_DIR / "seed_npcs.json")
    if not seeds:
        print("  [WARNING]  No NPC seeds found")
        return

    for npc in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO npcs
                (id, name, race, gender, background, sizes, alignment, creature_type, ac, hp, speed,
                 abilities, saving_throws, skills, passive_perception, damage_resistances,
                 damage_immunities, damage_vulnerabilities, condition_immunities, senses, languages,
                 features, cr, cr_note, experience_points, appearance, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    npc.get("id"),
                    npc.get("name"),
                    npc.get("race"),
                    npc.get("gender"),
                    npc.get("background"),
                    serialize_for_db(npc.get("sizes")),
                    npc.get("alignment"),
                    serialize_for_db(npc.get("creature_type")),
                    serialize_for_db(npc.get("ac")),
                    serialize_for_db(npc.get("hp")),
                    serialize_for_db(npc.get("speed")),
                    serialize_for_db(npc.get("abilities")),
                    serialize_for_db(npc.get("saving_throws")),
                    serialize_for_db(npc.get("skills")),
                    npc.get("passive_perception"),
                    serialize_for_db(npc.get("damage_resistances")),
                    serialize_for_db(npc.get("damage_immunities")),
                    serialize_for_db(npc.get("damage_vulnerabilities")),
                    serialize_for_db(npc.get("condition_immunities")),
                    serialize_for_db(npc.get("senses")),
                    serialize_for_db(npc.get("languages")),
                    serialize_for_db(npc.get("features")),
                    npc.get("cr"),
                    npc.get("cr_note"),
                    npc.get("experience_points"),
                    serialize_for_db(npc.get("appearance")),
                    npc.get("notes"),
                ),
            )
            print(f"  [CHECK] {npc.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {npc.get('name')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} NPCs")


def populate_loom_threads(cursor, conn, force=False):
    """Populate loom_threads table from seed_loom_threads.json (frozen demo tapestry)."""
    print("\n[LOOM] Loading loom threads...")
    try:
        cursor.execute("SELECT COUNT(*) FROM loom_threads")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the Loom threads table") from e

    if count > 0 and not force:
        print(
            f"  [INFO] Loom threads table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    seeds = load_json_file(SEEDS_DIR / "seed_loom_threads.json")
    if not seeds:
        print("  [WARNING]  No loom thread seeds found")
        return

    for thread in seeds:
        try:
            cursor.execute(
                "INSERT INTO loom_threads (id, name, color, description, origin_node_id) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    thread.get("id"),
                    thread.get("name"),
                    thread.get("color"),
                    thread.get("description"),
                    thread.get("origin_node_id"),
                ),
            )
            print(f"  [CHECK] {thread.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {thread.get('name')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} loom threads")


def populate_loom_sessions(cursor, conn, force=False):
    """Populate loom_sessions table from seed_loom_sessions.json (frozen demo tapestry)."""
    print("\n[LOOM] Loading loom sessions...")
    try:
        cursor.execute("SELECT COUNT(*) FROM loom_sessions")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the Loom sessions table") from e

    if count > 0 and not force:
        print(
            f"  [INFO] Loom sessions table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    seeds = load_json_file(SEEDS_DIR / "seed_loom_sessions.json")
    if not seeds:
        print("  [WARNING]  No loom session seeds found")
        return

    for session in seeds:
        try:
            cursor.execute(
                """INSERT INTO loom_sessions (id, ordinal, name, played_on, notes)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    session.get("id"),
                    session.get("ordinal"),
                    session.get("name"),
                    session.get("played_on"),
                    session.get("notes"),
                ),
            )
            print(f"  [CHECK] {session.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {session.get('name')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} loom sessions")


def populate_loom_nodes(cursor, conn, force=False):
    """Populate loom_nodes table from seed_loom_nodes.json (frozen demo tapestry)."""
    print("\n[LOOM] Loading loom nodes...")
    try:
        cursor.execute("SELECT COUNT(*) FROM loom_nodes")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the Loom nodes table") from e

    if count > 0 and not force:
        print(
            f"  [INFO] Loom nodes table already has {count} records. Skip (use --force to override)"
        )
        return

    seeds = load_json_file(SEEDS_DIR / "seed_loom_nodes.json")
    if not seeds:
        print("  [WARNING]  No loom node seeds found")
        return

    for node in seeds:
        try:
            cursor.execute(
                """INSERT INTO loom_nodes (id, thread_id, kind, title, body, session_id, position,
                   carried_count, fulfilled_planned_title, fulfilled_at, banked_from_thread_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    node.get("id"),
                    node.get("thread_id"),
                    node.get("kind"),
                    node.get("title"),
                    node.get("body"),
                    node.get("session_id"),
                    node.get("position", 0),
                    node.get("carried_count", 0),
                    node.get("fulfilled_planned_title"),
                    node.get("fulfilled_at"),
                    node.get("banked_from_thread_id"),
                ),
            )
            print(f"  [CHECK] {node.get('title')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {node.get('title')} - {e}")
            raise

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} loom nodes")


def populate_damage_types(cursor, conn, force=False):
    """Populate damage types from seed_damage_types.json.

    Requires the schema created by init_database.py.
    """
    print("\n[BOOM] Loading damage types...")

    if force:
        # Clear existing damage types data, but do not manage schema here
        cursor.execute("DELETE FROM damage_types")
        print("  [TRASH]  Cleared existing damage_types data")
    else:
        # Check if table exists and has data
        cursor.execute("SELECT COUNT(*) FROM damage_types")
        count = cursor.fetchone()[0]
        if count > 0:
            print(
                f"  [INFO]  Damage types table already has {count} records. "
                "Skip (use --force to override)"
            )
            return

    seeds = load_json_file(SEEDS_DIR / "seed_damage_types.json")
    if not seeds:
        print("  [WARNING]  No damage type seeds found")
        return

    for damage_type in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO damage_types 
                (id, code, name, emoji, color)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    damage_type.get("id"),
                    damage_type.get("code"),
                    damage_type.get("name"),
                    damage_type.get("emoji", "❓"),
                    damage_type.get("color", "#95a5a6"),
                ),
            )
            dt_id = damage_type.get("id", "?")
            print(
                f"  [CHECK] ID {dt_id}: {damage_type.get('code').upper()} - "
                f"{damage_type.get('name')}"
            )
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Error: {damage_type.get('code')} - {e}")
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM damage_types")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Damage types table now has {final_count} records")


def populate_weapon_properties(cursor, conn, force=False):
    """Populate weapon_properties table from seed_weapon_properties.json."""
    print("[ARMS] Loading weapon properties...")

    if force:
        cursor.execute("DELETE FROM weapon_properties")
        print("  [TRASH]  Cleared existing weapon_properties data")
    else:
        cursor.execute("SELECT COUNT(*) FROM weapon_properties")
        count = cursor.fetchone()[0]
        if count > 0:
            print(
                f"  [INFO]  Weapon properties table already has {count} records. "
                "Skip (use --force to override)"
            )
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
            property_items.append(
                {
                    "code": code,
                    "name": payload.get("name"),
                    "description": payload.get("description"),
                }
            )
    elif isinstance(seeds, list):
        property_items = seeds
    else:
        raise ValueError("Unexpected seed format for weapon properties")

    for prop in property_items:
        try:
            cursor.execute(
                """
                INSERT INTO weapon_properties
                (code, name, description)
                VALUES (?, ?, ?)
            """,
                (prop.get("code"), prop.get("name"), prop.get("description")),
            )
            print(f"  [CHECK] {prop.get('code').upper()}: {prop.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {prop.get('code')} - {e}")
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM weapon_properties")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Weapon properties table now has {final_count} records")


def insert_weapon(cursor, weapon_data):
    quick_rules = weapon_data.get("quick_rules")
    if quick_rules is not None:
        validation = validate_reference_text(quick_rules, weapon_value_reference_registry)
        if not validation["valid"]:
            raise ValueError(
                f"Invalid quick_rules for {weapon_data.get('name')}: {validation['errors']}"
            )

    def parse_bool(value):
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, str):
            return int(value.strip().lower() in ["true", "1", "+1", "yes"])
        return 0

    def get_field(*keys):
        for key in keys:
            if key in weapon_data:
                return weapon_data.get(key)
        return None

    cursor.execute(
        """
        INSERT INTO weapons
        (name, base_weapon, baseitems, rarity, weapon_category, weight, req_attune,
         sentient, curse, resist, property, focus, spells, attack, recharge, light,
         entries, tier, grants_language, bonus_spell_attack, bonus_spell_save_dc,
         bonus_ac, bonus_saving_throw, crit_threshold, ammo_type,
         grants_proficiency, modify_speed, ability,
         quick_rules, weapon_attack_bonus, weapon_damage_bonus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?)
        """,
        (
            serialize_for_db(get_field("name")),
            serialize_for_db(get_field("baseWeapon", "base_weapon")),
            parse_bool(get_field("baseitems", "base_items")),
            serialize_for_db(get_field("rarity")),
            serialize_for_db(get_field("weaponCategory", "weapon_category")),
            get_field("weight"),
            serialize_for_db(get_field("reqAttune", "req_attune")),
            int(bool(get_field("sentient", False))),
            int(bool(get_field("curse", False))),
            serialize_json_field(get_field("resist"), []),
            serialize_json_field(get_field("property"), []),
            serialize_json_field(get_field("focus"), []),
            serialize_json_field(get_field("spells"), []),
            serialize_json_field(get_field("attack"), []),
            serialize_json_field(get_field("recharge"), {}),
            serialize_json_field(get_field("light"), []),
            serialize_json_field(get_field("entries"), []),
            serialize_for_db(get_field("tier")),
            int(bool(get_field("grantsLanguage", "grants_language", False))),
            get_field("bonusSpellAttack", "bonus_spell_attack"),
            get_field("bonusSpellSaveDc", "bonus_spell_save_dc"),
            get_field("bonusAc", "bonus_ac"),
            get_field("bonusSavingThrow", "bonus_saving_throw"),
            get_field("critThreshold", "crit_threshold"),
            serialize_for_db(get_field("ammoType", "ammo_type")),
            int(bool(get_field("grantsProficiency", "grants_proficiency", False))),
            serialize_json_field(get_field("modifySpeed", "modify_speed"), {}),
            serialize_json_field(get_field("ability"), {}),
            quick_rules,
            get_field("weaponAttackBonus", "weapon_attack_bonus"),
            get_field("weaponDamageBonus", "weapon_damage_bonus"),
        ),
    )


def populate_weapons(cursor, conn, force=False):
    """Populate weapons table from seed_weapons.json."""
    print("[ARMS] Loading weapons...")

    if force:
        cursor.execute("DELETE FROM weapons")
        print("  [TRASH]  Cleared existing weapons data")
    else:
        cursor.execute("SELECT COUNT(*) FROM weapons")
        count = cursor.fetchone()[0]
        if count > 0:
            print(
                f"  [INFO] Weapons table already has {count} records. "
                "Skip (use --force to override)"
            )
            return

    seeds = load_json_file(SEEDS_DIR / "seed_weapons.json")
    if not seeds:
        print("  [WARNING]  No weapon seeds found")
        return

    if isinstance(seeds, dict) and "item" in seeds:
        records = seeds.get("item", [])
    else:
        records = seeds if isinstance(seeds, list) else []

    for weapon in records:
        try:
            insert_weapon(cursor, weapon)
            print(f"  [CHECK] {weapon.get('name')}")
        except ValueError as e:
            print(f"  [ERROR]  Invalid weapon quick_rules: {weapon.get('name')} - {e}")
            raise
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {weapon.get('name')} - {e}")
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM weapons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} weapons")


def populate_items(cursor, conn, force=False):
    """Populate items table from seed_items.json."""
    print("\n[ITEMS] Loading items...")
    if force:
        cursor.execute("DELETE FROM items")
    else:
        cursor.execute("SELECT COUNT(*) FROM items")
        if cursor.fetchone()[0] > 0:
            print("  [INFO] Items table already has data. Skip (use --force to override)")
            return

    seeds = load_json_file(SEEDS_DIR / "seed_items.json")
    for item in seeds:
        cursor.execute(
            """INSERT INTO items (name, value_gp, category, description)
               VALUES (?, ?, ?, ?)""",
            (
                item.get("name"),
                item.get("value_gp", 0),
                item.get("category"),
                item.get("description"),
            ),
        )
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} items")


def populate_loot_bundles(cursor, conn, force=False):
    """Populate loot_bundle table from seed_loot_bundles.json."""
    print("\n[LOOT] Loading loot bundles...")
    try:
        cursor.execute("SELECT COUNT(*) FROM loot_bundle")
        count = cursor.fetchone()[0]
    except sqlite3.OperationalError as e:
        raise RuntimeError("Failed to read the loot_bundle table") from e

    if count > 0 and not force:
        print(
            f"  [INFO] Loot bundle table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    if force:
        cursor.execute("DELETE FROM loot_bundle")

    seeds = load_json_file(SEEDS_DIR / "seed_loot_bundles.json")
    if not seeds:
        print("  [WARNING] No loot bundle seeds found")
        return

    for bundle in seeds:
        cursor.execute(
            """INSERT INTO loot_bundle (id, name, gold, contents)
               VALUES (?, ?, ?, ?)""",
            (
                bundle.get("id"),
                bundle.get("name"),
                bundle.get("gold", 0),
                serialize_for_db(bundle.get("contents", [])),
            ),
        )
        print(f"  [CHECK] {bundle.get('name')}")

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM loot_bundle")
    print(f"  [OK] Loaded {cursor.fetchone()[0]} loot bundles")


def populate_encounters(cursor, conn, force=False):
    """Populate encounter table from seed_encounters.json."""
    print("\n[ENCOUNTER] Loading encounters...")
    cursor.execute("SELECT COUNT(*) FROM encounter")
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        print(
            f"  [INFO] Encounter table already has {count} records. Skip (use --force to override)"
        )
        return

    if force:
        cursor.execute("DELETE FROM encounter")
        print("  [TRASH]  Cleared existing encounter data")

    seeds = load_json_file(SEEDS_DIR / "seed_encounters.json")
    if not seeds:
        print("  [WARNING]  No encounter seeds found")
        return

    for encounter in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO encounter (id, name, units, active_index)
                VALUES (?, ?, ?, ?)
            """,
                (
                    encounter.get("id"),
                    encounter.get("name"),
                    serialize_for_db(encounter.get("units", [])),
                    encounter.get("active_index"),
                ),
            )
            print(f"  [CHECK] {encounter.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {encounter.get('name')} - {e}")
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM encounter")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} encounters")


def populate_players(cursor, conn, force=False):
    """Populate players table from seed_players.json."""
    print("\n[HERO] Loading players...")
    cursor.execute("SELECT COUNT(*) FROM players")
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        print(f"  [INFO] Players table already has {count} records. Skip (use --force to override)")
        return

    if force:
        cursor.execute("DELETE FROM players")
        print("  [TRASH]  Cleared existing players data")

    seeds = load_json_file(SEEDS_DIR / "seed_players.json")
    if not seeds:
        print("  [WARNING]  No player seeds found")
        return

    for player in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO players
                (id, name, child_name, class, subclass, level, ancestry, background,
                 sizes, alignment, creature_type, ac, hp, speed, abilities, saving_throws, skills,
                 passive_perception, damage_resistances, damage_immunities, damage_vulnerabilities,
                 condition_immunities, senses, languages, features,
                 initiative, proficiency_bonus, spell_attack_bonus, spell_save_dc,
                 max_spell_slots, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    player.get("id"),
                    player.get("name"),
                    player.get("child_name"),
                    player.get("class"),
                    player.get("subclass"),
                    player.get("level"),
                    player.get("ancestry"),
                    player.get("background"),
                    serialize_for_db(player.get("sizes")),
                    player.get("alignment"),
                    serialize_for_db(player.get("creature_type")),
                    serialize_for_db(player.get("ac")),
                    serialize_for_db(player.get("hp")),
                    serialize_for_db(player.get("speed")),
                    serialize_for_db(player.get("abilities")),
                    serialize_for_db(player.get("saving_throws")),
                    serialize_for_db(player.get("skills")),
                    player.get("passive_perception"),
                    serialize_for_db(player.get("damage_resistances")),
                    serialize_for_db(player.get("damage_immunities")),
                    serialize_for_db(player.get("damage_vulnerabilities")),
                    serialize_for_db(player.get("condition_immunities")),
                    serialize_for_db(player.get("senses")),
                    serialize_for_db(player.get("languages")),
                    serialize_for_db(player.get("features")),
                    player.get("initiative"),
                    player.get("proficiency_bonus"),
                    player.get("spell_attack_bonus"),
                    player.get("spell_save_dc"),
                    serialize_for_db(player.get("max_spell_slots")),
                    player.get("notes"),
                    player.get("created_at"),
                    player.get("updated_at"),
                ),
            )
            print(f"  [CHECK] {player.get('name')}")
        except sqlite3.IntegrityError as e:
            print(f"  [WARNING]  Duplicate or error: {player.get('name')} - {e}")
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM players")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} players")


def populate_player_spells(cursor, conn, force=False):
    """Populate player_spells table from seed_player_spells.json."""
    print("\n[SPELLBOOK] Loading player spells...")
    cursor.execute("SELECT COUNT(*) FROM player_spells")
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        print(
            f"  [INFO] Player spells table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    if force:
        cursor.execute("DELETE FROM player_spells")
        print("  [TRASH]  Cleared existing player spells data")

    seeds = load_json_file(SEEDS_DIR / "seed_player_spells.json")
    if not seeds:
        print("  [WARNING]  No player spell seeds found")
        return

    for entry in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO player_spells
                (id, player_id, spell_id, added_at)
                VALUES (?, ?, ?, ?)
            """,
                (
                    entry.get("id"),
                    entry.get("player_id"),
                    entry.get("spell_id"),
                    entry.get("added_at"),
                ),
            )
            print(f"  [CHECK] Player {entry.get('player_id')} spell {entry.get('spell_id')}")
        except sqlite3.IntegrityError as e:
            print(
                f"  [WARNING]  Duplicate or error: player_id={entry.get('player_id')} "
                f"spell_id={entry.get('spell_id')} - {e}"
            )
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM player_spells")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} player spells")


def populate_player_weapons(cursor, conn, force=False):
    """Populate player_weapons table from seed_player_weapons.json."""
    print("\n[ARMS] Loading player weapons...")
    cursor.execute("SELECT COUNT(*) FROM player_weapons")
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        print(
            f"  [INFO] Player weapons table already has {count} records. "
            "Skip (use --force to override)"
        )
        return

    if force:
        cursor.execute("DELETE FROM player_weapons")
        print("  [TRASH]  Cleared existing player weapons data")

    seeds = load_json_file(SEEDS_DIR / "seed_player_weapons.json")
    if not seeds:
        print("  [WARNING]  No player weapon seeds found")
        return

    for entry in seeds:
        try:
            cursor.execute(
                """
                INSERT INTO player_weapons
                (id, player_id, weapon_id, added_at)
                VALUES (?, ?, ?, ?)
            """,
                (
                    entry.get("id"),
                    entry.get("player_id"),
                    entry.get("weapon_id"),
                    entry.get("added_at"),
                ),
            )
            print(f"  [CHECK] Player {entry.get('player_id')} weapon {entry.get('weapon_id')}")
        except sqlite3.IntegrityError as e:
            print(
                f"  [WARNING]  Duplicate or error: player_id={entry.get('player_id')} "
                f"weapon_id={entry.get('weapon_id')} - {e}"
            )
            raise

    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM player_weapons")
    final_count = cursor.fetchone()[0]
    print(f"  [OK] Loaded {final_count} player weapons")


def _populate_dungeon_blob_table(cursor, conn, table, seed_file, label, force=False):
    """Load one of the three dungeon tables, each of which is a key plus a JSON data blob."""
    print(f"\n[DUNGEON] Loading {label}...")
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        print(f"  [INFO] {table} already has {count} records. Skip (use --force to override)")
        return

    if force:
        cursor.execute(f"DELETE FROM {table}")

    seeds = load_json_file(SEEDS_DIR / seed_file)
    if not seeds:
        print(f"  [INFO] No {seed_file}; nothing to load.")
        return

    for record in seeds:
        columns = list(record.keys())
        placeholders = ", ".join("?" for _ in columns)
        values = [serialize_for_db(record[column]) for column in columns]
        cursor.execute(
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})",
            values,
        )

    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} {label}")


def populate_dungeons(cursor, conn, force=False):
    """Populate dungeon content and its saved map/fog/at-the-table state.

    Dungeons became seed-backed so that authored content survives an init_database.py rebuild;
    see docs/areas/dungeons.md. The five tables load in foreign-key order.
    """
    _populate_dungeon_blob_table(cursor, conn, "dungeons", "seed_dungeons.json", "dungeons", force)
    _populate_dungeon_blob_table(
        cursor, conn, "map_layout", "seed_map_layouts.json", "map layouts", force
    )
    _populate_dungeon_blob_table(
        cursor, conn, "map_session_state", "seed_map_session_state.json", "map session state", force
    )
    populate_revealed_cells(cursor, conn, force)
    populate_at_the_table(cursor, conn, force)


def populate_revealed_cells(cursor, conn, force=False):
    """Restore fog-of-war state from seed_revealed_cells.json."""
    print("\n[FOG] Loading revealed cells...")
    cursor.execute("SELECT COUNT(*) FROM revealed_cells")
    count = cursor.fetchone()[0]
    if count > 0 and not force:
        print(f"  [INFO] revealed_cells already has {count} records. Skip (use --force to override)")
        return
    if force:
        cursor.execute("DELETE FROM revealed_cells")

    seeds = load_json_file(SEEDS_DIR / "seed_revealed_cells.json")
    for cell in seeds:
        cursor.execute(
            "INSERT INTO revealed_cells (dungeon_id, x, y) VALUES (?, ?, ?)",
            (cell.get("dungeon_id"), cell.get("x"), cell.get("y")),
        )
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} revealed cells")


def populate_at_the_table(cursor, conn, force=False):
    """Restore the selected dungeon pointer from seed_at_the_table.json."""
    print("\n[TABLE] Loading at-the-table state...")
    cursor.execute("SELECT COUNT(*) FROM at_the_table")
    count = cursor.fetchone()[0]
    if count > 0 and not force:
        print("  [INFO] at_the_table already has a row. Skip (use --force to override)")
        return
    if force:
        cursor.execute("DELETE FROM at_the_table")

    seeds = load_json_file(SEEDS_DIR / "seed_at_the_table.json")
    for state in seeds:
        cursor.execute(
            "INSERT INTO at_the_table (lock, dungeon_id) VALUES (?, ?)",
            (state.get("lock", 1), state.get("dungeon_id")),
        )
    conn.commit()
    print(f"  [OK] Loaded {len(seeds)} at-the-table rows")


def clear_all_tables(cursor, tables_to_clear):
    """Clear only the selected tables; callers own the surrounding transaction."""
    allowed_tables = {table for group in SEED_GROUPS.values() for table in group["tables"]}
    if not tables_to_clear or any(table not in allowed_tables for table in tables_to_clear):
        raise ValueError("Force clear requires a non-empty list of known seed tables")

    print("\n[FORCE] Clearing selected tables in dependency order...")
    for table in tables_to_clear:
        cursor.execute(f"DELETE FROM {table}")
        print(f"  [TRASH]  Cleared {table}")

    cursor.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'")
    if cursor.fetchone():
        cursor.executemany(
            "DELETE FROM sqlite_sequence WHERE name = ?",
            [(table,) for table in tables_to_clear],
        )
        print("  [OK] Reset selected sqlite_sequence counters")


def main():
    parser = argparse.ArgumentParser(description="Populate database from seed JSON files")
    parser.add_argument("--abilities", action="store_true", help="Load only abilities")
    parser.add_argument("--spells", action="store_true", help="Load only spells")
    parser.add_argument("--conditions", action="store_true", help="Load only conditions")
    parser.add_argument("--monsters", action="store_true", help="Load only monsters")
    parser.add_argument("--damage-types", action="store_true", help="Load only damage types")
    parser.add_argument(
        "--weapon-properties", action="store_true", help="Load only weapon properties"
    )
    parser.add_argument("--weapons", action="store_true", help="Load only weapons")
    parser.add_argument("--items", action="store_true", help="Load only items")
    parser.add_argument("--loot-bundles", action="store_true", help="Load only loot bundles")
    parser.add_argument("--encounters", action="store_true", help="Load only encounters")
    parser.add_argument("--npcs", action="store_true", help="Load only NPCs")
    parser.add_argument("--players", action="store_true", help="Load only players")
    parser.add_argument(
        "--player-spells", action="store_true", help="Load only player spell assignments"
    )
    parser.add_argument(
        "--player-weapons", action="store_true", help="Load only player weapon assignments"
    )
    parser.add_argument(
        "--dungeons",
        action="store_true",
        help="Load only dungeons, map layouts and map session state",
    )
    parser.add_argument(
        "--loom",
        action="store_true",
        help="Load only the loom demo tapestry (test/playtest fixture, not loaded by default)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace only the selected seed groups; fail without changing data on any error",
    )

    args = parser.parse_args()
    # If no specific tables selected, load all canonical seed groups except Loom.
    # --loom is never part of "load all": the loom demo tapestry is a frozen
    # test/playtest fixture, not canonical campaign data (see docs/areas/loom.md).
    load_all = not any(getattr(args, group["argument"]) for group in SEED_GROUPS.values())
    selected_groups = [
        name
        for name, group in SEED_GROUPS.items()
        if (load_all and name != "loom") or (not load_all and getattr(args, group["argument"]))
    ]
    selected_tables = list(
        dict.fromkeys(table for name in selected_groups for table in SEED_GROUPS[name]["tables"])
    )

    print("=" * 60)
    print("PHASE 2: DATABASE SEEDING")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"[ERROR] Database not found: {DB_PATH}")
        return False

    conn = None
    global _PRELOADED_SEEDS
    try:
        # Parse and validate every selected file before opening a write transaction.
        _PRELOADED_SEEDS = _preload_seed_inputs(selected_groups)
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        existing_tables = {
            row[0]
            for row in cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        }
        missing_tables = [table for table in selected_tables if table not in existing_tables]
        if missing_tables:
            raise RuntimeError(
                "Database schema is missing selected seed table(s): " + ", ".join(missing_tables)
            )

        # Keep old values and new values in one transaction. Foreign keys are
        # checked explicitly before commit so selected catalog replacement can
        # preserve junction/state rows whose referenced IDs remain available.
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.execute("BEGIN")
        population_conn = _DeferredCommitConnection(conn)

        if args.force:
            print("\n[WARNING]  FORCE MODE: Replacing selected seed groups only\n")
            clear_all_tables(cursor, selected_tables)

        if "abilities" in selected_groups:
            populate_abilities(cursor, population_conn)
        if "damage_types" in selected_groups:
            populate_damage_types(cursor, population_conn)
        if "weapon_properties" in selected_groups:
            populate_weapon_properties(cursor, population_conn)
        if "weapons" in selected_groups:
            populate_weapons(cursor, population_conn)
        if "items" in selected_groups:
            populate_items(cursor, population_conn)
        if "monsters" in selected_groups:
            populate_monsters(cursor, population_conn)
        if "npcs" in selected_groups:
            populate_npcs(cursor, population_conn)
        if "spells" in selected_groups:
            populate_spells(cursor, population_conn)
        if "conditions" in selected_groups:
            populate_conditions(cursor, population_conn)
        if "encounters" in selected_groups:
            populate_encounters(cursor, population_conn)
        if "loot_bundles" in selected_groups:
            populate_loot_bundles(cursor, population_conn)
        if "players" in selected_groups:
            populate_players(cursor, population_conn)
        if "player_spells" in selected_groups:
            populate_player_spells(cursor, population_conn)
        if "player_weapons" in selected_groups:
            populate_player_weapons(cursor, population_conn)
        if "dungeons" in selected_groups:
            populate_dungeons(cursor, population_conn)
        if "loom" in selected_groups:
            populate_loom_threads(cursor, population_conn)
            populate_loom_sessions(cursor, population_conn)
            populate_loom_nodes(cursor, population_conn)

        foreign_key_errors = cursor.execute("PRAGMA foreign_key_check").fetchall()
        if foreign_key_errors:
            raise sqlite3.IntegrityError(
                f"Seed operation would leave foreign-key violations: {foreign_key_errors[:5]}"
            )
        conn.commit()
        conn.execute("PRAGMA foreign_keys = ON")

        print("\n" + "=" * 60)
        print("[OK] PHASE 2 COMPLETE!")
        print("=" * 60)
        print("\nNext Steps:")
        print("  1. Edit seed files in data/seeds/ to add more data")
        print("  2. Force-reload only the intended groups against a disposable or backed-up database")
        print("  3. Build frontend and run FastAPI server")
        print("\nSeed files are read from data/seeds/.")
        print("The optional Loom demo group is excluded from the default load; select it with --loom.")

        return True

    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback

        traceback.print_exc()
        return False
    finally:
        _PRELOADED_SEEDS = None
        if conn is not None:
            if conn.in_transaction:
                conn.rollback()
            conn.execute("PRAGMA foreign_keys = ON")
            conn.close()


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
