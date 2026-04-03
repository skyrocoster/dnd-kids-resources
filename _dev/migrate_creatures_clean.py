#!/usr/bin/env python3
"""
Migration: Clean up creatures table - add FK to creature_types and move attack_name into JSON.
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


def parse_roll(roll_str):
    """
    Extract dice notation and modifier from a roll string.

    Examples:
        "1d8+4" -> {"roll": "1d8", "mod": 4}
        "2d6-1" -> {"roll": "2d6", "mod": -1}
        "1d4" -> {"roll": "1d4", "mod": None}

    Returns: dict with "roll" and "mod" keys
    """
    import re

    if not roll_str:
        return {"roll": "", "mod": None}

    # Match pattern: XdY followed by optional +/- modifier
    match = re.match(r'^(\d+d\d+)([\+\-]\d+)?$', roll_str.strip())

    if match:
        dice_part = match.group(1)
        mod_part = match.group(2)

        mod_value = None
        if mod_part:
            mod_value = int(mod_part)  # Includes the +/- sign

        return {"roll": dice_part, "mod": mod_value}

    # Fallback for non-standard formats
    return {"roll": roll_str, "mod": None}


CREATURES_DATA = [
    {
        "title": "fox",
        "icon": "🦊",
        "size": "tiny",
        "creature_type": "beast",
        "hp": 6,
        "ac": 12,
        "explanation": "a clever little fox with sharp eyes and a twitchy nose",
        "attack_to_hit": [
            {
                "name": "Bite",
                "roll": "1d4",
                "mod": 2,
                "numerics": [{"code": "dex"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"name": "Bite", "roll": "1d4", "mod": None, "types": ["piercing"], "save": False}],
        "special": "keen senses — advantage on sight and smell checks"
    },
    {
        "title": "cat",
        "icon": "🐱",
        "size": "tiny",
        "creature_type": "beast",
        "hp": 4,
        "ac": 12,
        "explanation": "a fluffy little cat who can climb almost anything",
        "attack_to_hit": [
            {
                "name": "Claws",
                "roll": "1d4",
                "mod": None,
                "numerics": [{"code": "dex"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"name": "Claws", "roll": "1d4", "mod": None, "types": ["slashing"], "save": False}],
        "special": "keen smell — advantage on smell checks"
    },
    {
        "title": "giant crab",
        "icon": "🦀",
        "size": "medium",
        "creature_type": "beast",
        "hp": 24,
        "ac": 15,
        "explanation": "a big snappy crab with tough shell armour and two grabby claws",
        "attack_to_hit": [
            {
                "name": "Claw",
                "roll": "1d8",
                "mod": 3,
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"name": "Claw", "roll": "1d8", "mod": None, "types": ["bludgeoning"], "save": False}],
        "special": "amphibious — can breathe air and water. Two claws, each can grab one target!"
    },
    {
        "title": "wolf",
        "icon": "🐺",
        "size": "medium",
        "creature_type": "beast",
        "hp": 18,
        "ac": 13,
        "explanation": "a fierce wolf that fights even better with friends nearby",
        "attack_to_hit": [
            {
                "name": "Bite",
                "roll": "1d8",
                "mod": 4,
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"name": "Bite", "roll": "2d4", "mod": None, "types": ["piercing"], "save": False}],
        "special": "pack tactics — advantage on attacks when an ally is nearby. Keen hearing and smell!"
    },
    {
        "title": "giant wolf spider",
        "icon": "🕷️",
        "size": "medium",
        "creature_type": "beast",
        "hp": 18,
        "ac": 13,
        "explanation": "a huge sneaky spider that can walk on walls and sense things through its web",
        "attack_to_hit": [
            {
                "name": "Bite",
                "roll": "1d6",
                "mod": 3,
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [
            {"name": "Bite", "roll": "1d6", "mod": None,
                "types": ["piercing"], "save": False},
            {"name": "Bite", "roll": "2d6", "mod": None,
                "types": ["poison"], "save": False}
        ],
        "special": "spider climb — walks on walls and ceilings! Web sense and web walker — knows who touches its web and moves through webs freely"
    },
    {
        "title": "dimetrodon",
        "icon": "🦎",
        "size": "medium",
        "creature_type": "beast",
        "hp": 30,
        "ac": 12,
        "explanation": "a cool sail-backed reptile that hunts along shores like a prehistoric crocodile",
        "attack_to_hit": [
            {
                "name": "Bite",
                "roll": "1d10",
                "mod": 4,
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }
        ],
        "damage": [{"name": "Bite", "roll": "2d6", "mod": None, "types": ["piercing"], "save": False}],
        "special": ""
    }
]


def migrate_creatures():
    """Load creatures into cleaned-up database."""

    print("Setting up creatures table...")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop existing creatures table and recreate with FK
    print("Recreating creatures table with creature_type FK...")
    cursor.execute("DROP TABLE IF EXISTS creatures;")

    cursor.execute("""
        CREATE TABLE creatures (
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creature_type_id) REFERENCES creature_types(id)
        );
    """)

    # Insert each creature
    print("Inserting creatures...")
    for i, creature in enumerate(CREATURES_DATA):
        # Get creature_type_id from creature_types table
        creature_type = creature.get('creature_type', '')
        cursor.execute(
            "SELECT id FROM creature_types WHERE code = ?", (creature_type,))
        type_row = cursor.fetchone()
        if not type_row:
            print(
                f"  WARNING: Creature type '{creature_type}' not found for {creature['title']}")
            continue

        creature_type_id = type_row[0]

        title = creature.get('title', '')
        icon = creature.get('icon', '')
        size = creature.get('size', '')
        hp = creature.get('hp', 0)
        ac = creature.get('ac', 10)
        explanation = creature.get('explanation', '')
        attack_to_hit = json.dumps(creature.get('attack_to_hit', []))
        damage = json.dumps(creature.get('damage', []))
        special = creature.get('special', '')

        print(f"  Inserting {i+1}/6: {title}")
        cursor.execute("""
            INSERT INTO creatures 
            (title, icon, size, creature_type_id, hp, ac, explanation, attack_to_hit, damage, special)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (title, icon, size, creature_type_id, hp, ac, explanation, attack_to_hit, damage, special))

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
