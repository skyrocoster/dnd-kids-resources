#!/usr/bin/env python3
import sqlite3
import json
from pathlib import Path

# Get database path
BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

damage = [
    {
        "name": "A",
        "roll": "2d6",
        "numerics": [{"code": "dex"}],
        "types": ["fire"],
        "save": True
    }
]

cursor.execute('''
    INSERT INTO spells (title, icon, level, school, explanation, damage)
    VALUES (?, ?, ?, ?, ?, ?)
''', (
    'Flaming Sphere',
    '🔥',
    'level2',
    'Conjuration',
    'summon a rolling ball of fire that you can move around and burn creatures that get too close',
    json.dumps(damage)
))

conn.commit()
print("✓ Flaming Sphere added successfully!")

# Verify
cursor.execute(
    'SELECT id, title, icon, level FROM spells WHERE title = "Flaming Sphere"')
row = cursor.fetchone()
if row:
    print(f"  ID: {row[0]}, Title: {row[1]}, Icon: {row[2]}, Level: {row[3]}")

conn.close()
