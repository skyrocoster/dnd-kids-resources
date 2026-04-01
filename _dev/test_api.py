#!/usr/bin/env python3
"""Test the spell API endpoint."""

import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:8000/api/spells')
    data = json.loads(response.read().decode())

    print(f"✅ Successfully fetched {len(data)} spells from API\n")

    # Show first spell as example
    if data:
        spell = data[0]
        print(f"📊 Sample Spell: {spell['title']}")
        print(f"   Icon: {spell['icon']}")
        print(f"   Level: {spell['level']}")
        print(f"   School: {spell['school']}")
        print(f"   Details: {len(spell.get('details', []))} entries")
        print(f"\n   First detail:")
        if spell.get('details'):
            d = spell['details'][0]
            print(f"     Label: {d.get('label')}")
            print(f"     Content: {str(d.get('content'))[:80]}...")

except Exception as e:
    print(f"❌ Error: {e}")
