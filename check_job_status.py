#!/usr/bin/env python3
"""Check statblock job status"""
import sqlite3
from pathlib import Path

db_path = Path("dnd_kids_resources.db")

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

print("\n=== STATBLOCK JOB STATUS ===\n")

# Get job counts by status
statuses = ['pending', 'processing', 'completed', 'failed']
for status in statuses:
    cursor.execute('SELECT COUNT(*) FROM statblock_jobs WHERE status = ?', (status,))
    count = cursor.fetchone()[0]
    print(f"{status.upper():12} : {count}")

print("\n=== FAILED JOBS DETAILS ===\n")

# Get failed jobs
cursor.execute("""
    SELECT id, job_type, error_message, elapsed_seconds, created_at
    FROM statblock_jobs
    WHERE status = 'failed'
    ORDER BY completed_at DESC
    LIMIT 10
""")

failed_jobs = cursor.fetchall()

if not failed_jobs:
    print("No failed jobs found!")
else:
    for job_id, job_type, error, elapsed, created in failed_jobs:
        print(f"Job #{job_id} ({job_type})")
        print(f"  Created: {created}")
        print(f"  Time: {elapsed}s")
        print(f"  Error: {error[:150]}{'...' if len(error or '') > 150 else ''}")
        print()

conn.close()
