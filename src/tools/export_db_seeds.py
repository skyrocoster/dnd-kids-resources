#!/usr/bin/env python3
"""Export every user table in the live database into JSON files under data/seeds.

This is the backup half of the two-phase workflow: `backend/database/init_database.py` (create
schema) → `backend/database/seed_database.py` (load JSON) → this exporter (dump the database back
to JSON). `backend/database/init_database.py` drops every table, so authored content that is not
exported here is lost on the next rebuild.

**Every user table is exported from the live database itself.** The exporter introspects
`sqlite_master` for the list of tables (system tables such as `sqlite_sequence` are excluded) and
`PRAGMA table_info` for each table's columns, so a table added by a migration — or any drift
between `backend/database/init_database.py`, `data/generated/export_schema.json`, and the live
database — can no longer silently miss the backup. Table/column/value truth comes from the
database; `src/tools/generate_export_schema.py` is no longer involved in exporting.

Seed-file conventions (kept so `backend/database/seed_database.py` can reload the files):
- File names: the `SEED_FILENAMES` mapping keeps the historical per-table names (e.g. table
  `loot_bundle` -> `seed_loot_bundles.json`, plural). Any table without an entry uses
  `seed_<table>.json`. Unrecognized files already under `data/seeds/` are left untouched.
- Row order: the `STABLE_ORDER_BY` mapping keeps the historical per-table ordering when its
  columns still exist; otherwise rows are ordered by the table's primary key columns, which is
  also stable.
- JSON-as-text columns: `JSON_COLUMNS` columns are parsed back into JSON so the seed files stay
  readable and diffable. Parsing is per live table (a listed column that no longer exists in the
  live database is ignored, not an error). Any other SQLite value is written as-is, so nothing is
  transformed lossily.

Before a write replaces different existing content, the old file is copied to a dated directory
under `data/archive/` (e.g. `data/archive/export_db_seeds_20260927T120000Z/`). This preserves
seed-only historical data — such as the old `spells.categories` field or the loom fixtures — when
the live database no longer holds it. Empty tables are always exported as empty arrays; the
pre-overwrite backup makes that safe. Nothing is ever silently skipped or deleted.

The database is opened read-only (`mode=ro`); exporting never writes to it.

Usage:
  docker compose exec backend python src/tools/export_db_seeds.py
  docker compose exec backend python src/tools/export_db_seeds.py --tables abilities,conditions,monsters
  docker compose exec backend python src/tools/export_db_seeds.py --dry-run
"""

import argparse
import json
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

sys.path.insert(0, str(Path(__file__).parent))
from backend.app.db import DB_PATH  # noqa: E402

SEEDS_DIR = ROOT / "data" / "seeds"
ARCHIVE_DIR = ROOT / "data" / "archive"

# Historical seed-file names per table (seed_database.py loads these exact files). Tables absent
# from this mapping are exported to `seed_<table>.json`.
SEED_FILENAMES = {
    "abilities": "seed_abilities.json",
    "conditions": "seed_conditions.json",
    "damage_types": "seed_damage_types.json",
    "dungeons": "seed_dungeons.json",
    "encounter": "seed_encounters.json",
    "items": "seed_items.json",
    "loom_nodes": "seed_loom_nodes.json",
    "loom_sessions": "seed_loom_sessions.json",
    "loom_threads": "seed_loom_threads.json",
    "loot_bundle": "seed_loot_bundles.json",
    "map_layout": "seed_map_layouts.json",
    "map_session_state": "seed_map_session_state.json",
    "revealed_cells": "seed_revealed_cells.json",
    "at_the_table": "seed_at_the_table.json",
    "monsters": "seed_monsters.json",
    "npcs": "seed_npcs.json",
    "player_spells": "seed_player_spells.json",
    "player_weapons": "seed_player_weapons.json",
    "players": "seed_players.json",
    "spells": "seed_spells.json",
    "weapon_properties": "seed_weapon_properties.json",
    "weapons": "seed_weapons.json",
}

# Stable row order per table so the exported file stays stable between runs and diffs stay
# reviewable. Each name must exist in the live table's columns (checked at export time);
# otherwise the table falls back to primary-key order.
STABLE_ORDER_BY = {
    "abilities": "id",
    "conditions": "title",
    "damage_types": "id",
    "dungeons": "id",
    "encounter": "name",
    "items": "name",
    "loom_nodes": "id",
    "loom_sessions": "id",
    "loom_threads": "id",
    "loot_bundle": "name",
    "map_layout": "dungeon_id",
    "map_session_state": "dungeon_id",
    "revealed_cells": "dungeon_id, x, y",
    "at_the_table": "lock",
    "monsters": "name",
    "npcs": "id",
    "player_spells": "player_id, added_at",
    "player_weapons": "player_id, added_at",
    "players": "name",
    "spells": "name",
    "weapon_properties": "code",
    "weapons": "name",
    "quests": "id",
    "map_knowledge": "dungeon_id",
}

# Columns holding JSON documents, which are unpacked so the seed files stay readable and diffable
# rather than storing escaped JSON inside a string. Columns are checked against the live table at
# export time: a listed column that the live database does not have is skipped for that table (the
# live database is the truth), so a stale entry can never block or corrupt an export. `categories`
# is kept for the legacy 20-column spells schema in tests; the live spells table has no such
# column, so the hand-authored category values stay seed-only and are preserved by the archive.
JSON_COLUMNS = {
    "conditions": ["details"],
    "dungeons": ["data"],
    "encounter": ["units"],
    "loot_bundle": ["contents"],
    "map_layout": ["data"],
    "map_session_state": ["data"],
    "map_knowledge": ["data"],
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
        "categories", "damage", "healing", "higher_levels", "casting_times", "components",
        "attacks", "area_of_effect",
    ],
    "weapons": [
        "resist", "property", "focus", "spells", "attack", "recharge", "light", "entries",
        "modify_speed", "ability",
    ],
    "quests": ["reward", "objectives", "details"],
}


def discover_user_tables(cursor) -> list[str]:
    """Return every user table in the live database, sorted.

    The database is the source of truth for what gets backed up: anything in sqlite_master of
    type 'table' that is not a SQLite system table is exported. Views are not tables and are
    skipped.
    """
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    return sorted(row[0] for row in cursor.fetchall())


def table_columns(cursor, table_name: str) -> list[str]:
    """Return the live table's column names, in declared order."""
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    return [row[1] for row in cursor.fetchall()]


def table_primary_key(cursor, table_name: str) -> list[str]:
    """Return the live table's primary-key column names in key order (may be empty)."""
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    pk = [(row[5], row[1]) for row in cursor.fetchall() if row[5]]
    return [column for _, column in sorted(pk)]


def resolve_order_by(cursor, table_name: str, columns: list[str]) -> str | None:
    """Pick a stable ORDER BY expression for a table's export.

    STABLE_ORDER_BY is used when every name it references is a live column; otherwise the table's
    primary key. When neither is available the row order is whatever SQLite returns; nothing is
    skipped because of a missing sort key.
    """
    order_by = STABLE_ORDER_BY.get(table_name)
    if order_by:
        names = [part.strip() for part in order_by.split(",")]
        if all(name in columns for name in names):
            return order_by
    pk = table_primary_key(cursor, table_name)
    if pk:
        return ", ".join(pk)
    return None


def parse_json_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def transform_record(record: dict, table_name: str, columns: list[str]) -> dict:
    for column in JSON_COLUMNS.get(table_name, []):
        if column in columns:
            record[column] = parse_json_value(record.get(column))
    return record


def fetch_rows(cursor, table_name: str, order_by: str | None) -> list[dict]:
    """Read the whole table, read-only, as dicts keyed by live column names."""
    statement = f'SELECT * FROM "{table_name}"'
    if order_by:
        statement += f" ORDER BY {order_by}"
    try:
        cursor.execute(statement)
    except sqlite3.OperationalError as exc:
        # Deliberately fatal: a half-exported backup is worse than a failed one.
        raise SystemExit(f"Failed to export {table_name}: {exc}") from exc
    names = [description[0] for description in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def export_table(cursor, table_name: str, schema=None, dry_run=False, allow_empty=False):
    """Export one live table into its seed file, archiving a differing prior file first.

    `schema` maps table name -> live column names; it is introspected from the database when not
    supplied. `allow_empty` is kept for backwards compatibility and does nothing: empty tables are
    always exported, and any seed file whose content changes is archived first.
    """
    if schema is None:
        schema = {table: table_columns(cursor, table) for table in discover_user_tables(cursor)}
    columns = schema[table_name]
    order_by = resolve_order_by(cursor, table_name, columns)
    rows = fetch_rows(cursor, table_name, order_by)
    transformed = [transform_record(row, table_name, columns) for row in rows]

    filename = SEED_FILENAMES.get(table_name, f"seed_{table_name}.json")
    file_path = SEEDS_DIR / filename
    content = json.dumps(transformed, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        note = ""
        if file_path.exists():
            try:
                existing = file_path.read_text(encoding="utf-8")
            except OSError:
                existing = None
            if existing != content:
                note = " (existing file would be archived first)"
        print(f"[DRY RUN] Would write {file_path} ({len(transformed)} entries){note}")
        return

    if file_path.exists():
        try:
            existing = file_path.read_text(encoding="utf-8")
        except OSError:
            existing = None
        if existing != content:
            archive_seed_file(file_path)

    with file_path.open("w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {file_path} ({len(transformed)} entries)")


def archive_seed_file(file_path: Path) -> None:
    """Copy a seed file into a dated archive directory before its content is replaced.

    Only called for files whose content is about to change, so nothing is duplicated for no
    reason. The copy is the pre-overwrite record of any seed-only historical data.

    A seed file can be archived twice within the same UTC second (repeated exports, or two
    content changes of one file). `mkdir` without `exist_ok` claims a fresh timestamped
    directory (or a `_2`, `_3`, ... sibling when the first is already claimed), so the copy
    target never exists yet and no earlier archived copy can ever be overwritten.
    """
    base = datetime.now(timezone.utc).strftime("export_db_seeds_%Y%m%dT%H%M%SZ")
    archive_dir = ARCHIVE_DIR / base
    counter = 1
    while True:
        try:
            archive_dir.mkdir(parents=True)
            break
        except FileExistsError:
            counter += 1
            archive_dir = ARCHIVE_DIR / f"{base}_{counter}"
    target = archive_dir / file_path.name
    shutil.copy2(file_path, target)
    print(f"[ARCHIVED] {file_path} -> {target}")


def parse_table_list(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def open_readonly_db():
    """Open the database read-only; the exporter must never write to it."""
    path = DB_PATH.as_posix()
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True)


def main():
    parser = argparse.ArgumentParser(description="Export every user table in the database to data/seeds")
    parser.add_argument(
        "--tables",
        type=parse_table_list,
        help="Comma-separated subset of live tables to export (default: all of them)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show actions without writing files")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Accepted for backwards compatibility; empty tables are now always exported, and any "
        "seed file whose content changes is archived under data/archive/ before the overwrite",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    with open_readonly_db() as conn:
        cursor = conn.cursor()
        live_tables = discover_user_tables(cursor)
        schema = {table: table_columns(cursor, table) for table in live_tables}

        if args.tables:
            unknown = [table for table in args.tables if table not in live_tables]
            if unknown:
                raise SystemExit(
                    "Requested table(s) not present in the live database: "
                    + ", ".join(unknown) + "\n"
                    "Live user tables: " + ", ".join(live_tables)
                )
        requested = args.tables or live_tables

        for table_name in requested:
            export_table(cursor, table_name, schema, dry_run=args.dry_run,
                         allow_empty=args.allow_empty)

    if args.dry_run:
        print("\nDry run complete. No files were written or archived.")
    else:
        print("\nExport complete.")
        print(f"Seed files are written to: {SEEDS_DIR}")


if __name__ == "__main__":
    main()
