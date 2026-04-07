"""
Migration: Add type column to abilities table for categorizing stats, skills, and modifiers.
"""
import sqlite3
from pathlib import Path
import shutil

db_path = Path('dnd_kids_resources.db')
backup_name = db_path.with_stem(f"{db_path.stem}.backup.migration_abilities_type")

# Create backup
shutil.copy(db_path, backup_name)
print(f"✅ Backup created: {backup_name}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Step 1: Create new abilities table with type column
    cursor.execute('''
        CREATE TABLE abilities_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'stat',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("✅ Created new abilities table with type column")
    
    # Step 2: Copy data from old table to new (all current abilities are 'stat' or 'modifier')
    cursor.execute('''
        INSERT INTO abilities_new (code, name, emoji, color, type, created_at)
        SELECT code, name, emoji, color, 
               CASE WHEN code IN ('sam', 'sad') THEN 'modifier' ELSE 'stat' END as type,
               CURRENT_TIMESTAMP
        FROM abilities
    ''')
    print("✅ Copied data to new table and set types")
    
    # Step 3: Drop old table
    cursor.execute('DROP TABLE abilities')
    print("✅ Dropped old abilities table")
    
    # Step 4: Rename new table
    cursor.execute('ALTER TABLE abilities_new RENAME TO abilities')
    print("✅ Renamed new table to abilities")
    
    conn.commit()
    print("\n✅ Migration completed successfully")
    
    # List current abilities with types
    cursor.execute('SELECT id, code, type, name FROM abilities ORDER BY type, id')
    rows = cursor.fetchall()
    print(f"\nCurrent abilities ({len(rows)} total) by type:")
    
    current_type = None
    for row in rows:
        ability_type = row[2]
        if ability_type != current_type:
            current_type = ability_type
            print(f"\n  {ability_type.upper()}:")
        print(f"    ID {row[0]}: {row[1].upper()} - {row[3]}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()
