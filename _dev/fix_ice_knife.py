import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Get Ice Knife data
cursor.execute('SELECT to_hit, damage FROM spells WHERE id = 21')
row = cursor.fetchone()

if row:
    # Update to_hit: "primary" -> "A", "secondary" -> "B"
    to_hit = json.loads(row[0])
    damage = json.loads(row[1])

    print("Before:")
    print("To Hit:", json.dumps(to_hit, indent=2))
    print("Damage:", json.dumps(damage, indent=2))

    # Fix to_hit names
    for roll in to_hit:
        if roll.get('name') == 'primary':
            roll['name'] = 'A'
        elif roll.get('name') == 'secondary':
            roll['name'] = 'B'

    # Fix damage names
    for roll in damage:
        if roll.get('name') == 'primary':
            roll['name'] = 'A'
        elif roll.get('name') == 'secondary':
            roll['name'] = 'B'

    print("\nAfter:")
    print("To Hit:", json.dumps(to_hit, indent=2))
    print("Damage:", json.dumps(damage, indent=2))

    # Update database
    cursor.execute('UPDATE spells SET to_hit = ?, damage = ? WHERE id = 21',
                   (json.dumps(to_hit), json.dumps(damage)))
    conn.commit()
    print("\nDatabase updated!")

conn.close()
