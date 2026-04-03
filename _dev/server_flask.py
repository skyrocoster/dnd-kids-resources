#!/usr/bin/env python3
"""
D&D Kids Resources - Flask Web Server with Database API
Serves the website on http://localhost:8000 with API endpoints for spell data
"""

import sqlite3
import json
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
import webbrowser

# Setup Flask app
app = Flask(__name__, static_folder='..', static_url_path='')

# Get absolute path to database
BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

# Enable CORS headers for development


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def get_db_connection():
    """Create database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
    Enrich numerics array with ability metadata (name, emoji, color).

    Input: [{"code": "wis"}, {"code": "dex"}]
    Output: [{"code": "wis", "name": "Wisdom", "emoji": "👁️", "color": "#16a085"}, ...]
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
            if isinstance(item, dict) and 'code' in item:
                code = item['code']
                # Look up ability metadata
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT name, emoji, color 
                    FROM abilities 
                    WHERE code = ?
                """, (code,))
                ability = cursor.fetchone()

                if ability:
                    ability_dict = dict(ability)
                    enriched.append({
                        'code': code,
                        'name': ability_dict['name'],
                        'emoji': ability_dict['emoji'],
                        'color': ability_dict['color']
                    })
                else:
                    # Fallback if ability not found
                    enriched.append(item)
            else:
                enriched.append(item)

        return enriched
    finally:
        if should_close:
            conn.close()


def enrich_damage_types(damage_types, conn=None):
    """
    Enrich damage_types array with damage_types table metadata (emoji, color).

    Input: ["fire", "cold"]
    Output: [{"code": "fire", "name": "Fire", "emoji": "🔥", "color": "#e74c3c"}, ...]
    """
    if not damage_types or not isinstance(damage_types, list):
        return damage_types

    # If no connection provided, use the new one
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    enriched = []
    try:
        for damage_code in damage_types:
            if isinstance(damage_code, str):
                # Look up damage type metadata
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT code, name, emoji, color 
                    FROM damage_types 
                    WHERE code = ?
                """, (damage_code,))
                damage_type = cursor.fetchone()

                if damage_type:
                    damage_dict = dict(damage_type)
                    enriched.append({
                        'code': damage_dict['code'],
                        'name': damage_dict['name'],
                        'emoji': damage_dict['emoji'],
                        'color': damage_dict['color']
                    })
                else:
                    # Fallback if damage type not found
                    enriched.append(damage_code)
            else:
                enriched.append(damage_code)

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
    """Enrich a single roll object by adding ability metadata to numerics and damage type metadata to types."""
    if not isinstance(roll_obj, dict):
        return roll_obj

    # Create a copy to avoid modifying original
    enriched_roll = roll_obj.copy()

    # Enrich numerics with ability metadata
    if 'numerics' in enriched_roll:
        enriched_roll['numerics'] = enrich_numerics_with_abilities(
            roll_obj['numerics'], conn)

    # Enrich types with damage type metadata
    if 'types' in enriched_roll:
        enriched_roll['types'] = enrich_damage_types(
            roll_obj['types'], conn)

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

    # Build stats line for centered display (HP / AC)
    stats_line = ""
    if hp and ac:
        stats_line = f"HP {hp} / AC {ac}"
    elif hp:
        stats_line = f"HP {hp}"
    elif ac:
        stats_line = f"AC {ac}"

    # Add attack info if present (name is now inside attack_to_hit JSON)
    if attack_to_hit or damage:
        attack_obj = {}

        # Get attack name from first roll object in attack_to_hit if present
        if attack_to_hit and isinstance(attack_to_hit, list) and len(attack_to_hit) > 0:
            if isinstance(attack_to_hit[0], dict) and 'name' in attack_to_hit[0]:
                attack_obj['name'] = attack_to_hit[0]['name']

        # Enrich attack_to_hit with ability metadata (handle both single object and list)
        if attack_to_hit:
            if isinstance(attack_to_hit, list):
                # Multiple attack rolls
                enriched_to_hit = []
                for roll_obj in attack_to_hit:
                    enriched_to_hit.append(enrich_roll_object(roll_obj, conn))
                attack_obj['to_hit'] = enriched_to_hit
            else:
                # Single attack roll
                attack_obj['to_hit'] = enrich_roll_object(attack_to_hit, conn)

        # Enrich damage rolls (must be a list, with types enriched)
        if damage and isinstance(damage, list):
            enriched_damage = []
            for damage_roll in damage:
                # Enrich damage types with emoji/color
                enriched_roll = enrich_roll_object(damage_roll, conn)
                enriched_damage.append(enriched_roll)
            attack_obj['damage'] = enriched_damage

        details.append({"label": "🎲 Attack:", "content": attack_obj})

    # Add special abilities
    special = creature_dict.get('special', '')
    if special:
        details.append({"label": "⭐ Special:", "content": special})

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

    Returns:
    {
      "title": "Fire Bolt",
      "icon": "🔥",
      "level": "cantrip",
      "school": "Evocation",
      "explanation": "...",
      "details": [
        {"label": "🎲 Roll:", "content": {...}},
        {"label": "💥 Damage:", "content": {...}},
        {"label": "🎯 Range:", "content": {...}},
        ...
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
    # Order: to_hit, damage/heal, range
    details = []

    # Add to_hit rolls (enrich with ability metadata)
    if to_hit_data:
        if isinstance(to_hit_data, list):
            for i, roll_obj in enumerate(to_hit_data):
                label = "🎲 Roll:" if i == 0 else f"🎲 Roll ({i+1}):"
                enriched_roll = enrich_roll_object(roll_obj, conn)
                details.append({"label": label, "content": enriched_roll})
        else:
            enriched_roll = enrich_roll_object(to_hit_data, conn)
            details.append({"label": "🎲 Roll:", "content": enriched_roll})

    # Add damage rolls (enrich with ability metadata)
    if damage_data:
        if isinstance(damage_data, list):
            for i, roll_obj in enumerate(damage_data):
                label = "💥 Damage:" if i == 0 else f"💥 Damage ({i+1}):"
                enriched_roll = enrich_roll_object(roll_obj, conn)
                details.append({"label": label, "content": enriched_roll})
        else:
            enriched_roll = enrich_roll_object(damage_data, conn)
            details.append({"label": "💥 Damage:", "content": enriched_roll})

    # Add heal rolls (enrich with ability metadata)
    if heal_data:
        if isinstance(heal_data, list):
            for i, roll_obj in enumerate(heal_data):
                label = "💚 Heal:" if i == 0 else f"💚 Heal ({i+1}):"
                enriched_roll = enrich_roll_object(roll_obj, conn)
                details.append({"label": label, "content": enriched_roll})
        else:
            enriched_roll = enrich_roll_object(heal_data, conn)
            details.append({"label": "💚 Heal:", "content": enriched_roll})

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
                   attack_to_hit, damage, special
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
                   attack_to_hit, damage, special
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


@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('..', 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('..', filename)


def start_server(port=8000):
    """Start the Flask server"""
    import io
    import sys
    if sys.platform == 'win32':
        # Fix encoding for Windows console
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

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
    print(f"\n Press Ctrl+C to stop the server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped.")
