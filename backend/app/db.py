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


def dict_from_row(row):
    """Convert a sqlite3.Row to a dict, parsing JSON columns where needed."""
    if row is None:
        return None
    return dict(row)
