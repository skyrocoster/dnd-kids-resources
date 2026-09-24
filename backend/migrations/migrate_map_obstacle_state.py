#!/usr/bin/env python3
"""Migrate map obstacle state to the new structured format.

Performs a one-time transition of map layouts from flat obstacle/DC fields to the
structured obstacles model. Resets all obstacle state to authored defaults, removes
legacy DC fields, and clears session state and knowledge records.

Usage:
    python -m backend.migrations.migrate_map_obstacle_state --db database.db [--seeds data/seeds]
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict

# Authored default obstacle state per fixture type
DEFAULT_FIXTURE_STATE = {
    "obstacles": {
        "concealment": {
            "armed": False,
        },
        "lock": {
            "armed": False,
            "shown": False,
        },
        "trap": {
            "armed": False,
            "shown": False,
        },
    },
}


def serialize_for_db(value: Any) -> Any:
    """Serialize Python value for SQLite storage."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def deserialize_from_db(value: Any) -> Any:
    """Deserialize SQLite value to Python object."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    return value


def reset_fixture_obstacles(fixture: Dict[str, Any]) -> None:
    """Reset obstacle state in a single fixture to authored defaults.

    Removes all DC fields (breakDc, pickDc, hiddenDc, searchDc) and resets
    obstacles to their default state. Ensures door.open is false.
    Preserves all other fixture content.
    """
    # Remove legacy flat DC fields from the fixture
    for dc_field in ["breakDc", "pickDc", "hiddenDc", "searchDc"]:
        fixture.pop(dc_field, None)

    # Set obstacles to default state
    fixture["obstacles"] = json.loads(
        json.dumps(DEFAULT_FIXTURE_STATE["obstacles"], ensure_ascii=False)
    )

    # For doors, ensure open is false
    if fixture.get("door_id") is not None:
        fixture["open"] = False


def reset_layout_obstacles(layout: Dict[str, Any]) -> None:
    """Reset all obstacle state in a map layout.

    Processes doors, stairs, props, and portals, resetting each to authored
    defaults and removing legacy DC fields.
    """
    for fixture_list_name in ["doors", "stairs", "props", "portals"]:
        if fixture_list_name in layout:
            for fixture in layout[fixture_list_name]:
                reset_fixture_obstacles(fixture)


def migrate_database(db_path: str) -> None:
    """Migrate map obstacle state in a SQLite database.

    Processes all map_layout records, resets obstacle state, and deletes
    map_session_state records.
    """
    db_path = Path(db_path)
    if not db_path.exists():
        print(f"[ERROR] Database not found: {db_path}")
        sys.exit(1)

    print(f"\n[MIGRATE] Opening database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # Migrate map_layout records
        cursor.execute("SELECT dungeon_id, data FROM map_layout")
        layouts = cursor.fetchall()

        if not layouts:
            print("[INFO] No map_layout records found")
        else:
            for dungeon_id, data_str in layouts:
                try:
                    layout = json.loads(data_str)
                    reset_layout_obstacles(layout)
                    updated_data = serialize_for_db(layout)
                    cursor.execute(
                        "UPDATE map_layout SET data = ? WHERE dungeon_id = ?",
                        (updated_data, dungeon_id),
                    )
                    print(f"  [OK] Migrated dungeon {dungeon_id}")
                except (json.JSONDecodeError, Exception) as e:
                    print(f"  [ERROR] Failed to migrate dungeon {dungeon_id}: {e}")
                    conn.rollback()
                    sys.exit(1)

            conn.commit()
            print(f"[OK] Migrated {len(layouts)} map_layout records")

        # Delete map_session_state records
        cursor.execute("DELETE FROM map_session_state")
        deleted_session = cursor.rowcount
        conn.commit()
        print(f"[OK] Deleted {deleted_session} map_session_state records")

    finally:
        conn.close()


def migrate_seed_files(seeds_dir: str) -> None:
    """Migrate map obstacle state in seed export files.

    Clears map_session_state seed exports if present.
    Reports and skips absent optional seed files.
    """
    seeds_dir = Path(seeds_dir)
    if not seeds_dir.exists():
        print(f"[WARNING] Seeds directory not found: {seeds_dir}")
        return

    print(f"\n[MIGRATE] Processing seed files in: {seeds_dir}")

    # Process map_layouts.json
    layouts_file = seeds_dir / "seed_map_layouts.json"
    if layouts_file.exists():
        try:
            with open(layouts_file, "r", encoding="utf-8") as f:
                layouts = json.load(f)

            if not isinstance(layouts, list):
                print(f"[ERROR] {layouts_file} is not a JSON array")
                sys.exit(1)

            for layout_record in layouts:
                if "data" in layout_record and isinstance(layout_record["data"], dict):
                    reset_layout_obstacles(layout_record["data"])

            with open(layouts_file, "w", encoding="utf-8") as f:
                json.dump(layouts, f, ensure_ascii=False, indent=2)
            print(f"  [OK] Migrated {len(layouts)} records in seed_map_layouts.json")
        except Exception as e:
            print(f"  [ERROR] Failed to migrate seed_map_layouts.json: {e}")
            sys.exit(1)
    else:
        print("  [INFO] seed_map_layouts.json not found; skipping")

    # Clear map_session_state.json
    session_file = seeds_dir / "seed_map_session_state.json"
    if session_file.exists():
        try:
            with open(session_file, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False)
            print("  [OK] Cleared seed_map_session_state.json")
        except Exception as e:
            print(f"  [ERROR] Failed to clear seed_map_session_state.json: {e}")
            sys.exit(1)
    else:
        print("  [INFO] seed_map_session_state.json not found; skipping")


def main():
    parser = argparse.ArgumentParser(description="Migrate map obstacle state to structured format")
    parser.add_argument(
        "--db",
        required=True,
        help="Path to SQLite database",
    )
    parser.add_argument(
        "--seeds",
        default="data/seeds",
        help="Path to seeds directory (default: data/seeds)",
    )

    args = parser.parse_args()

    migrate_database(args.db)
    migrate_seed_files(args.seeds)

    print("\n[DONE] Migration complete")


if __name__ == "__main__":
    main()
