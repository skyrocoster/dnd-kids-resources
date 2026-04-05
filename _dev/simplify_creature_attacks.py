import sqlite3
import json

# Connect to database
conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Get all creatures with attack_to_hit
cursor.execute(
    "SELECT id, title, attack_to_hit FROM creatures WHERE attack_to_hit IS NOT NULL")
creatures = cursor.fetchall()

updated_count = 0

for creature_id, title, attack_to_hit_str in creatures:
    try:
        # Parse the JSON
        attack_to_hit = json.loads(attack_to_hit_str)

        if not isinstance(attack_to_hit, list):
            attack_to_hit = [attack_to_hit]

        # Remove numerics field from each roll
        simplified_rolls = []
        for roll_obj in attack_to_hit:
            simplified = {k: v for k, v in roll_obj.items() if k != 'numerics'}
            simplified_rolls.append(simplified)

        # Update the database
        new_json = json.dumps(simplified_rolls)
        cursor.execute(
            "UPDATE creatures SET attack_to_hit = ? WHERE id = ?", (new_json, creature_id))
        print(f"✅ Updated '{title}' - removed ability modifiers")
        updated_count += 1
    except Exception as e:
        print(f"❌ Error updating '{title}': {e}")

conn.commit()
conn.close()

print(f"\n📊 Summary: {updated_count} creatures updated")
