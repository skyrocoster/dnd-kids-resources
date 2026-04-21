#!/usr/bin/env python3
"""Convert weapons-base.json entries into attack profile dictionaries.

This script reads data/Working/weapons-base.json and writes a normalized
weapon attack file that captures each weapon's attack options.

Usage:
    python _dev/convert_weapon_attacks.py
    python _dev/convert_weapon_attacks.py --input data/Working/weapons-base.json --output data/Working/weapon-attacks.json
    python _dev/convert_weapon_attacks.py --print
"""

import argparse
import json
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Convert weapons-base.json to weapon attack profiles")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).parent.parent / "data" / "Working" / "weapons-base.json",
        help="Path to the source weapons-base.json file"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent.parent / "data" / "Working" / "weapon-attacks.json",
        help="Path to the output weapon attack file"
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="Print the output to stdout instead of writing a file"
    )
    return parser.parse_args()


def build_attack_entries(weapon):
    base_entry = {
        "type": weapon.get("type"),
        "damage": weapon.get("dmg1"),
        "damage_type": weapon.get("dmgType"),
    }

    if weapon.get("range") is not None:
        base_entry["range"] = weapon["range"]

    if weapon.get("name") == "Net":
        base_entry["special"] = "Restrains target on hit; one attack per action"

    property_codes = weapon.get("property") or []
    entries = []

    if "V" in property_codes and weapon.get("2_handed_dmg") is not None:
        one_handed = dict(base_entry)
        one_handed["hands"] = 1

        two_handed = dict(base_entry)
        two_handed["hands"] = 2
        two_handed["damage"] = weapon.get("2_handed_dmg")

        entries.extend([one_handed, two_handed])
    elif "2H" in property_codes:
        entry = dict(base_entry)
        entry["hands"] = 2
        entries.append(entry)
    else:
        entry = dict(base_entry)
        entry["hands"] = 1
        entries.append(entry)

    return entries


def convert_weapons(input_path):
    with open(input_path, "r", encoding="utf-8") as f:
        source = json.load(f)

    result = []
    for weapon in source.get("baseitem", []):
        attack_profiles = build_attack_entries(weapon)
        result.append({
            "name": weapon.get("name"),
            "attack": attack_profiles,
        })

    return result


def write_output(output_path, data):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main():
    args = parse_args()
    attack_data = convert_weapons(args.input)

    if args.print:
        print(json.dumps(attack_data, indent=2, ensure_ascii=False))
    else:
        write_output(args.output, attack_data)
        print(f"Wrote weapon attack profiles to {args.output}")


if __name__ == "__main__":
    main()
