#!/usr/bin/env python3
"""
Migrate actions from data/actions.json to the database.
Creates the actions table and populates it with data from the JSON file.
"""

import sqlite3
import json
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "dnd_kids_resources.db"
ACTIONS_JSON_PATH = BASE_DIR / "data" / "actions.json"


def create_actions_table(conn):
    """Create the actions table if it doesn't exist."""
    cursor = conn.cursor()

    # Drop existing table if it exists (fresh migration)
    cursor.execute("DROP TABLE IF EXISTS actions")

    # Create new actions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            explanation TEXT,
            details TEXT NOT NULL
        )
    """)

    conn.commit()
    print("✓ Created actions table")


def migrate_actions_from_json(conn):
    """Load actions from JSON and insert into database."""

    # Read actions.json
    try:
        with open(ACTIONS_JSON_PATH, 'r', encoding='utf-8') as f:
            actions = json.load(f)
    except FileNotFoundError:
        print(f"✗ Error: {ACTIONS_JSON_PATH} not found")
        return 0
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing JSON: {e}")
        return 0

    print(f"✓ Loaded {len(actions)} actions from JSON")

    # Insert actions into database
    cursor = conn.cursor()
    inserted = 0

    for action in actions:
        title = action.get('title')
        icon = action.get('icon', '⚔️')
        level = action.get('level', 'action')
        explanation = action.get('explanation', '')

        # Extract the content text from details array
        details_list = action.get('details', [])
        details_text = ''
        if details_list and len(details_list) > 0:
            # Get the first detail's content (usually "Use when...")
            details_text = details_list[0].get('content', '')

        try:
            cursor.execute("""
                INSERT INTO actions (title, icon, level, explanation, details)
                VALUES (?, ?, ?, ?, ?)
            """, (title, icon, level, explanation, details_text))
            inserted += 1
        except sqlite3.IntegrityError as e:
            print(f"⚠ Skipped duplicate: {title} ({e})")

    conn.commit()
    print(f"✓ Inserted {inserted} actions into database")

    return inserted


def verify_migration(conn):
    """Verify the migration was successful."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM actions")
    count = cursor.fetchone()[0]

    print(f"\n✓ Verification: {count} actions in database")

    # Show first few
    cursor.execute("SELECT title, icon, level, details FROM actions LIMIT 3")
    print("\nSample actions:")
    for row in cursor.fetchall():
        print(f"  – {row[1]} {row[0]} ({row[2]})")
        print(f"    └─ {row[3]}")


if __name__ == '__main__':
    try:
        # Connect to database
        conn = sqlite3.connect(str(DB_PATH))

        # Create table
        create_actions_table(conn)

        # Migrate data
        migrate_actions_from_json(conn)

        # Verify
        verify_migration(conn)

        conn.close()
        print("\n✅ Migration complete!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
