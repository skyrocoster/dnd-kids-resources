#!/usr/bin/env python3
"""
D&D Kids Resources - Flask Web Server with Database API
Serves the website on http://localhost:8000 with API endpoints for spell data
"""

import sys
from pathlib import Path

# Add lib to path BEFORE importing parse_dungeon
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

import json
import sqlite3
from parse_dungeon import DungeonHTMLParser
from flask import Flask, jsonify, send_from_directory, request
import webbrowser


# Setup Flask app
app = Flask(__name__, static_folder='.', static_url_path='')

# Get absolute path to database (same directory as server_flask.py)
DB_PATH = str(Path(__file__).parent / "dnd_kids_resources.db")

# Enable CORS headers for development


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def get_db_connection():
    """Create database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def parse_json_field(json_str):
    """Parse a JSON field from database, return None if invalid."""
    if not json_str:
        return None
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return None


def enrich_numerics_with_abilities(numerics, conn=None):
    """
    Enrich numerics array with ability metadata (id, code, name, emoji, color, type).

    Input: [34, 39] or [{"code": "dex"}] or ["dex", "sam"]
    Output: [{"id": 34, "code": "dex", "type": "stat", "name": "Dexterity", "emoji": "⚡", "color": "#f39c12"}, ...]
    """
    if not numerics or not isinstance(numerics, list):
        return numerics

    # If no connection provided, use the global one
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    enriched = []
    try:
        for item in numerics:
            ability_id = None
            code = None
            
            # Handle integer IDs (e.g., 34, 39)
            if isinstance(item, int):
                ability_id = item
            # Handle string codes (e.g., "dex", "sam")
            elif isinstance(item, str):
                code = item
            # Handle dict with code field
            elif isinstance(item, dict) and 'code' in item:
                code = item['code']
            
            if ability_id is not None:
                # Look up by ID
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, code, type, name, emoji, color 
                    FROM abilities 
                    WHERE id = ?
                """, (ability_id,))
                ability = cursor.fetchone()
                
                if ability:
                    ability_dict = dict(ability)
                    enriched.append({
                        'id': ability_dict['id'],
                        'code': ability_dict['code'],
                        'type': ability_dict['type'],
                        'name': ability_dict['name'],
                        'emoji': ability_dict['emoji'],
                        'color': ability_dict['color']
                    })
                else:
                    # Fallback if ability not found
                    enriched.append({'id': ability_id})
            elif code:
                # Look up by code
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, code, type, name, emoji, color 
                    FROM abilities 
                    WHERE code = ?
                """, (code,))
                ability = cursor.fetchone()

                if ability:
                    ability_dict = dict(ability)
                    enriched.append({
                        'id': ability_dict['id'],
                        'code': ability_dict['code'],
                        'type': ability_dict['type'],
                        'name': ability_dict['name'],
                        'emoji': ability_dict['emoji'],
                        'color': ability_dict['color']
                    })
                else:
                    # Fallback if ability not found
                    enriched.append(item if isinstance(item, dict) else code)
            else:
                enriched.append(item)

        return enriched
    finally:
        if should_close:
            conn.close()


def enrich_damage_types(damage_type_ids, conn=None):
    """
    Enrich damage_type_ids array with damage_types table metadata (emoji, color).

    Input: [4, 3]  (numeric IDs) or ["fire", "cold"] (string codes)
    Output: [{"id": 4, "code": "fire", "name": "Fire", "emoji": "🔥", "color": "#e74c3c"}, ...]
    """
    if not damage_type_ids or not isinstance(damage_type_ids, list):
        return damage_type_ids

    # If no connection provided, use the new one
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    enriched = []
    try:
        for damage_item in damage_type_ids:
            if isinstance(damage_item, int):
                # Look up damage type metadata by ID
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, code, name, emoji, color 
                    FROM damage_types 
                    WHERE id = ?
                """, (damage_item,))
                damage_type = cursor.fetchone()

                if damage_type:
                    damage_dict = dict(damage_type)
                    enriched.append({
                        'id': damage_dict['id'],
                        'code': damage_dict['code'],
                        'name': damage_dict['name'],
                        'emoji': damage_dict['emoji'],
                        'color': damage_dict['color']
                    })
                else:
                    # Fallback if damage type not found
                    enriched.append(damage_item)
            elif isinstance(damage_item, str):
                # Look up damage type metadata by code
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, code, name, emoji, color 
                    FROM damage_types 
                    WHERE code = ?
                """, (damage_item,))
                damage_type = cursor.fetchone()

                if damage_type:
                    damage_dict = dict(damage_type)
                    enriched.append({
                        'id': damage_dict['id'],
                        'code': damage_dict['code'],
                        'name': damage_dict['name'],
                        'emoji': damage_dict['emoji'],
                        'color': damage_dict['color']
                    })
                else:
                    # Fallback if damage type not found
                    enriched.append(damage_item if isinstance(damage_item, dict) else damage_item)
            else:
                enriched.append(damage_item)

        return enriched
    finally:
        if should_close:
            conn.close()


def enrich_creature_type(creature_type_code, conn=None):
    """
    Enrich a creature type code with creature_types table metadata (emoji, color).

    Input: "beast"
    Output: {"code": "beast", "emoji": "🦁", "color": "#8B4513"}
    """
    if not creature_type_code or not isinstance(creature_type_code, str):
        return creature_type_code

    # If no connection provided, use the new one
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT code, emoji, color 
            FROM creature_types 
            WHERE code = ?
        """, (creature_type_code,))
        creature_type = cursor.fetchone()

        if creature_type:
            creature_type_dict = dict(creature_type)
            return {
                'code': creature_type_dict['code'],
                'emoji': creature_type_dict['emoji'],
                'color': creature_type_dict['color']
            }
        else:
            # Fallback if creature type not found
            return creature_type_code
    finally:
        if should_close:
            conn.close()


def enrich_roll_object(roll_obj, conn):
    """Enrich a single roll object by adding ability metadata to numerics and damage type metadata to type_ids."""
    if not isinstance(roll_obj, dict):
        return roll_obj

    # Create a copy to avoid modifying original
    enriched_roll = roll_obj.copy()

    # Enrich numerics with ability metadata
    if 'numerics' in enriched_roll:
        enriched_roll['numerics'] = enrich_numerics_with_abilities(
            roll_obj['numerics'], conn)

    # Enrich type_ids with damage type metadata
    if 'type_ids' in enriched_roll:
        enriched_roll['type_ids'] = enrich_damage_types(
            roll_obj['type_ids'], conn)

    return enriched_roll


def convert_db_skill_to_api_format(skill_row):
    """
    Convert database skill to API format.

    skill_row contains: id, title, icon, level, explanation, details

    Returns:
    {
      "title": "Acrobatics",
      "icon": "🤸",
      "level": "action",
      "explanation": "...",
      "details": "Use when you need to balance, flip, or do tricks"
    }
    """
    skill_dict = dict(skill_row)

    return {
        "icon": skill_dict.get('icon', '⚔️'),
        "level": skill_dict.get('level', 'action'),
        "title": skill_dict.get('title', 'Unknown'),
        "explanation": skill_dict.get('explanation', ''),
        "details": skill_dict.get('details', '')
    }


def convert_db_condition_to_api_format(condition_row):
    """
    Convert database condition to API format.

    condition_row contains: id, title, icon, explanation, details (JSON)

    Returns:
    {
      "title": "Blinded",
      "icon": "🙈",
      "level": "blinded",
      "explanation": "You can't see anything!",
      "details": [{"label": "", "content": "..."}, ...]
    }
    """
    condition_dict = dict(condition_row)

    # Parse details JSON if present
    details = condition_dict.get('details', '[]')
    if details and isinstance(details, str):
        details = parse_json_field(details) or []

    # Get lowercased title (for CSS class) and capitalize for display
    title_lower = condition_dict.get('title', 'unknown')
    title_display = title_lower.capitalize()

    return {
        "icon": condition_dict.get('icon', '⚠️'),
        "level": title_lower,  # Use lowercased title for CSS class
        "title": title_display,  # Capitalize for display
        "explanation": condition_dict.get('explanation', ''),
        "details": details
    }


def convert_db_creature_to_api_format(creature_row, conn=None):
    """
    Convert database creature to API format.

    creature_row contains: id, title, icon, size, creature_type_id, hp, ac, explanation,
                         attack_to_hit (JSON with name inside), damage, special

    Returns:
    {
      "title": "Fox",
      "icon": "🦊",
      "level": "fox",
      "explanation": "a clever little fox with sharp eyes and a twitchy nose",
      "details": [
        {"label": "Size:", "content": "Tiny"},
        {"label": "Type:", "content": "Beast"},
        {"label": "HP:", "content": "6"},
        {"label": "AC:", "content": "12"},
        {"label": "🎲 Attack:", "content": {"name": "Bite", "to_hit": {...}, "damage": [...]}},
        {"label": "⭐ Special:", "content": "keen senses..."}
      ]
    }
    """
    creature_dict = dict(creature_row)

    # Get a connection if not provided (for enriching abilities/damage)
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    # Parse the JSON fields
    attack_to_hit = parse_json_field(creature_dict.get('attack_to_hit'))
    damage = parse_json_field(creature_dict.get('damage'))
    stats = parse_json_field(creature_dict.get('stats'))

    # Calculate saving throws from stats if present
    saving_throws = {}
    if stats and isinstance(stats, dict):
        for ability_code, ability_score in stats.items():
            if isinstance(ability_score, int):
                # D&D 5e modifier = (score - 10) // 2
                modifier = (ability_score - 10) // 2
                saving_throws[ability_code] = {
                    "score": ability_score,
                    "modifier": modifier
                }

    # Build details array
    details = []

    # Store creature type info for card coloring and footer display
    creature_type_code = None
    creature_type_emoji = None

    # Look up creature type from creature_type_id
    creature_type_id = creature_dict.get('creature_type_id')
    if creature_type_id:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT code FROM creature_types WHERE id = ?", (creature_type_id,))
        type_row = cursor.fetchone()
        if type_row:
            creature_type_code = type_row[0]
            # Enrich creature type with emoji and color
            enriched_type = enrich_creature_type(creature_type_code, conn)
            if isinstance(enriched_type, dict):
                creature_type_emoji = enriched_type['emoji']

    # Add HP and AC to details (moved size and type to footer)
    hp = creature_dict.get('hp')
    ac = creature_dict.get('ac')

    # Build stats_grid for display with emojis and colors
    stats_grid_data = []
    if hp:
        stats_grid_data.append({
            "code": "hp",
            "name": "Hit Points",
            "emoji": "💗",
            "color": "#c0392b",
            "value": hp
        })
    if ac:
        stats_grid_data.append({
            "code": "ac",
            "name": "Armor Class",
            "emoji": "🛡️",
            "color": "#2471a3",
            "value": ac
        })

    # Legacy stats_line for backward compatibility
    stats_line = ""
    if hp and ac:
        stats_line = f"HP {hp} / AC {ac}"
    elif hp:
        stats_line = f"HP {hp}"
    elif ac:
        stats_line = f"AC {ac}"

    # Add attack info with same pairing logic as spells
    # Number emoji mapping (same as spells)
    number_map = {'A': '1️⃣', 'B': '2️⃣', 'C': '3️⃣', 'D': '4️⃣',
                  'E': '5️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣'}

    # Check if we have paired rolls (multiple to_hit and damage with same count)
    has_paired_rolls = (
        isinstance(attack_to_hit, list) and isinstance(damage, list) and
        len(attack_to_hit) > 1 and len(damage) > 1 and
        len(attack_to_hit) == len(damage)
    )

    if attack_to_hit or damage:
        if has_paired_rolls:
            # Pair rolls and damages together: roll1, damage1, roll2, damage2, etc.
            for i, (to_hit_roll, damage_roll) in enumerate(zip(attack_to_hit, damage)):
                roll_name = to_hit_roll.get('name', None) if isinstance(
                    to_hit_roll, dict) else None

                # Use number emoji for paired rolls
                emoji = number_map.get(roll_name, '1️⃣')

                # Add roll
                enriched_roll = enrich_roll_object(to_hit_roll, conn)
                details.append({"label": f"{emoji} To Hit:",
                               "content": enriched_roll})

                # Add paired damage
                enriched_damage = enrich_roll_object(damage_roll, conn)
                details.append({"label": f"{emoji} Damage:",
                               "content": enriched_damage})
        else:
            # Add to_hit rolls separately (not paired)
            if attack_to_hit:
                if isinstance(attack_to_hit, list):
                    for i, roll_obj in enumerate(attack_to_hit):
                        enriched_roll = enrich_roll_object(roll_obj, conn)
                        if len(attack_to_hit) > 1:
                            details.append(
                                {"label": "🎲 To Hit:", "content": enriched_roll})
                        else:
                            details.append(
                                {"label": "🎲 To Hit:", "content": enriched_roll})
                else:
                    enriched_roll = enrich_roll_object(attack_to_hit, conn)
                    details.append(
                        {"label": "🎲 To Hit:", "content": enriched_roll})

            # Add damage rolls separately (not paired)
            if damage:
                if isinstance(damage, list):
                    for i, roll_obj in enumerate(damage):
                        enriched_roll = enrich_roll_object(roll_obj, conn)
                        if len(damage) > 1:
                            details.append(
                                {"label": "💥 Damage:", "content": enriched_roll})
                        else:
                            details.append(
                                {"label": "💥 Damage:", "content": enriched_roll})

    # Add HP and AC stats grid (similar to saves_grid)
    if stats_grid_data:
        details.append({
            "label": "Stats",
            "content": stats_grid_data,
            "type": "stats_grid"  # Special type to signal grid rendering
        })

    # Add saving throws from stats as a structured grid (3x2)
    # enriched with ability metadata for emoji and color display
    if saving_throws:
        ability_order = ['str', 'dex', 'con', 'int', 'wis', 'cha']
        save_data_with_metadata = []

        cursor = conn.cursor()
        for ability_code in ability_order:
            if ability_code in saving_throws:
                save_value = saving_throws[ability_code]
                modifier = save_value['modifier']

                # Look up ability metadata for emoji and color
                cursor.execute("""
                    SELECT emoji, color, name
                    FROM abilities
                    WHERE code = ?
                """, (ability_code,))
                ability = cursor.fetchone()

                if ability:
                    save_data_with_metadata.append({
                        "code": ability_code,
                        "name": ability[2],  # name
                        "emoji": ability[0],  # emoji
                        "color": ability[1],  # color
                        "modifier": modifier,
                        "score": save_value['score']
                    })

        if save_data_with_metadata:
            # Add as a structured object for grid display
            details.append({
                "label": "💪 Saves:",
                "content": save_data_with_metadata,
                "type": "saves_grid"  # Special type to signal grid rendering
            })

    # Get lowercased title (for CSS class) and capitalize for display
    title_lower = creature_dict.get('title', 'unknown')
    title_display = title_lower.capitalize()

    # Use creature type as level for card coloring (CSS will style .card.beast, .card.humanoid, etc.)
    # Falls back to title if no creature type
    level = creature_type_code if creature_type_code else title_lower

    # Build footer info with type and size
    footer_info = []
    size = creature_dict.get('size', '')
    if size and creature_type_emoji:
        footer_info.append(
            f"{creature_type_emoji} {creature_type_code.capitalize()}")
        footer_info.append(size.capitalize())

    result = {
        "icon": creature_dict.get('icon', '🦁'),
        "level": level,  # Use creature type code for CSS coloring
        "title": title_display,  # Capitalize for display
        "explanation": creature_dict.get('explanation', ''),
        "stats_line": stats_line,  # Centered HP / AC line
        "details": details,
        "footer_info": " • ".join(footer_info) if footer_info else ""
    }

    # Close connection if we created it
    if should_close:
        conn.close()

    return result


def convert_db_spell_to_api_format(spell_row, conn=None):
    """
    Convert database spell to API format.

    spell_row contains: id, title, icon, level, school, explanation,
                       to_hit, damage, heal, range

    Features:
    - Detects paired rolls (multiple to_hit/damage with same count) and interleaves them
    - Uses "To Hit" or "Save" labels based on roll's save field
    - Maps roll name field (A, B, C) to number emojis (1️⃣, 2️⃣, 3️⃣) for visual pairing
    - Single-roll spells use traditional emojis (🎲, 💥, 💚)
    - Enriches rolls with ability/damage type metadata

    Returns:
    {
      "title": "Fire Bolt",
      "icon": "🔥",
      "level": "cantrip",
      "school": "Evocation",
      "explanation": "...",
      "details": [
        {"label": "🎲 To Hit:", "content": {...}},
        {"label": "💥 Damage:", "content": {...}},
        {"label": "🎯 Range:", "content": {...}}
      ]
    }

    For spells with paired rolls (e.g., Ice Knife):
    {
      "details": [
        {"label": "1️⃣ To Hit:", "content": {...}},
        {"label": "1️⃣ Damage:", "content": {...}},
        {"label": "2️⃣ Save:", "content": {...}},
        {"label": "2️⃣ Damage:", "content": {...}},
        {"label": "🎯 Range:", "content": {...}}
      ]
    }
    """
    spell_dict = dict(spell_row)

    # Get a connection if not provided (for enriching abilities)
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    # Parse the database JSON fields
    to_hit_data = parse_json_field(spell_dict.get('to_hit'))
    damage_data = parse_json_field(spell_dict.get('damage'))
    heal_data = parse_json_field(spell_dict.get('heal'))
    range_data = parse_json_field(spell_dict.get('range'))

    # Build details array with database format
    # Order: paired rolls/damage (if applicable), then unpaired, range at end
    details = []

    # Number emoji mapping
    number_map = {'A': '1️⃣', 'B': '2️⃣', 'C': '3️⃣', 'D': '4️⃣', 'E': '5️⃣'}

    # Check if we have paired rolls (multiple to_hit and damage with same count)
    has_paired_rolls = (
        isinstance(to_hit_data, list) and isinstance(damage_data, list) and
        len(to_hit_data) > 1 and len(damage_data) > 1 and
        len(to_hit_data) == len(damage_data)
    )

    if has_paired_rolls:
        # Pair rolls and damages together: roll1, damage1, roll2, damage2, etc.
        for i, (to_hit_roll, damage_roll) in enumerate(zip(to_hit_data, damage_data)):
            roll_name = to_hit_roll.get('name', None) if isinstance(
                to_hit_roll, dict) else None

            # Determine if this is a save or attack roll
            is_save = to_hit_roll.get('save', False) if isinstance(
                to_hit_roll, dict) else False
            roll_label = "Save" if is_save else "To Hit"

            # Use number emoji for paired rolls
            emoji = number_map.get(roll_name, '1️⃣')

            # Add roll
            enriched_roll = enrich_roll_object(to_hit_roll, conn)
            details.append({"label": f"{emoji} {roll_label}:",
                           "content": enriched_roll})

            # Add paired damage
            enriched_damage = enrich_roll_object(damage_roll, conn)
            details.append({"label": f"{emoji} Damage:",
                           "content": enriched_damage})
    else:
        # Add to_hit rolls separately (not paired)
        if to_hit_data:
            if isinstance(to_hit_data, list):
                for i, roll_obj in enumerate(to_hit_data):
                    roll_name = roll_obj.get('name', None) if isinstance(
                        roll_obj, dict) else None

                    # Determine if this is a save or attack roll
                    is_save = roll_obj.get('save', False) if isinstance(
                        roll_obj, dict) else False
                    roll_label = "Save" if is_save else "To Hit"

                    if len(to_hit_data) > 1 and roll_name:
                        emoji = number_map.get(roll_name, '🎲')
                        label = f"{emoji} {roll_label}:"
                    else:
                        label = f"🎲 {roll_label}:"

                    enriched_roll = enrich_roll_object(roll_obj, conn)
                    details.append({"label": label, "content": enriched_roll})
            else:
                enriched_roll = enrich_roll_object(to_hit_data, conn)
                is_save = to_hit_data.get('save', False) if isinstance(
                    to_hit_data, dict) else False
                roll_label = "Save" if is_save else "To Hit"
                details.append({"label": f"🎲 {roll_label}:",
                               "content": enriched_roll})

        # Add damage rolls separately (not paired)
        if damage_data:
            if isinstance(damage_data, list):
                for i, roll_obj in enumerate(damage_data):
                    roll_name = roll_obj.get('name', None) if isinstance(
                        roll_obj, dict) else None

                    if len(damage_data) > 1 and roll_name:
                        emoji = number_map.get(roll_name, '💥')
                        label = f"{emoji} Damage:"
                    else:
                        label = "💥 Damage:"

                    enriched_roll = enrich_roll_object(roll_obj, conn)
                    details.append({"label": label, "content": enriched_roll})
            else:
                enriched_roll = enrich_roll_object(damage_data, conn)
                details.append(
                    {"label": "💥 Damage:", "content": enriched_roll})

    # Add heal rolls (enrich with ability metadata)
    if heal_data:
        if isinstance(heal_data, list):
            for i, roll_obj in enumerate(heal_data):
                roll_name = roll_obj.get('name', None) if isinstance(
                    roll_obj, dict) else None
                heal_type = roll_obj.get('type', 'normal') if isinstance(
                    roll_obj, dict) else 'normal'

                # Determine heal label based on type
                heal_text = "Max HP" if heal_type == 'max_hp' else "Heal"

                if len(heal_data) > 1 and roll_name:
                    emoji = number_map.get(roll_name, '💚')
                    label = f"{emoji} {heal_text}:"
                else:
                    label = f"💚 {heal_text}:"

                enriched_roll = enrich_roll_object(roll_obj, conn)
                details.append({"label": label, "content": enriched_roll})
        else:
            heal_type = heal_data.get('type', 'normal') if isinstance(
                heal_data, dict) else 'normal'
            heal_text = "Max HP" if heal_type == 'max_hp' else "Heal"
            enriched_roll = enrich_roll_object(heal_data, conn)
            details.append({"label": f"💚 {heal_text}:",
                           "content": enriched_roll})

    # Add range ALWAYS at the end (from spells.range column)
    if range_data:
        details.append({"label": "🎯 Range:", "content": range_data})

    # Return in API format
    result = {
        "icon": spell_dict.get('icon', '✨'),
        "level": spell_dict.get('level', 'cantrip'),
        "school": spell_dict.get('school', 'Evocation'),
        "title": spell_dict.get('title', 'Unknown'),
        "explanation": spell_dict.get('explanation', ''),
        "details": details
    }

    # Close connection if we created it
    if should_close:
        conn.close()

    return result


@app.route('/api/spells', methods=['GET'])
def get_spells_api():
    """API endpoint: GET /api/spells - Returns all spells as JSON."""
    try:
        print(
            f"[API] GET /api/spells - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        print(f"[API] Database connection established")
        cursor = conn.cursor()

        # Get all spells directly
        cursor.execute("""
            SELECT 
                id, title, icon, level, school, explanation,
                to_hit, damage, heal, range
            FROM spells
            ORDER BY title
        """)

        spells = []
        for row in cursor.fetchall():
            # Convert to API format (no detail_entries anymore)
            spell_json = convert_db_spell_to_api_format(row, conn)
            spells.append(spell_json)

        print(f"[API] Successfully loaded {len(spells)} spells")
        conn.close()
        return jsonify(spells)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/spells/<title>', methods=['GET'])
def get_spell_by_title(title):
    """API endpoint: GET /api/spells/<title> - Returns a single spell by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get spell by title (directly from spells table)
        cursor.execute("""
            SELECT 
                id, title, icon, level, school, explanation,
                to_hit, damage, heal, range
            FROM spells
            WHERE title = ?
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Spell '{title}' not found"}), 404

        # Convert to API format (no detail_entries anymore)
        spell_json = convert_db_spell_to_api_format(row, conn)

        conn.close()
        return jsonify(spell_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/skills', methods=['GET'])
def get_skills_api():
    """API endpoint: GET /api/skills - Returns all skills as JSON."""
    try:
        print(
            f"[API] GET /api/skills - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        print(f"[API] Database connection established")
        cursor = conn.cursor()

        # Get all skills
        cursor.execute("""
            SELECT id, title, icon, level, explanation, details
            FROM skills
            ORDER BY title
        """)

        skills = []
        for row in cursor.fetchall():
            skill_json = convert_db_skill_to_api_format(row)
            skills.append(skill_json)

        print(f"[API] Successfully loaded {len(skills)} skills")
        conn.close()
        return jsonify(skills)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/skills/<title>', methods=['GET'])
def get_skill_by_title(title):
    """API endpoint: GET /api/skills/<title> - Returns a single skill by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get skill by title
        cursor.execute("""
            SELECT id, title, icon, level, explanation, details
            FROM skills
            WHERE title = ?
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Skill '{title}' not found"}), 404

        skill_json = convert_db_skill_to_api_format(row)
        conn.close()
        return jsonify(skill_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/conditions', methods=['GET'])
def get_conditions_api():
    """API endpoint: GET /api/conditions - Returns all conditions as JSON."""
    try:
        print(
            f"[API] GET /api/conditions - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get all conditions
        cursor.execute("""
            SELECT id, title, icon, explanation, details
            FROM conditions
            ORDER BY title
        """)

        conditions = []
        for row in cursor.fetchall():
            condition_json = convert_db_condition_to_api_format(row)
            conditions.append(condition_json)

        print(f"[API] Successfully loaded {len(conditions)} conditions")
        conn.close()
        return jsonify(conditions)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/conditions/<title>', methods=['GET'])
def get_condition_by_title(title):
    """API endpoint: GET /api/conditions/<title> - Returns a single condition by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get condition by title (search case-insensitive)
        cursor.execute("""
            SELECT id, title, icon, explanation, details
            FROM conditions
            WHERE LOWER(title) = LOWER(?)
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Condition '{title}' not found"}), 404

        condition_json = convert_db_condition_to_api_format(row)
        conn.close()
        return jsonify(condition_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/abilities', methods=['GET'])
def get_abilities_api():
    """API endpoint: GET /api/abilities - Returns all abilities with icons and colors."""
    try:
        print(
            f"[API] GET /api/abilities - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        print(f"[API] Database connection established")
        cursor = conn.cursor()

        # Get all abilities
        cursor.execute("""
            SELECT id, code, name, emoji, color, type
            FROM abilities
            ORDER BY type, name
        """)

        abilities = []
        for row in cursor.fetchall():
            ability_dict = {
                'id': row['id'],
                'code': row['code'],
                'name': row['name'],
                'emoji': row['emoji'],
                'color': row['color'],
                'type': row['type']
            }
            abilities.append(ability_dict)

        print(f"[API] Successfully loaded {len(abilities)} abilities")
        conn.close()
        return jsonify(abilities)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/creatures', methods=['GET'])
def get_creatures_api():
    """API endpoint: GET /api/creatures - Returns all creatures as JSON."""
    try:
        print(
            f"[API] GET /api/creatures - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get all creatures
        cursor.execute("""
            SELECT id, title, icon, size, creature_type_id, hp, ac, explanation,
                   attack_to_hit, damage, special, stats
            FROM creatures
            ORDER BY title
        """)

        creatures = []
        for row in cursor.fetchall():
            creature_json = convert_db_creature_to_api_format(row, conn)
            creatures.append(creature_json)

        print(f"[API] Successfully loaded {len(creatures)} creatures")
        conn.close()
        return jsonify(creatures)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/creatures/<title>', methods=['GET'])
def get_creature_by_title(title):
    """API endpoint: GET /api/creatures/<title> - Returns a single creature by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get creature by title (search case-insensitive)
        cursor.execute("""
            SELECT id, title, icon, size, creature_type_id, hp, ac, explanation,
                   attack_to_hit, damage, special, stats
            FROM creatures
            WHERE LOWER(title) = LOWER(?)
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Creature '{title}' not found"}), 404

        creature_json = convert_db_creature_to_api_format(row, conn)
        conn.close()
        return jsonify(creature_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DUNGEON ENDPOINTS
# ============================================================================

@app.route('/api/dungeons', methods=['GET'])
def list_dungeons():
    """List all dungeons"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, created_at, updated_at 
            FROM dungeons 
            ORDER BY created_at DESC
        """)
        dungeons = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(dungeons)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dungeons/<int:dungeon_id>', methods=['GET'])
def get_dungeon(dungeon_id):
    """Get a specific dungeon by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, original_html, parsed_json, created_at, updated_at 
            FROM dungeons 
            WHERE id = ?
        """, (dungeon_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"error": "Dungeon not found"}), 404

        dungeon = dict(row)
        # Parse the JSON string back to object
        if dungeon['parsed_json']:
            dungeon['parsed_json'] = json.loads(dungeon['parsed_json'])
        return jsonify(dungeon)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dungeons/upload', methods=['POST'])
def upload_dungeon():
    """Upload and parse a new dungeon HTML file"""
    try:
        # Check if HTML file was provided
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Read the HTML content
        html_content = file.read().decode('utf-8')

        # Parse the dungeon
        parser = DungeonHTMLParser(html_content)
        dungeon_data = parser.parse()

        # Get title from parsed data
        title = dungeon_data.general_info.title
        if not title or title == 'Unknown':
            return jsonify({"error": "Could not extract dungeon title from HTML"}), 400

        # Convert parsed data to JSON
        parsed_json = json.dumps(dungeon_data.to_dict())

        # Store in database
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO dungeons (title, original_html, parsed_json)
                VALUES (?, ?, ?)
            """, (title, html_content, parsed_json))
            conn.commit()
            dungeon_id = cursor.lastrowid
            conn.close()

            return jsonify({
                "id": dungeon_id,
                "title": title,
                "message": "Dungeon uploaded and parsed successfully"
            }), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"error": f"Dungeon '{title}' already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dungeons/<int:dungeon_id>', methods=['PUT'])
def update_dungeon(dungeon_id):
    """Update dungeon parsed data"""
    try:
        data = request.get_json()
        parsed_json = data.get('parsed_json')

        if not parsed_json:
            return jsonify({"error": "No parsed_json provided"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE dungeons 
            SET parsed_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (parsed_json, dungeon_id))
        conn.commit()
        conn.close()

        return jsonify({"message": "Dungeon updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rebuild-database', methods=['POST'])
def rebuild_database():
    """
    Rebuild the entire database from scratch.
    Deletes the existing database and runs init + seed.
    """
    try:
        import subprocess
        from pathlib import Path
        
        db_path = Path(DB_PATH)
        project_root = db_path.parent
        
        # Step 1: Delete existing database
        if db_path.exists():
            db_path.unlink()
            print(f"✓ Deleted existing database")
        
        # Step 2: Initialize schema
        init_script = project_root / "_dev" / "init_database.py"
        result = subprocess.run(
            [sys.executable, str(init_script)],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Database initialization failed",
                "details": result.stderr
            }), 500
        
        print("✓ Database schema initialized")
        
        # Step 3: Seed all data
        seed_script = project_root / "_dev" / "seed_database.py"
        result = subprocess.run(
            [sys.executable, str(seed_script), "--force"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Database seeding failed",
                "details": result.stderr
            }), 500
        
        print("✓ Database seeded successfully")
        
        return jsonify({
            "success": True,
            "message": "Database rebuilt successfully",
            "steps": [
                "Deleted existing database",
                "Initialized database schema",
                "Seeded all data (abilities, spells, conditions, creatures, damage types, creature types, dungeons)"
            ]
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": "Database rebuild failed",
            "details": str(e)
        }), 500


# ============================================================================
# TRAPS ENDPOINTS
# ============================================================================

@app.route('/api/traps', methods=['GET'])
def get_all_traps():
    """API endpoint: GET /api/traps - Returns all traps"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, created_at
            FROM traps
            ORDER BY name
        """)
        
        traps = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(traps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/traps/<int:trap_id>', methods=['GET'])
def get_trap_by_id(trap_id):
    """API endpoint: GET /api/traps/<id> - Returns a single trap by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, created_at
            FROM traps
            WHERE id = ?
        """, (trap_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"error": f"Trap with ID {trap_id} not found"}), 404
        
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)


def start_server(port=8000):
    """Start the Flask server"""
    # Note: Encoding fix removed to prevent I/O issues in various environments

    print(f"\nD&D Kids Resources Server (Flask)")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Server running at: http://localhost:{port}")
    print(f"Database: {Path(DB_PATH).resolve()}")
    print(f"API endpoints:")
    print(f"   - GET /api/spells         (all spells)")
    print(f"   - GET /api/spells/<title> (single spell)")
    print(f"   - GET /api/skills         (all skills)")
    print(f"   - GET /api/skills/<title> (single skill)")
    print(f"   - GET /api/conditions     (all conditions)")
    print(f"   - GET /api/conditions/<title> (single condition)")
    print(f"   - GET /api/creatures      (all creatures)")
    print(f"   - GET /api/creatures/<title> (single creature)")
    print(f"   - GET /api/dungeons       (all dungeons)")
    print(f"   - GET /api/dungeons/<id>  (single dungeon)")
    print(f"   - POST /api/dungeons/<id> (save dungeon)")
    print(f"   - POST /api/dungeons/upload (upload new dungeon file)")
    print(f"\n Press Ctrl+C to stop the server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped.")
