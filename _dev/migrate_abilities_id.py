"""
Migration: Add id column to abilities table and make it primary key.
"""
import sqlite3
from pathlib import Path

db_path = Path('dnd_kids_resources.db')
backup_name = db_path.with_stem(f"{db_path.stem}.backup.migration_abilities")

# Create backup
import shutil
shutil.copy(db_path, backup_name)
print(f"✅ Backup created: {backup_name}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Step 1: Create new abilities table with id column
    cursor.execute('''
        CREATE TABLE abilities_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL
        )
    ''')
    print("✅ Created new abilities table with id column")
    
    # Step 2: Copy data from old table to new
    cursor.execute('''
        INSERT INTO abilities_new (code, name, emoji, color)
        SELECT code, name, emoji, color FROM abilities
    ''')
    print("✅ Copied data to new table")
    
    # Step 3: Drop old table
    cursor.execute('DROP TABLE abilities')
    print("✅ Dropped old abilities table")
    
    # Step 4: Rename new table
    cursor.execute('ALTER TABLE abilities_new RENAME TO abilities')
    print("✅ Renamed new table to abilities")
    
    conn.commit()
    print("\n✅ Migration completed successfully")
    
    # List current abilities
    cursor.execute('SELECT id, code, name FROM abilities ORDER BY id')
    rows = cursor.fetchall()
    print(f"\nCurrent abilities ({len(rows)} total):")
    for row in rows:
        print(f"  ID {row[0]}: {row[1]} ({row[2]})")
    
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()
