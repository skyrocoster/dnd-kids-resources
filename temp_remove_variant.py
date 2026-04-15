import json
from pathlib import Path

path = Path(r'f:\DND\Kids Resources\data\5eTools\extracted\data\bestiary\monsters_merged.json')
with path.open('r', encoding='utf-8') as f:
    data = json.load(f)

count = 0
for item in data:
    if 'variant' in item:
        del item['variant']
        count += 1

print(f'Removed variant key from {count} entries')
with path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
