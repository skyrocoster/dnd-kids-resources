import json
import re

# Update spells.json
with open('data/spells.json', 'r', encoding='utf-8-sig') as f:
    spells = json.load(f)

for spell in spells:
    if 'details' in spell and isinstance(spell['details'], list):
        for detail in spell['details']:
            if isinstance(detail.get('content'), dict) and 'prefix' in detail['content']:
                prefix = detail['content'].pop('prefix')
                # Simplify prefix to just the actor type
                if 'target' in prefix.lower():
                    detail['content']['rollActor'] = 'target'
                elif 'self' in prefix.lower():
                    detail['content']['rollActor'] = 'self'
                # If no prefix, don't add rollActor - it defaults to 'self'

with open('data/spells.json', 'w', encoding='utf-8') as f:
    json.dump(spells, f, indent=2, ensure_ascii=False)

# Check weapons.json for any prefix fields
with open('data/weapons.json', 'r', encoding='utf-8-sig') as f:
    weapons = json.load(f)

has_prefix = False
for weapon in weapons:
    if 'details' in weapon and isinstance(weapon['details'], list):
        for detail in weapon['details']:
            if isinstance(detail.get('content'), dict) and 'prefix' in detail['content']:
                has_prefix = True

if not has_prefix:
    print("✓ weapons.json has no prefix fields")
else:
    # Update weapons.json if needed
    for weapon in weapons:
        if 'details' in weapon and isinstance(weapon['details'], list):
            for detail in weapon['details']:
                if isinstance(detail.get('content'), dict) and 'prefix' in detail['content']:
                    prefix = detail['content'].pop('prefix')
                    if 'target' in prefix.lower():
                        detail['content']['rollActor'] = 'target'
                    elif 'self' in prefix.lower():
                        detail['content']['rollActor'] = 'self'

    with open('data/weapons.json', 'w', encoding='utf-8') as f:
        json.dump(weapons, f, indent=2, ensure_ascii=False)

print("✓ Updated spells.json: renamed prefix → rollActor")
