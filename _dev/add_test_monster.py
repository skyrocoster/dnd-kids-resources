import json
import sqlite3

# Fetch the dungeon from database
conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()
cursor.execute('SELECT id, parsed_json FROM dungeons WHERE id = 2')
row = cursor.fetchone()

if not row:
    print("Dungeon not found")
    exit(1)

dungeon_id, json_str = row
data = json.loads(json_str)

# Add a second monster to Room #10 (index 9)
room = data['rooms'][9]
print(f"Adding second monster to {room['title']}\n")

# Get existing monsters in this room
existing_monsters = [e for e in room['entries']
                     if e['entry_type'] == 'monster']
print(f"Before: {len(existing_monsters)} monster entries")

# Add a second monster type
new_monster = {
    'entry_type': 'monster',
    'title': 'Skeleton',
    'content': 'Skeleton',
    'count': 2,
    'creature_index': 1,
    'creature_total': 2,
    'leads_to': None,
    'traps': []
}

room['entries'].append(new_monster)
room['entries'].append({
    'entry_type': 'monster',
    'title': 'Skeleton',
    'content': 'Skeleton',
    'count': 2,
    'creature_index': 2,
    'creature_total': 2,
    'leads_to': None,
    'traps': []
})

# Update database
updated_json = json.dumps(data)
cursor.execute(
    'UPDATE dungeons SET parsed_json = ? WHERE id = 2', (updated_json,))
conn.commit()
conn.close()

existing_monsters = [e for e in room['entries']
                     if e['entry_type'] == 'monster']
print(f"After: {len(existing_monsters)} monster entries")
print(f"\nRoom now has Skeletons + original monsters!")
