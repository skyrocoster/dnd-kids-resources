#!/usr/bin/env python3
import json
from pathlib import Path

seed_file = Path("data/seed_spells.json")
with open(seed_file, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"✓ Valid JSON - {len(data)} spells loaded")
print(f"\nFirst 3 spells:")
for i, spell in enumerate(data[:3], 1):
    print(f"  {i}. {spell['title']} (Level {spell['level']}) - {spell['school']}")
    print(f"     Damage: {spell['damage']}")
    print()
