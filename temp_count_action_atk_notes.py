import json
from pathlib import Path

p = Path('data/5eTools/extracted/data/bestiary/monsters_merged.json')
with p.open('r', encoding='utf-8') as f:
    data = json.load(f)

count = 0
count_notes = 0
count_entries = 0
for ent in data:
    if not isinstance(ent, dict):
        continue
    actions = ent.get('action')
    if not isinstance(actions, list):
        continue
    for action in actions:
        if not isinstance(action, dict):
            continue
        if 'attack' in action:
            continue
        if 'notes' in action:
            for note in action['notes']:
                if isinstance(note, str) and '{@atk' in note:
                    count += 1
                    count_notes += 1
        if 'entries' in action:
            for note in action['entries']:
                if isinstance(note, str) and '{@atk' in note:
                    count += 1
                    count_entries += 1
print('total_action_atk_notes', count)
print('notes', count_notes)
print('entries', count_entries)
