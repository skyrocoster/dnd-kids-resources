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
import re
import sqlite3
from parse_dungeon import DungeonHTMLParser  # type: ignore

from flask import Flask, jsonify, send_from_directory, request
import webbrowser


# Setup Flask app
app = Flask(__name__, static_folder='.', static_url_path='')

# Get absolute path to database (same directory as server_flask.py)
DB_PATH = str(Path(__file__).parent / "dnd_kids_resources.db")

@app.route('/api/classes', methods=['GET'])
def get_classes_api():
    """API endpoint: GET /api/classes - Returns all class codes, names, emoji, and color as JSON."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT code, name, emoji, color
            FROM classes
            ORDER BY name
        """)
        classes = []
        for row in cursor.fetchall():
            classes.append({
                'code': row['code'],
                'name': row['name'],
                'emoji': row['emoji'],
                'color': row['color']
            })
        conn.close()
        return jsonify(classes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/spell-components', methods=['GET'])
def get_spell_components_api():
    """API endpoint: GET /api/spell-components - Returns all distinct component values in the spells table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT components FROM spells")
        component_values = set()
        rows = cursor.fetchall()
        for row in rows:
            raw = row['components'] if isinstance(row, sqlite3.Row) else row[0]
            values = parse_json_array_field(raw)
            if isinstance(values, list):
                for value in values:
                    if isinstance(value, str):
                        component_values.add(value)
        conn.close()
        return jsonify(sorted(component_values))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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


def parse_json_array_field(value):
    """Parse a JSON array or normalize a plain string into a list."""
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return []
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, str):
                return [parsed]
            return []
        except json.JSONDecodeError:
            # Normalize plain strings like "wizard, sorcerer" or "wizard|sorcerer"
            if re.search(r"[,|;]", cleaned):
                return [part.strip() for part in re.split(r"[,|;]+", cleaned) if part.strip()]
            return [cleaned]
    return []


def convert_db_player_to_api_format(player_row, conn=None, include_spells=False, include_weapons=False):
    player = dict(player_row)
    result = {
        'id': player.get('id'),
        'name': player.get('name'),
        'class': player.get('class'),
        'level': player.get('level'),
        'total_spell_slots': parse_json_field(player.get('total_spell_slots')) or {},
        'current_spell_slots': parse_json_field(player.get('current_spell_slots')) or {},
        'created_at': player.get('created_at'),
        'updated_at': player.get('updated_at')
    }

    if include_spells or include_weapons:
        if conn is None:
            conn = get_db_connection()
            should_close = True
        else:
            should_close = False

        if include_spells:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT spell_id FROM player_spells WHERE player_id = ? ORDER BY added_at",
                (player.get('id'),)
            )
            result['spells'] = [row['spell_id'] for row in cursor.fetchall()]
        else:
            result['spells'] = []

        if include_weapons:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT weapon_id FROM player_weapons WHERE player_id = ? ORDER BY added_at",
                (player.get('id'),)
            )
            result['weapons'] = [row['weapon_id'] for row in cursor.fetchall()]
        else:
            result['weapons'] = []

        if should_close:
            conn.close()
    else:
        result['spells'] = []
        result['weapons'] = []

    return result


def get_player_by_id(player_id, include_spells=False, include_weapons=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, class, level, total_spell_slots, current_spell_slots, created_at, updated_at FROM players WHERE id = ?", (player_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    player = convert_db_player_to_api_format(row, conn if include_spells or include_weapons else None, include_spells=include_spells, include_weapons=include_weapons)
    conn.close()
    return player


def get_all_players(include_spells=False, include_weapons=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, class, level, total_spell_slots, current_spell_slots, created_at, updated_at FROM players ORDER BY name")
    players = []
    rows = cursor.fetchall()
    for row in rows:
        players.append(convert_db_player_to_api_format(row, conn if include_spells or include_weapons else None, include_spells=include_spells, include_weapons=include_weapons))
    conn.close()
    return players


def validate_spell_slot_block(value):
    if value is None:
        return True
    if isinstance(value, dict):
        return all(
            isinstance(key, (str, int)) and str(key).isdigit() and 1 <= int(key) <= 9 and
            (isinstance(val, int) or (isinstance(val, str) and str(val).isdigit()))
            for key, val in value.items()
        )
    if isinstance(value, str):
        parsed = parse_json_field(value)
        return isinstance(parsed, dict) and validate_spell_slot_block(parsed)
    return False


def validate_player_payload(payload):
    if not isinstance(payload, dict):
        return False
    if 'name' in payload and payload.get('name') is not None and not isinstance(payload.get('name'), str):
        return False
    if 'class' in payload and payload.get('class') is not None and not isinstance(payload.get('class'), str):
        return False
    if 'level' in payload:
        level_value = payload.get('level')
        if level_value is not None:
            try:
                int(level_value)
            except (ValueError, TypeError):
                return False
    if 'total_spell_slots' in payload and not validate_spell_slot_block(payload.get('total_spell_slots')):
        return False
    if 'current_spell_slots' in payload and not validate_spell_slot_block(payload.get('current_spell_slots')):
        return False
    return True


def normalize_spell_slot_block(value):
    if value is None:
        return {}
    if isinstance(value, str):
        parsed = parse_json_field(value)
        if isinstance(parsed, dict):
            value = parsed
        else:
            return {}
    if not isinstance(value, dict):
        return {}
    normalized = {}
    for key, rawVal in value.items():
        if rawVal is None or rawVal == '':
            continue
        try:
            slotValue = int(rawVal)
        except (TypeError, ValueError):
            continue
        levelKey = str(key).strip()
        if levelKey.isdigit() and 1 <= int(levelKey) <= 9:
            normalized[levelKey] = slotValue
    return normalized


def sanitize_player_payload(payload):
    if not isinstance(payload, dict):
        return {}
    result = {}
    if 'name' in payload:
        result['name'] = str(payload['name']).strip() if payload['name'] is not None else 'Unnamed Player'
    if 'class' in payload:
        result['class'] = str(payload['class']).strip() if payload['class'] is not None else None
    if 'level' in payload:
        try:
            result['level'] = int(payload['level']) if payload['level'] not in (None, '') else None
        except (TypeError, ValueError):
            result['level'] = None
    if 'total_spell_slots' in payload:
        result['total_spell_slots'] = json.dumps(normalize_spell_slot_block(payload['total_spell_slots']))
    if 'current_spell_slots' in payload:
        result['current_spell_slots'] = json.dumps(normalize_spell_slot_block(payload['current_spell_slots']))
    return result


def create_player(player_data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO players (name, class, level, total_spell_slots, current_spell_slots) VALUES (?, ?, ?, ?, ?)",
        (
            player_data.get('name', 'Unnamed Player'),
            player_data.get('class'),
            player_data.get('level'),
            player_data.get('total_spell_slots', '{}'),
            player_data.get('current_spell_slots', '{}')
        )
    )
    conn.commit()
    player_id = cursor.lastrowid
    conn.close()
    return get_player_by_id(player_id, include_spells=True, include_weapons=True)


def update_player(player_id, player_data):
    fields = []
    values = []
    for key in ['name', 'class', 'level', 'total_spell_slots', 'current_spell_slots']:
        if key in player_data:
            fields.append(f"{key} = ?")
            values.append(player_data[key])
    if not fields:
        return None
    values.append(player_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE players SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_player_by_id(player_id, include_spells=True, include_weapons=True)


def delete_player(player_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM players WHERE id = ?", (player_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0


def add_spell_to_player(player_id, spell_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
    if not cursor.fetchone():
        conn.close()
        return None
    cursor.execute("SELECT id FROM spells WHERE id = ?", (spell_id,))
    if not cursor.fetchone():
        conn.close()
        return None
    try:
        cursor.execute(
            "INSERT OR IGNORE INTO player_spells (player_id, spell_id) VALUES (?, ?)",
            (player_id, spell_id)
        )
        conn.commit()
    except Exception:
        pass
    conn.close()
    return get_player_by_id(player_id, include_spells=True, include_weapons=True)


def remove_spell_from_player(player_id, spell_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM player_spells WHERE player_id = ? AND spell_id = ?", (player_id, spell_id))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0


def add_weapon_to_player(player_id, weapon_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
    if not cursor.fetchone():
        conn.close()
        return None
    cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
    if not cursor.fetchone():
        conn.close()
        return None
    try:
        cursor.execute(
            "INSERT OR IGNORE INTO player_weapons (player_id, weapon_id) VALUES (?, ?)",
            (player_id, weapon_id)
        )
        conn.commit()
    except Exception:
        pass
    conn.close()
    return get_player_by_id(player_id, include_spells=True, include_weapons=True)


def remove_weapon_from_player(player_id, weapon_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM player_weapons WHERE player_id = ? AND weapon_id = ?", (player_id, weapon_id))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0


def get_player_weapon_ids(player_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT weapon_id FROM player_weapons WHERE player_id = ? ORDER BY added_at", (player_id,))
    weapon_ids = [row['weapon_id'] for row in cursor.fetchall()]
    conn.close()
    return weapon_ids


def convert_db_npc_to_api_format(npc_row):
    npc = dict(npc_row)
    return {
        'id': npc.get('id'),
        'name': npc.get('name'),
        'race': npc.get('race'),
        'gender': npc.get('gender'),
        'background': npc.get('background'),
        'size': npc.get('size'),
        'stats': parse_json_field(npc.get('stats')) or {},
        'armor_class': npc.get('armor_class'),
        'hit_points': npc.get('hit_points'),
        'speed': npc.get('speed'),
        'saving_throws': parse_json_field(npc.get('saving_throws')) or {},
        'skills': parse_json_field(npc.get('skills')) or {},
        'senses': parse_json_field(npc.get('senses')) or [],
        'languages': npc.get('languages'),
        'appearance': parse_json_field(npc.get('appearance')) or {},
        'notes': npc.get('notes'),
        'created_at': npc.get('created_at'),
        'updated_at': npc.get('updated_at')
    }


def get_npc_by_id(npc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, race, gender, background, size, stats, armor_class, hit_points, speed, saving_throws, skills, senses, languages, appearance, notes, created_at, updated_at FROM npcs WHERE id = ?",
        (npc_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    npc = convert_db_npc_to_api_format(row)
    conn.close()
    return npc


def get_all_npcs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, race, gender, background, size, stats, armor_class, hit_points, speed, saving_throws, skills, senses, languages, appearance, notes, created_at, updated_at FROM npcs ORDER BY name"
    )
    npcs = [convert_db_npc_to_api_format(row) for row in cursor.fetchall()]
    conn.close()
    return npcs


def validate_npc_payload(payload):
    if not isinstance(payload, dict):
        return False
    if 'name' in payload and payload.get('name') is not None and not isinstance(payload.get('name'), str):
        return False
    if 'race' in payload and payload.get('race') is not None and not isinstance(payload.get('race'), str):
        return False
    if 'gender' in payload and payload.get('gender') is not None and not isinstance(payload.get('gender'), str):
        return False
    if 'background' in payload and payload.get('background') is not None and not isinstance(payload.get('background'), str):
        return False
    if 'size' in payload and payload.get('size') is not None and not isinstance(payload.get('size'), str):
        return False
    if 'speed' in payload and payload.get('speed') is not None and not isinstance(payload.get('speed'), str):
        return False
    if 'languages' in payload and payload.get('languages') is not None and not isinstance(payload.get('languages'), str):
        return False
    if 'notes' in payload and payload.get('notes') is not None and not isinstance(payload.get('notes'), str):
        return False
    for int_field in ['armor_class', 'hit_points']:
        if int_field in payload:
            field_value = payload.get(int_field)
            if field_value not in (None, ''):
                try:
                    int(field_value)
                except (TypeError, ValueError):
                    return False
    for json_field in ['stats', 'saving_throws', 'skills', 'appearance']:
        if json_field in payload and payload.get(json_field) is not None:
            value = payload.get(json_field)
            if isinstance(value, str):
                parsed = parse_json_field(value)
                if not isinstance(parsed, dict):
                    return False
            elif not isinstance(value, dict):
                return False
    if 'senses' in payload and payload.get('senses') is not None:
        value = payload.get('senses')
        if isinstance(value, str):
            parsed = parse_json_field(value)
            if not isinstance(parsed, list):
                return False
        elif not isinstance(value, list):
            return False
    return True


def normalize_npc_json_object(value):
    if value is None or value == '':
        return {}
    if isinstance(value, str):
        parsed = parse_json_field(value)
        if isinstance(parsed, dict):
            value = parsed
        else:
            return {}
    if not isinstance(value, dict):
        return {}
    normalized = {}
    for key, raw_val in value.items():
        if raw_val is None or raw_val == '':
            continue
        if isinstance(raw_val, str):
            normalized[key] = raw_val.strip()
            if normalized[key].isdigit():
                normalized[key] = int(normalized[key])
        else:
            normalized[key] = raw_val
    return normalized


def normalize_npc_senses(value):
    if value is None or value == '':
        return []
    if isinstance(value, str):
        parsed = parse_json_field(value)
        if isinstance(parsed, list):
            value = parsed
        else:
            return []
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, dict):
            result.append(item)
    return result


def sanitize_npc_payload(payload):
    if not isinstance(payload, dict):
        return {}
    result = {}
    for text_field in ['name', 'race', 'gender', 'background', 'size', 'speed', 'languages', 'notes']:
        if text_field in payload:
            result[text_field] = str(payload[text_field]).strip() if payload[text_field] is not None else None
    if 'armor_class' in payload:
        try:
            result['armor_class'] = int(payload['armor_class']) if payload['armor_class'] not in (None, '') else None
        except (TypeError, ValueError):
            result['armor_class'] = None
    if 'hit_points' in payload:
        try:
            result['hit_points'] = int(payload['hit_points']) if payload['hit_points'] not in (None, '') else None
        except (TypeError, ValueError):
            result['hit_points'] = None
    if 'stats' in payload:
        result['stats'] = json.dumps(normalize_npc_json_object(payload['stats']))
    if 'saving_throws' in payload:
        result['saving_throws'] = json.dumps(normalize_npc_json_object(payload['saving_throws']))
    if 'skills' in payload:
        result['skills'] = json.dumps(normalize_npc_json_object(payload['skills']))
    if 'appearance' in payload:
        result['appearance'] = json.dumps(normalize_npc_json_object(payload['appearance']))
    if 'senses' in payload:
        result['senses'] = json.dumps(normalize_npc_senses(payload['senses']))
    return result


def create_npc(npc_data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO npcs (name, race, gender, background, size, stats, armor_class, hit_points, speed, saving_throws, skills, senses, languages, appearance, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            npc_data.get('name', 'Unnamed NPC'),
            npc_data.get('race'),
            npc_data.get('gender'),
            npc_data.get('background'),
            npc_data.get('size'),
            npc_data.get('stats', '{}'),
            npc_data.get('armor_class'),
            npc_data.get('hit_points'),
            npc_data.get('speed'),
            npc_data.get('saving_throws', '{}'),
            npc_data.get('skills', '{}'),
            npc_data.get('senses', '[]'),
            npc_data.get('languages'),
            npc_data.get('appearance', '{}'),
            npc_data.get('notes')
        )
    )
    conn.commit()
    npc_id = cursor.lastrowid
    conn.close()
    return get_npc_by_id(npc_id)


def update_npc(npc_id, npc_data):
    fields = []
    values = []
    allowed_keys = ['name', 'race', 'gender', 'background', 'size', 'stats', 'armor_class', 'hit_points', 'speed', 'saving_throws', 'skills', 'senses', 'languages', 'appearance', 'notes']
    for key in allowed_keys:
        if key in npc_data:
            fields.append(f"{key} = ?")
            values.append(npc_data[key])
    if not fields:
        return None
    values.append(npc_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE npcs SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_npc_by_id(npc_id)


def delete_npc(npc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM npcs WHERE id = ?", (npc_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0


def get_player_spell_ids(player_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT spell_id FROM player_spells WHERE player_id = ? ORDER BY added_at", (player_id,))
    spell_ids = [row['spell_id'] for row in cursor.fetchall()]
    conn.close()
    return spell_ids


def get_spells_by_ids(spell_ids):
    if not spell_ids:
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ','.join(['?'] * len(spell_ids))
    cursor.execute(f"SELECT id, spell_name, icon, level, school, spell_text, attack_type, damage, heal, range, area_of_effect, classes, casting_time FROM spells WHERE id IN ({placeholders}) ORDER BY spell_name", tuple(spell_ids))
    spells = [convert_db_spell_to_api_format(row, conn) for row in cursor.fetchall()]
    conn.close()
    return spells


def format_area_of_effect_object(aoe_obj):
    """Convert structured AoE data like {"line": 100} into readable text."""
    if not isinstance(aoe_obj, dict) or not aoe_obj:
        return None

    parts = []
    for aoe_type, aoe_size in aoe_obj.items():
        type_text = str(aoe_type).replace('_', ' ').strip().title()
        if aoe_size is None or aoe_size == '':
            parts.append(type_text)
            continue

        size_text = str(aoe_size).strip()
        if size_text.isdigit():
            size_text = f"{size_text} feet"
        elif size_text.lower().endswith('ft'):
            size_text = size_text[:-2].strip() + ' feet'

        parts.append(f"{type_text} - {size_text}")

    return ' / '.join(parts) if parts else None


SPELL_EDITABLE_FIELDS = [
    'spell_name', 'icon', 'level', 'school', 'spell_text', 'spell_alt_text',
    'damage', 'heal', 'heal_at_spell_slots', 'range', 'higher_levels',
    'damage_at_higher_levels', 'casting_time', 'duration', 'concentration',
    'ritual', 'components', 'materials', 'attack_type', 'area_of_effect',
    'classes', 'subclasses'
]

SPELL_BOOLEAN_FIELDS = {'concentration', 'ritual'}

SPELL_JSON_EDITOR_FIELDS = {
    'damage', 'heal', 'heal_at_spell_slots', 'higher_levels',
    'damage_at_higher_levels', 'attack_type', 'area_of_effect',
    'classes', 'subclasses'
}


def format_spell_field_for_editor(field_name, value):
    """Prepare DB field values for the spell edit modal."""
    if field_name in SPELL_BOOLEAN_FIELDS:
        return bool(value)

    if value is None:
        return ''

    if field_name in SPELL_JSON_EDITOR_FIELDS:
        parsed = parse_json_field(value)
        if parsed is not None:
            return json.dumps(parsed, ensure_ascii=False, indent=2)

    return value


def normalize_spell_editor_value(field_name, value):
    """Normalize edited spell field values before saving to SQLite."""
    if field_name in SPELL_BOOLEAN_FIELDS:
        if isinstance(value, bool):
            return 1 if value else 0
        if isinstance(value, str):
            return 1 if value.strip().lower() in {'1', 'true', 'yes', 'on'} else 0
        return 1 if value else 0

    if value is None:
        return None

    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned if cleaned else None

    return value


def convert_db_spell_to_editor_format(spell_row):
    """Return a raw editable spell payload for the frontend modal."""
    spell_dict = dict(spell_row)
    result = {'id': spell_dict.get('id')}
    for field_name in SPELL_EDITABLE_FIELDS:
        result[field_name] = format_spell_field_for_editor(field_name, spell_dict.get(field_name))
    return result


def parse_area_of_effect(aoe_str):
    """Convert stored AoE value like [cube:30] or JSON into readable text."""
    if not aoe_str:
        return None

    if isinstance(aoe_str, dict):
        return format_area_of_effect_object(aoe_str)

    if isinstance(aoe_str, str):
        parsed = parse_json_field(aoe_str)
        if isinstance(parsed, dict):
            return format_area_of_effect_object(parsed)
        if isinstance(parsed, list):
            if not parsed:
                return None
            return json.dumps(parsed, ensure_ascii=False)

        match = re.match(r'^\[([^:\]]+):([^\]]+)\]$', aoe_str)
        if match:
            aoe_type = match.group(1).capitalize()
            aoe_size = match.group(2).strip()
            # Normalize numeric sizes to feet
            if aoe_size.isdigit():
                aoe_size = f"{aoe_size} feet"
            elif aoe_size.lower().endswith('ft'):
                aoe_size = aoe_size[:-2].strip() + ' feet'
            elif aoe_size.lower().endswith('feet'):
                aoe_size = aoe_size
            return f"{aoe_type} ({aoe_size})"

    return aoe_str


def enrich_numerics_with_abilities(numerics, conn=None):
    """
    Enrich numerics array with ability metadata (code, name, emoji, color).

    Input: [{"code": "dex"}] or ["dex", "sam"] or [{"code": "strength"}]
    Output: [{"code": "dex", "name": "Dexterity", "emoji": "⚡", "color": "#f39c12"}, ...]
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
            code = None
            
            # Handle string codes (e.g., "dex", "sam")
            if isinstance(item, str):
                code = item
            # Handle dict with code field
            elif isinstance(item, dict) and 'code' in item:
                code = item['code']
            # Skip integer IDs since abilities table uses code as PK
            elif isinstance(item, int):
                enriched.append(item)
                continue
            
            if code:
                # Look up by code
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT code, name, emoji, color 
                    FROM abilities 
                    WHERE code = ?
                """, (code,))
                ability = cursor.fetchone()

                if ability:
                    ability_dict = dict(ability)
                    enriched.append({
                        'code': ability_dict['code'],
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
    Enrich damage_type_ids array with damage_types table metadata (code, name, emoji, color).

    Input: ["fire", "cold"] (string codes)
    Output: [{"code": "fire", "name": "Fire", "emoji": "🔥", "color": "#e74c3c"}, ...]
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
            if isinstance(damage_item, str):
                # Look up damage type metadata by code
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT code, name, emoji, color 
                    FROM damage_types 
                    WHERE code = ?
                """, (damage_item,))
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
                    enriched.append(damage_item)
            else:
                # Skip integers since damage_types table uses code as PK
                enriched.append(damage_item)

        return enriched
    finally:
        if should_close:
            conn.close()


def get_damage_type_metadata(damage_type_code, conn):
    """
    Get enriched metadata for a damage type code.
    
    Input: "piercing"
    Output: {"code": "piercing", "name": "Piercing", "emoji": "🗡️", "color": "#..."}
    """
    if not isinstance(damage_type_code, str):
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT code, name, emoji, color 
            FROM damage_types 
            WHERE code = ?
        """, (damage_type_code,))
        damage_type = cursor.fetchone()
        
        if damage_type:
            return {
                'code': damage_type[0],
                'name': damage_type[1],
                'emoji': damage_type[2],
                'color': damage_type[3]
            }
    except Exception as e:
        print(f"Error enriching damage type {damage_type_code}: {e}")
    
    return None


def enrich_creature_type(creature_type_code, conn=None):
    """Lookup creature type metadata for a creature type code."""
    if not isinstance(creature_type_code, str):
        return None

    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT code, name, emoji, color FROM creature_types WHERE code = ?",
            (creature_type_code,)
        )
        creature_type = cursor.fetchone()
        if creature_type:
            return {
                'code': creature_type[0],
                'name': creature_type[1],
                'emoji': creature_type[2],
                'color': creature_type[3]
            }
    except Exception as e:
        print(f"Error enriching creature type {creature_type_code}: {e}")
    finally:
        if should_close:
            conn.close()

    return None


def enrich_roll_mappings(roll_mappings, conn):
    """
    Enrich roll mappings [{"1d4": "piercing"}, ...] by enriching damage type metadata.
    
    Input: [{"1d4": "piercing"}, {"2d6": "cold"}]
    Output: [{"1d4": {"code": "piercing", "name": "Piercing", "emoji": "🗡️", "color": "#..."}}, ...]
    """
    if not isinstance(roll_mappings, list):
        return roll_mappings
    
    enriched = []
    for mapping in roll_mappings:
        if isinstance(mapping, dict):
            enriched_mapping = {}
            for dice_notation, damage_type_code in mapping.items():
                # Enrich the damage type with metadata
                damage_metadata = get_damage_type_metadata(damage_type_code, conn)
                enriched_mapping[dice_notation] = damage_metadata if damage_metadata else damage_type_code
            enriched.append(enriched_mapping)
        else:
            enriched.append(mapping)
    
    return enriched


def enrich_roll_object(roll_obj, conn):
    """Enrich a single roll object by adding ability metadata and enriching damage types from roll mappings."""
    if not isinstance(roll_obj, dict):
        return roll_obj

    # Create a copy to avoid modifying original
    enriched_roll = roll_obj.copy()

    # Enrich numerics with ability metadata
    if 'numerics' in enriched_roll:
        enriched_roll['numerics'] = enrich_numerics_with_abilities(
            roll_obj['numerics'], conn)

    # If save data is present but numerics metadata is missing, enrich save codes too.
    if 'save' in enriched_roll and 'numerics' not in enriched_roll:
        save_codes = []
        if isinstance(enriched_roll['save'], str):
            save_codes = [enriched_roll['save']]
        elif isinstance(enriched_roll['save'], list):
            save_codes = [code for code in enriched_roll['save'] if isinstance(code, str)]

        if save_codes:
            enriched_roll['numerics'] = enrich_numerics_with_abilities(save_codes, conn)

    # Handle new roll format: [{"1d4": "piercing"}, ...]
    if 'roll' in enriched_roll and isinstance(enriched_roll['roll'], list):
        enriched_roll['roll'] = enrich_roll_mappings(
            roll_obj['roll'], conn)

    # Always enrich explicit damage type strings via damage_types metadata.
    if 'type' in enriched_roll and isinstance(enriched_roll['type'], str) and enriched_roll['type'].strip():
        type_code = enriched_roll['type'].strip().lower()
        if type_code not in ['melee', 'ranged']:
            enriched_roll['type_ids'] = enrich_damage_types(
                [enriched_roll['type'].strip()], conn)

    if 'type' in enriched_roll and isinstance(enriched_roll['type'], list):
        enriched_roll['types'] = enrich_damage_types(
            enriched_roll['type'], conn)

    if 'type_ids' in enriched_roll:
        enriched_roll['type_ids'] = enrich_damage_types(
            enriched_roll.get('type_ids'), conn)

    if 'types' in enriched_roll:
        enriched_roll['types'] = enrich_damage_types(
            enriched_roll.get('types'), conn)

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


def convert_db_creature_to_api_format_deprecated(creature_row, conn=None):
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

    attack_to_hit_list = attack_to_hit if isinstance(attack_to_hit, list) else []
    damage_list = damage if isinstance(damage, list) else []

    # Check if we have paired rolls (multiple to_hit and damage with same count)
    has_paired_rolls = (
        len(attack_to_hit_list) > 1 and len(damage_list) > 1 and
        len(attack_to_hit_list) == len(damage_list)
    )

    if attack_to_hit or damage:
        if has_paired_rolls:
            # Pair rolls and damages together: roll1, damage1, roll2, damage2, etc.
            for i, (to_hit_roll, damage_roll) in enumerate(zip(attack_to_hit_list, damage_list)):
                roll_name = to_hit_roll.get('name', None) if isinstance(
                    to_hit_roll, dict) else None

                # Use attack name if available, otherwise fall back to number emoji
                if roll_name and roll_name != 'A':
                    label_prefix = roll_name
                else:
                    label_prefix = number_map.get(roll_name if isinstance(roll_name, str) else 'A', '1️⃣')

                # Add roll with attack name
                enriched_roll = enrich_roll_object(to_hit_roll, conn)
                details.append({"label": f"🎲 {label_prefix}:",
                               "content": enriched_roll})

                # Add paired damage - use damage type emoji if available
                enriched_damage = enrich_roll_object(damage_roll, conn)
                # Try to extract damage type emoji for label
                damage_emoji = "💥"
                if enriched_damage and isinstance(enriched_damage, dict) and enriched_damage.get('type_ids'):
                    type_ids = enriched_damage.get('type_ids')
                    if isinstance(type_ids, list) and len(type_ids) > 0:
                        first_type = type_ids[0]
                        if isinstance(first_type, dict) and first_type.get('emoji'):
                            damage_emoji = first_type.get('emoji')
                
                details.append({"label": f"{damage_emoji} {label_prefix}:",
                               "content": enriched_damage})
        else:
            # Add to_hit rolls separately (not paired)
            if attack_to_hit:
                if isinstance(attack_to_hit, list):
                    for i, roll_obj in enumerate(attack_to_hit):
                        enriched_roll = enrich_roll_object(roll_obj, conn)
                        roll_name = roll_obj.get('name', None) if isinstance(roll_obj, dict) else None
                        
                        # Use attack name if available
                        if roll_name and roll_name != 'A':
                            label = f"🎲 {roll_name}:"
                        else:
                            label = "🎲 To Hit:"
                        
                        details.append({"label": label, "content": enriched_roll})
                else:
                    enriched_roll = enrich_roll_object(attack_to_hit, conn)
                    roll_name = attack_to_hit.get('name', None) if isinstance(attack_to_hit, dict) else None
                    
                    if roll_name and roll_name != 'A':
                        label = f"🎲 {roll_name}:"
                    else:
                        label = "🎲 To Hit:"
                    
                    details.append({"label": label, "content": enriched_roll})

            # Add damage rolls separately (not paired)
            if damage:
                if isinstance(damage, list):
                    for i, roll_obj in enumerate(damage):
                        enriched_roll = enrich_roll_object(roll_obj, conn)
                        roll_name = roll_obj.get('name', None) if isinstance(roll_obj, dict) else None
                        
                        # Extract damage type emoji for label
                        damage_emoji = "💥"
                        if enriched_roll and isinstance(enriched_roll, dict) and enriched_roll.get('type_ids'):
                            type_ids = enriched_roll.get('type_ids')
                            if isinstance(type_ids, list) and len(type_ids) > 0:
                                first_type = type_ids[0]
                                if isinstance(first_type, dict) and first_type.get('emoji'):
                                    damage_emoji = first_type.get('emoji')
                        
                        # Use attack name if available
                        if roll_name and roll_name != 'A':
                            label = f"{damage_emoji} {roll_name}:"
                        else:
                            label = "💥 Damage:"
                        
                        details.append({"label": label, "content": enriched_roll})
                else:
                    enriched_roll = enrich_roll_object(damage, conn)
                    roll_name = damage.get('name', None) if isinstance(damage, dict) else None
                    
                    # Extract damage type emoji for label
                    damage_emoji = "💥"
                    if enriched_roll and isinstance(enriched_roll, dict) and enriched_roll.get('type_ids'):
                        type_ids = enriched_roll.get('type_ids')
                        if isinstance(type_ids, list) and len(type_ids) > 0:
                            first_type = type_ids[0]
                            if isinstance(first_type, dict) and first_type.get('emoji'):
                                damage_emoji = first_type.get('emoji')
                    
                    if roll_name and roll_name != 'A':
                        label = f"{damage_emoji} {roll_name}:"
                    else:
                        label = "💥 Damage:"
                    
                    details.append({"label": label, "content": enriched_roll})

    # Add HP and AC stats grid (similar to saves_grid)
    if stats_grid_data:
        details.append({
            "label": "STATS",
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
    title_lower = str(creature_dict.get('title', 'unknown'))
    title_display = title_lower.capitalize()

    # Use creature type as level for card coloring (CSS will style .card.beast, .card.humanoid, etc.)
    # Falls back to title if no creature type
    level = creature_type_code if creature_type_code else title_lower

    # Build footer info with type and size
    footer_info = []
    size = creature_dict.get('size', '')
    if size and creature_type_emoji and creature_type_code:
        footer_info.append(
            f"{creature_type_emoji} {creature_type_code.capitalize()}")
        footer_info.append(str(size).capitalize())

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


def convert_db_monster_to_api_format(monster_row, conn=None):
    """
    Convert a database monster row to API format for the dungeon UI.
    """
    monster_dict = dict(monster_row)

    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    def parse_field(value):
        if value is None:
            return None
        if isinstance(value, str):
            parsed = parse_json_field(value)
            return parsed if parsed is not None else value
        return value

    def format_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            if 'average' in value:
                return str(value['average'])
            if 'avg' in value:
                return str(value['avg'])
            if 'value' in value:
                return str(value['value'])
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, list):
            return ', '.join(str(item) for item in value)
        return str(value)

    def format_hp_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            if 'average' in value:
                return str(value['average'])
            if 'avg' in value:
                return str(value['avg'])
            if 'value' in value:
                return str(value['value'])
            return ''
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    if 'average' in item:
                        return str(item['average'])
                    if 'avg' in item:
                        return str(item['avg'])
                    if 'value' in item:
                        return str(item['value'])
            return ''
        return ''

    def format_ac_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            pairs = []
            for ac_key, ac_note in value.items():
                ac_text = str(ac_key).strip()
                if ac_text == '':
                    continue
                if ac_note is None or ac_note == '':
                    pairs.append(ac_text)
                else:
                    pairs.append(f"{ac_text} ({str(ac_note).strip()})")
            return ', '.join(pairs)
        if isinstance(value, list):
            formatted = []
            for item in value:
                if isinstance(item, dict):
                    if 'value' in item:
                        item_text = str(item['value']).strip()
                        note = ''
                        if 'note' in item and item['note']:
                            note = str(item['note']).strip()
                        elif 'special' in item and item['special']:
                            note = str(item['special']).strip()
                        if item_text:
                            formatted.append(item_text if not note else f"{item_text} ({note})")
                else:
                    formatted.append(str(item))
            return ', '.join(formatted)
        return str(value)

    def format_speed_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            walk = value.get('walk')
            return str(walk).strip() if walk is not None and walk != '' else ''
        if isinstance(value, str):
            return value.strip()
        return ''

    def format_speed_tooltip(value):
        if not isinstance(value, dict):
            return ''
        parts = []
        for speed_type, speed_val in value.items():
            if speed_type and speed_val is not None and speed_val != '':
                parts.append(f"{speed_type}: {speed_val}")
        return ', '.join(parts)

    name = monster_dict.get('name', 'Unknown')
    title_display = str(name)
    icon = monster_dict.get('icon', '👹')
    size = monster_dict.get('size', '') or ''

    type_info = parse_field(monster_dict.get('type')) or {}
    type_name = ''
    if isinstance(type_info, dict):
        type_name = type_info.get('name', '') or ''
        subtype = type_info.get('subtype')
        if subtype:
            type_name = f"{type_name} ({subtype})" if type_name else str(subtype)
    elif type_info:
        type_name = str(type_info)

    hp = parse_field(monster_dict.get('hp'))
    ac = parse_field(monster_dict.get('ac'))
    speed = parse_field(monster_dict.get('speed'))
    save = parse_field(monster_dict.get('save')) or {}
    skill = parse_field(monster_dict.get('skill')) or {}
    resist = parse_field(monster_dict.get('resist')) or []
    vulnerable = parse_field(monster_dict.get('vulnerable')) or []
    senses = parse_field(monster_dict.get('senses')) or []
    languages = parse_field(monster_dict.get('languages')) or []
    action = parse_field(monster_dict.get('action')) or []
    reaction = parse_field(monster_dict.get('reaction')) or []
    traits = parse_field(monster_dict.get('traits')) or []
    bonus = parse_field(monster_dict.get('bonus')) or []
    legendary = parse_field(monster_dict.get('legendary')) or []
    mythic = parse_field(monster_dict.get('mythic')) or []
    spellcasting = parse_field(monster_dict.get('spellcasting')) or []
    cr = monster_dict.get('cr') or ''
    stats = parse_field(monster_dict.get('stats')) or {}

    details = []
    if size:
        details.append({'label': 'Size:', 'content': size})
    if type_name:
        details.append({'label': 'Type:', 'content': type_name})
    if cr:
        details.append({'label': 'CR:', 'content': cr})

    hp_str = format_hp_value(hp)
    if hp_str:
        details.append({'label': 'HP:', 'content': hp_str})

    ac_str = format_ac_value(ac)
    if ac_str:
        details.append({'label': 'AC:', 'content': ac_str})

    speed_str = format_speed_value(speed)
    if speed_str:
        speed_tooltip = format_speed_tooltip(speed)
        details.append({
            'label': 'Speed:',
            'content': speed_str,
            'tooltip': speed_tooltip
        })

    def format_resistance_entries(entries):
        if not isinstance(entries, list) or len(entries) == 0:
            return []
        formatted = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            if entry.get('type') == 'resist':
                damage_type = entry.get('damage_type') or entry.get('type_name')
                if not damage_type:
                    continue
                parts = [str(damage_type)]
                note = entry.get('note')
                if note:
                    parts.append(str(note))
                formatted.append(' '.join(parts))
        return formatted

    def format_damage_immunities(entries):
        if not isinstance(entries, list) or len(entries) == 0:
            return []
        formatted = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            if entry.get('type') == 'damageImmune':
                damage_type = entry.get('damage_type') or entry.get('type_name')
                if damage_type:
                    formatted.append(str(damage_type))
        return formatted

    def format_condition_immunities(entries):
        if not isinstance(entries, list) or len(entries) == 0:
            return []
        formatted = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            if entry.get('type') == 'conditionImmune':
                immune_type = entry.get('immune_type') or entry.get('condition') or entry.get('type_name')
                if immune_type:
                    formatted.append(str(immune_type))
        return formatted

    def format_senses_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            range_val = value.get('range') or value.get('distance') or value.get('value')
            sense_type = value.get('type') or value.get('sense')
            if range_val and sense_type:
                return f"{range_val} ({sense_type})"
            if range_val:
                return str(range_val)
            if sense_type:
                return str(sense_type)
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, list):
            formatted = []
            for item in value:
                if isinstance(item, dict):
                    item_text = format_senses_value(item)
                    if item_text:
                        formatted.append(item_text)
                elif item is not None and item != '':
                    formatted.append(str(item))
            return ', '.join(formatted)
        return str(value)

    def normalize_skill_code(skill_name):
        if not isinstance(skill_name, str):
            return None
        return skill_name.strip().lower().replace(' ', '_').replace('-', '_')

    def build_save_grid(save_obj):
        if not isinstance(save_obj, dict):
            return []
        save_grid = []
        cursor = conn.cursor()
        for ability_code in ['str', 'dex', 'con', 'int', 'wis', 'cha']:
            if ability_code not in save_obj:
                continue
            raw_value = save_obj.get(ability_code)
            if raw_value is None or raw_value == '':
                continue
            try:
                modifier = int(raw_value)
            except (TypeError, ValueError):
                continue

            cursor.execute(
                "SELECT code, name, emoji, color FROM abilities WHERE code = ?",
                (ability_code,)
            )
            ability = cursor.fetchone()
            if ability:
                ability_dict = dict(ability)
                save_grid.append({
                    'code': ability_dict['code'],
                    'name': ability_dict['name'],
                    'emoji': ability_dict['emoji'],
                    'color': ability_dict['color'],
                    'modifier': modifier
                })
            else:
                save_grid.append({
                    'code': ability_code,
                    'name': ability_code.upper(),
                    'emoji': '',
                    'color': '#7f8c8d',
                    'modifier': modifier
                })
        return save_grid

    def build_skill_grid(skill_obj):
        if not isinstance(skill_obj, dict):
            return [], None
        skill_grid = []
        other_skills = []
        passive_perception = None
        cursor = conn.cursor()

        for skill_name, raw_value in skill_obj.items():
            if skill_name is None:
                continue
            key = skill_name.strip().lower()
            if key == 'passive perception':
                passive_perception = raw_value
                continue
            if raw_value is None or raw_value == '':
                continue

            skill_code = normalize_skill_code(skill_name)
            if not skill_code:
                continue

            cursor.execute(
                "SELECT code, name, emoji, color FROM abilities WHERE code = ? AND type = 'skill'",
                (skill_code,)
            )
            ability = cursor.fetchone()
            if ability:
                ability_dict = dict(ability)
                try:
                    modifier = int(raw_value)
                except (TypeError, ValueError):
                    modifier = raw_value
                skill_grid.append({
                    'code': ability_dict['code'],
                    'name': ability_dict['name'],
                    'emoji': ability_dict['emoji'],
                    'color': ability_dict['color'],
                    'modifier': modifier
                })
            else:
                other_skills.append(f"{skill_name}: {raw_value}")

        if other_skills:
            skill_grid.append({
                'code': 'other',
                'name': 'Other Skills',
                'emoji': '❓',
                'color': '#95a5a6',
                'modifier': ', '.join(other_skills)
            })

        return skill_grid, passive_perception

    save_grid = build_save_grid(save)
    if save_grid:
        details.append({
            'label': '💪 Saves:',
            'content': save_grid,
            'type': 'saves_grid'
        })

    skill_grid, passive_perception = build_skill_grid(skill)
    if skill_grid:
        details.append({
            'label': '🛠️ Skills:',
            'content': skill_grid,
            'type': 'skills_grid'
        })
    if passive_perception is not None and passive_perception != '':
        details.append({'label': 'Passive Perception:', 'content': passive_perception})
    if senses:
        senses_str = format_senses_value(senses)
        if senses_str:
            details.append({'label': 'Senses:', 'content': senses_str})
    if languages:
        details.append({'label': 'Languages:', 'content': languages})

    resist_entries = format_resistance_entries(resist)
    if resist_entries:
        details.append({'label': 'Resistances:', 'content': resist_entries})

    damage_immunities = format_damage_immunities(resist)
    if damage_immunities:
        details.append({'label': 'Damage Immunities:', 'content': damage_immunities})

    condition_immunities = format_condition_immunities(resist)
    if condition_immunities:
        details.append({'label': 'Condition Immunities:', 'content': condition_immunities})

    if vulnerable:
        details.append({'label': 'Vulnerabilities:', 'content': vulnerable})
    if traits:
        details.append({'label': 'Traits:', 'content': f'{len(traits)} entries'})
    if action:
        details.append({'label': 'Actions:', 'content': f'{len(action)} entries'})
    if reaction:
        details.append({'label': 'Reactions:', 'content': f'{len(reaction)} entries'})
    if bonus:
        details.append({'label': 'Bonus Actions:', 'content': f'{len(bonus)} entries'})
    if legendary:
        details.append({'label': 'Legendary:', 'content': f'{len(legendary)} entries'})
    if mythic:
        details.append({'label': 'Mythic:', 'content': f'{len(mythic)} entries'})
    if spellcasting:
        spellcasting_count = len(spellcasting) if isinstance(spellcasting, (list, tuple)) else 1
        details.append({'label': 'Spellcasting:', 'content': f'{spellcasting_count} entries'})

    if isinstance(stats, dict) and stats:
        stats_grid_data = []
        cursor = conn.cursor()
        for ability_code in ['str', 'dex', 'con', 'int', 'wis', 'cha']:
            if ability_code in stats and isinstance(stats[ability_code], int):
                cursor.execute(
                    "SELECT code, name, emoji, color FROM abilities WHERE code = ?",
                    (ability_code,)
                )
                ability = cursor.fetchone()
                if ability:
                    ability_dict = dict(ability)
                    stats_grid_data.append({
                        'code': ability_dict['code'],
                        'name': ability_dict['name'],
                        'emoji': ability_dict['emoji'],
                        'color': ability_dict['color'],
                        'value': stats[ability_code]
                    })
                else:
                    stats_grid_data.append({
                        'code': ability_code,
                        'name': ability_code.upper(),
                        'emoji': ability_code.upper(),
                        'color': '#7f8c8d',
                        'value': stats[ability_code]
                    })
        if stats_grid_data:
            details.append({
                'label': 'STATS',
                'content': stats_grid_data,
                'type': 'stats_grid'
            })

    footer_info = []
    if type_name:
        footer_info.append(type_name)
    if size:
        footer_info.append(size)

    explanation = type_name or ''

    result = {
        'icon': icon,
        'level': type_name or size or str(name).lower(),
        'title': title_display,
        'explanation': explanation,
        'details': details,
        'footer_info': ' • '.join(footer_info) if footer_info else '',
        'traits': traits,
        'actions': action,
        'reactions': reaction,
        'bonus_actions': bonus,
        'legendary_actions': legendary,
        'mythic_actions': mythic,
        'spellcasting': spellcasting
    }

    if should_close:
        conn.close()

    return result


def format_element_name(name):
    """Format element name for display (e.g., 'target' -> 'Target', 'aoe' -> 'AOE')"""
    if not name:
        return "Effect"
    # Special case: aoe should be AOE (all caps abbreviation)
    if name.lower() == 'aoe':
        return "AOE"
    # Otherwise capitalize first letter
    return name.capitalize()


def get_spell_level_color(level):
    """Get hex color for spell level (matching CSS color classes)"""
    level_colors = {
        'cantrip': '#f39c12',      # Gold
        '0': '#f39c12',            # Gold (cantrip numeric)
        '1': '#e74c3c',            # Red
        '2': '#9b59b6',            # Purple
        '3': '#3498db',            # Blue
        '4': '#1abc9c',            # Teal
        '5': '#2ecc71',            # Green
        '6': '#f1c40f',            # Yellow
        '7': '#e67e22',            # Orange
        '8': '#95a5a6',            # Grey
        '9': '#34495e'             # Dark Blue-Grey
    }
    # Normalize level string (strip 'level' prefix if present)
    normalized = level.lower().replace('level', '').strip()
    return level_colors.get(normalized, '#95a5a6')  # Default to grey


def has_meaningful_spell_roll(roll_obj):
    """Return True if a spell roll/save object contains renderable content."""
    if not isinstance(roll_obj, dict):
        return bool(roll_obj)

    if roll_obj.get('roll'):
        return True
    if roll_obj.get('numerics'):
        return True
    if roll_obj.get('type_ids'):
        return True
    if roll_obj.get('types'):
        return True
    if roll_obj.get('amount'):
        return True
    if roll_obj.get('type'):
        return True
    if roll_obj.get('save') and str(roll_obj.get('save')).strip():
        return True
    if roll_obj.get('save_success') and str(roll_obj.get('save_success')).strip() and roll_obj.get('save_success') != 'none':
        return True
    return False


def is_single_initial_attack_damage_pair(to_hit_data, damage_data):
    def is_initial_attack(obj):
        return isinstance(obj, dict) and obj.get('name', '').strip().lower() == 'initial'

    if isinstance(to_hit_data, list) and isinstance(damage_data, list):
        return len(to_hit_data) == 1 and len(damage_data) == 1 and is_initial_attack(to_hit_data[0]) and is_initial_attack(damage_data[0])

    if isinstance(to_hit_data, dict) and isinstance(damage_data, dict):
        return is_initial_attack(to_hit_data) and is_initial_attack(damage_data)

    return False


def is_single_initial_save(to_hit_data, damage_data):
    if damage_data:
        return False

    if isinstance(to_hit_data, list) and len(to_hit_data) == 1 and isinstance(to_hit_data[0], dict):
        role_obj = to_hit_data[0]
        return role_obj.get('name', '').strip().lower() == 'initial' and bool(role_obj.get('save'))

    if isinstance(to_hit_data, dict):
        return to_hit_data.get('name', '').strip().lower() == 'initial' and bool(to_hit_data.get('save'))

    return False


def is_single_primary_damage(damage_data):
    if isinstance(damage_data, list):
        meaningful_damage = [
            roll_obj for roll_obj in damage_data
            if isinstance(roll_obj, dict) and has_meaningful_spell_roll(roll_obj)
        ]
        return len(meaningful_damage) == 1 and meaningful_damage[0].get('name', '').strip().lower() == 'primary'

    if isinstance(damage_data, dict):
        return damage_data.get('name', '').strip().lower() == 'primary' and has_meaningful_spell_roll(damage_data)

    return False


def format_spell_detail_label(name, role, single_initial_pair=False, single_initial_save=False, single_primary_damage=False):
    if isinstance(name, str) and name.strip().lower() == 'initial' and role == 'Save':
        return "Save:"

    if isinstance(name, str) and name.strip().lower() == 'initial' and role == 'Attack':
        return "Attack:"

    if single_primary_damage and isinstance(name, str) and name.strip().lower() == 'primary' and role == 'Damage':
        return "Damage:"

    if isinstance(name, str) and role == 'Damage':
        normalized_name = name.strip().lower()
        if normalized_name == 'primary':
            return "Damage (1):"
        if normalized_name == 'secondary':
            return "Damage (2):"

    if single_initial_pair and isinstance(name, str) and name.strip().lower() == 'initial':
        return f"{role}:"

    formatted_name = format_element_name(name)
    if role == 'Heal' and formatted_name == 'Effect':
        return "Heal:"

    return f"{formatted_name} ({role}):"


def convert_db_spell_to_api_format(spell_row, conn=None):
    """
    Convert database spell to API format.

    spell_row contains: id, spell_name, icon, level, school, spell_text,
                       to_hit, damage, heal, range

    Features:
    - Detects paired rolls (multiple to_hit/damage with same count) and interleaves them
    - Uses element names (target, aoe, etc.) with (Attack) or (Save) indicators
    - Colors details by spell level
    - Enriches rolls with ability/damage type metadata

    Returns:
    {
      "title": "Fire Bolt",
      "icon": "🔥",
      "level": "cantrip",
      "school": "Evocation",
      "explanation": "...",
      "details": [
        {"label": "Target (Attack)", "color": "#f39c12", "content": {...}},
        {"label": "Target (Damage)", "color": "#f39c12", "content": {...}},
        {"label": "Range", "color": "#f39c12", "content": {...}}
      ]
    }

    For spells with multiple elements (e.g., Ice Knife):
    {
      "details": [
        {"label": "Target (Attack)", "color": "#e74c3c", "content": {...}},
        {"label": "Target (Damage)", "color": "#e74c3c", "content": {...}},
        {"label": "AOE (Save)", "color": "#e74c3c", "content": {...}},
        {"label": "AOE (Damage)", "color": "#e74c3c", "content": {...}},
        {"label": "Range", "color": "#e74c3c", "content": {...}}
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

    # Get spell level and calculate detail color
    spell_level = spell_dict.get('level', 'cantrip')
    detail_color = get_spell_level_color(spell_level)

    # Parse the database JSON fields
    to_hit_data = parse_json_field(spell_dict.get('attack_type') or spell_dict.get('to_hit'))
    damage_data = parse_json_field(spell_dict.get('damage'))
    heal_data = parse_json_field(spell_dict.get('heal'))
    range_data = parse_json_field(spell_dict.get('range'))
    if range_data is None:
        range_data = spell_dict.get('range')
    if isinstance(range_data, str) and not range_data.strip():
        range_data = None
    aoe_data = parse_area_of_effect(spell_dict.get('area_of_effect'))
    casting_time_text = spell_dict.get('casting_time')

    single_initial_pair = is_single_initial_attack_damage_pair(to_hit_data, damage_data)
    single_initial_save = is_single_initial_save(to_hit_data, damage_data)
    single_primary_damage = is_single_primary_damage(damage_data)

    # Build details array with database format
    # Order: paired rolls/damage (if applicable), then unpaired, range at end
    details = []

    # Number emoji mapping
    number_map = {'A': '1️⃣', 'B': '2️⃣', 'C': '3️⃣', 'D': '4️⃣', 'E': '5️⃣'}

    to_hit_data_list = to_hit_data if isinstance(to_hit_data, list) else []
    damage_data_list = damage_data if isinstance(damage_data, list) else []

    # Check if we have paired rolls (multiple to_hit and damage with same count)
    has_paired_rolls = (
        len(to_hit_data_list) > 1 and len(damage_data_list) > 1 and
        len(to_hit_data_list) == len(damage_data_list)
    )

    if has_paired_rolls:
        # Pair rolls and damages together: roll1, damage1, roll2, damage2, etc.
        for i, (to_hit_roll, damage_roll) in enumerate(zip(to_hit_data_list, damage_data_list)):
            element_name = None
            if has_meaningful_spell_roll(to_hit_roll):
                roll_name = to_hit_roll.get('name', None) if isinstance(
                    to_hit_roll, dict) else None
                element_name = format_element_name(roll_name)

                # Determine if this is a save or attack roll
                is_save = to_hit_roll.get('save', False) if isinstance(
                    to_hit_roll, dict) else False
                roll_type = "Save" if is_save else "Attack"

                # Add roll with element name and type
                label = format_spell_detail_label(roll_name, roll_type, single_initial_pair, single_initial_save)
                enriched_roll = enrich_roll_object(to_hit_roll, conn)
                details.append({"label": label, "color": detail_color,
                               "content": enriched_roll})

            if has_meaningful_spell_roll(damage_roll):
                if element_name is None:
                    roll_name = damage_roll.get('name', None) if isinstance(
                        damage_roll, dict) else None
                    element_name = format_element_name(roll_name)
                label = format_spell_detail_label(damage_roll.get('name', None) if isinstance(damage_roll, dict) else None, 'Damage', single_initial_pair, single_initial_save, single_primary_damage)
                enriched_damage = enrich_roll_object(damage_roll, conn)
                details.append({"label": label, "color": detail_color,
                               "content": enriched_damage})
    else:
        # Add to_hit rolls separately (not paired)
        if to_hit_data:
            if isinstance(to_hit_data, list):
                for i, roll_obj in enumerate(to_hit_data):
                    if not has_meaningful_spell_roll(roll_obj):
                        continue

                    roll_name = roll_obj.get('name', None) if isinstance(
                        roll_obj, dict) else None
                    element_name = format_element_name(roll_name)

                    # Determine if this is a save or attack roll
                    is_save = roll_obj.get('save', False) if isinstance(
                        roll_obj, dict) else False
                    roll_type = "Save" if is_save else "Attack"

                    label = format_spell_detail_label(roll_name, roll_type, single_initial_pair, single_initial_save)

                    enriched_roll = enrich_roll_object(roll_obj, conn)
                    details.append({"label": label, "color": detail_color, "content": enriched_roll})
            else:
                if has_meaningful_spell_roll(to_hit_data):
                    element_name = format_element_name(None)
                    is_save = to_hit_data.get('save', False) if isinstance(
                        to_hit_data, dict) else False
                    roll_type = "Save" if is_save else "Attack"
                    label = format_spell_detail_label(to_hit_data.get('name', None) if isinstance(to_hit_data, dict) else None, roll_type, single_initial_pair, single_initial_save, single_primary_damage)
                    enriched_roll = enrich_roll_object(to_hit_data, conn)
                    details.append({"label": label, "color": detail_color,
                                   "content": enriched_roll})

        # Add damage rolls separately (not paired)
        if damage_data:
            if isinstance(damage_data, list):
                for i, roll_obj in enumerate(damage_data):
                    if not has_meaningful_spell_roll(roll_obj):
                        continue

                    roll_name = roll_obj.get('name', None) if isinstance(
                        roll_obj, dict) else None
                    element_name = format_element_name(roll_name)

                    label = format_spell_detail_label(roll_name, 'Damage', single_initial_pair, single_initial_save, single_primary_damage)

                    enriched_roll = enrich_roll_object(roll_obj, conn)
                    details.append({"label": label, "color": detail_color, "content": enriched_roll})
            else:
                if has_meaningful_spell_roll(damage_data):
                    label = format_spell_detail_label(damage_data.get('name', None) if isinstance(damage_data, dict) else None, 'Damage', single_initial_pair, single_initial_save, single_primary_damage)
                    enriched_roll = enrich_roll_object(damage_data, conn)
                    details.append({"label": label, "color": detail_color, "content": enriched_roll})

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

                label = format_spell_detail_label(roll_name, heal_text, single_initial_pair)

                enriched_roll = enrich_roll_object(roll_obj, conn)
                details.append({"label": label, "color": detail_color, "content": enriched_roll})
        else:
            heal_type = heal_data.get('type', 'normal') if isinstance(
                heal_data, dict) else 'normal'
            heal_text = "Max HP" if heal_type == 'max_hp' else "Heal"
            label = format_spell_detail_label(heal_data.get('name', None) if isinstance(heal_data, dict) else None, heal_text, single_initial_pair)
            enriched_roll = enrich_roll_object(heal_data, conn)
            details.append({"label": label, "color": detail_color, "content": enriched_roll})

    # Add AoE if present
    if aoe_data:
        details.append({"label": "Area:", "color": detail_color, "content": aoe_data})

    # Add range ALWAYS at the end (from spells.range column)
    if range_data:
        details.append({"label": "Range:", "color": detail_color, "content": range_data})

    # Return in API format
    # Parse spell_text into a structured explanation if it is stored as JSON
    spell_text_data = parse_json_field(spell_dict.get('spell_text'))
    explanation_content = spell_text_data if spell_text_data is not None else spell_dict.get('spell_text') or spell_dict.get('explanation', '')

    result = {
        "id": spell_dict.get('id'),
        "icon": spell_dict.get('icon', '✨'),
        "level": spell_dict.get('level', 'cantrip'),
        "school": spell_dict.get('school', 'Evocation'),
        "title": spell_dict.get('spell_name') or spell_dict.get('title', 'Unknown'),
        "explanation": explanation_content,
        "details": details,
        "classes": parse_json_array_field(spell_dict.get('classes')),
        "casting_time": casting_time_text or ''
    }

    # Close connection if we created it
    if should_close:
        conn.close()

    return result


def convert_db_weapon_to_api_format(weapon_row):
    """Convert a database weapon row to API format."""
    weapon_dict = dict(weapon_row)

    def parse_field(value):
        if value is None:
            return None
        if isinstance(value, str):
            parsed = parse_json_field(value)
            return parsed if parsed is not None else value
        return value

    return {
        'id': weapon_dict.get('id'),
        'name': weapon_dict.get('name') or '',
        'base_weapon': parse_field(weapon_dict.get('base_weapon')),
        'baseitems': bool(weapon_dict.get('baseitems')),
        'rarity': parse_field(weapon_dict.get('rarity')),
        'weapon_category': parse_field(weapon_dict.get('weapon_category')),
        'weight': weapon_dict.get('weight'),
        'req_attune': parse_field(weapon_dict.get('req_attune')),
        'sentient': bool(weapon_dict.get('sentient')),
        'curse': bool(weapon_dict.get('curse')),
        'resist': parse_field(weapon_dict.get('resist')) or [],
        'property': parse_field(weapon_dict.get('property')) or [],
        'focus': parse_field(weapon_dict.get('focus')) or [],
        'spells': parse_field(weapon_dict.get('spells')) or [],
        'attack': parse_field(weapon_dict.get('attack')) or [],
        'recharge': parse_field(weapon_dict.get('recharge')) or {},
        'light': parse_field(weapon_dict.get('light')) or [],
        'entries': parse_field(weapon_dict.get('entries')) or [],
        'tier': parse_field(weapon_dict.get('tier')),
        'grants_language': bool(weapon_dict.get('grants_language')),
        'bonus_spell_attack': weapon_dict.get('bonus_spell_attack'),
        'bonus_spell_save_dc': weapon_dict.get('bonus_spell_save_dc'),
        'bonus_ac': weapon_dict.get('bonus_ac'),
        'bonus_saving_throw': weapon_dict.get('bonus_saving_throw'),
        'crit_threshold': weapon_dict.get('crit_threshold'),
        'ammo_type': parse_field(weapon_dict.get('ammo_type')),
        'grants_proficiency': bool(weapon_dict.get('grants_proficiency')),
        'modify_speed': parse_field(weapon_dict.get('modify_speed')) or {},
        'ability': parse_field(weapon_dict.get('ability')) or {}
    }


@app.route('/api/weapons', methods=['GET'])
def get_weapons_api():
    """API endpoint: GET /api/weapons - Returns all weapons as JSON."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM weapons
            ORDER BY name
        """)

        weapons = []
        for row in cursor.fetchall():
            weapons.append(convert_db_weapon_to_api_format(row))

        conn.close()
        return jsonify(weapons)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/weapons/<title>', methods=['GET'])
def get_weapon_by_title(title):
    """API endpoint: GET /api/weapons/<title> - Returns a single weapon by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM weapons
            WHERE LOWER(name) = LOWER(?)
        """, (title,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": f"Weapon '{title}' not found"}), 404

        weapon_json = convert_db_weapon_to_api_format(row)
        conn.close()
        return jsonify(weapon_json)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
                id, spell_name, icon, level, school, spell_text,
                attack_type, damage, heal, range, area_of_effect, classes,
                casting_time
            FROM spells
            ORDER BY spell_name
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
                id, spell_name, icon, level, school, spell_text,
                attack_type, damage, heal, range, area_of_effect, classes,
                casting_time
            FROM spells
            WHERE spell_name = ?
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


@app.route('/api/players', methods=['GET'])
def get_players_api():
    """API endpoint: GET /api/players - Returns all players."""
    try:
        players = get_all_players(include_spells=True, include_weapons=True)
        return jsonify(players)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>', methods=['GET'])
def get_player_api(player_id):
    """API endpoint: GET /api/players/<player_id> - Returns one player and assigned spells and weapons."""
    try:
        player = get_player_by_id(player_id, include_spells=True, include_weapons=True)
        if not player:
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        return jsonify(player)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players', methods=['POST'])
def create_player_api():
    """API endpoint: POST /api/players - Creates a new player."""
    try:
        payload = request.get_json(silent=True) or {}
        if not validate_player_payload(payload):
            return jsonify({"error": "Invalid player payload"}), 400
        player_data = sanitize_player_payload(payload)
        player = create_player(player_data)
        return jsonify(player), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>', methods=['PUT'])
def update_player_api(player_id):
    """API endpoint: PUT /api/players/<player_id> - Updates a player."""
    try:
        payload = request.get_json(silent=True) or {}
        if not validate_player_payload(payload):
            return jsonify({"error": "Invalid player payload"}), 400
        player_data = sanitize_player_payload(payload)
        player = update_player(player_id, player_data)
        if not player:
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        return jsonify(player)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player_api(player_id):
    """API endpoint: DELETE /api/players/<player_id> - Deletes a player."""
    try:
        deleted = delete_player(player_id)
        if not deleted:
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/npcs', methods=['GET'])
def get_npcs_api():
    """API endpoint: GET /api/npcs - Returns all NPCs."""
    try:
        return jsonify(get_all_npcs())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/npcs/<int:npc_id>', methods=['GET'])
def get_npc_api(npc_id):
    """API endpoint: GET /api/npcs/<npc_id> - Returns one NPC."""
    try:
        npc = get_npc_by_id(npc_id)
        if not npc:
            return jsonify({"error": "NPC not found"}), 404
        return jsonify(npc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/npcs', methods=['POST'])
def create_npc_api():
    """API endpoint: POST /api/npcs - Creates a new NPC."""
    try:
        payload = request.get_json(silent=True) or {}
        if not validate_npc_payload(payload):
            return jsonify({"error": "Invalid NPC payload"}), 400
        npc_data = sanitize_npc_payload(payload)
        npc = create_npc(npc_data)
        return jsonify(npc), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/npcs/<int:npc_id>', methods=['PUT'])
def update_npc_api(npc_id):
    """API endpoint: PUT /api/npcs/<npc_id> - Updates an NPC."""
    try:
        payload = request.get_json(silent=True) or {}
        if not validate_npc_payload(payload):
            return jsonify({"error": "Invalid NPC payload"}), 400
        npc_data = sanitize_npc_payload(payload)
        npc = update_npc(npc_id, npc_data)
        if not npc:
            return jsonify({"error": f"NPC id '{npc_id}' not found"}), 404
        return jsonify(npc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/npcs/<int:npc_id>', methods=['DELETE'])
def delete_npc_api(npc_id):
    """API endpoint: DELETE /api/npcs/<npc_id> - Deletes an NPC."""
    try:
        deleted = delete_npc(npc_id)
        if not deleted:
            return jsonify({"error": f"NPC id '{npc_id}' not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/spells', methods=['GET'])
def get_player_spells_api(player_id):
    """API endpoint: GET /api/players/<player_id>/spells - Returns assigned spell IDs."""
    try:
        if not get_player_by_id(player_id):
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        spell_ids = get_player_spell_ids(player_id)
        return jsonify(spell_ids)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/spells', methods=['POST'])
def add_player_spell_api(player_id):
    """API endpoint: POST /api/players/<player_id>/spells - Assign a spell to a player."""
    try:
        payload = request.get_json(silent=True) or {}
        spell_id = payload.get('spell_id')
        if spell_id is None:
            return jsonify({"error": "Missing spell_id"}), 400
        try:
            spell_id = int(spell_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid spell_id"}), 400
        player = add_spell_to_player(player_id, spell_id)
        if player is None:
            return jsonify({"error": "Player or spell not found"}), 404
        return jsonify(player)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/spells/<int:spell_id>', methods=['DELETE'])
def remove_player_spell_api(player_id, spell_id):
    """API endpoint: DELETE /api/players/<player_id>/spells/<spell_id> - Remove a spell assignment."""
    try:
        if not get_player_by_id(player_id):
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        removed = remove_spell_from_player(player_id, spell_id)
        if not removed:
            return jsonify({"error": "Spell assignment not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/weapons', methods=['GET'])
def get_player_weapons_api(player_id):
    """API endpoint: GET /api/players/<player_id>/weapons - Returns assigned weapon IDs."""
    try:
        if not get_player_by_id(player_id):
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        weapon_ids = get_player_weapon_ids(player_id)
        return jsonify(weapon_ids)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/weapons', methods=['POST'])
def add_player_weapon_api(player_id):
    """API endpoint: POST /api/players/<player_id>/weapons - Assign a weapon to a player."""
    try:
        payload = request.get_json(silent=True) or {}
        weapon_id = payload.get('weapon_id')
        if weapon_id is None:
            return jsonify({"error": "Missing weapon_id"}), 400
        try:
            weapon_id = int(weapon_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid weapon_id"}), 400
        player = add_weapon_to_player(player_id, weapon_id)
        if player is None:
            return jsonify({"error": "Player or weapon not found"}), 404
        return jsonify(player)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/players/<int:player_id>/weapons/<int:weapon_id>', methods=['DELETE'])
def remove_player_weapon_api(player_id, weapon_id):
    """API endpoint: DELETE /api/players/<player_id>/weapons/<weapon_id> - Remove a weapon assignment."""
    try:
        if not get_player_by_id(player_id):
            return jsonify({"error": f"Player id '{player_id}' not found"}), 404
        removed = remove_weapon_from_player(player_id, weapon_id)
        if not removed:
            return jsonify({"error": "Weapon assignment not found"}), 404
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/spells/id/<int:spell_id>/raw', methods=['GET'])
def get_spell_by_id_raw(spell_id):
    """API endpoint: GET /api/spells/id/<spell_id>/raw - Returns raw spell data for editing."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT id, {', '.join(SPELL_EDITABLE_FIELDS)} FROM spells WHERE id = ?", (spell_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({"error": f"Spell id '{spell_id}' not found"}), 404

        spell_json = convert_db_spell_to_editor_format(row)
        conn.close()
        return jsonify(spell_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/spells/id/<int:spell_id>', methods=['PUT'])
def update_spell_by_id(spell_id):
    """API endpoint: PUT /api/spells/id/<spell_id> - Updates editable spell fields."""
    try:
        payload = request.get_json(silent=True) or {}
        updates = []
        values = []

        for field_name in SPELL_EDITABLE_FIELDS:
            if field_name in payload:
                updates.append(f"{field_name} = ?")
                values.append(normalize_spell_editor_value(field_name, payload.get(field_name)))

        if not updates:
            return jsonify({"error": "No valid spell fields provided"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        values.append(spell_id)
        cursor.execute(f"UPDATE spells SET {', '.join(updates)} WHERE id = ?", values)

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"error": f"Spell id '{spell_id}' not found"}), 404

        conn.commit()
        cursor.execute(f"SELECT id, {', '.join(SPELL_EDITABLE_FIELDS)} FROM spells WHERE id = ?", (spell_id,))
        updated_row = cursor.fetchone()
        result = convert_db_spell_to_editor_format(updated_row) if updated_row else {"id": spell_id}
        conn.close()
        return jsonify({"success": True, "spell": result})

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


@app.route('/api/monsters', methods=['GET'])
def get_monsters_api():
    """API endpoint: GET /api/monsters - Returns monster summaries as JSON."""
    try:
        print(
            f"[API] GET /api/monsters - DB Path: {DB_PATH}, exists: {Path(DB_PATH).exists()}")
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name
            FROM monsters
            ORDER BY name
        """)

        monsters = []
        for row in cursor.fetchall():
            monsters.append({
                'id': row['id'],
                'title': row['name']
            })

        print(f"[API] Successfully loaded {len(monsters)} monsters")
        conn.close()
        return jsonify(monsters)

    except Exception as e:
        print(f"[API] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/monsters/<title>', methods=['GET'])
def get_monster_by_title(title):
    """API endpoint: GET /api/monsters/<title> - Returns a single monster by title."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM monsters
            WHERE LOWER(name) = LOWER(?)
        """, (title,))

        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Monster '{title}' not found"}), 404

        monster_json = convert_db_monster_to_api_format(row, conn)
        conn.close()
        return jsonify(monster_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def load_quests_data():
    quest_file = Path(__file__).parent / 'data' / 'quests.json'
    if quest_file.exists():
        with quest_file.open('r', encoding='utf-8') as f:
            return json.load(f)

    seed_file = Path(__file__).parent / 'data' / 'seeds' / 'seed_quests.json'
    if seed_file.exists():
        with seed_file.open('r', encoding='utf-8') as f:
            return json.load(f)

    return []


def save_quests_data(quests):
    quest_file = Path(__file__).parent / 'data' / 'quests.json'
    quest_file.parent.mkdir(parents=True, exist_ok=True)
    with quest_file.open('w', encoding='utf-8') as f:
        json.dump(quests, f, indent=2, ensure_ascii=False)
    return quest_file


@app.route('/api/quests', methods=['GET'])
def get_quests_api():
    """API endpoint: GET /api/quests - Returns quest summaries as JSON."""
    try:
        quests = load_quests_data()

        summaries = []
        for quest in quests:
            summaries.append({
                'id': quest.get('id'),
                'name': quest.get('name'),
                'title': quest.get('name') or quest.get('title'),
                'summary': quest.get('summary'),
                'location': quest.get('location'),
                'dungeon_id': quest.get('dungeon_id')
            })

        return jsonify(summaries)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/quests/<quest_id>', methods=['GET'])
def get_quest_by_id(quest_id):
    """API endpoint: GET /api/quests/<quest_id> - Returns a single quest by id or title."""
    try:
        quests = load_quests_data()

        key = quest_id.strip().lower()
        for quest in quests:
            if (str(quest.get('id') or '').strip().lower() == key or
                    str(quest.get('name') or quest.get('title') or '').strip().lower() == key):
                return jsonify(quest)

        return jsonify({"error": f"Quest '{quest_id}' not found"}), 404

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


@app.route('/api/quests', methods=['POST'])
def create_quest_api():
    """API endpoint: POST /api/quests - Creates a new quest."""
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"error": "Quest name is required."}), 400

        summary = (data.get('summary') or '').strip() or None
        location = (data.get('location') or '').strip() or None
        dungeon_id = data.get('dungeon_id')
        if dungeon_id is not None:
            try:
                dungeon_id = int(dungeon_id)
            except (TypeError, ValueError):
                dungeon_id = None
        quest_giver = data.get('quest_giver')
        if quest_giver is not None:
            try:
                quest_giver = int(quest_giver)
            except (TypeError, ValueError):
                quest_giver = None

        def normalize_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            return [line.strip() for line in str(value).splitlines() if line.strip()]

        reward = normalize_list(data.get('reward'))
        objectives = normalize_list(data.get('objectives'))
        details = normalize_list(data.get('details'))
        notes = (data.get('notes') or '').strip() or None

        quests = load_quests_data()
        existing_ids = [int(q.get('id')) for q in quests if q.get('id') is not None and str(q.get('id')).isdigit()]
        next_id = max(existing_ids or [0]) + 1

        new_quest = {
            'id': next_id,
            'name': name,
            'summary': summary,
            'location': location,
            'dungeon_id': dungeon_id,
            'quest_giver': quest_giver,
            'reward': reward,
            'objectives': objectives,
            'details': details,
            'notes': notes
        }

        quests.append(new_quest)
        save_quests_data(quests)
        return jsonify(new_quest), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dungeons', methods=['POST'])
def create_dungeon():
    """Create a new blank dungeon"""
    try:
        data = request.get_json(silent=True) or {}
        title = (data.get('title') or 'Untitled Dungeon').strip()

        if not title:
            title = 'Untitled Dungeon'

        blank_dungeon = {
            'general_info': {
                'title': title,
                'size': None,
                'walls': None,
                'floor': None,
                'temperature': None,
                'illumination': None
            },
            'map_image': None,
            'map_image_length': 0,
            'corridors': [],
            'rooms': []
        }

        parsed_json = json.dumps(blank_dungeon)

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO dungeons (title, original_html, parsed_json)
                VALUES (?, ?, ?)
            """, (title, '', parsed_json))
            conn.commit()
            dungeon_id = cursor.lastrowid
            conn.close()
            return jsonify({
                'id': dungeon_id,
                'title': title,
                'message': 'Blank dungeon created successfully'
            }), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"error": f"Dungeon '{title}' already exists."}), 409
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


# ============================================================================
# STATBLOCK QUEUE ENDPOINTS
# ============================================================================

@app.route('/api/queue/submit', methods=['POST'])
def queue_submit_job():
    """
    API endpoint: POST /api/queue/submit
    Submit a new stat block or spell for AI parsing via the queue.
    
    Request JSON:
    {
        "statblock": "Goblin\nSmall Humanoid...",
        "job_type": "creature",      // Optional: "creature" (default) or "spell"
        "prompt_type": "full_parse",  // Optional: "full_parse" (default) or "damage_only"
        "model_path": "/path/to/model.gguf"  // Optional
    }
    
    Response:
    {
        "success": true,
        "job_id": 42,
        "status": "pending",
        "job_type": "creature",
        "prompt_type": "full_parse"
    }
    """
    try:
        data = request.get_json()
        if not data or 'statblock' not in data:
            return jsonify({"error": "Missing 'statblock' field"}), 400
        
        statblock_text = data['statblock'].strip()
        model_path = data.get('model_path', '')
        job_type = data.get('job_type', None)  # Will be auto-detected if not provided
        prompt_type = data.get('prompt_type', 'full_parse')  # Defaults to full_parse
        job_type = data.get('job_type', 'creature').lower()  # Default to 'creature'
        
        # Validate job_type
        if job_type not in ['creature', 'spell']:
            return jsonify({"error": "job_type must be 'creature' or 'spell'"}), 400
        
        if not statblock_text:
            return jsonify({"error": "Statblock cannot be empty"}), 400
        
        # Warn if content appears to be mismatched with job_type
        text_lower = statblock_text.lower()
        spell_indicators = any(x in text_lower for x in ['cantrip', 'evocation', 'abjuration', 'conjuration', 'divination', 
                                                           'enchantment', 'illusion', 'necromancy', 'transmutation',
                                                           '1st level', '2nd level', '3rd level', '4th level', '5th level',
                                                           '6th level', '7th level', '8th level', '9th level'])
        
        warning = None
        if spell_indicators and job_type == 'creature':
            warning = "Content appears to be a spell (contains spell school or level keywords), but job_type='creature'. Consider using job_type='spell' or the /api/queue/submit/spell endpoint."
            print(f"[API] WARNING: {warning}")
        elif not spell_indicators and job_type == 'spell':
            warning = "Content may not be a spell (missing spell school/level keywords), but job_type='spell'. Verify you meant to submit this as a spell."
            print(f"[API] WARNING: {warning}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert new job with status='pending', job_type, and prompt_type
        cursor.execute("""
            INSERT INTO statblock_jobs (status, job_type, prompt_type, statblock, model_path)
            VALUES (?, ?, ?, ?, ?)
        """, ('pending', job_type, prompt_type, statblock_text, model_path if model_path else None))
        
        conn.commit()
        job_id = cursor.lastrowid
        conn.close()
        
        print(f"[API] Job #{job_id} ({job_type}, prompt: {prompt_type}) submitted to queue")
        
        response = {
            "success": True,
            "job_id": job_id,
            "status": "pending",
            "job_type": job_type,
            "prompt_type": prompt_type
        }
        
        if warning:
            response["warning"] = warning
        
        return jsonify(response), 201
    
    except Exception as e:
        print(f"[API] Error submitting job: {e}")
        return jsonify({"error": str(e), "success": False}), 500


@app.route('/api/queue/submit/spell', methods=['POST'])
def queue_submit_spell_job():
    """
    API endpoint: POST /api/queue/submit/spell
    Submit a spell description for AI parsing via the queue.
    
    Request JSON:
    {
        "spell": "Fire Bolt\nCantrip evocation spell...",
        "prompt_type": "full_parse",  // Optional: "full_parse" (default) or "damage_only"
        "model_path": "/path/to/model.gguf"  // Optional
    }
    
    Response:
    {
        "success": true,
        "job_id": 42,
        "status": "pending",
        "job_type": "spell",
        "prompt_type": "full_parse"
    }
    """
    try:
        data = request.get_json()
        if not data or 'spell' not in data:
            return jsonify({"error": "Missing 'spell' field"}), 400
        
        spell_text = data['spell'].strip()
        model_path = data.get('model_path', '')
        prompt_type = data.get('prompt_type', 'full_parse')  # Defaults to full_parse
        
        if not spell_text:
            return jsonify({"error": "Spell cannot be empty"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert new job with status='pending', job_type='spell', and prompt_type
        cursor.execute("""
            INSERT INTO statblock_jobs (status, job_type, prompt_type, statblock, model_path)
            VALUES (?, ?, ?, ?, ?)
        """, ('pending', 'spell', prompt_type, spell_text, model_path if model_path else None))
        
        conn.commit()
        job_id = cursor.lastrowid
        conn.close()
        
        print(f"[API] Spell job #{job_id} (prompt: {prompt_type}) submitted to queue")
        
        return jsonify({
            "success": True,
            "job_id": job_id,
            "status": "pending",
            "job_type": "spell",
            "prompt_type": prompt_type
        }), 201
    
    except Exception as e:
        print(f"[API] Error submitting spell job: {e}")
        return jsonify({"error": str(e), "success": False}), 500


@app.route('/api/queue/<int:job_id>', methods=['GET'])
def queue_get_job(job_id):
    """
    API endpoint: GET /api/queue/<job_id>
    Get the status and details of a job.
    
    Response:
    {
        "id": 42,
        "status": "completed",  // pending, processing, completed, failed
        "job_type": "creature",  // creature or spell
        "parsed_data": {...},
        "creature_id": 15,
        "spell_id": null,
        "error_message": null,
        "progress_percent": 100,
        "elapsed_seconds": 23,
        "created_at": "2026-04-07T12:34:56",
        "started_at": "2026-04-07T12:34:58",
        "completed_at": "2026-04-07T12:35:21"
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, status, job_type, parsed_data, creature_id, spell_id, 
                   error_message, progress_percent, elapsed_seconds, 
                   created_at, started_at, completed_at
            FROM statblock_jobs
            WHERE id = ?
        """, (job_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"error": f"Job {job_id} not found"}), 404
        
        job_dict = dict(row)
        
        # Parse JSON fields
        if job_dict['parsed_data']:
            try:
                job_dict['parsed_data'] = json.loads(job_dict['parsed_data'])
            except json.JSONDecodeError:
                job_dict['parsed_data'] = None
        
        return jsonify(job_dict), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/queue/stats', methods=['GET'])
def queue_get_stats():
    """
    API endpoint: GET /api/queue/stats
    Get current queue statistics.
    
    Response:
    {
        "pending": 3,
        "processing": 1,
        "completed": 42,
        "failed": 2,
        "avg_parse_time": 23,
        "current_job_id": 42,
        "current_job_progress": 45
    }
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get counts by status
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='pending'")
        pending = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='processing'")
        processing = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='completed'")
        completed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='failed'")
        failed = cursor.fetchone()[0]
        
        # Get average parse time
        cursor.execute("""
            SELECT AVG(elapsed_seconds) 
            FROM statblock_jobs 
            WHERE status='completed' AND elapsed_seconds > 0
        """)
        avg_result = cursor.fetchone()
        avg_time = int(avg_result[0]) if avg_result[0] else 0
        
        # Get current processing job
        cursor.execute("""
            SELECT id, progress_percent
            FROM statblock_jobs
            WHERE status='processing'
            LIMIT 1
        """)
        current = cursor.fetchone()
        
        conn.close()
        
        return jsonify({
            "pending": pending,
            "processing": processing,
            "completed": completed,
            "failed": failed,
            "avg_parse_time": avg_time,
            "current_job_id": current['id'] if current else None,
            "current_job_progress": current['progress_percent'] if current else 0
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/queue/recent', methods=['GET'])
def queue_get_recent():
    """
    API endpoint: GET /api/queue/recent?limit=10
    Get recent jobs (default last 10).
    
    Response:
    [
        {
            "id": 42,
            "status": "completed",
            "creature_title": "Goblin",
            "creature_id": 15,
            "elapsed_seconds": 23,
            "completed_at": "2026-04-07T12:35:21"
        },
        ...
    ]
    """
    try:
        limit = request.args.get('limit', 10, type=int)
        if limit > 100:
            limit = 100  # Cap at 100
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, status, creature_id, elapsed_seconds, completed_at, parsed_data
            FROM statblock_jobs
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        jobs = []
        for row in rows:
            job_dict = dict(row)
            
            # Extract creature title from parsed_data
            creature_title = "Unknown"
            if job_dict['parsed_data']:
                try:
                    parsed = json.loads(job_dict['parsed_data'])
                    creature_title = parsed.get('title', 'Unknown')
                except json.JSONDecodeError:
                    pass
            
            jobs.append({
                "id": job_dict['id'],
                "status": job_dict['status'],
                "creature_title": creature_title,
                "creature_id": job_dict['creature_id'],
                "elapsed_seconds": job_dict['elapsed_seconds'],
                "completed_at": job_dict['completed_at']
            })
        
        return jsonify(jobs), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/spell-cards-list')
def spell_cards_list():
    """Serve the spell card list-style demo page."""
    return send_from_directory('.', 'pages/spell-cards-list.html')


@app.route('/spell-cards-v2')
def spell_cards_v2():
    """Serve the new spell card demo page."""
    return send_from_directory('.', 'pages/spell-cards-v2.html')


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
    print(f"   - GET /api/weapons        (all weapons)")
    print(f"   - GET /api/weapons/<title> (single weapon)")
    print(f"   - GET /api/monsters      (all monsters)")
    print(f"   - GET /api/monsters/<title> (single monster)")
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
