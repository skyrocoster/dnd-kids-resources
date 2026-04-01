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


def convert_db_spell_to_api_format(spell_row, detail_rows):
    """
    Convert database spell to API format.

    Returns database roll format as-is (roll, numerics, types, save):
    {
      "title": "Fire Bolt",
      "icon": "🔥",
      "level": "cantrip",
      "school": "Evocation",
      "explanation": "...",
      "details": [
        {"label": "🎲 Roll:", "content": {"roll": "1d20", "numerics": ["SAM"], "save": false}},
        {"label": "💥 Damage:", "content": {"roll": "1d10", "types": ["fire"], "save": false}},
        {"label": "🎯 Range:", "content": {"distance": "very long", "target": "single"}},
        ...
      ]
    }
    """
    spell_dict = dict(spell_row)

    # Parse the database JSON fields
    to_hit_data = parse_json_field(spell_dict['to_hit'])
    damage_data = parse_json_field(spell_dict['damage'])
    heal_data = parse_json_field(spell_dict['heal'])
    range_data = parse_json_field(spell_dict['range'])

    # Build details array with database format
    details = []

    # Add to_hit rolls (already in database format)
    if to_hit_data:
        if isinstance(to_hit_data, list):
            for i, roll_obj in enumerate(to_hit_data):
                label = "🎲 Roll:" if i == 0 else f"🎲 Roll ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "🎲 Roll:", "content": to_hit_data})

    # Add damage rolls (already in database format)
    if damage_data:
        if isinstance(damage_data, list):
            for i, roll_obj in enumerate(damage_data):
                label = "💥 Damage:" if i == 0 else f"💥 Damage ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "💥 Damage:", "content": damage_data})

    # Add heal rolls (already in database format)
    if heal_data:
        if isinstance(heal_data, list):
            for i, roll_obj in enumerate(heal_data):
                label = "💚 Heal:" if i == 0 else f"💚 Heal ({i+1}):"
                details.append({"label": label, "content": roll_obj})
        else:
            details.append({"label": "💚 Heal:", "content": heal_data})

    # Add range (already in database format)
    if range_data:
        details.append({"label": "🎯 Range:", "content": range_data})

    # Add details from detail_entries table (like scaling, descriptions)
    for detail_row in detail_rows:
        detail_dict = dict(detail_row)
        label = detail_dict.get('label', '')
        content = detail_dict.get('content_text', '')

        # Skip range details since we already added it above
        if 'range' in label.lower():
            continue

        details.append({
            "label": label,
            "content": content
        })

    # Return in database format
    return {
        "icon": spell_dict.get('icon', '✨'),
        "level": spell_dict.get('level', 'cantrip'),
        "school": spell_dict.get('school', 'Evocation'),
        "title": spell_dict.get('title', 'Unknown'),
        "explanation": spell_dict.get('explanation', ''),
        "details": details
    }


@app.route('/api/spells', methods=['GET'])
def get_spells_api():
    """API endpoint: GET /api/spells - Returns all spells as JSON."""
    try:
        print(
            f"[API] GET /api/spells - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        print(f"[API] Database connection established")
        cursor = conn.cursor()

        # Get all spells with their card info
        cursor.execute("""
            SELECT 
                s.id as spell_id, c.id as card_id, c.title, c.icon, c.level, c.explanation,
                s.school, s.to_hit, s.damage, s.heal, s.range
            FROM spells s
            JOIN cards c ON s.card_id = c.id
            ORDER BY c.title
        """)

        spells = []
        for row in cursor.fetchall():
            card_id = row['card_id']

            # Get detail entries for this card
            cursor.execute("""
                SELECT label, content_text
                FROM detail_entries
                WHERE card_id = ?
                ORDER BY sequence_order
            """, (card_id,))

            detail_rows = cursor.fetchall()

            # Convert to API format
            spell_json = convert_db_spell_to_api_format(row, detail_rows)
            spells.append(spell_json)

        print(f"[API] Successfully loaded {len(spells)} spells")
        conn.close()
        return jsonify(spells)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/spells/<title>', methods=['GET'])
def get_spell_by_title(title):
    """API endpoint: GET /api/spells/<title> - Returns a single spell by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get spell by title
        cursor.execute("""
            SELECT 
                s.id as spell_id, c.id as card_id, c.title, c.icon, c.level, c.explanation,
                s.school, s.to_hit, s.damage, s.heal, s.range
            FROM spells s
            JOIN cards c ON s.card_id = c.id
            WHERE c.title = ?
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Spell '{title}' not found"}), 404

        card_id = row['card_id']

        # Get detail entries for this card
        cursor.execute("""
            SELECT label, content_text
            FROM detail_entries
            WHERE card_id = ?
            ORDER BY sequence_order
        """, (card_id,))

        detail_rows = cursor.fetchall()

        # Convert to API format (database format with details)
        spell_json = convert_db_spell_to_api_format(row, detail_rows)

        conn.close()
        return jsonify(spell_json)

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
    print(f"\n🎲 D&D Kids Resources Server (Flask)")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"✨ Server running at: http://localhost:{port}")
    print(f"📂 Database: {Path(DB_PATH).resolve()}")
    print(f"📡 API endpoints:")
    print(f"   - GET /api/spells         (all spells)")
    print(f"   - GET /api/spells/<title> (single spell)")
    print(f"\n Press Ctrl+C to stop the server")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    # Try to open in browser
    try:
        webbrowser.open(f"http://localhost:{port}")
    except:
        pass

    app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped.")
