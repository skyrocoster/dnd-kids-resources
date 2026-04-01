import sqlite3

conn = sqlite3.connect("dnd_kids_resources.db")
cursor = conn.cursor()

cursor.execute("""
    SELECT c.title, s.to_hit, s.damage, s.heal 
    FROM cards c 
    JOIN spells s ON c.id = s.card_id 
    WHERE c.title IN ('Healing Word', 'Ice Knife', 'Goodberry', 'Thunderwave')
    ORDER BY c.title
""")

for title, to_hit, damage, heal in cursor.fetchall():
    print(f"\n{title}:")
    print(f"  to_hit:  {to_hit if to_hit else '(none)'}")
    print(f"  damage:  {damage if damage else '(none)'}")
    print(f"  heal:    {heal if heal else '(none)'}")

conn.close()
