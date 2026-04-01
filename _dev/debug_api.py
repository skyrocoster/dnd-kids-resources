#!/usr/bin/env python3
"""Debug the spell API."""

import sqlite3
import json
import traceback

DB_PATH = "dnd_kids_resources.db"


def get_db_connection():
    """Create database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def parse_json_field(json_str):
    """Parse a JSON field from database, return None if invalid."""
    if not json_str:
        return None
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return None


def convert_db_spell_to_json_format(spell_row, detail_rows):
    """Convert database spell format to the legacy JSON format."""
    spell_dict = dict(spell_row)
    print(f"  Spell dict keys: {list(spell_dict.keys())}")

    # Parse the database JSON fields
    to_hit_data = parse_json_field(spell_dict['to_hit'])
    damage_data = parse_json_field(spell_dict['damage'])
    heal_data = parse_json_field(spell_dict['heal'])
    range_data = parse_json_field(spell_dict['range'])

    print(f"  to_hit: {to_hit_data}")
    print(f"  damage: {damage_data}")

    details = []

    # Add to_hit rolls
    if to_hit_data:
        if isinstance(to_hit_data, list):
            for i, roll_obj in enumerate(to_hit_data):
                label = "🎲 Roll:" if i == 0 else f"🎲 Roll ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "🎲 Roll:", "content": to_hit_data})

    # Add damage rolls
    if damage_data:
        if isinstance(damage_data, list):
            for i, roll_obj in enumerate(damage_data):
                label = "💥 Damage:" if i == 0 else f"💥 Damage ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "💥 Damage:", "content": damage_data})

    # Add heal rolls
    if heal_data:
        if isinstance(heal_data, list):
            for i, roll_obj in enumerate(heal_data):
                label = "💚 Heal:" if i == 0 else f"💚 Heal ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "💚 Heal:", "content": heal_data})

    # Add range
    if range_data:
        range_text = f"{range_data}"
        details.append({"label": "🎯 Range:", "content": range_text})

    # Add details from detail_entries table
    for detail_row in detail_rows:
        detail_dict = dict(detail_row)
        label = detail_dict.get('label', '')
        content = detail_dict.get('content_text', '')

        if 'range' in label.lower():
            continue

        details.append({
            "label": label,
            "content": content
        })

    return {
        "icon": spell_dict.get('icon', '✨'),
        "level": spell_dict.get('level', 'cantrip'),
        "school": spell_dict.get('school', 'Evocation'),
        "title": spell_dict.get('title', 'Unknown'),
        "explanation": spell_dict.get('explanation', ''),
        "details": details
    }


try:
    print("Testing spell API data conversion...\n")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get one spell
    cursor.execute("""
        SELECT 
            s.id as spell_id, c.id as card_id, c.title, c.icon, c.level, c.explanation,
            s.school, s.to_hit, s.damage, s.heal, s.range
        FROM spells s
        JOIN cards c ON s.card_id = c.id
        ORDER BY c.title
        LIMIT 1
    """)

    row = cursor.fetchone()
    if row:
        print(f"Fetched spell row: {dict(row).keys()}")
        card_id = row['card_id']

        # Get details
        cursor.execute("""
            SELECT label, content_text
            FROM detail_entries
            WHERE card_id = ?
            ORDER BY sequence_order
        """, (card_id,))

        detail_rows = cursor.fetchall()
        print(f"Fetched {len(detail_rows)} detail rows\n")

        # Convert
        spell_json = convert_db_spell_to_json_format(row, detail_rows)
        print(f"\n✅ Conversion successful!")
        print(f"Result: {json.dumps(spell_json, indent=2)[:500]}...")

    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()
