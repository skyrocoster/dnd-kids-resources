import sqlite3
import json
from datetime import datetime

# Connect to database
conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Get existing creatures to avoid duplicates
cursor.execute("SELECT title FROM creatures")
existing = set(row[0] for row in cursor.fetchall())

# Creatures to add - from beasts.txt
creatures_to_add = [
    {
        "title": "spider",
        "icon": "🕷️",
        "size": "tiny",
        "type_id": 1,  # beast
        "hp": 1,
        "ac": 12,
        "explanation": "A small arachnid with venomous bite.",
        "attack_to_hit": "+4",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1"}, "2": {"type": "poison", "roll": "1d4"}}),
        "special": "Poison damage (DC 9 Constitution save for half)"
    },
    {
        "title": "giant rat",
        "icon": "🐀",
        "size": "small",
        "type_id": 1,  # beast
        "hp": 7,
        "ac": 12,
        "explanation": "An oversized rodent with sharp teeth.",
        "attack_to_hit": "+4",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1d4+2"}}),
        "special": None
    },
    {
        "title": "giant weasel",
        "icon": "🐭",
        "size": "small",
        "type_id": 1,  # beast
        "hp": 9,
        "ac": 13,
        "explanation": "A large and aggressive weasel-like creature.",
        "attack_to_hit": "+5",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1d4+3"}}),
        "special": None
    },
    {
        "title": "mastiff",
        "icon": "🐕",
        "size": "medium",
        "type_id": 1,  # beast
        "hp": 5,
        "ac": 12,
        "explanation": "A large dog trained for battle.",
        "attack_to_hit": "+3",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1d6+1"}}),
        "special": "Target must succeed on DC 11 Strength saving throw or be knocked prone"
    },
    {
        "title": "giant centipede",
        "icon": "🐛",
        "size": "small",
        "type_id": 1,  # beast
        "hp": 22,
        "ac": 13,
        "explanation": "A massive many-legged creature with a venomous bite.",
        "attack_to_hit": "+4",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1d4+2"}, "2": {"type": "poison", "roll": "3d6"}}),
        "special": "Poison damage (DC 11 Constitution save for half)"
    },
    {
        "title": "giant frog",
        "icon": "🐸",
        "size": "medium",
        "type_id": 1,  # beast
        "hp": 7,
        "ac": 11,
        "explanation": "A large amphibian capable of swimming and grappling prey.",
        "attack_to_hit": "+3",
        "damage": json.dumps({"1": {"type": "piercing", "roll": "1d6+1"}}),
        "special": "Target is grappled (escape DC 11). Swim 30 ft."
    },
    {
        "title": "panther",
        "icon": "🐆",
        "size": "medium",
        "type_id": 1,  # beast
        "hp": 13,
        "ac": 12,
        "explanation": "A large spotted feline predator.",
        "attack_to_hit": "+4",
        "damage": json.dumps({"bite": {"type": "piercing", "roll": "1d6+2"}, "claw": {"type": "slashing", "roll": "1d4+2"}}),
        "special": None
    },
    {
        "title": "riding horse",
        "icon": "🐎",
        "size": "large",
        "type_id": 1,  # beast
        "hp": 13,
        "ac": 10,
        "explanation": "A domesticated horse trained for riding.",
        "attack_to_hit": "+5",
        "damage": json.dumps({"1": {"type": "bludgeoning", "roll": "2d4+3"}}),
        "special": None
    }
]

# Add creatures one by one
added_count = 0
skipped_count = 0

for creature in creatures_to_add:
    if creature["title"] in existing:
        print(
            f"⏭️  Skipping '{creature['title']}' - already exists in database")
        skipped_count += 1
        continue

    try:
        cursor.execute("""
            INSERT INTO creatures 
            (title, icon, size, creature_type_id, hp, ac, explanation, attack_to_hit, damage, special)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            creature["title"],
            creature["icon"],
            creature["size"],
            creature["type_id"],
            creature["hp"],
            creature["ac"],
            creature["explanation"],
            creature["attack_to_hit"],
            creature["damage"],
            creature["special"]
        ))
        print(
            f"✅ Added '{creature['title']}' ({creature['size']}, {creature['hp']} HP, AC {creature['ac']})")
        added_count += 1
    except Exception as e:
        print(f"❌ Error adding '{creature['title']}': {e}")

conn.commit()
conn.close()

print(f"\n📊 Summary: {added_count} added, {skipped_count} skipped")
