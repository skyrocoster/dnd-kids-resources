#!/usr/bin/env python3
"""
Remove css_class column from abilities table - styling belongs in CSS, not DB.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'


def migrate_remove_css_class():
    """Remove css_class column from abilities table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        print("Removing css_class column from abilities table...")

        # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        cursor.execute("""
            CREATE TABLE abilities_new (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL
            )
        """)

        # Copy data from old table
        cursor.execute("""
            INSERT INTO abilities_new (code, name, emoji)
            SELECT code, name, emoji FROM abilities
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE abilities")
        cursor.execute("ALTER TABLE abilities_new RENAME TO abilities")

        conn.commit()
        conn.close()

        print("✓ Successfully removed css_class column")
        print("  Database now stores: code, name, emoji")
        print("  CSS handles all color/styling via .ability-{code} classes")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    migrate_remove_css_class()
