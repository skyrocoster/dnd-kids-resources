import json
import urllib.request

try:
    print("Fetching dungeon data...")
    resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/1')
    data = json.loads(resp.read())
    pj = data['parsed_json']

    print(f"Number of rooms: {len(pj['rooms'])}")
    print(f"First room: {pj['rooms'][0]['title']}")
    print(f"Last room: {pj['rooms'][-1]['title']}")

    total_entries = 0
    for r in pj['rooms']:
        total_entries += len(r['entries'])
    print(f"Total entries: {total_entries}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
