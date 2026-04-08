#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('dnd_kids_resources.db')
c = conn.cursor()

# List all tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()

print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

# Check if statblock_jobs exists and show schema
print("\nChecking statblock_jobs table:")
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='statblock_jobs'")
if c.fetchone():
    print("  ✓ statblock_jobs table EXISTS")
    c.execute("PRAGMA table_info(statblock_jobs)")
    columns = c.fetchall()
    print("  Columns:")
    for col in columns:
        print(f"    - {col[1]} ({col[2]})")
else:
    print("  ✗ statblock_jobs table NOT FOUND")

conn.close()
