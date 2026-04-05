import sqlite3
import json

conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Define creature updates
updates = {
    "panther": {
        "attack_to_hit": json.dumps([
            {"name": "A", "roll": "1d20", "mod": 4,
                "save": False, "actor": "attacker"},
            {"name": "B", "roll": "1d20", "mod": 4,
                "save": False, "actor": "attacker"}
        ]),
        "damage": json.dumps([
            {"name": "A", "roll": "1d6", "mod": 2,
                "types": ["piercing"], "save": False},
            {"name": "B", "roll": "1d4", "mod": 2,
                "types": ["slashing"], "save": False}
        ])
    },
    "spider": {
        "damage": json.dumps([
            {"name": "1", "roll": "1", "mod": 0,
                "types": ["piercing"], "save": False},
            {"name": "2", "roll": "1d4", "mod": None,
                "types": ["poison"], "save": True}
        ])
    },
    "giant centipede": {
        "attack_to_hit": json.dumps([
            {"name": "A", "roll": "1d20", "mod": 4,
                "save": False, "actor": "attacker"}
        ]),
        "damage": json.dumps([
            {"name": "A", "roll": "1d4", "mod": 2,
                "types": ["piercing"], "save": False},
            {"name": "A", "roll": "3d6", "mod": None,
                "types": ["poison"], "save": True}
        ])
    }
}

updated_count = 0

for creature_name, update_dict in updates.items():
    try:
        if "attack_to_hit" in update_dict:
            cursor.execute(
                "UPDATE creatures SET attack_to_hit = ? WHERE LOWER(title) = LOWER(?)",
                (update_dict["attack_to_hit"], creature_name)
            )
        if "damage" in update_dict:
            cursor.execute(
                "UPDATE creatures SET damage = ? WHERE LOWER(title) = LOWER(?)",
                (update_dict["damage"], creature_name)
            )
        print(f"✅ Updated '{creature_name}'")
        updated_count += 1
    except Exception as e:
        print(f"❌ Error updating '{creature_name}': {e}")

conn.commit()
conn.close()

print(f"\n📊 Summary: {updated_count} creatures updated")
