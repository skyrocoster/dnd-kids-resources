import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Get the current heal data for spell 55
cursor.execute('SELECT id, heal FROM spells WHERE id = 55')
row = cursor.fetchone()

if row:
    heal_json = json.loads(row[1])
    print(f'Original heal: {heal_json}')

    # Remove 'types' field from each heal object
    for heal_obj in heal_json:
        if 'types' in heal_obj:
            del heal_obj['types']

    new_heal_json = json.dumps(heal_json)
    print(f'Updated heal: {new_heal_json}')

    # Update the database
    cursor.execute('UPDATE spells SET heal = ? WHERE id = 55',
                   (new_heal_json,))
    conn.commit()
    print('Database updated successfully!')

conn.close()
