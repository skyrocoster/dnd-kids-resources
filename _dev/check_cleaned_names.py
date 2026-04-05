import json
import urllib.request

resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/3')
data = json.loads(resp.read())
pj = data['parsed_json']

# Find rooms with creature entries that have level descriptors or parentheses
print("Sample monsters from dungeon:\n")
for i, room in enumerate(pj['rooms']):
    monsters = [e for e in room['entries'] if e['entry_type'] == 'monster']
    unique_monsters = list(set(e['title'] for e in monsters))
    if unique_monsters:
        print(f"{room['title']}: {', '.join(unique_monsters)}")
        if i >= 5:  # Show first 5 rooms with monsters
            break
