#!/usr/bin/env python3
"""
Migration: Create damage_types table with emojis and colors
"""

import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create damage_types table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS damage_types (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)

    # Insert damage types with emojis and colors
    damage_types = [
        # Physical damage
        ('slashing', 'Slashing', '🔪', '#e74c3c'),      # Red - sword/cutting
        ('piercing', 'Piercing', '🗡️', '#c0392b'),      # Dark red - spear/arrow
        ('bludgeoning', 'Bludgeoning', '🔨', '#8b4513'),  # Brown - club/hammer

        # Elemental damage
        ('fire', 'Fire', '🔥', '#e74c3c'),               # Red/orange - flames
        ('cold', 'Cold', '❄️', '#3498db'),               # Blue - ice
        # Yellow/gold - electricity
        ('lightning', 'Lightning', '⚡', '#f39c12'),
        ('acid', 'Acid', '🧪', '#27ae60'),               # Green - chemical
        ('poison', 'Poison', '☠️', '#8e44ad'),           # Purple - toxic

        # Cosmic damage
        ('thunder', 'Thunder', '🌩️', '#34495e'),        # Dark gray - storm
        # Bright blue - magical force
        ('force', 'Force', '✨', '#2980b9'),

        # Necrotic/Radiant
        ('necrotic', 'Necrotic', '💀', '#2c3e50'),       # Dark - death/decay
        ('radiant', 'Radiant', '☀️', '#f1c40f'),         # Gold - light/holy

        # Psychic
        ('psychic', 'Psychic', '🧠', '#9b59b6'),         # Purple - mind
    ]

    cursor.executemany(
        "INSERT OR REPLACE INTO damage_types (code, name, emoji, color) VALUES (?, ?, ?, ?)",
        damage_types
    )

    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM damage_types")
    count = cursor.fetchone()[0]
    print(f"✓ Created damage_types table with {count} types")

    # Show the table
    cursor.execute(
        "SELECT code, name, emoji, color FROM damage_types ORDER BY code")
    rows = cursor.fetchall()
    for code, name, emoji, color in rows:
        print(f"  {emoji} {code:12} | {name:15} | {color}")

    conn.close()


if __name__ == '__main__':
    migrate()
