#!/usr/bin/env python3
"""Investigate specific test failures"""
import requests
import json

print('=== INVESTIGATING FAILURES ===\n')

# 1. Skills table issue
print('1. SKILLS ENDPOINT')
resp = requests.get('http://localhost:8000/api/skills')
print(f'   Status: {resp.status_code}')
print(f'   Response: {resp.text[:200]}\n')

# 2. Spell by ID issue - check what spell IDs look like
print('2. SPELL ID FORMAT')
resp = requests.get('http://localhost:8000/api/spells')
if resp.status_code == 200:
    spells = resp.json()
    print(f'   First 3 spell objects:')
    for spell in spells[:3]:
        spell_id = spell.get("id", "N/A")
        keys = list(spell.keys())[:5]
        print(f'     ID: {spell_id} ({type(spell_id).__name__}) | Keys: {keys}')
print()

# 3. Check existing players for nested resources
print('3. EXISTING PLAYERS')
resp = requests.get('http://localhost:8000/api/players')
if resp.status_code == 200:
    players = resp.json()
    for player in players[:5]:
        player_id = player.get('id')
        print(f'   Player ID: {player_id} ({type(player_id).__name__})')
        resp_spells = requests.get(f'http://localhost:8000/api/players/{player_id}/spells')
        print(f'     /spells: {resp_spells.status_code}')
        if resp_spells.status_code != 200:
            print(f'       Error: {resp_spells.text[:100]}')
