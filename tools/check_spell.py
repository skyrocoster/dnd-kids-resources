#!/usr/bin/env python3
import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
c = conn.cursor()

# Get all spells
c.execute('SELECT title, special, higher_levels FROM spells')
rows = c.fetchall()

print(f"Found {len(rows)} spells:\n")

for row in rows:
    print(f"Title: {row[0]}")
    special = json.loads(row[1]) if row[1] else None
    higher_levels = json.loads(row[2]) if row[2] else None
    print(f"  special: {special}")
    print(f"  higher_levels: {higher_levels}")
    print()

conn.close()
