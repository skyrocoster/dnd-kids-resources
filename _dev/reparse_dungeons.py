#!/usr/bin/env python3
"""
Re-parse all dungeons in the database with the fixed parser
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import lib
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.parse_dungeon import DungeonHTMLParser
import sqlite3
import json


def reparse_dungeons():
    """Re-parse all dungeons in the database"""
    conn = sqlite3.connect('dnd_kids_resources.db')
    cursor = conn.cursor()

    # Get all dungeons
    cursor.execute('SELECT id, title, original_html FROM dungeons ORDER BY id')
    dungeons = cursor.fetchall()

    print(f"Found {len(dungeons)} dungeon(s) to re-parse\n")

    for dungeon_id, title, original_html in dungeons:
        print(f"🔄 Re-parsing: {title} (ID: {dungeon_id})")

        try:
            # Parse the HTML
            parser = DungeonHTMLParser(original_html)
            dungeon_data = parser.parse()

            # Convert to JSON
            json_output = json.dumps(dungeon_data.to_dict(), indent=2)

            # Update the database
            cursor.execute(
                'UPDATE dungeons SET parsed_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (json_output, dungeon_id)
            )
            conn.commit()

            print(f"   ✓ Successfully re-parsed and updated\n")

        except Exception as e:
            print(f"   ❌ Error: {e}\n")
            conn.rollback()

    conn.close()
    print("✅ Re-parsing complete!")


if __name__ == '__main__':
    reparse_dungeons()
