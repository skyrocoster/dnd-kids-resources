import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Get Ice Knife spell with all fields
cursor.execute(
    'SELECT id, title, to_hit, damage FROM spells WHERE title = "Ice Knife"')
spell = cursor.fetchone()

if spell:
    print(f'Ice Knife (ID {spell[0]}):')
    print(f'\nTo Hit:')
    try:
        to_hit = json.loads(spell[2])
        print(json.dumps(to_hit, indent=2))
    except:
        print(f'  Raw: {spell[2]}')

    print(f'\nDamage:')
    try:
        damage = json.loads(spell[3])
        print(json.dumps(damage, indent=2))
    except:
        print(f'  Raw: {spell[3]}')

conn.close()
