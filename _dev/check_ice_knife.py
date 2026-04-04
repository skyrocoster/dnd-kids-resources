import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Get Ice Knife spell
cursor.execute(
    'SELECT id, title, damage FROM spells WHERE title = "Ice Knife"')
spell = cursor.fetchone()

if spell:
    print(f'Ice Knife (ID {spell[0]}):')
    print(f'Raw damage field: {spell[2]}')

    try:
        damage_data = json.loads(spell[2])
        print(f'Parsed JSON:')
        print(json.dumps(damage_data, indent=2))
    except:
        print('Could not parse as JSON')

print('\n' + '='*80 + '\n')

# Check other spells with multiple damage entries
cursor.execute(
    'SELECT id, title, damage FROM spells WHERE damage IS NOT NULL AND damage != ""')
all_spells = cursor.fetchall()

print('Spells with damage values:')
for spell in all_spells:
    try:
        damage_data = json.loads(spell[2])
        if isinstance(damage_data, list) and len(damage_data) > 1:
            print(f'\nID {spell[0]} - {spell[1]}:')
            print(f'  {json.dumps(damage_data, indent=2)}')
    except:
        pass

conn.close()
