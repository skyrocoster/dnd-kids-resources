import sqlite3
import json
import re

# Connect to database
conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()


def parse_roll_string(roll_str):
    """Parse a roll string like '1d4+2' into components"""
    if not roll_str:
        return None

    # Pattern: numDice diceType [+ or -] [modifier]
    match = re.match(r'(\d+)?d(\d+)([\+\-]\d+)?', roll_str)
    if match:
        num_dice = int(match.group(1)) if match.group(1) else 1
        dice_type = f"d{match.group(2)}"
        modifier = None
        if match.group(3):
            modifier = int(match.group(3))
        return {
            "numDice": num_dice,
            "diceType": dice_type,
            "modifier": modifier
        }
    return None


def convert_to_hit_to_json(to_hit_str, creature_name):
    """Convert attack_to_hit string like '+4' to JSON array format"""
    if isinstance(to_hit_str, str):
        # Try to extract the bonus number
        match = re.match(r'[\+\-](\d+)', to_hit_str)
        if match:
            bonus = int(to_hit_str)
            return json.dumps([{
                "name": "Attack",
                "roll": "1d20",
                "mod": bonus,
                "numerics": [{"code": "str"}],
                "save": False,
                "actor": "attacker"
            }])
    return None


def get_damage_type_code(damage_type_str):
    """Convert damage type names to codes"""
    mapping = {
        "piercing": "piercing",
        "slashing": "slashing",
        "bludgeoning": "bludgeoning",
        "poison": "poison",
        "fire": "fire",
        "cold": "cold",
        "acid": "acid",
        "thunder": "thunder",
        "lightning": "lightning",
        "psychic": "psychic",
        "necrotic": "necrotic",
        "radiant": "radiant",
        "force": "force"
    }
    return mapping.get(damage_type_str.lower(), damage_type_str.lower())


def convert_damage_to_json(damage_obj):
    """Convert damage object/string to JSON array format"""
    if isinstance(damage_obj, str):
        # Try to parse as JSON first
        try:
            damage_obj = json.loads(damage_obj)
        except:
            return None

    if not isinstance(damage_obj, dict):
        return None

    result = []

    for key, value in damage_obj.items():
        if isinstance(value, dict) and "roll" in value and "type" in value:
            roll_parts = parse_roll_string(value["roll"])
            if roll_parts:
                damage_type_code = get_damage_type_code(value["type"])
                result.append({
                    "name": key.capitalize(),
                    "roll": f"{roll_parts['numDice']}{roll_parts['diceType']}",
                    "mod": roll_parts["modifier"],
                    "types": [damage_type_code],
                    "save": False
                })

    return json.dumps(result) if result else None


# Get all creatures
cursor.execute("SELECT id, title, attack_to_hit, damage FROM creatures")
creatures = cursor.fetchall()

updated_count = 0

for creature_id, title, attack_to_hit, damage in creatures:
    new_to_hit = None
    new_damage = None

    # Skip if already in proper JSON format
    try:
        if attack_to_hit and isinstance(attack_to_hit, str):
            if attack_to_hit.startswith('[{'):
                # Already in JSON format
                continue
            # Convert from plain string format
            new_to_hit = convert_to_hit_to_json(attack_to_hit, title)
    except:
        pass

    try:
        if damage and isinstance(damage, str):
            if damage.startswith('[{'):
                # Already in JSON format
                continue
            # Convert from custom format
            new_damage = convert_damage_to_json(damage)
    except:
        pass

    # Update if we converted anything
    if new_to_hit or new_damage:
        try:
            if new_to_hit and new_damage:
                cursor.execute(
                    "UPDATE creatures SET attack_to_hit = ?, damage = ? WHERE id = ?",
                    (new_to_hit, new_damage, creature_id)
                )
                print(f"✅ Updated '{title}' - both to_hit and damage")
                updated_count += 1
            elif new_to_hit:
                cursor.execute(
                    "UPDATE creatures SET attack_to_hit = ? WHERE id = ?",
                    (new_to_hit, creature_id)
                )
                print(f"✅ Updated '{title}' - to_hit only")
                updated_count += 1
            elif new_damage:
                cursor.execute(
                    "UPDATE creatures SET damage = ? WHERE id = ?",
                    (new_damage, creature_id)
                )
                print(f"✅ Updated '{title}' - damage only")
                updated_count += 1
        except Exception as e:
            print(f"❌ Error updating '{title}': {e}")

conn.commit()
conn.close()

print(f"\n📊 Summary: {updated_count} creatures updated")
