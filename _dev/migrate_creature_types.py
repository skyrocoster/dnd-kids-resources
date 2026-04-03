#!/usr/bin/env python3
"""
Migration: Create creature_types table with emoji and color metadata.
"""

import sqlite3
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

# Standard D&D 5e creature types with evocative colors and emojis
CREATURE_TYPES = [
    ("beast", "🦁", "#8B4513"),
    ("humanoid", "👤", "#4472C4"),
    ("dragon", "🐉", "#FF6B35"),
    ("undead", "💀", "#6B5B95"),
    ("elemental", "⚡", "#FFD700"),
    ("fey", "🧚", "#FF69B4"),
    ("giant", "👹", "#DC143C"),
    ("goblinoid", "👺", "#228B22"),
    ("monstrosity", "👹", "#8B0000"),
    ("ooze", "💧", "#00CED1"),
    ("plant", "🌿", "#32CD32"),
    ("construct", "🤖", "#A9A9A9"),
]


def migrate_creature_types():
    """Create creature_types table and populate with D&D types."""

    print("Setting up creature_types table...")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop existing table if it exists
    print("Recreating creature_types table...")
    cursor.execute("DROP TABLE IF EXISTS creature_types;")

    # Create table
    cursor.execute("""
        CREATE TABLE creature_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL
        );
    """)

    # Insert each creature type
    print("Inserting creature types...")
    for code, emoji, color in CREATURE_TYPES:
        print(f"  Adding: {emoji} {code}")
        cursor.execute("""
            INSERT INTO creature_types (code, emoji, color)
            VALUES (?, ?, ?)
        """, (code, emoji, color))

    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM creature_types;")
    count = cursor.fetchone()[0]

    conn.close()

    print(f"\nMigration complete: {count} creature types in database")


if __name__ == '__main__':
    try:
        migrate_creature_types()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
