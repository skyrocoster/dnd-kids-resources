#!/usr/bin/env python3
"""Validate that the local demo SQLite database matches required app columns."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "dnd_kids_resources.db"

REQUIRED_COLUMNS = {
    "npcs": {
        "id",
        "name",
        "race",
        "gender",
        "background",
        "sizes",
        "alignment",
        "creature_type",
        "ac",
        "hp",
        "speed",
        "abilities",
        "saving_throws",
        "skills",
        "passive_perception",
        "damage_resistances",
        "damage_immunities",
        "damage_vulnerabilities",
        "condition_immunities",
        "senses",
        "languages",
        "features",
        "cr",
        "cr_note",
        "experience_points",
        "appearance",
        "notes",
    },
}


def _table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {row[1] for row in rows}


def main() -> int:
    if not DB_PATH.exists():
        print(f"[ERROR] Demo database not found: {DB_PATH}")
        _print_repair()
        return 1

    try:
        with sqlite3.connect(DB_PATH) as conn:
            problems: list[str] = []
            for table, required in REQUIRED_COLUMNS.items():
                actual = _table_columns(conn, table)
                if not actual:
                    problems.append(f"{table}: table is missing")
                    continue
                missing = sorted(required - actual)
                if missing:
                    problems.append(f"{table}: missing columns {', '.join(missing)}")
    except sqlite3.DatabaseError as exc:
        print(f"[ERROR] Could not inspect demo database: {exc}")
        _print_repair()
        return 1

    if problems:
        print("[ERROR] Demo database schema is stale:")
        for problem in problems:
            print(f"  - {problem}")
        _print_repair()
        return 1

    print("[OK] Demo database schema check passed.")
    return 0


def _print_repair() -> None:
    print("\nRepair from the repo root:")
    print(r"  .venv\Scripts\python.exe scripts\init_database.py")
    print(r"  .venv\Scripts\python.exe scripts\seed_database.py")
    print("\nThis rebuilds dnd_kids_resources.db from schema and seeds.")


if __name__ == "__main__":
    sys.exit(main())
