import json
import urllib.request

resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/2')
data = json.loads(resp.read())
pj = data['parsed_json']

rooms_with_different_monsters = []

for room in pj['rooms']:
    monster_entries = [e for e in room['entries']
                       if e['entry_type'] == 'monster']

    if monster_entries:
        unique_titles = set(e['title'] for e in monster_entries)
        if len(unique_titles) > 1:
            rooms_with_different_monsters.append({
                'room': room['title'],
                'total_monster_entries': len(monster_entries),
                'unique_monsters': list(unique_titles)
            })

if rooms_with_different_monsters:
    print(
        f"✓ Found {len(rooms_with_different_monsters)} rooms with DIFFERENT monster types:\n")
    for room in rooms_with_different_monsters:
        print(f"{room['room']}")
        print(f"  Total entries: {room['total_monster_entries']}")
        print(f"  Different monsters: {', '.join(room['unique_monsters'])}")
        print()
else:
    print("No rooms have different types of monsters.")
