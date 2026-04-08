#!/usr/bin/env python3
"""
Migrate spell levels to correct format: 'cantrip' or '1'-'9' (not 'level1', 'level2', etc)
"""

import sqlite3
from pathlib import Path
import re

DB_PATH = Path("dnd_kids_resources.db")

if not DB_PATH.exists():
    print(f"Database not found at {DB_PATH}")
    exit(1)

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

print("\n=== SPELL LEVEL MIGRATION ===\n")

# Find all spells with incorrect level format
cursor.execute("SELECT id, title, level FROM spells")
rows = cursor.fetchall()

corrections = []

for spell_id, title, level in rows:
    # Check for "level1" through "level9" format
    match = re.match(r'level(\d)', level)
    if match:
        new_level = match.group(1)
        corrections.append((new_level, spell_id, title, level))
        print(f"🔧 {title}")
        print(f"   OLD: {repr(level)} → NEW: {repr(new_level)}")

if not corrections:
    print("✓ All spells already have correct level format!")
else:
    print(f"\nApplying {len(corrections)} corrections...")
    
    for new_level, spell_id, title, old_level in corrections:
        cursor.execute("UPDATE spells SET level = ? WHERE id = ?", (new_level, spell_id))
        print(f"  ✓ Updated #{spell_id}: {title}")
    
    conn.commit()
    print(f"\n✅ Migration complete!")

# Verify results
print("\n=== VERIFICATION ===\n")
cursor.execute("SELECT id, title, level FROM spells ORDER BY level, title")
rows = cursor.fetchall()

for spell_id, title, level in rows:
    status = "✓" if (level == "cantrip" or level in "123456789") else "✗"
    print(f"{status} #{spell_id:2} | {title:25} | level: {repr(level)}")

conn.close()
