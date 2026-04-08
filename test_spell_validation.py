#!/usr/bin/env python3
"""Test spell level validation"""
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from spell_validators import normalize_spell_level, validate_spell_level

print("\n=== SPELL LEVEL VALIDATION TESTS ===\n")

test_cases = [
    ('cantrip', True, 'cantrip', 'Valid cantrip'),
    ('1', True, '1', 'Valid level 1'),
    ('2', True, '2', 'Valid level 2'),
    ('9', True, '9', 'Valid level 9'),
    ('level1', True, '1', 'Old format level1'),
    ('level8', True, '8', 'Old format level8'),
    ('level9', True, '9', 'Old format level9'),
    ('invalid', False, None, 'Invalid format'),
    ('level10', False, None, 'Out of range'),
    ('0', False, None, 'Level 0'),
    (None, False, None, 'None value'),
]

print("Testing normalize_spell_level():\n")

passed = 0
failed = 0

for input_val, should_pass, expected, description in test_cases:
    try:
        result = normalize_spell_level(input_val)
        if should_pass:
            if result == expected:
                print(f"✓ {description:30} | {repr(input_val):12} → {repr(result)}")
                passed += 1
            else:
                print(f"✗ {description:30} | Got {repr(result)}, expected {repr(expected)}")
                failed += 1
        else:
            print(f"✗ {description:30} | Should have raised ValueError for {repr(input_val)}")
            failed += 1
    except ValueError as e:
        if not should_pass:
            print(f"✓ {description:30} | {repr(input_val):12} → ValueError (expected)")
            passed += 1
        else:
            print(f"✗ {description:30} | Unexpected error: {e}")
            failed += 1

print(f"\n{'='*60}")
print(f"Results: {passed} passed, {failed} failed")
print(f"{'='*60}\n")
