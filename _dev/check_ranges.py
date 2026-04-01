#!/usr/bin/env python3
"""Check what range data was stored in database."""

import sqlite3
import json

DB_PATH = "dnd_kids_resources.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Query the spells with their range values
cursor.execute("""
    SELECT s.id, c.title, s.range 
    FROM spells s 
    JOIN cards c ON s.card_id = c.id 
    ORDER BY c.title
""")

print("\n" + "="*80)
print("Spell Ranges - Database Verification")
print("="*80)

for i, row in enumerate(cursor.fetchall(), 1):
    range_val = row['range']
    print(f"{i:2}. {row['title']:30} | {range_val}")

conn.close()
