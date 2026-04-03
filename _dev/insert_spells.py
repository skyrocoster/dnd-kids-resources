#!/usr/bin/env python3
import sqlite3
import json
import re

# Read the text file
with open('lvl2spells.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

conn = sqlite3.connect('../dnd_kids_resources.db')
cursor = conn.cursor()

count = 0
failed = 0

for idx, line in enumerate(lines):
    if not line.strip():
        continue

    try:
        # Fix the format issues by removing quotes around JSON structures
        # This pattern handles: "field": "[...]" where ... contains {}{} and quotes
        fixed_line = line

        # More specifically:
        # "to_hit": "[{...}]" -> "to_hit": [{...}]
        # "damage": "[{...}]" -> "damage": [{...}]
        # "heal": "[{...}]" -> "heal": [{...}]
        # "range": "{...}" -> "range": {...}

        # Use a more forgiving regex that matches nested structures
        # Pattern: "fieldname": "['[" followed by anything, ending with ']"' or '}"'

        def unescape_field(field_name):
            # Find the field and unquote its value if it's JSON
            pattern = f'"{field_name}": "([\\[\\{{].+?[\\]\\}}])"'
            return re.sub(pattern, f'"{field_name}": \\1', fixed_line)

        fixed_line = unescape_field('to_hit')
        fixed_line = unescape_field('damage')
        fixed_line = unescape_field('heal')
        fixed_line = unescape_field('range')

        spell = json.loads(fixed_line.strip())

        # Ensure complex fields are stored as JSON strings
        for field in ['to_hit', 'damage', 'heal', 'range']:
            if field in spell and not isinstance(spell[field], str) and spell[field] is not None:
                spell[field] = json.dumps(spell[field])

        cursor.execute('''
            INSERT OR REPLACE INTO spells 
            (id, title, icon, level, school, explanation, to_hit, damage, heal, range)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            spell['id'],
            spell['title'],
            spell['icon'],
            spell['level'],
            spell['school'],
            spell['explanation'],
            spell.get('to_hit'),
            spell.get('damage'),
            spell.get('heal'),
            spell.get('range')
        ))
        count += 1
    except:
        failed += 1

conn.commit()
conn.close()

print(f"Inserted {count} spells ({failed} failed)")
