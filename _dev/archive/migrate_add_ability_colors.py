#!/usr/bin/env python3
"""
Add color column to abilities table.
Store the hex color codes so they're part of the semantic data.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'

# Ability colors from COLORS.md
ABILITIES = {
    'str': {'name': 'Strength', 'emoji': '💪', 'color': '#c55a11'},
    'dex': {'name': 'Dexterity', 'emoji': '⚡', 'color': '#f39c12'},
    'con': {'name': 'Constitution', 'emoji': '❤️', 'color': '#e74c3c'},
    'int': {'name': 'Intelligence', 'emoji': '🧠', 'color': '#3498db'},
    'wis': {'name': 'Wisdom', 'emoji': '👁️', 'color': '#16a085'},
    'cha': {'name': 'Charisma', 'emoji': '✨', 'color': '#8e44ad'},
    'sam': {'name': 'Spell Attack Modifier', 'emoji': '✨', 'color': '#8e44ad'},
}


def migrate_add_color():
    """Add color column to abilities table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        print("Adding color column to abilities table...")

        # Create new table with color column
        cursor.execute("""
            CREATE TABLE abilities_new (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        # Migrate existing data with colors
        for code, data in ABILITIES.items():
            cursor.execute("""
                INSERT INTO abilities_new (code, name, emoji, color)
                VALUES (?, ?, ?, ?)
            """, (code, data['name'], data['emoji'], data['color']))
            print(
                f"  ✓ {code.upper():<3} {data['emoji']}  {data['name']:<25} {data['color']}")

        # Drop old table and rename new one
        cursor.execute("DROP TABLE abilities")
        cursor.execute("ALTER TABLE abilities_new RENAME TO abilities")

        conn.commit()
        conn.close()

        print("\n✓ Successfully added color column")
        print("  Database now stores: code, name, emoji, color (hex)")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    migrate_add_color()
