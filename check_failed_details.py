#!/usr/bin/env python3
"""Get detailed failed job output"""
import sqlite3
from pathlib import Path
import json

db_path = Path("dnd_kids_resources.db")

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("\n=== FAILED JOB #4 - CREATURE ===\n")

cursor.execute("""
    SELECT id, job_type, statblock, error_message, raw_ai_output, parsed_data
    FROM statblock_jobs
    WHERE id = 4
""")

job = cursor.fetchone()

if job:
    print(f"Error Message: {job['error_message']}\n")
    
    print("="*80)
    print("RAW AI OUTPUT (first 2000 chars):")
    print("="*80)
    output = job['raw_ai_output'] or "No output"
    print(output[:2000])
    if len(output) > 2000:
        print(f"\n... ({len(output)} total characters)\n")
    
    print("\n" + "="*80)
    print("STAT BLOCK INPUT (first 1000 chars):")
    print("="*80)
    statblock = job['statblock'] or "No statblock"
    print(statblock[:1000])
    if len(statblock) > 1000:
        print(f"\n... ({len(statblock)} total characters)\n")

print("\n" + "="*80)
print("FAILED JOB #3 - CREATURE")
print("="*80 + "\n")

cursor.execute("""
    SELECT id, job_type, statblock, error_message, raw_ai_output, parsed_data
    FROM statblock_jobs
    WHERE id = 3
""")

job = cursor.fetchone()

if job:
    print(f"Error Message: {job['error_message']}\n")
    
    print("="*80)
    print("RAW AI OUTPUT (first 2000 chars):")
    print("="*80)
    output = job['raw_ai_output'] or "No output"
    print(output[:2000])
    if len(output) > 2000:
        print(f"\n... ({len(output)} total characters)\n")
    
    print("\n" + "="*80)
    print("STAT BLOCK INPUT (first 1000 chars):")
    print("="*80)
    statblock = job['statblock'] or "No statblock"
    print(statblock[:1000])
    if len(statblock) > 1000:
        print(f"\n... ({len(statblock)} total characters)\n")

conn.close()
