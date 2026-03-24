import json

# Update weapons to use [BOX] marker instead of 'ability'
with open('data/weapons.json', 'r', encoding='utf-8-sig') as f:
    weapons = json.load(f)

for weapon in weapons:
    if 'details' in weapon and isinstance(weapon['details'], list):
        for detail in weapon['details']:
            if 'content' in detail and isinstance(detail['content'], dict):
                # Check if this is a roll with modifier
                if detail['content'].get('modifier') == '+ ability':
                    detail['content']['modifier'] = '+ [BOX]'

with open('data/weapons.json', 'w', encoding='utf-8') as f:
    json.dump(weapons, f, indent=2, ensure_ascii=False)

# Update spells to use [BOX] marker instead of HTML
with open('data/spells.json', 'r', encoding='utf-8-sig') as f:
    spells = json.load(f)

for spell in spells:
    if 'details' in spell and isinstance(spell['details'], list):
        for detail in spell['details']:
            if 'content' in detail and isinstance(detail['content'], str):
                # Replace HTML sab-box with [BOX] marker
                detail['content'] = detail['content'].replace(
                    "<span class='sab-box'></span>", '[BOX]')

with open('data/spells.json', 'w', encoding='utf-8') as f:
    json.dump(spells, f, indent=2, ensure_ascii=False)

print('✓ Updated data files to use unified [BOX] marker')
