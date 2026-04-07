#!/usr/bin/env python3
"""
Initialize D&D Kids Resources database with schema and default data
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def init_database():
    """Create database tables and populate with default data"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print("Creating database schema...")

    # Create abilities table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS abilities (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL
        )
    """)

    # Create damage_types table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS damage_types (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)

    # Create spells table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            school TEXT,
            explanation TEXT,
            to_hit TEXT,
            damage TEXT,
            heal TEXT,
            range TEXT
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_title ON spells(title)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school)")

    # Create conditions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            explanation TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create creature_types lookup table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS creature_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            emoji TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)

    # Create creatures table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS creatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            size TEXT NOT NULL,
            creature_type_id INTEGER NOT NULL,
            hp INTEGER NOT NULL,
            ac INTEGER NOT NULL,
            explanation TEXT NOT NULL,
            attack_to_hit TEXT,
            damage TEXT,
            special TEXT,
            stats TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creature_type_id) REFERENCES creature_types(id)
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_creatures_creature_type_id ON creatures(creature_type_id)")

    # Create skills table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            explanation TEXT,
            details TEXT NOT NULL
        )
    """)

    # Create dungeons table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dungeons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            original_html TEXT NOT NULL,
            parsed_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create weapons table (legacy)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weapons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL UNIQUE,
            type TEXT,
            hands TEXT,
            removable INTEGER,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
    """)

    # Create wild_shapes table (legacy)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS wild_shapes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL UNIQUE,
            creature_type TEXT,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
    """)

    # Create icons table (legacy)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS icons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            purpose TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    print("[OK] Tables created")

    # Populate abilities if empty
    cursor.execute("SELECT COUNT(*) FROM abilities")
    if cursor.fetchone()[0] == 0:
        print("Populating abilities...")
        abilities = [
            ('str', 'Strength', '💪', '#e74c3c'),
            ('dex', 'Dexterity', '⚡', '#f39c12'),
            ('con', 'Constitution', '❤️', '#c0392b'),
            ('int', 'Intelligence', '🧠', '#3498db'),
            ('wis', 'Wisdom', '👁️', '#27ae60'),
            ('cha', 'Charisma', '✨', '#8e44ad'),
            ('sam', 'Spellcasting Attack Modifier', '🎯', '#9b59b6'),
            ('sad', 'Spellcasting Ability Difference', '📊', '#34495e'),
        ]
        cursor.executemany(
            "INSERT INTO abilities (code, name, emoji, color) VALUES (?, ?, ?, ?)", abilities)
        print(f"  [OK] Added {len(abilities)} abilities")

    # Populate damage_types if empty
    cursor.execute("SELECT COUNT(*) FROM damage_types")
    if cursor.fetchone()[0] == 0:
        print("Populating damage types...")
        damage_types = [
            ('fire', 'Fire', '🔥', '#e74c3c'),
            ('cold', 'Cold', '❄️', '#3498db'),
            ('acid', 'Acid', '💧', '#16a085'),
            ('poison', 'Poison', '☠️', '#9b59b6'),
            ('slashing', 'Slashing', '⚔️', '#7f8c8d'),
            ('piercing', 'Piercing', '🗡️', '#95a5a6'),
            ('bludgeoning', 'Bludgeoning', '🔨', '#e67e22'),
            ('thunder', 'Thunder', '⚡', '#f39c12'),
            ('lightning', 'Lightning', '⚡', '#f1c40f'),
            ('necrotic', 'Necrotic', '💀', '#2c3e50'),
            ('radiant', 'Radiant', '☀️', '#f39c12'),
            ('psychic', 'Psychic', '🧠', '#8e44ad'),
            ('force', 'Force', '✨', '#3498db'),
        ]
        cursor.executemany(
            "INSERT INTO damage_types (code, name, emoji, color) VALUES (?, ?, ?, ?)", damage_types)
        print(f"  [OK] Added {len(damage_types)} damage types")

    # Populate creature_types if empty
    cursor.execute("SELECT COUNT(*) FROM creature_types")
    if cursor.fetchone()[0] == 0:
        print("Populating creature types...")
        creature_types = [
            ('beast', '🐾', '#8B4513'),
            ('elemental', '🌊', '#1E90FF'),
            ('fey', '🧚', '#DA70D6'),
            ('humanoid', '👤', '#D3D3D3'),
            ('monstrosity', '👹', '#FF00FF'),
            ('ooze', '🟢', '#32CD32'),
        ]
        cursor.executemany(
            "INSERT INTO creature_types (code, emoji, color) VALUES (?, ?, ?)", creature_types)
        print(f"  [OK] Added {len(creature_types)} creature types")

    conn.commit()
    conn.close()

    print(f"\n[SUCCESS] Database initialized: {DB_PATH}")
    print(f"   Size: {DB_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == '__main__':
    init_database()
