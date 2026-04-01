import sqlite3

conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Find all spells with their IDs
cursor.execute(
    "SELECT c.id, c.title, s.to_hit FROM cards c JOIN spells s ON c.id = s.card_id ORDER BY c.id")

results = cursor.fetchall()
for card_id, title, to_hit in results:
    if to_hit and ('+{save}' in to_hit or '+{target}' in to_hit):
        print(f"WRONG - ID {card_id}: {title}")
        print(f"  to_hit: {to_hit}")
    elif to_hit:
        print(f"ID {card_id}: {title}")
        print(f"  to_hit: {to_hit}")

conn.close()
