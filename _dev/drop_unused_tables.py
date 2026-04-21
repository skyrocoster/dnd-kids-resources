#!/usr/bin/env python3
"""Drop legacy database tables from dnd_kids_resources.db.

This script removes the following tables if they exist:
- wild_shapes
- spells_staging
- icons

Usage:
  python _dev/drop_unused_tables.py
  python _dev/drop_unused_tables.py --dry-run
  python _dev/drop_unused_tables.py --db path/to/dnd_kids_resources.db
"""

import argparse
import sqlite3
from pathlib import Path

DEFAULT_DB = Path(__file__).parent.parent / "dnd_kids_resources.db"
LEGACY_TABLES = ["wild_shapes", "spells_staging", "icons"]


def parse_args():
    parser = argparse.ArgumentParser(description="Drop legacy database tables from dnd_kids_resources.db")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to the SQLite database file")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without modifying the database")
    return parser.parse_args()


def get_existing_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}


def drop_tables(conn, tables, dry_run=False):
    cursor = conn.cursor()
    existing_tables = get_existing_tables(cursor)
    dropped = []
    skipped = []

    for table in tables:
        if table in existing_tables:
            if dry_run:
                print(f"[DRY RUN] Would drop table: {table}")
                dropped.append(table)
            else:
                print(f"Dropping table: {table}")
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                dropped.append(table)
        else:
            skipped.append(table)
            print(f"Table not found, skipping: {table}")

    if not dry_run:
        conn.commit()
    return dropped, skipped


def main():
    args = parse_args()
    db_path = args.db

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    print(f"Using database: {db_path}")
    print(f"Legacy tables to remove: {', '.join(LEGACY_TABLES)}")
    if args.dry_run:
        print("Dry run enabled: no changes will be written.")

    with sqlite3.connect(str(db_path)) as conn:
        dropped, skipped = drop_tables(conn, LEGACY_TABLES, dry_run=args.dry_run)

    print("\nSummary:")
    print(f"  Dropped: {len(dropped)}")
    print(f"  Skipped: {len(skipped)}")
    if args.dry_run:
        print("Dry run complete. No changes were made.")


if __name__ == "__main__":
    main()
