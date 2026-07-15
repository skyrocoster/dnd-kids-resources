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
    conn.execute("PRAGMA foreign_keys = ON")
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
    """Parse a JSON column expected to hold a list."""
    parsed = parse_json_value(value)
    if parsed is None:
        return None
    if not isinstance(parsed, list):
        raise TypeError(f"Expected JSON list, got {type(parsed).__name__}")
    return parsed


def dict_from_row(row):
    """Convert a sqlite3.Row to a dict, parsing JSON columns where needed."""
    if row is None:
        return None
    return dict(row)


# JSON-encoded spell columns, split by expected decoded shape. Kept here (not in a
# router) so every endpoint that returns a spell row parses it identically.
_SPELL_OBJECT_COLUMNS = ["healing", "higher_levels", "area_of_effect"]
_SPELL_LIST_COLUMNS = ["damage", "casting_times", "components", "attacks"]


def parse_spell_row(row):
    """Convert a spell sqlite3.Row to a dict, parsing every JSON-encoded column.

    This is the single canonical spell-row parser. Both the spells router and the
    nested player-spells endpoint use it so their JSON handling can never diverge.
    """
    spell = dict_from_row(row)
    if spell is None:
        return None

    for field in _SPELL_OBJECT_COLUMNS:
        if field in spell and spell[field] is not None:
            spell[field] = parse_json_value(spell[field])

    for field in _SPELL_LIST_COLUMNS:
        if field in spell and spell[field] is not None:
            spell[field] = parse_json_list(spell[field])

    return spell
