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

    # Parse the database JSON fields
    to_hit_data = parse_json_field(spell_dict.get('to_hit'))
    damage_data = parse_json_field(spell_dict.get('damage'))
    heal_data = parse_json_field(spell_dict.get('heal'))
    range_data = parse_json_field(spell_dict.get('range'))

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

    # Return in API format
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

        # Get all spells directly (cards table no longer exists)
        cursor.execute("""
            SELECT 
                id, title, icon, level, school, explanation,
                to_hit, damage, heal, range
            FROM spells
            ORDER BY title
        """)

        spells = []
        for row in cursor.fetchall():
            spell_id = row['id']

            # Get detail entries for this spell
            cursor.execute("""
                SELECT label, content_text
                FROM detail_entries
                WHERE spell_id = ?
                ORDER BY sequence_order
            """, (spell_id,))

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

        # Get spell by title (directly from spells table)
        cursor.execute("""
            SELECT 
                id, title, icon, level, school, explanation,
                to_hit, damage, heal, range
            FROM spells
            WHERE title = ?
        """, (title,))

        row = cursor.fetchone()
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Spell '{title}' not found"}), 404

        spell_id = row['id']

        # Get detail entries for this spell
        cursor.execute("""
            SELECT label, content_text
            FROM detail_entries
            WHERE spell_id = ?
            ORDER BY sequence_order
        """, (spell_id,))

        detail_rows = cursor.fetchall()

        # Convert to API format
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
