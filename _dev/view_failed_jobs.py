#!/usr/bin/env python3
"""
View failed AI jobs and their raw output for debugging
Helps identify patterns in parsing failures
"""

import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"


def view_failed_jobs(limit=10):
    """View recent failed jobs with their raw AI output"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, statblock, error_message, raw_ai_output, elapsed_seconds
            FROM statblock_jobs
            WHERE status = 'failed'
            ORDER BY completed_at DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        
        if not rows:
            print("No failed jobs found")
            return
        
        print(f"\n{'='*80}")
        print(f"Failed AI Jobs (Last {len(rows)} failures)")
        print(f"{'='*80}\n")
        
        for i, row in enumerate(rows, 1):
            print(f"[FAILED JOB #{row['id']}]")
            print(f"Error: {row['error_message']}")
            print(f"Time: {row['elapsed_seconds']}s")
            
            if row['raw_ai_output']:
                print(f"\nRaw AI Output:")
                print("-" * 80)
                
                # Try to pretty-print JSON if it is JSON
                try:
                    data = json.loads(row['raw_ai_output'])
                    print(json.dumps(data, indent=2))
                except json.JSONDecodeError:
                    # Not JSON, print as-is
                    print(row['raw_ai_output'][:500])  # Limit output
                    if len(row['raw_ai_output']) > 500:
                        print(f"... ({len(row['raw_ai_output'])} total chars)")
            else:
                print("(No raw AI output captured)")
            
            if row['statblock']:
                print(f"\nOriginal Stat Block (first 200 chars):")
                print("-" * 80)
                print(row['statblock'][:200])
                if len(row['statblock']) > 200:
                    print(f"... ({len(row['statblock'])} total chars)")
            
            print()
    
    except Exception as e:
        print(f"[ERROR] Failed to query database: {e}")
    finally:
        conn.close()


def view_job_details(job_id):
    """View detailed output for a specific failed job"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, status, statblock, error_message, raw_ai_output, 
                   parsed_data, elapsed_seconds, created_at, started_at, completed_at
            FROM statblock_jobs
            WHERE id = ?
        """, (job_id,))
        
        row = cursor.fetchone()
        
        if not row:
            print(f"Job #{job_id} not found")
            return
        
        print(f"\n{'='*80}")
        print(f"Job Details - #{row['id']} ({row['status'].upper()})")
        print(f"{'='*80}\n")
        
        print(f"Created:   {row['created_at']}")
        print(f"Started:   {row['started_at']}")
        print(f"Completed: {row['completed_at']}")
        print(f"Duration:  {row['elapsed_seconds']}s")
        
        if row['error_message']:
            print(f"\nError Message:")
            print(f"{row['error_message']}")
        
        print(f"\nOriginal Stat Block:")
        print("-" * 80)
        print(row['statblock'] if row['statblock'] else "(No stat block)")
        
        print(f"\nRaw AI Output:")
        print("-" * 80)
        if row['raw_ai_output']:
            try:
                data = json.loads(row['raw_ai_output'])
                print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print(row['raw_ai_output'])
        else:
            print("(No output captured)")
        
        if row['parsed_data']:
            print(f"\nParsed Data (what reached DB):")
            print("-" * 80)
            try:
                data = json.loads(row['parsed_data'])
                print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print(row['parsed_data'])
        
        print()
    
    except Exception as e:
        print(f"[ERROR] Failed to query database: {e}")
    finally:
        conn.close()


def get_failure_stats():
    """Get statistics on failures"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Total jobs
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs")
        total = cursor.fetchone()[0]
        
        # Failed jobs
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status = 'failed'")
        failed = cursor.fetchone()[0]
        
        # Completed jobs
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status = 'completed'")
        completed = cursor.fetchone()[0]
        
        # Pending jobs
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status = 'pending'")
        pending = cursor.fetchone()[0]
        
        # Common error messages
        cursor.execute("""
            SELECT error_message, COUNT(*) as count
            FROM statblock_jobs
            WHERE status = 'failed' AND error_message IS NOT NULL
            GROUP BY error_message
            ORDER BY count DESC
            LIMIT 5
        """)
        error_types = cursor.fetchall()
        
        print(f"\n{'='*80}")
        print(f"Queue Statistics")
        print(f"{'='*80}")
        print(f"Total Jobs:     {total}")
        print(f"Completed:      {completed} ({100*completed//total if total else 0}%)")
        print(f"Failed:         {failed} ({100*failed//total if total else 0}%)")
        print(f"Pending:        {pending}")
        
        if error_types:
            print(f"\nCommon Error Types:")
            for error_msg, count in error_types:
                print(f"  • {count}x: {error_msg[:60]}")
        
        print()
    
    except Exception as e:
        print(f"[ERROR] Failed to query database: {e}")
    finally:
        conn.close()


if __name__ == '__main__':
    import sys
    
    print(f"Database: {DB_PATH}\n")
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--stats':
            get_failure_stats()
        elif sys.argv[1] == '--job' and len(sys.argv) > 2:
            view_job_details(int(sys.argv[2]))
        else:
            print(f"Usage:")
            print(f"  python {Path(__file__).name}              - View last 10 failed jobs")
            print(f"  python {Path(__file__).name} --stats      - Show failure statistics")
            print(f"  python {Path(__file__).name} --job <id>   - View detailed output for job")
    else:
        view_failed_jobs()
