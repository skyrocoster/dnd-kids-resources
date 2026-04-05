#!/usr/bin/env python
"""Test script to verify stats_grid is in the API response."""

import subprocess
import json
import time
import sys
import urllib.request
import urllib.error


def test_stats_grid():
    # Start Flask server
    print("Starting Flask server...")
    proc = subprocess.Popen(
        ['python', '_dev/server_flask.py'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    try:
        # Wait for server to start
        time.sleep(3)

        # Test API
        print("Testing /api/creatures/cat endpoint...")
        try:
            with urllib.request.urlopen('http://localhost:8000/api/creatures/cat') as response:
                data = json.loads(response.read().decode('utf-8'))

                # Check for stats_grid
                has_stats_grid = False
                for detail in data.get('details', []):
                    if detail.get('type') == 'stats_grid':
                        has_stats_grid = True
                        print(f"✓ Found stats_grid!")
                        print(f"  Content: {detail.get('content')}")
                        break

                if not has_stats_grid:
                    print("✗ stats_grid NOT found in details")
                    print(f"Details count: {len(data.get('details', []))}")
                    print("Detail types:")
                    for i, detail in enumerate(data.get('details', [])):
                        print(
                            f"  {i}: {detail.get('label')} (type: {detail.get('type', 'none')})")

                # Also check for stats_line for backward compat
                print(f"\nstats_line: {data.get('stats_line')}")

        except urllib.error.URLError as e:
            print(f"✗ Failed to connect to server: {e}")
            return False

    finally:
        # Stop server
        print("\nStopping server...")
        proc.terminate()
        proc.wait(timeout=5)

    return True


if __name__ == '__main__':
    sys.exit(0 if test_stats_grid() else 1)
