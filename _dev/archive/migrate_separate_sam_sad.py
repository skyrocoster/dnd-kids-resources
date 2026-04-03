#!/usr/bin/env python3
"""
Separate Spell Attack Modifier (SAM) from Spell Ability Modifier (SAD).
Make emoji field UNIQUE in abilities table.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'

# Updated abilities with SAM and SAD separated and unique icons
ABILITIES = {
    'str': {'name': 'Strength', 'emoji': '💪', 'color': '#c55a11'},
    'dex': {'name': 'Dexterity', 'emoji': '⚡', 'color': '#f39c12'},
    'con': {'name': 'Constitution', 'emoji': '❤️', 'color': '#e74c3c'},
    'int': {'name': 'Intelligence', 'emoji': '🧠', 'color': '#3498db'},
    'wis': {'name': 'Wisdom', 'emoji': '👁️', 'color': '#16a085'},
    'cha': {'name': 'Charisma', 'emoji': '✨', 'color': '#8e44ad'},
    'sam': {'name': 'Spell Attack Modifier', 'emoji': '🎯', 'color': '#e67e22'},
    'sad': {'name': 'Spell Ability Modifier', 'emoji': '🔮', 'color': '#9b59b6'},
}


def migrate_separate_sam_sad():
    """Separate SAM and SAD with unique icons, make emoji UNIQUE."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        print("Migrating abilities table...")
        print("  - Separating Spell Attack Modifier and Spell Ability Modifier")
        print("  - Making emoji field UNIQUE")

        # Create new table with UNIQUE constraint on emoji
        cursor.execute("""
            CREATE TABLE abilities_new (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL
            )
        """)

        # Insert all abilities
        for code, data in ABILITIES.items():
            cursor.execute("""
                INSERT INTO abilities_new (code, name, emoji, color)
                VALUES (?, ?, ?, ?)
            """, (code, data['name'], data['emoji'], data['color']))
            print(
                f"  ✓ {code:<3} {data['emoji']}  {data['name']:<30} {data['color']}")

        # Drop old table and rename new one
        cursor.execute("DROP TABLE abilities")
        cursor.execute("ALTER TABLE abilities_new RENAME TO abilities")

        conn.commit()
        conn.close()

        print("\n✓ Successfully migrated abilities")
        print("  Database schema: code (PK), name, emoji (UNIQUE), color")
        print("\nNew entries:")
        print("  sam: 🎯 Spell Attack Modifier (for attack rolls)")
        print("  sad: 🔮 Spell Ability Modifier (for DCs and ability checks)")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    migrate_separate_sam_sad()
