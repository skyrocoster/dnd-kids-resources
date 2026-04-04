import sqlite3
import json

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# Get spell 55
cursor.execute('SELECT id, title, heal FROM spells WHERE id = 55')
spell55 = cursor.fetchone()
print('Spell 55 (Wither and Bloom):')
print(f'  ID: {spell55[0]}')
print(f'  Title: {spell55[1]}')
print(f'  Heal: {spell55[2]}')
print()

# Get other spells with heal values
cursor.execute(
    "SELECT id, title, heal FROM spells WHERE heal IS NOT NULL AND heal != ''")
heals = cursor.fetchall()
print('Other spells with heal values:')
for spell in heals:
    print(f"  ID {spell[0]} ({spell[1]}): {spell[2]}")

conn.close()
