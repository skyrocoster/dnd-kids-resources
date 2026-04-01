#!/usr/bin/env python3
"""
Migrate spell data from spells.json to the database.
Uses template-based roll system (Option A).
Converts JSON roll objects to template strings like {1}{d20}+{SAM}
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = "dnd_kids_resources.db"
SPELLS_JSON = "data/spells.json"


def convert_roll_to_json(roll_obj):
    """
    Convert a roll object from JSON to structured JSON format.

    Returns a dict with:
    - "roll": "1d20"
    - "numerics": ["DEX", "SAM"]  (optional, only if present)
    - "types": ["fire", "cold"]   (optional, only if present)
    - "save": true/false
    - "actor": "target"/"player"  (optional)
    - "shape": "sphere"/"cube"    (optional)

    Or None if this is a "no roll" object.
    """
    if not isinstance(roll_obj, dict):
        return None

    # Extract fields
    num_dice = roll_obj.get("numDice")
    dice_type = roll_obj.get("diceType")
    base_modifier = roll_obj.get("baseModifier", "").strip()
    stat_modifier = roll_obj.get("statModifier")
    apply_spell_modifier = roll_obj.get("applySpellModifier", False)
    roll_actor = roll_obj.get("rollActor")

    # Check if this is a "no roll" object (empty modifiers, no dice)
    if not num_dice and not dice_type and not base_modifier and not stat_modifier and not apply_spell_modifier:
        return None  # Signal to use text content instead

    # Roll (dice notation) - required
    if num_dice and dice_type:
        roll_str = f"{num_dice}{dice_type}"
    else:
        return None

    # Build result object
    result = {"roll": roll_str}

    # Numeric modifiers that add to the calculation
    numerics = []

    if stat_modifier:
        numerics.append(stat_modifier.upper())

    if apply_spell_modifier:
        numerics.append("SAM")

    if numerics:
        result["numerics"] = numerics

    # Damage types and other descriptors
    damage_types = {
        "fire", "cold", "lightning", "poison", "thunder", "acid",
        "necrotic", "radiant", "psychic", "force", "healing",
        "pierce", "slashing", "bludgeoning"
    }

    types = []

    if base_modifier and base_modifier not in ("save", ""):
        if base_modifier.lower() in damage_types:
            types.append(base_modifier.lower())

    if types:
        result["types"] = types

    # Save flag
    result["save"] = (base_modifier == "save")

    # Actor
    if roll_actor and roll_actor != "self":
        result["actor"] = roll_actor

    # Note: shape/sphere would come from spell data, not roll_obj
    # This is handled separately if needed

    return result


def parse_range_text(range_text):
    """
    Parse range text like "self, cube" or "long, large sphere" into structured JSON.

    Returns dict with distance, shape, size, target fields as applicable.
    Returns None if no valid range text.
    """
    if not range_text or range_text.lower() == "none":
        return None

    # Split by comma
    parts = [p.strip() for p in range_text.split(",")]

    # First part is always distance
    distance_variants = {
        "self": "self",
        "touch": "touch",
        "short": "short",
        "medium": "medium",
        "long": "long",
        "very long": "very long",
    }

    result = {}

    # Parse distance (first part or first two parts for "very long")
    if len(parts) >= 1:
        first = parts[0].lower()
        if first == "very" and len(parts) >= 2:
            # Check if it's "very long"
            next_word = parts[1].lower().split()[0] if parts[1] else ""
            if next_word == "long":
                result["distance"] = "very long"
                # Remaining parts are descriptors
                remaining = parts[2:] if len(parts) > 2 else []
            else:
                result["distance"] = first
                remaining = parts[1:]
        else:
            result["distance"] = first
            remaining = parts[1:]
    else:
        return None

    # Parse remaining descriptors
    for descriptor in remaining:
        desc_lower = descriptor.lower()

        # Check for size
        if "small" in desc_lower:
            result["size"] = "small"
        elif "large" in desc_lower:
            result["size"] = "large"

        # Check for shape
        if "cube" in desc_lower:
            result["shape"] = "cube"
        elif "sphere" in desc_lower:
            result["shape"] = "sphere"
        elif "radius" in desc_lower:
            result["shape"] = "radius"
        elif "circle" in desc_lower:
            result["shape"] = "circle"
        elif "square" in desc_lower:
            result["shape"] = "square"
        elif "effect" in desc_lower:
            result["shape"] = "effect"

        # Check for target count
        if "single" in desc_lower:
            result["target"] = "single"
        elif "multiple" in desc_lower:
            result["targets"] = "multiple"

    return result if result else None


def insert_spell(cursor, conn, spell_data):
    """Insert a single spell into database."""
    title = spell_data.get("title")
    icon = spell_data.get("icon")
    level = spell_data.get("level")
    school = spell_data.get("school")
    explanation = spell_data.get("explanation")
    details = spell_data.get("details", [])

    # 1. Get or create icon
    cursor.execute(
        "SELECT id FROM icons WHERE symbol = ? AND purpose = 'spell'",
        (icon,)
    )
    icon_row = cursor.fetchone()

    if icon_row:
        icon_id = icon_row[0]
    else:
        # Create new icon
        cursor.execute(
            """INSERT INTO icons (symbol, description, purpose)
               VALUES (?, ?, ?)""",
            (icon, f"Spell icon: {title}", "spell")
        )
        conn.commit()
        icon_id = cursor.lastrowid

    # 2. Insert card (spells are default system cards, no user_id)
    cursor.execute(
        """INSERT INTO cards (card_type, title, icon_id, level, explanation, is_default, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        ("spell", title, icon_id, level, explanation, 1, None)
    )
    conn.commit()
    card_id = cursor.lastrowid

    # 3. Parse details to categorize rolls into to_hit, damage, heal
    to_hit_rolls = []
    damage_rolls = []
    heal_rolls = []
    range_obj = None
    text_details = []  # For detail_entries table

    for seq_order, detail in enumerate(details, start=1):
        label = detail.get("label", "").lower()
        content = detail.get("content")

        # Extract range if label contains "range"
        if "range" in label:
            if isinstance(content, str):
                range_obj = parse_range_text(content)
            else:
                # If it's a dict, convert to string first
                range_obj = parse_range_text(str(content))

        if isinstance(content, str):
            # Simple text content - store in detail_entries (no categorization)
            text_details.append({
                "seq": seq_order,
                "label": detail.get("label"),
                "text": content
            })
        elif isinstance(content, dict):
            # Roll content - categorize by label
            roll_obj = convert_roll_to_json(content)

            if roll_obj:
                # Check label to determine category
                if "roll" in label or "attack" in label or "hit" in label or "to hit" in label:
                    to_hit_rolls.append(roll_obj)
                elif "damage" in label or "hurt" in label:
                    damage_rolls.append(roll_obj)
                elif "heal" in label or "cure" in label or "recover" in label:
                    heal_rolls.append(roll_obj)
                else:
                    # Custom/unknown category - store in detail_entries as text
                    text_details.append({
                        "seq": seq_order,
                        "label": detail.get("label"),
                        "text": json.dumps(roll_obj)
                    })
            else:
                # No roll - store as text
                text_details.append({
                    "seq": seq_order,
                    "label": detail.get("label"),
                    "text": "none"
                })

    # 4. Insert spell metadata with JSON arrays
    to_hit_json = json.dumps(to_hit_rolls) if to_hit_rolls else None
    damage_json = json.dumps(damage_rolls) if damage_rolls else None
    heal_json = json.dumps(heal_rolls) if heal_rolls else None
    range_json = json.dumps(range_obj) if range_obj else None

    cursor.execute(
        """INSERT INTO spells (card_id, school, to_hit, damage, heal, range)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (card_id, school, to_hit_json, damage_json, heal_json, range_json)
    )
    conn.commit()

    # 5. Insert remaining text detail entries
    for detail in text_details:
        cursor.execute(
            """INSERT INTO detail_entries 
               (card_id, sequence_order, label, content_type, content_text, roll_actor)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (card_id, detail["seq"], detail["label"],
             "text", detail["text"], None)
        )

    conn.commit()
    return card_id


def migrate_spells():
    """Load all spells from JSON and insert into database."""
    print("\n" + "=" * 60)
    print("Migrating Spells to Database")
    print("=" * 60)

    # Load JSON
    print(f"\nLoading spells from {SPELLS_JSON}...")
    with open(SPELLS_JSON, 'r', encoding='utf-8') as f:
        spells_data = json.load(f)
    print(f"✓ Loaded {len(spells_data)} spells")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if spells already exist
    cursor.execute("SELECT COUNT(*) FROM cards WHERE card_type = 'spell'")
    existing = cursor.fetchone()[0]
    if existing > 0:
        print(f"\n⚠️  WARNING: Database already contains {existing} spells")
        print("Deleting existing spells to reload with updated schema...")
        cursor.execute("DELETE FROM cards WHERE card_type = 'spell'")
        conn.commit()
        print("✓ Deleted existing spells")

    # Insert spells
    print("\nInserting spells...")
    print("-" * 60)

    inserted_count = 0
    inserted_icons = set()

    for spell in spells_data:
        try:
            card_id = insert_spell(cursor, conn, spell)
            icon = spell.get("icon")
            inserted_icons.add(icon)
            inserted_count += 1
            print(f"✓ {spell['title']:<30} (Card ID: {card_id})")
        except Exception as e:
            print(f"✗ {spell.get('title', 'Unknown'):<30} ERROR: {e}")
            conn.rollback()

    conn.commit()
    conn.close()

    # Summary
    print("-" * 60)
    print(f"\n✅ Migration complete!")
    print(f"   - Spells inserted: {inserted_count}")
    print(f"   - Unique icons: {len(inserted_icons)}")
    print(f"   - Icons: {', '.join(sorted(inserted_icons))}")

    return True


def verify_migration():
    """Quick verification of loaded data."""
    print("\n" + "=" * 60)
    print("Verifying Migration")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Count spells
    cursor.execute("SELECT COUNT(*) FROM cards WHERE card_type = 'spell'")
    spell_count = cursor.fetchone()[0]
    print(f"\nTotal spells in database: {spell_count}")

    # Count icons used by spells
    cursor.execute("""
        SELECT COUNT(DISTINCT icons.id)
        FROM icons
        JOIN cards ON cards.icon_id = icons.id
        WHERE cards.card_type = 'spell'
    """)
    icon_count = cursor.fetchone()[0]
    print(f"Unique icons for spells: {icon_count}")

    # Sample spell: Fire Bolt
    cursor.execute("""
        SELECT c.id, c.title, s.school, i.symbol, s.to_hit, s.damage, s.heal
        FROM cards c
        JOIN spells s ON c.id = s.card_id
        LEFT JOIN icons i ON c.icon_id = i.id
        WHERE c.title = 'Fire Bolt'
    """)
    fire_bolt = cursor.fetchone()
    if fire_bolt:
        card_id, title, school, icon, to_hit, damage, heal = fire_bolt
        print(f"\nSample spell: {icon} {title} ({school})")
        print(f"  to_hit:  {to_hit if to_hit else '(none)'}")
        print(f"  damage:  {damage if damage else '(none)'}")
        print(f"  heal:    {heal if heal else '(none)'}")

        # Also show remaining text details
        cursor.execute("""
            SELECT label, content_text
            FROM detail_entries
            WHERE card_id = ?
            ORDER BY sequence_order
        """, (card_id,))

        text_details = cursor.fetchall()
        if text_details:
            print(f"  Other details ({len(text_details)}):")
            for label, text in text_details:
                print(f"    • {label}: {text}")

    conn.close()
    print("\n✅ Verification complete!")


if __name__ == "__main__":
    success = migrate_spells()
    if success:
        verify_migration()
