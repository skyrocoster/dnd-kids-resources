import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
import os


# DB_PATH: resolve to repo root, handling both dev (from backend/) and test (monkeypatched) runs
def _get_db_path():
    # Try multiple paths to find the database
    # Path 1: from backend/app/db.py -> ../../dnd_kids_resources.db (when running from backend/)
    candidate = Path(__file__).parent.parent.parent / "dnd_kids_resources.db"
    if candidate.exists():
        return candidate

    # Path 2: from cwd (when running from repo root)
    candidate = Path.cwd() / "dnd_kids_resources.db"
    if candidate.exists():
        return candidate

    # Path 3: fallback (tests may monkeypatch this)
    return Path(__file__).parent.parent.parent / "dnd_kids_resources.db"


DB_PATH = _get_db_path()


def get_conn():
    """Get a SQLite connection with Row factory for dict-like access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_conn()
    try:
        yield conn
    finally:
        conn.close()


def parse_json_value(value):
    """Parse a JSON-encoded column value. Returns parsed object or original value if not JSON."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    return value


def parse_json_list(value):
    """Parse a JSON column expected to hold a list. Falls back to comma-splitting
    for legacy rows stored as a plain string (e.g. "V, S") instead of JSON."""
    parsed = parse_json_value(value)
    if parsed is None:
        return None
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, str):
        return [item.strip() for item in parsed.split(",") if item.strip()]
    return [parsed]


def dict_from_row(row):
    """Convert a sqlite3.Row to a dict, parsing JSON columns where needed."""
    if row is None:
        return None
    return dict(row)


# JSON-encoded spell columns, split by expected decoded shape. Kept here (not in a
# router) so every endpoint that returns a spell row parses it identically — a
# second, drifting copy of this list previously caused /api/players/{id}/spells
# to 500 while /api/spells worked.
_SPELL_OBJECT_COLUMNS = ["damage", "heal", "heal_at_spell_slots", "area_of_effect", "attack_type"]
_SPELL_LIST_COLUMNS = ["components", "classes", "subclasses"]


def parse_spell_row(row):
    """Convert a spell sqlite3.Row to a dict, parsing every JSON-encoded column.

    This is the single canonical spell-row parser. Both the spells router and the
    nested player-spells endpoint use it so their JSON handling can never diverge.
    """
    spell = dict_from_row(row)
    if spell is None:
        return None

    for field in _SPELL_OBJECT_COLUMNS:
        if spell.get(field):
            spell[field] = parse_json_value(spell[field])

    # List-typed columns; some legacy rows store them as a plain comma-separated
    # string instead of a JSON array.
    for field in _SPELL_LIST_COLUMNS:
        if spell.get(field):
            spell[field] = parse_json_list(spell[field])

    return spell
