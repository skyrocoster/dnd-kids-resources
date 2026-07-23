#!/usr/bin/env python3
"""Export current database tables into JSON files under data/seeds.

This is the backup half of the three-phase workflow: `init_database.py` (create schema) →
`seed_database.py` (load JSON) → `export_db_seeds.py` (dump the database back to JSON).
`init_database.py` drops every table, so authored content that is not exported here is lost on
the next rebuild.

Column lists are **not** written by hand. They come from `data/generated/export_schema.json`,
generated from `init_database.py` by `scripts/generate_export_schema.py`. What stays hand-declared
below is policy — which tables are backed up, to which file, in what order — and every table in the
schema must be classified as either exported or explicitly excluded, so a new table cannot slip
through unnoticed.

Usage:
  python scripts/export_db_seeds.py
  python scripts/export_db_seeds.py --tables abilities,conditions,monsters
  python scripts/export_db_seeds.py --dry-run
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from generate_export_schema import load_manifest  # noqa: E402

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "dnd_kids_resources.db"
SEEDS_DIR = ROOT / "data" / "seeds"

# Policy, not schema: the seed file each table backs up to, and the ORDER BY that keeps the
# exported file stable between runs so diffs stay reviewable.
EXPORT_POLICY = {
    "abilities": {"file": "seed_abilities.json", "order_by": "id"},
    "conditions": {"file": "seed_conditions.json", "order_by": "title"},
    "damage_types": {"file": "seed_damage_types.json", "order_by": "id"},
    "dungeons": {"file": "seed_dungeons.json", "order_by": "id"},
    "encounter": {"file": "seed_encounters.json", "order_by": "name"},
    "items": {"file": "seed_items.json", "order_by": "name"},
    "loom_nodes": {"file": "seed_loom_nodes.json", "order_by": "id"},
    "loom_sessions": {"file": "seed_loom_sessions.json", "order_by": "id"},
    "loom_threads": {"file": "seed_loom_threads.json", "order_by": "id"},
    "loot_bundle": {"file": "seed_loot_bundles.json", "order_by": "name"},
    "map_layout": {"file": "seed_map_layouts.json", "order_by": "dungeon_id"},
    "map_session_state": {"file": "seed_map_session_state.json", "order_by": "dungeon_id"},
    "revealed_cells": {"file": "seed_revealed_cells.json", "order_by": "dungeon_id, x, y"},
    "at_the_table": {"file": "seed_at_the_table.json", "order_by": "lock"},
    "monsters": {"file": "seed_monsters.json", "order_by": "name"},
    "npcs": {"file": "seed_npcs.json", "order_by": "id"},
    "player_spells": {"file": "seed_player_spells.json", "order_by": "player_id, added_at"},
    "player_weapons": {"file": "seed_player_weapons.json", "order_by": "player_id, added_at"},
    "players": {"file": "seed_players.json", "order_by": "name"},
    "spells": {"file": "seed_spells.json", "order_by": "name"},
    "weapon_properties": {"file": "seed_weapon_properties.json", "order_by": "code"},
    "weapons": {"file": "seed_weapons.json", "order_by": "name"},
}

# Tables deliberately not backed up. Empty today; kept so that excluding a table is a recorded
# decision with a reason rather than an omission.
EXPORT_EXCLUSIONS: dict[str, str] = {}

# Columns holding JSON documents, which are unpacked so the seed files stay readable and diffable
# rather than storing escaped JSON inside a string.
JSON_COLUMNS = {
    "conditions": ["details"],
    "dungeons": ["data"],
    "encounter": ["units"],
    "loot_bundle": ["contents"],
    "map_layout": ["data"],
    "map_session_state": ["data"],
    "monsters": [
        "aliases", "sizes", "creature_type", "ac", "hp", "speed", "abilities", "saving_throws",
        "skills", "damage_resistances", "damage_immunities", "damage_vulnerabilities",
        "condition_immunities", "senses", "languages", "features",
    ],
    "npcs": [
        "sizes", "creature_type", "ac", "hp", "speed", "abilities", "saving_throws", "skills",
        "damage_resistances", "damage_immunities", "damage_vulnerabilities", "condition_immunities",
        "senses", "languages", "features", "appearance",
    ],
    "players": [
        "max_spell_slots", "sizes", "creature_type", "ac", "hp", "speed", "abilities",
        "saving_throws", "skills", "damage_resistances", "damage_immunities",
        "damage_vulnerabilities", "condition_immunities", "senses", "languages", "features",
    ],
    "spells": [
        "damage", "healing", "higher_levels", "casting_times", "components", "attacks",
        "area_of_effect",
    ],
    "weapons": [
        "resist", "property", "focus", "spells", "attack", "recharge", "light", "entries",
        "modify_speed", "ability",
    ],
}


def validate_policy(schema: dict[str, list[str]]) -> None:
    """Fail loudly when the schema and the export policy disagree.

    This is the check that the old hand-written EXPORT_DEFINITIONS could not make: a table added
    to init_database.py used to be silently absent from every backup.
    """
    classified = set(EXPORT_POLICY) | set(EXPORT_EXCLUSIONS)
    unclassified = sorted(set(schema) - classified)
    if unclassified:
        raise SystemExit(
            "Unclassified table(s) in the schema: " + ", ".join(unclassified) + "\n"
            "Add each to EXPORT_POLICY (backed up) or EXPORT_EXCLUSIONS (with a reason) "
            "in scripts/export_db_seeds.py."
        )

    unknown = sorted(classified - set(schema))
    if unknown:
        raise SystemExit(
            "Export policy names table(s) absent from the schema: " + ", ".join(unknown) + "\n"
            "Regenerate with: python scripts/generate_export_schema.py --write"
        )

    for table, columns in JSON_COLUMNS.items():
        missing = [column for column in columns if column not in schema.get(table, [])]
        if missing:
            raise SystemExit(
                f"JSON_COLUMNS lists column(s) {', '.join(missing)} that {table} does not have. "
                "Update scripts/export_db_seeds.py to match the schema."
            )


def parse_json_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def transform_record(record: dict, table_name: str) -> dict:
    for column in JSON_COLUMNS.get(table_name, []):
        record[column] = parse_json_value(record.get(column))
    return record


def fetch_rows(cursor, table_name: str, columns: list[str], order_by: str) -> list[dict]:
    column_list = ", ".join(columns)
    try:
        cursor.execute(f"SELECT {column_list} FROM {table_name} ORDER BY {order_by}")
    except sqlite3.OperationalError as exc:
        # Deliberately fatal. This used to print a warning and continue, which meant a renamed
        # column dropped an entire table from the seeds without failing the run.
        raise SystemExit(
            f"Failed to export {table_name}: {exc}\n"
            "The generated schema and the live database disagree. Diagnose with: "
            "python scripts/generate_export_schema.py --check-db"
        ) from exc
    names = [description[0] for description in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def would_destroy_existing(file_path: Path, data) -> bool:
    """True when writing would replace a populated seed file with an empty one.

    The export is a blind overwrite, so exporting from a database that has not loaded a given
    domain silently destroys that domain's seed file. The loom is the live example: its seeds are
    a frozen fixture loaded only behind `--loom`, so a routine full export from a database without
    it would wipe them.
    """
    if data:
        return False
    if not file_path.exists():
        return False
    try:
        return bool(json.loads(file_path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, OSError):
        return False


def write_json_file(file_path: Path, data, dry_run=False):
    if dry_run:
        print(f"[DRY RUN] Would write {file_path} ({len(data)} entries)")
        return
    with file_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {file_path} ({len(data)} entries)")


def export_table(
    cursor,
    table_name: str,
    dry_run=False,
    schema: dict[str, list[str]] | None = None,
    allow_empty=False,
):
    schema = schema if schema is not None else load_manifest()
    policy = EXPORT_POLICY[table_name]
    rows = fetch_rows(cursor, table_name, schema[table_name], policy["order_by"])
    transformed = [transform_record(row, table_name) for row in rows]

    file_path = SEEDS_DIR / policy["file"]
    if not allow_empty and would_destroy_existing(file_path, transformed):
        print(
            f"[SKIP] {policy['file']} kept: {table_name} is empty in the database but the seed "
            "file has data. Load it first, or pass --allow-empty to overwrite."
        )
        return
    write_json_file(file_path, transformed, dry_run=dry_run)


def parse_table_list(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def main():
    parser = argparse.ArgumentParser(description="Export database tables to data/seeds")
    parser.add_argument("--tables", type=parse_table_list, help="Comma-separated list of tables to export")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without writing files")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Permit an empty table to overwrite a populated seed file (destructive)",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    schema = load_manifest()
    validate_policy(schema)

    SEEDS_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(str(DB_PATH)) as conn:
        cursor = conn.cursor()
        requested = args.tables or list(EXPORT_POLICY.keys())

        for table_name in requested:
            if table_name not in EXPORT_POLICY:
                raise ValueError(
                    f"Unknown or non-exported table: {table_name}. "
                    f"Known: {', '.join(sorted(EXPORT_POLICY))}"
                )
            export_table(
                cursor,
                table_name,
                dry_run=args.dry_run,
                schema=schema,
                allow_empty=args.allow_empty,
            )

    print("\nExport complete.")
    print(f"Seed files are written to: {SEEDS_DIR}")


if __name__ == "__main__":
    main()
