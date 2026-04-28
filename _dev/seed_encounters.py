#!/usr/bin/env python3
"""
Seed encounters from JSON file into the database
"""
import sys
import json
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

import sqlite3

# Get absolute path to database
DB_PATH = str(Path(__file__).parent.parent / "dnd_kids_resources.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def seed_encounters():
    """Load encounters from seed file and insert into database"""
    seed_file = Path(__file__).parent.parent / "data" / "seeds" / "seed_encounters.json"
    
    if not seed_file.exists():
        print(f"Seed file not found: {seed_file}")
        return
    
    with open(seed_file, 'r') as f:
        encounters = json.load(f)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear existing encounters
    cursor.execute("DELETE FROM encounter")
    
    # Insert encounters
    for encounter in encounters:
        name = encounter.get('name', 'Unnamed Encounter')
        units = encounter.get('units', [])
        
        cursor.execute("""
            INSERT INTO encounter (name, units)
            VALUES (?, ?)
        """, (name, json.dumps(units)))
    
    conn.commit()
    conn.close()
    
    print(f"Seeded {len(encounters)} encounters into database")

if __name__ == '__main__':
    seed_encounters()
