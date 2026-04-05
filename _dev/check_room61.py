import json
import urllib.request

resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/2')
data = json.loads(resp.read())
pj = data['parsed_json']

# Room #61 is index 60
room = pj['rooms'][60]
print(f"Room: {room['title']}")
print("\nDoors:")
for entry in room['entries']:
    if entry['entry_type'] == 'door':
        print(f"  {entry['title']}")
        print(f"  Content: {entry['content']}")
        print()
