import sqlite3
import json

conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Add stats column if it doesn't exist
try:
    cursor.execute("ALTER TABLE creatures ADD COLUMN stats TEXT")
    print("✅ Added stats column to creatures table")
except sqlite3.OperationalError as e:
    if "already exists" in str(e):
        print("ℹ️  stats column already exists")
    else:
        raise

# Define creature ability scores (STR, DEX, CON, INT, WIS, CHA)
creature_stats = {
    "cat": {"str": 3, "dex": 15, "con": 10, "int": 3, "wis": 12, "cha": 7},
    "spider": {"str": 2, "dex": 14, "con": 10, "int": 1, "wis": 10, "cha": 2},
    "giant rat": {"str": 7, "dex": 15, "con": 10, "int": 2, "wis": 10, "cha": 4},
    "giant weasel": {"str": 9, "dex": 16, "con": 10, "int": 4, "wis": 11, "cha": 5},
    "mastiff": {"str": 13, "dex": 12, "con": 15, "int": 3, "wis": 12, "cha": 6},
    "giant centipede": {"str": 15, "dex": 14, "con": 13, "int": 1, "wis": 9, "cha": 2},
    "giant frog": {"str": 12, "dex": 13, "con": 13, "int": 2, "wis": 10, "cha": 3},
    "panther": {"str": 15, "dex": 16, "con": 13, "int": 3, "wis": 12, "cha": 5},
    "riding horse": {"str": 16, "dex": 10, "con": 16, "int": 2, "wis": 12, "cha": 7},
    "wolf": {"str": 12, "dex": 15, "con": 13, "int": 3, "wis": 12, "cha": 6},
    "giant crab": {"str": 15, "dex": 13, "con": 13, "int": 1, "wis": 9, "cha": 3},
    "giant wolf spider": {"str": 15, "dex": 16, "con": 13, "int": 1, "wis": 12, "cha": 3},
    "fox": {"str": 5, "dex": 16, "con": 10, "int": 3, "wis": 12, "cha": 6},
    "dimetrodon": {"str": 19, "dex": 10, "con": 19, "int": 2, "wis": 12, "cha": 7},
}

updated_count = 0

for creature_name, stats in creature_stats.items():
    try:
        stats_json = json.dumps(stats)
        cursor.execute(
            "UPDATE creatures SET stats = ? WHERE LOWER(title) = LOWER(?)",
            (stats_json, creature_name)
        )
        print(f"✅ Updated '{creature_name}' with stats")
        updated_count += 1
    except Exception as e:
        print(f"❌ Error updating '{creature_name}': {e}")

conn.commit()
conn.close()

print(f"\n📊 Summary: {updated_count} creatures updated with ability scores")
