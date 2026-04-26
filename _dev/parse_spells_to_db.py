#!/usr/bin/env python3
"""parse_spells_to_db.py

Load the new 5eTools spell JSON directly into the SQLite spells table.

This script maps the new field names to the current DB schema and stores
rich data as JSON where appropriate.
"""

import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "dnd_kids_resources.db"
SOURCE_PATH = ROOT / "data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json"


def load_source():
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE_PATH}")
    with SOURCE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_spell(spell):
    level = spell.get("level", 0)
    if level is None:
        level = 0

    def entries_to_text(value):
        if value is None:
            return None
        if isinstance(value, list):
            parts = []
            for item in value:
                if item is None:
                    continue
                if isinstance(item, dict):
                    parts.append(json.dumps(item, ensure_ascii=False))
                else:
                    parts.append(str(item).strip())
            return "\n\n".join(parts).strip() or None
        if isinstance(value, dict):
            return json.dumps(value, ensure_ascii=False)
        return str(value).strip() or None

    components = spell.get("components")
    if isinstance(components, list):
        components = json.dumps([str(item).strip() for item in components if item is not None], ensure_ascii=False)
    elif components is not None:
        components = str(components).strip()

    primary_damage = str(spell.get("damage", "") or "").strip()
    secondary_damage = str(spell.get("damage_secondary", "") or "").strip()
    damage_types = spell.get("damageType") or []
    if isinstance(damage_types, list):
        damage_types = [str(item).strip() for item in damage_types if item is not None]
    elif damage_types is not None:
        damage_types = [str(damage_types).strip()]

    damage_entries = []
    if primary_damage:
        primary_entry = {"name": "primary", "damage": primary_damage}
        if damage_types:
            primary_entry["type"] = damage_types
        damage_entries.append(primary_entry)
    if secondary_damage:
        secondary_entry = {"name": "secondary", "damage": secondary_damage}
        if damage_types:
            secondary_entry["type"] = damage_types
        damage_entries.append(secondary_entry)
    damage_json = json.dumps(damage_entries, ensure_ascii=False) if damage_entries else None

    attack_type_value = None
    if spell.get("spellAttack") or spell.get("savingThrow"):
        attack_type_value = json.dumps([
            {
                "name": "initial",
                "type": spell.get("spellAttack", ""),
                "save": spell.get("savingThrow", []),
            }
        ], ensure_ascii=False)

    healing_value = spell.get("healing")
    if isinstance(healing_value, (dict, list)):
        healing_value = json.dumps(healing_value, ensure_ascii=False)
    elif healing_value is not None:
        healing_value = str(healing_value).strip() or None

    return {
        "spell_name": str(spell.get("name", "")).strip(),
        # required DB fields with safe defaults for now
        "icon": "✨",
        "level": str(level),
        "school": str(spell.get("school", "")).strip(),
        "spell_text": entries_to_text(spell.get("entries")),
        "spell_alt_text": entries_to_text(spell.get("entries_extra")),
        "damage": damage_json,
        "heal": healing_value,
        "heal_at_spell_slots": None,
        "range": str(spell.get("range", "")).strip() or None,
        "higher_levels": entries_to_text(spell.get("at_higher_levels")),
        "damage_at_higher_levels": json.dumps(spell.get("damage_at_spell_slot"), ensure_ascii=False) if spell.get("damage_at_spell_slot") else None,
        "casting_time": str(spell.get("casting_time", "")).strip() or None,
        "duration": str(spell.get("duration", "")).strip() or None,
        "concentration": bool(spell.get("concentration", False)),
        "ritual": bool(spell.get("ritual", False)),
        "components": components,
        "materials": str(spell.get("materials", "")).strip() or None,
        "attack_type": attack_type_value,
        "area_of_effect": entries_to_text(spell.get("area_of_effect")),
        "classes": None,
        "subclasses": None,
    }

# TODO: Add field-by-field normalization for each DB field as you confirm the mapping.


def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def rebuild_spells_table(cursor):
    cursor.execute("DROP TABLE IF EXISTS spells")
    cursor.execute(
        """
        CREATE TABLE spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spell_name TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            level TEXT NOT NULL,
            school TEXT,
            spell_text TEXT,
            spell_alt_text TEXT,
            damage TEXT,
            heal TEXT,
            heal_at_spell_slots TEXT,
            range TEXT,
            higher_levels TEXT,
            damage_at_higher_levels TEXT,
            casting_time TEXT,
            duration TEXT,
            concentration BOOLEAN DEFAULT 0,
            ritual BOOLEAN DEFAULT 0,
            components TEXT,
            materials TEXT,
            attack_type TEXT,
            action TEXT,
            area_of_effect TEXT,
            classes TEXT,
            subclasses TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def insert_spell(cursor, spell_data):
    cursor.execute(
        """
        INSERT INTO spells
        (spell_name, icon, level, school, spell_text, spell_alt_text, damage, heal, heal_at_spell_slots, range,
         higher_levels, damage_at_higher_levels, casting_time, duration, concentration, ritual, components, materials,
         attack_type, action, area_of_effect, classes, subclasses)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            spell_data["spell_name"],
            spell_data["icon"],
            spell_data["level"],
            spell_data["school"],
            spell_data["spell_text"],
            spell_data["spell_alt_text"],
            spell_data["damage"],
            spell_data["heal"],
            spell_data["heal_at_spell_slots"],
            spell_data["range"],
            spell_data["higher_levels"],
            spell_data["damage_at_higher_levels"],
            spell_data["casting_time"],
            spell_data["duration"],
            int(spell_data["concentration"]),
            int(spell_data["ritual"]),
            spell_data["components"],
            spell_data["materials"],
            spell_data["attack_type"],
            spell_data.get("action"),
            spell_data["area_of_effect"],
            spell_data["classes"],
            spell_data["subclasses"],
        )
    )


def main(force=False):
    spells = load_source()
    parsed_spells = [normalize_spell(spell) for spell in spells]

    conn = get_db_connection()
    cursor = conn.cursor()

    rebuild_spells_table(cursor)
    conn.commit()

    for spell_data in parsed_spells:
        try:
            insert_spell(cursor, spell_data)
        except sqlite3.IntegrityError as e:
            print(f"[WARNING] Duplicate or insert error for {spell_data['spell_name']}: {e}")

    conn.commit()
    conn.close()

    print(f"Loaded {len(parsed_spells)} spells into spells table at {DB_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load 5eTools spell JSON into the spells DB")
    parser.add_argument("--force", action="store_true", help="Delete existing spells rows before loading")
    args = parser.parse_args()
    main(force=args.force)
