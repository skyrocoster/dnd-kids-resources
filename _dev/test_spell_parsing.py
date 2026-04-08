#!/usr/bin/env python3
"""
Test script for spell parsing via the queue system.

Tests:
1. Submit a spell parsing job via API
2. Check job status
3. Verify parsed spell data in database
"""

import requests
import json
import time
import sqlite3
from pathlib import Path

# Configuration
API_BASE_URL = "http://127.0.0.1:8000"
DB_PATH = Path(__file__).parent.parent / "dnd_kids_resources.db"

# Test spell data
TEST_SPELL = """Fire Bolt
Evocation cantrip

Casting Time: 1 action
Range: 120 feet
Components: V, S
Duration: Instantaneous

You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn't being worn or carried.

This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).
"""


def test_spell_submission():
    """Test 1: Submit a spell parsing job"""
    print("\n" + "="*60)
    print("TEST 1: Submit Spell Parsing Job")
    print("="*60)
    
    payload = {
        "spell": TEST_SPELL,
        "job_type": "spell"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/queue/submit/spell",
            json=payload,
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            print(f"✓ Spell job submitted successfully")
            print(f"  Job ID: {data['job_id']}")
            print(f"  Status: {data['status']}")
            print(f"  Job Type: {data['job_type']}")
            return data['job_id']
        else:
            print(f"✗ Failed to submit job (HTTP {response.status_code})")
            print(f"  Response: {response.text}")
            return None
    
    except Exception as e:
        print(f"✗ Error submitting spell job: {e}")
        return None


def test_job_status(job_id, max_wait=60):
    """Test 2: Check job status and wait for completion"""
    print("\n" + "="*60)
    print(f"TEST 2: Check Job Status (Job #{job_id})")
    print("="*60)
    
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        try:
            response = requests.get(
                f"{API_BASE_URL}/api/queue/{job_id}",
                timeout=5
            )
            
            if response.status_code == 200:
                job_data = response.json()
                status = job_data.get('status', 'unknown')
                
                print(f"  Job #{job_id}: {status.upper()}")
                
                if status == 'completed':
                    print(f"  ✓ Job completed in {job_data.get('elapsed_seconds', '?')} seconds")
                    if job_data.get('spell_id'):
                        print(f"  Spell ID: {job_data['spell_id']}")
                    if job_data.get('parsed_data'):
                        print(f"  Parsed Data: {json.dumps(job_data['parsed_data'], indent=2)}")
                    return True
                elif status == 'failed':
                    print(f"  ✗ Job failed")
                    if job_data.get('error_message'):
                        print(f"  Error: {job_data['error_message']}")
                    return False
                elif status == 'processing':
                    progress = job_data.get('progress_percent', 0)
                    print(f"  Processing... {progress}%")
                    time.sleep(2)
                    continue
                else:  # pending
                    print(f"  Waiting for processing...")
                    time.sleep(2)
                    continue
            else:
                print(f"✗ Error checking job status: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
        
        except Exception as e:
            print(f"✗ Error checking job: {e}")
            return False
    
    print(f"✗ Job did not complete within {max_wait} seconds")
    return False


def test_database_insertion(job_id):
    """Test 3: Verify spell was inserted into database"""
    print("\n" + "="*60)
    print("TEST 3: Verify Database Insertion")
    print("="*60)
    
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get job details
        cursor.execute("""
            SELECT spell_id, parsed_data 
            FROM statblock_jobs 
            WHERE id = ?
        """, (job_id,))
        
        job_row = cursor.fetchone()
        
        if not job_row:
            print(f"✗ Job not found in database")
            conn.close()
            return False
        
        spell_id = job_row['spell_id']
        if not spell_id:
            print(f"✗ Job completed but no spell_id set")
            conn.close()
            return False
        
        # Get spell details
        cursor.execute("""
            SELECT * FROM spells WHERE id = ?
        """, (spell_id,))
        
        spell_row = cursor.fetchone()
        
        if not spell_row:
            print(f"✗ Spell not found in database (ID {spell_id})")
            conn.close()
            return False
        
        print(f"✓ Spell found in database")
        print(f"  Spell ID: {spell_id}")
        print(f"  Title: {spell_row['title']}")
        print(f"  Level: {spell_row['level']}")
        print(f"  School: {spell_row['school']}")
        print(f"  Icon: {spell_row['icon']}")
        print(f"  Explanation: {spell_row['explanation']}")
        
        # Parse and display JSON fields
        if spell_row['damage']:
            try:
                damage = json.loads(spell_row['damage'])
                print(f"  Damage: {json.dumps(damage, indent=4)}")
            except:
                pass
        
        conn.close()
        return True
    
    except Exception as e:
        print(f"✗ Error checking database: {e}")
        return False


def main():
    """Run all tests"""
    print("\n\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*16 + "SPELL PARSING WORKFLOW TEST" + " "*16 + "║")
    print("╚" + "="*58 + "╝")
    
    # Test 1: Submit job
    job_id = test_spell_submission()
    if not job_id:
        print("\n✗ FAILED: Could not submit spell job")
        return False
    
    # Test 2: Wait for completion
    success = test_job_status(job_id)
    if not success:
        print(f"\n✗ FAILED: Job did not complete successfully")
        return False
    
    # Test 3: Verify database
    success = test_database_insertion(job_id)
    if not success:
        print(f"\n✗ FAILED: Spell not properly inserted into database")
        return False
    
    print("\n" + "="*60)
    print("✓ ALL TESTS PASSED!")
    print("="*60)
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
