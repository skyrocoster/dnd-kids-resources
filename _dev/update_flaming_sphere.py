#!/usr/bin/env python3
import sqlite3
import json
from pathlib import Path

# Get database path
BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Save roll: 1d20 + dex
to_hit = [
    {
        "name": "A",
        "roll": "1d20",
        "numerics": [{"code": "dex"}],
        "save": True
    }
]

# Damage roll: 2d6 fire
damage = [
    {
        "name": "A",
        "roll": "2d6",
        "types": ["fire"]
    }
]

cursor.execute('''
    UPDATE spells
    SET to_hit = ?, damage = ?
    WHERE title = 'Flaming Sphere'
''', (json.dumps(to_hit), json.dumps(damage)))

conn.commit()
print("✓ Flaming Sphere updated with 1d20 + dex save!")

# Verify
cursor.execute(
    'SELECT to_hit, damage FROM spells WHERE title = "Flaming Sphere"')
row = cursor.fetchone()
if row:
    print(f"  Save: {row[0]}")
    print(f"  Damage: {row[1]}")

conn.close()
