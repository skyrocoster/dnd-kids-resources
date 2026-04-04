import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Find spells with multiple to_hit or damage entries
cursor.execute(
    'SELECT id, title, to_hit, damage FROM spells WHERE to_hit IS NOT NULL')
spells = cursor.fetchall()

print('Spells with multiple rolls:')
for spell in spells:
    try:
        to_hit = json.loads(spell[2])
        if isinstance(to_hit, list) and len(to_hit) > 1:
            print(f'\nID {spell[0]} - {spell[1]} (to_hit):')
            for roll in to_hit:
                name = roll.get('name', 'N/A')
                print(f'  name: {name}')
    except:
        pass

cursor.execute('SELECT id, title, damage FROM spells WHERE damage IS NOT NULL')
spells = cursor.fetchall()

for spell in spells:
    try:
        damage = json.loads(spell[2])
        if isinstance(damage, list) and len(damage) > 1:
            print(f'\nID {spell[0]} - {spell[1]} (damage):')
            for roll in damage:
                name = roll.get('name', 'N/A')
                print(f'  name: {name}')
    except:
        pass

conn.close()
