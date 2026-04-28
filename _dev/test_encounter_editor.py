#!/usr/bin/env python3
"""
Lightweight integration test for the Encounter Editor API.

Steps covered:
 - GET /api/monsters (read-only)
 - POST /api/encounters (create encounter with empty units)
 - PUT /api/encounters/<id> (update units to include one monster)
 - GET /api/encounters/<id> (verify persisted data)
 - DELETE /api/encounters/<id> (cleanup)

This test is intentionally small and non-invasive: it creates a single encounter and deletes it.
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

API_BASE_URL = "http://127.0.0.1:8000"


def safe_print(msg):
    print(msg)


def main():
    safe_print("\n=== Encounter Editor API Smoke Test ===")

    # 1) GET monsters (ensure endpoint is responsive)
    try:
        resp = requests.get(f"{API_BASE_URL}/api/monsters?limit=1", timeout=5)
        if resp.status_code != 200:
            safe_print(f"✗ GET /api/monsters failed: HTTP {resp.status_code} - {resp.text}")
            return 2
        monsters_payload = resp.json()
        if not isinstance(monsters_payload, dict) or 'results' not in monsters_payload:
            safe_print(f"✗ Unexpected monsters payload: {monsters_payload}")
            return 2
        safe_print("✓ /api/monsters responded with expected structure")
    except Exception as e:
        safe_print(f"✗ Error calling /api/monsters: {e}")
        return 2

    # pick a monster_id if available for a later update
    monster_id = None
    try:
        results = monsters_payload.get('results') or []
        if results:
            first = results[0]
            monster_id = first.get('id')
    except Exception:
        monster_id = None

    # 2) POST create a new encounter (empty units)
    unique_name = f"Test Encounter {datetime.utcnow().isoformat()}"
    payload = {"name": unique_name, "units": []}
    try:
        resp = requests.post(f"{API_BASE_URL}/api/encounters", json=payload, timeout=5)
        if resp.status_code not in (200, 201):
            safe_print(f"✗ POST /api/encounters failed: HTTP {resp.status_code} - {resp.text}")
            return 2
        created = resp.json()
        encounter_id = created.get('id')
        if not encounter_id:
            safe_print(f"✗ POST did not return an encounter id: {created}")
            return 2
        safe_print(f"✓ Created encounter id={encounter_id}")
    except Exception as e:
        safe_print(f"✗ Error creating encounter: {e}")
        return 2

    # 3) PUT update encounter to add one unit (if we have a monster id)
    if monster_id:
        unit = {
            "monster_id": monster_id,
            "name": "Test Unit",
            "hp_max": 1,
            "hp_current": 1,
            "ac": 10,
            "status": "alive",
            "conditions": []
        }
        try:
            resp = requests.put(f"{API_BASE_URL}/api/encounters/{encounter_id}", json={"units": [unit]}, timeout=5)
            if resp.status_code != 200:
                safe_print(f"✗ PUT /api/encounters/{encounter_id} failed: HTTP {resp.status_code} - {resp.text}")
                # attempt cleanup before exit
                requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
                return 2
            updated = resp.json()
            units = updated.get('units') or []
            if not isinstance(units, list) or len(units) != 1:
                safe_print(f"✗ Updated encounter units not as expected: {updated}")
                requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
                return 2
            if units[0].get('monster_id') != monster_id:
                safe_print(f"✗ Monster ID mismatch after update: expected {monster_id}, got {units[0].get('monster_id')}")
                requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
                return 2
            safe_print(f"✓ Updated encounter {encounter_id} with one unit (monster_id={monster_id})")
        except Exception as e:
            safe_print(f"✗ Error updating encounter: {e}")
            requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
            return 2
    else:
        safe_print("i) No monster id available from /api/monsters; skipping PUT update step")

    # 4) GET to verify persistence
    try:
        resp = requests.get(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
        if resp.status_code != 200:
            safe_print(f"✗ GET /api/encounters/{encounter_id} failed: HTTP {resp.status_code} - {resp.text}")
            requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
            return 2
        fetched = resp.json()
        if fetched.get('id') != encounter_id or fetched.get('name') != unique_name:
            safe_print(f"✗ Fetched encounter did not match: {fetched}")
            requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
            return 2
        safe_print(f"✓ Verified encounter persisted (id={encounter_id})")
    except Exception as e:
        safe_print(f"✗ Error fetching encounter: {e}")
        requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
        return 2

    # 5) Cleanup: DELETE the encounter
    try:
        resp = requests.delete(f"{API_BASE_URL}/api/encounters/{encounter_id}", timeout=5)
        if resp.status_code != 200:
            safe_print(f"⚠️ Cleanup DELETE returned HTTP {resp.status_code} - {resp.text}")
        else:
            safe_print(f"✓ Deleted test encounter {encounter_id}")
    except Exception as e:
        safe_print(f"⚠️ Error during cleanup DELETE: {e}")

    safe_print("\nAll done.")
    return 0


if __name__ == '__main__':
    exit(main())
