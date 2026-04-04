import sqlite3

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()
cursor.execute('SELECT id, title, explanation FROM spells ORDER BY title')
rows = cursor.fetchall()

for row in rows:
    print(f'\n--- ID: {row[0]} ---')
    print(f'Title: {row[1]}')
    print(f'Explanation: {row[2]}')

conn.close()
