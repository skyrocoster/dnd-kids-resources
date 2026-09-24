import json
import os
import sqlite3
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path

from fastapi import Depends, Request

DEFAULT_DB_PATH = Path("/workspace/data/database/dnd_kids_resources.db")


def _get_db_path():
    """Use the Docker volume DB; never fall back to an old host-side copy."""
    configured_path = os.environ.get("DND_DATABASE_PATH")
    return Path(configured_path) if configured_path else DEFAULT_DB_PATH


DB_PATH = _get_db_path()
_REQUEST_DB_PATH: ContextVar[Path | None] = ContextVar("request_db_path", default=None)


def get_db_path(request: Request) -> Path:
    """Resolve the database path configured for this FastAPI app/request."""
    configured_path = request.app.state.database_path
    return Path(configured_path) if configured_path is not None else DB_PATH


def get_active_db_path() -> Path:
    """Return the DB path bound to this request, or the configured default."""
    return Path(_REQUEST_DB_PATH.get() or DB_PATH)


async def bind_db_path(db_path: Path = Depends(get_db_path)):
    """Make the injected path available to the existing synchronous DB helpers."""
    token = _REQUEST_DB_PATH.set(Path(db_path))
    try:
        yield
    finally:
        _REQUEST_DB_PATH.reset(token)


def get_conn(db_path: Path | str | None = None):
    """Get a SQLite connection with Row factory for dict-like access."""
    path = db_path or _REQUEST_DB_PATH.get() or DB_PATH
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db(db_path: Path | str | None = None):
    """Context manager for database connections."""
    conn = get_conn() if db_path is None else get_conn(db_path)
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
_SPELL_LIST_COLUMNS = ["damage", "casting_times", "components", "categories", "attacks"]


def parse_spell_row(row):
    """Convert a spell sqlite3.Row to a dict, parsing every JSON-encoded column.

    This is the single canonical spell-row parser. Both the spells router and the
    nested player-spells endpoint use it so their JSON handling can never diverge.
    """
    spell = dict_from_row(row)
    if spell is None:
        return None

    for field in ("concentration", "ritual"):
        if field in spell and spell[field] is not None:
            spell[field] = bool(spell[field])

    for field in _SPELL_OBJECT_COLUMNS:
        if field in spell and spell[field] is not None:
            spell[field] = parse_json_value(spell[field])

    for field in _SPELL_LIST_COLUMNS:
        if field in spell and spell[field] is not None:
            spell[field] = parse_json_list(spell[field])

    return spell
