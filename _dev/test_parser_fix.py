#!/usr/bin/env python3
"""
Test the JSON cleaning fix on job #1 stat block
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'lib'))
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

import sqlite3
from parse_statblock import StatBlockParser, clean_json_string

# Get the stat block from job 1
print("Loading job #1 stat block from database...")
conn = sqlite3.connect(str(Path(__file__).parent.parent / "dnd_kids_resources.db"))
cursor = conn.cursor()
cursor.execute('SELECT statblock FROM statblock_jobs WHERE id = 1')
result = cursor.fetchone()
conn.close()

if not result:
    print("Job #1 not found")
    sys.exit(1)

statblock = result[0]

print("\nTesting parser on job #1 stat block...\n")

# Test the parser
print("[1/3] Initializing parser...")
try:
    parser = StatBlockParser()
    print("✓ Parser loaded")
except Exception as e:
    print(f"✗ Failed to load parser: {e}")
    sys.exit(1)

print("\n[2/3] Parsing stat block...")
try:
    raw_response = parser.parse_and_format_for_db(statblock)
    print("✓ AI parsing complete")
    print(f"  Response length: {len(raw_response)} chars")
except Exception as e:
    print(f"✗ Parser error: {e}")
    sys.exit(1)

print("\n[3/3] Cleaning and validating JSON...")
try:
    # Clean up the response
    cleaned = clean_json_string(raw_response)
    
    # Try to parse it
    data = json.loads(cleaned)
    
    print("✓ SUCCESS! JSON cleaned and parsed correctly")
    print(f"\nExtracted creature data:")
    print(f"  Title:     {data.get('title', 'Unknown')}")
    print(f"  Size:      {data.get('size', '?')}")
    print(f"  Type:      {data.get('creature_type', '?')}")
    print(f"  HP:        {data.get('hp', '?')}")
    print(f"  AC:        {data.get('ac', '?')}")
    print(f"  Attacks:   {len(data.get('attack_to_hit', []))} weapons")
    print(f"  Special:   {len(data.get('special', []))} abilities")
    
except json.JSONDecodeError as e:
    print(f"✗ JSON parsing FAILED: {e}")
    print(f"\nFirst 500 chars of response:")
    print(raw_response[:500])
    print("\nTrying to show where error is...")
    print(f"Error at position {e.pos}: {raw_response[max(0, e.pos-50):e.pos+50]}")
    sys.exit(1)
