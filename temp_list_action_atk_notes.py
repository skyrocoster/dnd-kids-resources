import json
from pathlib import Path

p = Path('data/5eTools/extracted/data/bestiary/monsters_merged.json')
with p.open('r', encoding='utf-8') as f:
    data = json.load(f)

for ent in data:
    if not isinstance(ent, dict):
        continue
    actions = ent.get('action')
    if not isinstance(actions, list):
        continue
    for action in actions:
        if not isinstance(action, dict) or 'attack' in action:
            continue
        for key in ('notes', 'entries'):
            if key not in action:
                continue
            value = action[key]
            if not isinstance(value, list):
                continue
            for note in value:
                if isinstance(note, str) and '{@atk' in note:
                    print('---')
                    print('monster:', ent.get('name'))
                    print('action:', action.get('name'))
                    print('field:', key)
                    print('note:', note)
