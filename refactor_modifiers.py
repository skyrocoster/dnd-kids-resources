import json
import re


def extract_ability_code(html_string):
    """Extract ability code from HTML like <span class='ability-dex'>DEX</span>"""
    match = re.search(r"ability-(\w+)", html_string)
    return match.group(1) if match else None


def parse_modifier(modifier_str):
    """
    Parse a modifier string into baseModifier, statModifier, and applySpellModifier

    Examples:
    - "fire" -> ("fire", None, False)
    - "+ [BOX]" -> ("", None, True)
    - "+ <span class='ability-dex'>DEX</span> save" -> ("save", "dex", False)
    - "none" -> ("", None, False)
    """
    if not modifier_str or modifier_str == "none":
        return ("", None, False)

    # Check for [BOX] placeholder
    if "[BOX]" in modifier_str:
        return ("", None, True)

    # Check for ability modifier (HTML span)
    ability_code = extract_ability_code(modifier_str)
    if ability_code:
        # Extract the base modifier text (everything after the span)
        base = modifier_str.replace(re.search(
            r"<span class='ability-\w+'>\w+</span>", modifier_str).group(), "").strip()
        # Remove leading +/- and whitespace
        base = re.sub(r"^\s*\+\s*", "", base).strip()
        return (base, ability_code, False)

    # Simple damage type or description
    base = modifier_str.replace("+", "").strip()
    return (base, None, False)


# Update weapons.json
with open('data/weapons.json', 'r', encoding='utf-8-sig') as f:
    weapons = json.load(f)

for weapon in weapons:
    if 'details' in weapon and isinstance(weapon['details'], list):
        for detail in weapon['details']:
            if isinstance(detail.get('content'), dict) and 'modifier' in detail['content']:
                old_modifier = detail['content'].pop('modifier')
                base_mod, stat_mod, apply_spell_mod = parse_modifier(
                    old_modifier)
                detail['content']['baseModifier'] = base_mod
                detail['content']['statModifier'] = stat_mod
                detail['content']['applySpellModifier'] = apply_spell_mod

with open('data/weapons.json', 'w', encoding='utf-8') as f:
    json.dump(weapons, f, indent=2, ensure_ascii=False)

# Update spells.json
with open('data/spells.json', 'r', encoding='utf-8-sig') as f:
    spells = json.load(f)

for spell in spells:
    if 'details' in spell and isinstance(spell['details'], list):
        for detail in spell['details']:
            if isinstance(detail.get('content'), dict) and 'modifier' in detail['content']:
                old_modifier = detail['content'].pop('modifier')
                base_mod, stat_mod, apply_spell_mod = parse_modifier(
                    old_modifier)
                detail['content']['baseModifier'] = base_mod
                detail['content']['statModifier'] = stat_mod
                detail['content']['applySpellModifier'] = apply_spell_mod

with open('data/spells.json', 'w', encoding='utf-8') as f:
    json.dump(spells, f, indent=2, ensure_ascii=False)

print("✓ Refactored modifiers: modifier → baseModifier + statModifier + applySpellModifier")
