import json
import urllib.request

resp = urllib.request.urlopen('http://localhost:8000/api/dungeons/2')
data = json.loads(resp.read())
pj = data['parsed_json']

room = pj['rooms'][9]  # Room #10
print(f"{room['title']}\n")

monsters = [e for e in room['entries'] if e['entry_type'] == 'monster']
print(
    f"Monsters ({len(monsters)} entries with {len(set(e['title'] for e in monsters))} types):")
for monster in monsters:
    print(
        f"  - {monster['title']} ({monster['creature_index']}/{monster['creature_total']})")
