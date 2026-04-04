import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Check all spells with multi-roll data to ensure they use A/B/C naming
issues = []

# Check to_hit
cursor.execute('SELECT id, title, to_hit FROM spells WHERE to_hit IS NOT NULL')
for spell_id, title, to_hit_str in cursor.fetchall():
    try:
        to_hit = json.loads(to_hit_str)
        if isinstance(to_hit, list) and len(to_hit) > 1:
            for roll in to_hit:
                name = roll.get('name')
                if name and name not in ['A', 'B', 'C', 'D', 'E']:
                    issues.append(
                        f'  ID {spell_id} ({title}): to_hit name="{name}"')
    except:
        pass

# Check damage
cursor.execute('SELECT id, title, damage FROM spells WHERE damage IS NOT NULL')
for spell_id, title, damage_str in cursor.fetchall():
    try:
        damage = json.loads(damage_str)
        if isinstance(damage, list) and len(damage) > 1:
            for roll in damage:
                name = roll.get('name')
                if name and name not in ['A', 'B', 'C', 'D', 'E']:
                    issues.append(
                        f'  ID {spell_id} ({title}): damage name="{name}"')
    except:
        pass

if issues:
    print('Spells with non-standard roll names:')
    for issue in issues:
        print(issue)
else:
    print('✓ All multi-roll spells use standard A/B/C/D/E naming')

conn.close()
