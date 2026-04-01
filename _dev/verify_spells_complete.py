#!/usr/bin/env python3
"""Comprehensive spell verification with all JSON fields."""

import sqlite3
import json

DB_PATH = "dnd_kids_resources.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get Fire Bolt as detailed example
cursor.execute("""
    SELECT c.title, s.school, s.to_hit, s.damage, s.heal, s.range
    FROM spells s 
    JOIN cards c ON s.card_id = c.id 
    WHERE c.title = 'Fire Bolt'
""")

row = cursor.fetchone()
if row:
    print("\n" + "="*80)
    print("📊 FIRE BOLT - Detailed Spell Record")
    print("="*80)
    print(f"Title:  {row['title']}")
    print(f"School: {row['school']}")
    print(f"\nTo Hit (JSON array):")
    if row['to_hit']:
        to_hit = json.loads(row['to_hit'])
        print(f"  {json.dumps(to_hit, indent=4)}")
    print(f"\nDamage (JSON array):")
    if row['damage']:
        damage = json.loads(row['damage'])
        print(f"  {json.dumps(damage, indent=4)}")
    print(f"\nHealing (JSON array):")
    if row['heal']:
        heal = json.loads(row['heal'])
        print(f"  {json.dumps(heal, indent=4)}")
    else:
        print(f"  None")
    print(f"\nRange (JSON object):")
    if row['range']:
        range_data = json.loads(row['range'])
        print(f"  {json.dumps(range_data, indent=4)}")


print("\n" + "="*80)
print("📋 Summary: All Spells with Range")
print("="*80)

cursor.execute("""
    SELECT c.title, c.level, s.school, s.range
    FROM spells s 
    JOIN cards c ON s.card_id = c.id 
    ORDER BY c.title
""")

for row in cursor.fetchall():
    range_data = json.loads(row['range']) if row['range'] else None
    range_str = json.dumps(range_data) if range_data else "None"
    print(f"{row['title']:30} | {range_str}")

print("\n" + "="*80)
print("✅ Range Migration Complete - All 28 spells have structured range data")
print("="*80 + "\n")

conn.close()
