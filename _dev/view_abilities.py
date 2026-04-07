import sqlite3

conn = sqlite3.connect('dnd_kids_resources.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT id, code, name, emoji, color FROM abilities ORDER BY id')
rows = cursor.fetchall()

print(f"Total abilities: {len(rows)}")
print()
for row in rows:
    print(f"ID: {row['id']}, Code: {row['code']}, Name: {row['name']}")

conn.close()
