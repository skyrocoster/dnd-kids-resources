import json
from collections import defaultdict

path = r'f:\DND\Kids Resources\data\5eTools\extracted\data\bestiary\monsters_merged.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

keys = set()
for item in data:
    keys.update(item.keys())

immune_keys = sorted(k for k in keys if 'immune' in k.lower())
print('immune_keys:', immune_keys)

key_types = defaultdict(set)
key_samples = defaultdict(list)
for item in data:
    for k in immune_keys:
        if k in item:
            v = item[k]
            key_types[k].add(type(v).__name__)
            if len(key_samples[k]) < 10:
                key_samples[k].append(v)

for k in immune_keys:
    print('\nKEY', k)
    print('types', key_types[k])
    for s in key_samples[k][:5]:
        print(' sample', repr(s))

issues = []
for item in data:
    for k in immune_keys:
        if k in item:
            v = item[k]
            if isinstance(v, list):
                if any(not isinstance(el, str) for el in v):
                    issues.append((item.get('name', '<no-name>'), k, type(v).__name__, [type(el).__name__ for el in v if not isinstance(el, str)][:5]))
            elif not isinstance(v, str):
                issues.append((item.get('name', '<no-name>'), k, type(v).__name__, None))

print('\nIssues count', len(issues))
print('First 20 issues', issues[:20])
for k in immune_keys:
    null_count = sum(1 for item in data if item.get(k) is None)
    print(k, 'null_count', null_count)

no_ci = sum(1 for item in data if 'immune' in item and 'conditionImmune' not in item)
no_i = sum(1 for item in data if 'conditionImmune' in item and 'immune' not in item)
print('immune only', no_ci, 'conditionImmune only', no_i)
for k in immune_keys:
    names = [item.get('name') for item in data if k in item][:5]
    print('SAMPLES', k, names)
