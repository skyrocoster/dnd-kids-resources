#!/usr/bin/env python3
"""
Migration: Load conditions from JSON into database.
Adds title, icon, level, explanation, and details (as JSON) to conditions table.
"""

import sqlite3
import json
import sys
from pathlib import Path

# Fix Windows console encoding for emoji
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Setup paths
BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")
JSON_PATH = str(BASE_DIR / "data" / "conditions.json")


def migrate_conditions():
    """Load conditions from JSON and populate database."""

    # Load JSON data
    print(f"📖 Loading conditions from: {JSON_PATH}")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        conditions_data = json.load(f)

    print(f"✓ Loaded {len(conditions_data)} conditions from JSON")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Drop existing conditions table and recreate with new schema
    print("\n🔄 Recreating conditions table...")
    cursor.execute("DROP TABLE IF EXISTS conditions;")

    cursor.execute("""
        CREATE TABLE conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            explanation TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Insert each condition
    print("📝 Inserting conditions...")
    for condition in conditions_data:
        title = condition.get('title', '').lower()
        icon = condition.get('icon', '')
        explanation = condition.get('explanation', '')
        details = condition.get('details', [])

        # Store details as JSON
        details_json = json.dumps(details)

        cursor.execute("""
            INSERT INTO conditions 
            (title, icon, explanation, details)
            VALUES (?, ?, ?, ?)
        """, (title, icon, explanation, details_json))

        print(f"  ✓ {title}")

    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) as count FROM conditions;")
    result = cursor.fetchone()
    count = result['count']

    conn.close()

    print(f"\n✅ Migration complete! {count} conditions in database")


if __name__ == '__main__':
    try:
        migrate_conditions()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
