"""
parse_spells_api.py

Script to parse 5eAPI spells JSON and map fields to the redesigned spells database schema.

- Maps API 'name' -> DB 'spell_name'
- Add further mappings as schema decisions are made
"""

import json
from pathlib import Path

# Input and output paths
API_SPELLS_PATH = Path("data/5eAPI/spells.json")

# Load API spells
with API_SPELLS_PATH.open(encoding="utf-8") as f:
    api_spells = json.load(f)

# Example: Map API 'name' to DB 'spell_name'
parsed_spells = []




for spell in api_spells:
    damage_data = spell.get("damage", {}) or {}
    damage_amount = ""
    damage_at_higher_levels = []
    if isinstance(damage_data.get("damage_at_slot_level"), dict):
        damage_amount = next(iter(damage_data["damage_at_slot_level"].values()), "")
        damage_at_higher_levels = list(damage_data["damage_at_slot_level"].values())
    elif isinstance(damage_data.get("damage_at_character_level"), dict):
        damage_amount = next(iter(damage_data["damage_at_character_level"].values()), "")

    heal_data = spell.get("heal_at_slot_level", {}) or {}
    heal_amount = ""
    heal_at_higher_levels = []
    if isinstance(heal_data, dict):
        heal_amount = next(iter(heal_data.values()), "")
        heal_at_higher_levels = list(heal_data.values())

    heal_field = heal_amount
    if "+ MOD" in heal_amount:
        heal_field = {"amount": heal_amount.replace(" + MOD", "").strip(), "MOD": "SAbM"}

    dc_data = spell.get("dc", {}) or {}
    aoe_data = spell.get("area_of_effect", {}) or {}
    aoe_type = aoe_data.get("type", "")
    aoe_size = aoe_data.get("size", "")
    aoe_value = f"[{aoe_type}:{aoe_size}]" if aoe_type or aoe_size else ""
    parsed = {
        "spell_name": spell.get("name", ""),
        "spell_text": json.dumps(spell.get("desc", [])),  # Store as JSON list
        "level": int(spell.get("level", 0)),  # Store as integer 0-9
        "higher_levels": json.dumps(spell.get("higher_level", [])),  # Store as JSON list
        "range": spell.get("range", ""),
        "duration": spell.get("duration", ""),  # Store as string
        "concentration": bool(spell.get("concentration", False)),  # Store as bool
        "casting_time": spell.get("casting_time", ""),  # Store as string
        "ritual": bool(spell.get("ritual", False)),  # Store as bool
        "components": json.dumps(spell.get("components", [])),  # Store as JSON list
        "materials": spell.get("material", ""),  # Store as string
        "school": spell.get("school", {}).get("index", ""),
        "classes": json.dumps([
            c.get("index", "") for c in spell.get("classes", []) if isinstance(c, dict)
        ]),
        "subclasses": json.dumps([
            s.get("index", "") for s in spell.get("subclasses", []) if isinstance(s, dict)
        ]),
        "area_of_effect": aoe_value,
        "heal": json.dumps(heal_field) if isinstance(heal_field, dict) else heal_field,
        "heal_at_higher_levels": json.dumps(heal_at_higher_levels),
        "damage_at_higher_levels": json.dumps(damage_at_higher_levels),
        "attack_type": json.dumps([
            {
                "name": "initial",
                "type": spell.get("attack_type", ""),
                "save": dc_data.get("dc_type", {}).get("index", ""),
            }
        ]),  # Store as JSON list of objects
        "damage": json.dumps([
            {
                "name": "initial",
                "type": damage_data.get("damage_type", {}).get("index", ""),
                "amount": damage_amount,
                "save_success": dc_data.get("dc_success", ""),
            }
        ]),
        # Add more mappings here as you redesign
    }
    parsed_spells.append(parsed)

# Print first 3 for verification
for s in parsed_spells[:3]:
    print(s)

# TODO: Save to file or database as needed
