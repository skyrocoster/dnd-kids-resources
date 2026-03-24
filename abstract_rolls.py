import json
import re

# Update weapons.json
with open('data/weapons.json', 'r', encoding='utf-8-sig') as f:
    weapons = json.load(f)

for weapon in weapons:
    if 'details' in weapon and isinstance(weapon['details'], list):
        for detail in weapon['details']:
            # Match any Roll-related label
            if detail.get('label', '').startswith('🎲 Roll') and isinstance(detail['content'], str):
                # Convert weapon roll string to structured format
                content = detail['content']
                if content == 'none':
                    detail['content'] = {"modifier": "none"}
                else:
                    # Parse "d20 + [BOX]" or similar
                    match = re.match(r'(\d*)d(\d+)(.*)', content.strip())
                    if match:
                        num_dice = int(match.group(1)) if match.group(1) else 1
                        dice_type = f"d{match.group(2)}"
                        modifier = match.group(
                            3).strip() if match.group(3) else ""
                        detail['content'] = {
                            "numDice": num_dice,
                            "diceType": dice_type,
                            "modifier": modifier
                        }

with open('data/weapons.json', 'w', encoding='utf-8') as f:
    json.dump(weapons, f, indent=2, ensure_ascii=False)

# Update spells.json
with open('data/spells.json', 'r', encoding='utf-8-sig') as f:
    spells = json.load(f)

for spell in spells:
    if 'details' in spell and isinstance(spell['details'], list):
        for detail in spell['details']:
            # Match any Roll-related label (including variations like "Roll (Target):" or "Roll (Area):")
            if detail.get('label', '').startswith('🎲 Roll') and isinstance(detail['content'], str):
                # Convert spell roll string to structured format
                content = detail['content']
                if content == 'none':
                    detail['content'] = {"modifier": "none"}
                else:
                    # Parse patterns like:
                    # - "target rolls d20 + <span class='ability-dex'>DEX</span> save"
                    # - "targets roll d20 + <span class='ability-str'>STR</span> save (if on creature)"
                    # - "d20 + [BOX]"

                    prefix = ""
                    suffix = ""

                    # Extract prefix (target rolls / targets roll)
                    prefix_match = re.match(
                        r'(targets? rolls?)\s+(.*)', content)
                    if prefix_match:
                        prefix = prefix_match.group(1)
                        remaining = prefix_match.group(2)
                    else:
                        remaining = content

                    # Extract suffix (conditions in parentheses)
                    suffix_match = re.search(r'\s*(\(.*\))\s*$', remaining)
                    if suffix_match:
                        suffix = suffix_match.group(1)
                        remaining = remaining[:suffix_match.start()]

                    # Parse dice and modifier
                    match = re.match(r'(\d*)d(\d+)(.*)', remaining.strip())
                    if match:
                        num_dice = int(match.group(1)) if match.group(1) else 1
                        dice_type = f"d{match.group(2)}"
                        modifier = match.group(
                            3).strip() if match.group(3) else ""

                        roll_obj = {
                            "numDice": num_dice,
                            "diceType": dice_type
                        }
                        if prefix:
                            roll_obj["prefix"] = prefix
                        if modifier:
                            roll_obj["modifier"] = modifier
                        if suffix:
                            roll_obj["suffix"] = suffix

                        detail['content'] = roll_obj
                    else:
                        # Fallback: keep as string
                        detail['content'] = {"modifier": content}

with open('data/spells.json', 'w', encoding='utf-8') as f:
    json.dump(spells, f, indent=2, ensure_ascii=False)

print('✓ Updated all Roll fields to structured format')
