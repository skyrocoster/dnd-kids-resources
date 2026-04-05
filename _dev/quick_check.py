import json
import urllib.request

resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/1')
data = json.loads(resp.read())
pj = data['parsed_json']

print(f"Rooms parsed: {len(pj['rooms'])}")
print(f"Room 1 entries: {len(pj['rooms'][0]['entries'])}")
print(f"Room 1 first entry: {pj['rooms'][0]['entries'][0]['title']}")
print("✓ Success!")
