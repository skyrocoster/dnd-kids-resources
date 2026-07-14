#!/usr/bin/env python3
"""Stub: transform seed_monsters.json rows to the M1 target shape.

M2 will flesh out `migrate()` with the actual transform (AC reshape,
tag-stripping, etc.). For now it round-trips the seed unchanged.
"""

import json
from pathlib import Path

SEEDS_DIR = Path(__file__).parent.parent / "data" / "seeds"


def migrate(rows: list) -> list:
    """Transform each monster row to the target shape (M1 contract).

    Current implementation is a round-trip stub.
    """
    return rows


if __name__ == "__main__":
    seed_path = SEEDS_DIR / "seed_monsters.json"
    monsters = json.loads(seed_path.read_text(encoding="utf-8"))
    result = migrate(monsters)
    seed_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Migrated {len(result)} monsters (round-trip, no changes).")
