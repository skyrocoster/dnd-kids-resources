#!/usr/bin/env python3
"""
Migration: Load creatures into database with spell-compatible roll format.
"""

import sqlite3
import json
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

CREATURES_DATA = [
    {
        "title": "fox",
        "icon": "🦊",
        "size": "tiny",
        "type": "beast",
        "hp": 6,
        "ac": 12,
        "explanation": "a clever little fox with sharp eyes and a twitchy nose",
        "attack_name": "Bite",
        "attack_to_hit": [
            {
                "roll": "1d4+2",
                "numerics": [{"code": "dex"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"roll": "1d4", "types": ["piercing"], "save": False}],
        "special": "keen senses — advantage on sight and smell checks"
    },
    {
        "title": "cat",
        "icon": "🐱",
        "size": "tiny",
        "type": "beast",
        "hp": 4,
        "ac": 12,
        "explanation": "a fluffy little cat who can climb almost anything",
        "attack_name": "Claws",
        "attack_to_hit": [
            {
                "roll": "1d4",
                "numerics": [{"code": "dex"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"roll": "1d4", "types": ["slashing"], "save": False}],
        "special": "keen smell — advantage on smell checks"
    },
    {
        "title": "giant crab",
        "icon": "🦀",
        "size": "medium",
        "type": "beast",
        "hp": 24,
        "ac": 15,
        "explanation": "a big snappy crab with tough shell armour and two grabby claws",
        "attack_name": "Claw",
        "attack_to_hit": [
            {
                "roll": "1d8+3",
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"roll": "1d8", "types": ["bludgeoning"], "save": False}],
        "special": "amphibious — can breathe air and water. Two claws, each can grab one target!"
    },
    {
        "title": "wolf",
        "icon": "🐺",
        "size": "medium",
        "type": "beast",
        "hp": 18,
        "ac": 13,
        "explanation": "a fierce wolf that fights even better with friends nearby",
        "attack_name": "Bite",
        "attack_to_hit": [
            {
                "roll": "1d8+4",
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"roll": "2d4", "types": ["piercing"], "save": False}],
        "special": "pack tactics — advantage on attacks when an ally is nearby. Keen hearing and smell!"
    },
    {
        "title": "giant wolf spider",
        "icon": "🕷️",
        "size": "medium",
        "type": "beast",
        "hp": 18,
        "ac": 13,
        "explanation": "a huge sneaky spider that can walk on walls and sense things through its web",
        "attack_name": "Bite",
        "attack_to_hit": [
            {
                "roll": "1d6+3",
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [
            {"roll": "1d6", "types": ["piercing"], "save": False},
            {"roll": "2d6", "types": ["poison"], "save": False}
        ],
        "special": "spider climb — walks on walls and ceilings! Web sense and web walker — knows who touches its web and moves through webs freely"
    },
    {
        "title": "dimetrodon",
        "icon": "🦎",
        "size": "medium",
        "type": "beast",
        "hp": 30,
        "ac": 12,
        "explanation": "a cool sail-backed reptile that hunts along shores like a prehistoric crocodile",
        "attack_name": "Bite",
        "attack_to_hit": [
            {
                "roll": "1d10+4",
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"roll": "2d6", "types": ["piercing"], "save": False}],
        "special": ""
    }
]


def migrate_creatures():
    """Load creatures into database."""

    print("Setting up creatures table...")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop existing creatures table and recreate
    print("Recreating creatures table...")
    cursor.execute("DROP TABLE IF EXISTS creatures;")

    cursor.execute("""
        CREATE TABLE creatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            size TEXT NOT NULL,
            type TEXT NOT NULL,
            hp INTEGER NOT NULL,
            ac INTEGER NOT NULL,
            explanation TEXT NOT NULL,
            attack_name TEXT,
            attack_to_hit TEXT,
            damage TEXT,
            special TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Insert each creature
    print("Inserting creatures...")
    for i, creature in enumerate(CREATURES_DATA):
        title = creature.get('title', '')
        icon = creature.get('icon', '')
        size = creature.get('size', '')
        creature_type = creature.get('type', '')
        hp = creature.get('hp', 0)
        ac = creature.get('ac', 10)
        explanation = creature.get('explanation', '')
        attack_name = creature.get('attack_name', '')
        attack_to_hit = json.dumps(creature.get('attack_to_hit', []))
        damage = json.dumps(creature.get('damage', []))
        special = creature.get('special', '')

        print(f"  Inserting {i+1}/6: {title}")
        cursor.execute("""
            INSERT INTO creatures 
            (title, icon, size, type, hp, ac, explanation, attack_name, attack_to_hit, damage, special)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (title, icon, size, creature_type, hp, ac, explanation, attack_name, attack_to_hit, damage, special))

        print(f"  Added: {title}")

    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM creatures;")
    count = cursor.fetchone()[0]

    conn.close()

    print(f"\nMigration complete: {count} creatures in database")


if __name__ == '__main__':
    try:
        migrate_creatures()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
