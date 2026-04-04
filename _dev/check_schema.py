import sqlite3

conn = sqlite3.connect('dnd_kids_resources.db')
cursor = conn.cursor()

# First, get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Available tables:")
for table in tables:
    print(f"  - {table[0]}")

# Check spells table schema
print("\nSpells table columns:")
cursor.execute("PRAGMA table_info(spells)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Get spell data
print("\n" + "="*80)
cursor.execute('SELECT * FROM spells LIMIT 1')
print("Sample spell record:")
row = cursor.fetchone()
if row:
    print(row)

conn.close()
