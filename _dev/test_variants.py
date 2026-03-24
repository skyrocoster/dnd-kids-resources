#!/usr/bin/env python3
import json

# Load weapons.json
with open('data/weapons.json', 'r', encoding='utf-8') as f:
    weapons = json.load(f)

# Find versatile weapons and check their structure
print("✓ Versatile Weapons Updated:\n")
for weapon in weapons:
    if weapon.get('hands') == 'versatile':
        damage = weapon['details'][1]['content']  # Damage is second detail
        print(f"  {weapon['title']}:")
        print(
            f"    Base: {damage['numDice']}{damage['diceType']} ({damage['baseModifier']})")
        if 'variants' in damage:
            for variant in damage['variants']:
                print(
                    f"    Variant: {variant['numDice']}{variant['diceType']} ({variant['baseModifier']}) - {variant.get('label', '')}")
        print()
