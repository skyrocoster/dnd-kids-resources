#!/usr/bin/env python3
"""
D&D Stat Block Queue Worker
Continuously processes pending statblock parsing jobs from the database.

Usage:
    python queue_worker.py [--interval SECONDS] [--verbose]

This worker:
1. Connects to the shared SQLite database
2. Polls for jobs with status='pending'
3. Processes one job at a time (AI parsing takes 10-30 sec)
4. Stores parsed_data in the job
5. Attempts to upsert creature to database
6. Updates job status to 'completed' or 'failed'
"""

import sys
from pathlib import Path
import sqlite3
import json
import time
import argparse
from datetime import datetime

# Add lib to path BEFORE importing parse_statblock
sys.path.insert(0, str(Path(__file__).parent / 'lib'))
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from parse_statblock import StatBlockParser, clean_json_string

# Database path
DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"

# Global flag to track if worker is running
_worker_running = False


def get_db_connection():
    """Create database connection with proper settings."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def upsert_creature(creature_data, conn):
    """
    Insert or update a creature in the database.
    
    Returns: creature_id (int) on success, None on failure
    """
    try:
        cursor = conn.cursor()
        creature_title = creature_data.get('title', '').strip()
        
        if not creature_title:
            return None
        
        # Look up creature_type_id from code
        creature_type_code = creature_data.get('creature_type', 'humanoid').lower()
        cursor.execute(
            "SELECT id FROM creature_types WHERE code = ?",
            (creature_type_code,)
        )
        type_row = cursor.fetchone()
        creature_type_id = type_row[0] if type_row else None
        
        # Prepare JSON fields
        attack_to_hit_json = json.dumps(creature_data.get('attack_to_hit', []))
        damage_json = json.dumps(creature_data.get('damage', []))
        special_json = json.dumps(creature_data.get('special', []))
        stats_json = json.dumps(creature_data.get('stats', {}))
        
        # Check if creature already exists
        cursor.execute(
            "SELECT id FROM creatures WHERE title = ?",
            (creature_title,)
        )
        existing = cursor.fetchone()
        
        if existing:
            # UPDATE existing creature
            creature_id = existing[0]
            cursor.execute("""
                UPDATE creatures 
                SET icon = ?, size = ?, creature_type_id = ?, hp = ?, ac = ?, 
                    explanation = ?, attack_to_hit = ?, damage = ?, special = ?, 
                    stats = ?
                WHERE id = ?
            """, (
                creature_data.get('icon', '?'),
                creature_data.get('size', 'Medium'),
                creature_type_id,
                creature_data.get('hp', 1),
                creature_data.get('ac', 10),
                creature_data.get('explanation', ''),
                attack_to_hit_json,
                damage_json,
                special_json,
                stats_json,
                creature_id
            ))
            conn.commit()
            print(f"  [UPSERT] Updated creature '{creature_title}' (ID {creature_id})")
            return creature_id
        else:
            # INSERT new creature
            cursor.execute("""
                INSERT INTO creatures 
                (title, icon, size, creature_type_id, hp, ac, explanation, 
                 attack_to_hit, damage, special, stats)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                creature_title,
                creature_data.get('icon', '?'),
                creature_data.get('size', 'Medium'),
                creature_type_id,
                creature_data.get('hp', 1),
                creature_data.get('ac', 10),
                creature_data.get('explanation', ''),
                attack_to_hit_json,
                damage_json,
                special_json,
                stats_json
            ))
            conn.commit()
            creature_id = cursor.lastrowid
            print(f"  [UPSERT] Inserted creature '{creature_title}' (ID {creature_id})")
            return creature_id
    
    except Exception as e:
        print(f"  [UPSERT] Error: {e}")
        return None


def process_job(job_id, statblock_text, parser):
    """
    Process a single job:
    1. Parse the stat block using AI (using pre-loaded parser)
    2. Store raw AI output for debugging failed jobs
    3. Store parsed_data in DB
    4. Attempt to upsert creature
    5. Update job status
    
    Args:
        job_id: Job ID from database
        statblock_text: Raw stat block text
        parser: Pre-loaded StatBlockParser instance (model already loaded)
    
    Returns: True if successful, False if failed
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    raw_ai_output = None
    
    try:
        start_time = time.time()
        
        # Update status to 'processing'
        cursor.execute(
            "UPDATE statblock_jobs SET status=?, started_at=? WHERE id=?",
            ('processing', datetime.now().isoformat(), job_id)
        )
        conn.commit()
        print(f"\n[JOB #{job_id}] Starting processing...")
        
        # Parse stat block using pre-loaded model
        print(f"[JOB #{job_id}] Parsing stat block (using loaded model)...")
        raw_response = parser.parse_and_format_for_db(statblock_text)
        
        # Store raw AI output for debugging
        raw_ai_output = raw_response if isinstance(raw_response, str) else json.dumps(raw_response)
        cursor.execute(
            "UPDATE statblock_jobs SET raw_ai_output=? WHERE id=?",
            (raw_ai_output, job_id)
        )
        conn.commit()
        
        # Parse the response
        if isinstance(raw_response, str):
            # Clean up common JSON issues (trailing commas, etc) before parsing
            cleaned_response = clean_json_string(raw_response)
            parsed_data = json.loads(cleaned_response)
        else:
            parsed_data = raw_response
        
        # Store parsed_data in job
        cursor.execute(
            "UPDATE statblock_jobs SET parsed_data=? WHERE id=?",
            (json.dumps(parsed_data), job_id)
        )
        conn.commit()
        print(f"[JOB #{job_id}] Parsing complete, attempting database upsert...")
        
        # Attempt to upsert creature
        creature_id = upsert_creature(parsed_data, conn)
        
        if creature_id is not None:
            # Success
            elapsed = int(time.time() - start_time)
            cursor.execute("""
                UPDATE statblock_jobs 
                SET status=?, creature_id=?, completed_at=?, elapsed_seconds=?
                WHERE id=?
            """, ('completed', creature_id, datetime.now().isoformat(), elapsed, job_id))
            conn.commit()
            creature_title = parsed_data.get('title', 'Unknown')
            print(f"[JOB #{job_id}] ✓ Complete! '{creature_title}' → Creature #{creature_id} ({elapsed}s)")
            conn.close()
            return True
        else:
            # Upsert failed
            raise Exception("Failed to upsert creature (see error above)")
    
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON response from parser: {str(e)}"
        print(f"[JOB #{job_id}] ✗ {error_msg}")
        cursor.execute("""
            UPDATE statblock_jobs 
            SET status=?, error_message=?, raw_ai_output=?, completed_at=?
            WHERE id=?
        """, ('failed', error_msg, raw_ai_output, datetime.now().isoformat(), job_id))
        conn.commit()
        conn.close()
        return False
    
    except Exception as e:
        error_msg = str(e)
        print(f"[JOB #{job_id}] ✗ Error: {error_msg}")
        cursor.execute("""
            UPDATE statblock_jobs 
            SET status=?, error_message=?, raw_ai_output=?, completed_at=?
            WHERE id=?
        """, ('failed', error_msg, raw_ai_output, datetime.now().isoformat(), job_id))
        conn.commit()
        conn.close()
        return False
    
    finally:
        if conn:
            conn.close()


def get_next_pending_job():
    """Get the oldest pending job from the queue."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, statblock, model_path
            FROM statblock_jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        """)
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row['id'],
                'statblock': row['statblock'],
                'model_path': row['model_path']
            }
        return None
    
    except Exception as e:
        print(f"[ERROR] Failed to get next job: {e}")
        conn.close()
        return None


def get_queue_stats():
    """Get current queue statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='pending'")
        pending = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='processing'")
        processing = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='completed'")
        completed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='failed'")
        failed = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT AVG(elapsed_seconds) 
            FROM statblock_jobs 
            WHERE status='completed' AND elapsed_seconds > 0
        """)
        avg_time_result = cursor.fetchone()
        avg_time = int(avg_time_result[0]) if avg_time_result[0] else 0
        
        conn.close()
        
        return {
            'pending': pending,
            'processing': processing,
            'completed': completed,
            'failed': failed,
            'avg_parse_time': avg_time
        }
    
    except Exception as e:
        print(f"[ERROR] Failed to get queue stats: {e}")
        conn.close()
        return None


def worker_loop(interval=2, verbose=False):
    """
    Main worker loop.
    Continuously checks for pending jobs and processes them.
    Model is loaded ON-DEMAND when a job is found, and unloaded when idle.
    
    Args:
        interval: Seconds to sleep between job checks
        verbose: Print status updates even when no jobs
    """
    global _worker_running
    _worker_running = True
    
    print("\n" + "="*60)
    print("D&D Statblock Queue Worker (On-Demand Model Loading)")
    print("="*60)
    print(f"Database: {DB_PATH}")
    print(f"Poll interval: {interval}s")
    print("Model will load when job is found, unload when idle.\n")
    print("Starting main loop... (Press Ctrl+C to stop)\n")
    
    parser = None  # Model loaded on-demand
    
    try:
        while _worker_running:
            # Get next job
            job = get_next_pending_job()
            
            if job:
                # Job found - load model if not already loaded
                if parser is None:
                    print("[LOAD] Loading AI model into memory...")
                    try:
                        parser = StatBlockParser()
                        print("[LOAD] ✓ Model loaded.\n")
                    except Exception as e:
                        print(f"[LOAD] ✗ Failed to load model: {e}")
                        print("[LOAD] Skipping this job and retrying later.\n")
                        time.sleep(interval)
                        continue
                
                # Process the job using loaded parser
                success = process_job(job['id'], job['statblock'], parser)
            else:
                # No jobs - unload model if loaded (free memory)
                if parser is not None:
                    print("[UNLOAD] No pending jobs. Unloading model from memory...")
                    parser = None
                    print("[UNLOAD] ✓ Model unloaded. Waiting for jobs...\n")
                    import gc
                    gc.collect()  # Force garbage collection
                
                # No jobs, show status if verbose
                if verbose:
                    stats = get_queue_stats()
                    if stats:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Queue: {stats['pending']} pending, "
                              f"{stats['processing']} processing, {stats['completed']} done, "
                              f"{stats['failed']} failed")
            
            # Sleep before next check
            time.sleep(interval)
    
    except KeyboardInterrupt:
        print("\n\n[STOP] Worker stopped by user")
        _worker_running = False
    
    except Exception as e:
        print(f"\n[FATAL] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        _worker_running = False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='D&D Statblock Queue Worker - processes AI parsing jobs in background'
    )
    parser.add_argument('--interval', type=int, default=2, 
                        help='Seconds between job checks (default: 2)')
    parser.add_argument('--verbose', action='store_true',
                        help='Print status updates even when idle')
    
    args = parser.parse_args()
    
    # Start worker loop (model is loaded once at startup)
    worker_loop(interval=args.interval, verbose=args.verbose)
