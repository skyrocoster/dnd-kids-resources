#!/usr/bin/env python3
"""
Create an abilities reference table with emoji and color codes.
Then update spell numerics to store objects with ability names instead of plain codes.
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'

# Define all abilities with their emoji, CSS class, and display name
ABILITIES = {
    'str': {'name': 'Strength', 'emoji': '💪', 'css_class': 'ability-str'},
    'dex': {'name': 'Dexterity', 'emoji': '⚡', 'css_class': 'ability-dex'},
    'con': {'name': 'Constitution', 'emoji': '❤️', 'css_class': 'ability-con'},
    'int': {'name': 'Intelligence', 'emoji': '🧠', 'css_class': 'ability-int'},
    'wis': {'name': 'Wisdom', 'emoji': '👁️', 'css_class': 'ability-wis'},
    'cha': {'name': 'Charisma', 'emoji': '✨', 'css_class': 'ability-cha'},
    'sam': {'name': 'Spell Attack Modifier', 'emoji': '✨', 'css_class': 'ability-sam'},
}


def migrate_abilities():
    """Create abilities table and migrate spell data."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print("Creating abilities table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS abilities (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                css_class TEXT NOT NULL
            )
        """)

        # Insert abilities
        for code, data in ABILITIES.items():
            cursor.execute("""
                INSERT OR REPLACE INTO abilities (code, name, emoji, css_class)
                VALUES (?, ?, ?, ?)
            """, (code, data['name'], data['emoji'], data['css_class']))
            print(f"  ✓ {code.upper()}: {data['emoji']} {data['name']}")

        print("\nMigrating spell numerics to reference abilities...")

        # Get all spells
        cursor.execute("SELECT id, title, to_hit, damage FROM spells")
        spells = cursor.fetchall()

        for spell in spells:
            spell_id = spell['id']
            title = spell['title']

            # Update to_hit field
            if spell['to_hit']:
                try:
                    to_hit_data = json.loads(spell['to_hit'])
                    if isinstance(to_hit_data, list):
                        for roll_obj in to_hit_data:
                            if 'numerics' in roll_obj and isinstance(roll_obj['numerics'], list):
                                # Convert codes to ability objects
                                roll_obj['numerics'] = [
                                    {'code': code.lower()} for code in roll_obj['numerics']
                                ]
                    elif isinstance(to_hit_data, dict):
                        if 'numerics' in to_hit_data:
                            to_hit_data['numerics'] = [
                                {'code': code.lower()} for code in to_hit_data['numerics']
                            ]

                    cursor.execute("UPDATE spells SET to_hit = ? WHERE id = ?",
                                   (json.dumps(to_hit_data), spell_id))
                    print(f"  ✓ {title} (to_hit)")
                except json.JSONDecodeError as e:
                    print(f"  ✗ {title} (to_hit): {e}")

            # Update damage field
            if spell['damage']:
                try:
                    damage_data = json.loads(spell['damage'])
                    if isinstance(damage_data, list):
                        for roll_obj in damage_data:
                            if 'numerics' in roll_obj and isinstance(roll_obj['numerics'], list):
                                roll_obj['numerics'] = [
                                    {'code': code.lower()} for code in roll_obj['numerics']
                                ]
                    elif isinstance(damage_data, dict):
                        if 'numerics' in damage_data:
                            damage_data['numerics'] = [
                                {'code': code.lower()} for code in damage_data['numerics']
                            ]

                    cursor.execute("UPDATE spells SET damage = ? WHERE id = ?",
                                   (json.dumps(damage_data), spell_id))
                    print(f"  ✓ {title} (damage)")
                except json.JSONDecodeError as e:
                    print(f"  ✗ {title} (damage): {e}")

        conn.commit()
        conn.close()
        print("\n✓ Migration complete!")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    migrate_abilities()
