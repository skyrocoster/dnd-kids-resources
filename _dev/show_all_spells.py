import sqlite3

conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

# Get all spells with their templates
cursor.execute("""
    SELECT c.id, c.title, s.school, s.to_hit, s.damage, s.heal 
    FROM cards c 
    JOIN spells s ON c.id = s.card_id 
    WHERE c.card_type = 'spell'
    ORDER BY c.id
""")

results = cursor.fetchall()

print("\n" + "="*140)
print(f"{'ID':<4} {'TITLE':<30} {'SCHOOL':<18} {'TO_HIT':<45} {'DAMAGE':<40}")
print("="*140)

for card_id, title, school, to_hit, damage, heal in results:
    to_hit_str = to_hit if to_hit else "-"
    damage_str = damage if damage else "-"

    print(f"{card_id:<4} {title:<30} {school:<18} {to_hit_str:<45} {damage_str:<40}")

print("="*140)
print(f"Total spells: {len(results)}\n")

conn.close()
