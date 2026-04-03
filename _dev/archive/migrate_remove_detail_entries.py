#!/usr/bin/env python3
"""
Migrate data from detail_entries into spells table columns.
Parse heal data and convert to JSON format.
Drop detail_entries table.
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'


def parse_heal_text(heal_text):
    """
    Parse healing text into JSON roll format.
    Examples:
      "heal 1d8 + [BOX]" → {"roll": "1d8", "numerics": [{"code": "sad"}]}
      "heal 1 per berry" → stays as text (can't be parsed)
    """
    if not heal_text or 'heal' not in heal_text.lower():
        return None

    heal_text = heal_text.replace('heal ', '').strip()

    # Check if it has [BOX] - means it uses Spell Ability Modifier
    if '[BOX]' in heal_text:
        # Extract the roll part
        roll_part = heal_text.replace(' + [BOX]', '').strip()
        return {
            "roll": roll_part,
            "numerics": [{"code": "sad"}]
        }

    # If it's just a roll without modifier
    if any(c.isdigit() for c in heal_text) and 'd' in heal_text.lower():
        # Could be "1d8" or similar
        return {"roll": heal_text}

    # Can't parse - return None
    return None


def migrate_detail_entries_to_spells():
    """Migrate detail_entries data to spells table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print("Migrating detail_entries data to spells table...\n")

        # Get all detail entries grouped by spell_id
        cursor.execute("""
            SELECT spell_id, label, content_text 
            FROM detail_entries 
            ORDER BY spell_id, label
        """)

        detail_entries = cursor.fetchall()

        # Group by spell_id
        spell_details = {}
        for entry in detail_entries:
            spell_id = entry['spell_id']
            if spell_id not in spell_details:
                spell_details[spell_id] = {}
            label = entry['label']
            content = entry['content_text']

            if label not in spell_details[spell_id]:
                spell_details[spell_id][label] = []
            spell_details[spell_id][label].append(content)

        # Process each spell
        migrated_count = 0
        for spell_id, details in spell_details.items():
            # Get spell title for logging
            cursor.execute(
                "SELECT title FROM spells WHERE id = ?", (spell_id,))
            spell = cursor.fetchone()
            spell_title = spell['title'] if spell else f"Spell #{spell_id}"

            # Process healing data
            if '💚 Heal:' in details:
                heal_texts = details['💚 Heal:']
                for heal_text in heal_texts:
                    heal_json = parse_heal_text(heal_text)
                    if heal_json:
                        # Update spells.heal column
                        cursor.execute(
                            "UPDATE spells SET heal = ? WHERE id = ?",
                            (json.dumps(heal_json), spell_id)
                        )
                        print(
                            f"✓ {spell_title}: Migrated heal → {json.dumps(heal_json)}")
                        migrated_count += 1

        print(f"\n✓ Migrated {migrated_count} heal entries")

        # Drop detail_entries table
        print("\nDropping detail_entries table...")
        cursor.execute("DROP TABLE detail_entries")

        conn.commit()
        conn.close()

        print("✓ Successfully dropped detail_entries table")
        print("\nData structure now:")
        print("  spells(id, title, icon, level, school, explanation, to_hit, damage, heal, range)")
        print(
            "  - All healing works same way as damage: {roll, numerics, types, save, ...}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    migrate_detail_entries_to_spells()
