"""Pytest fixtures for the D&D Kids Resources backend.

Design principle (learned the hard way — see docs/v2-rebuild-plan.md Task 10 notes):
the test database schema MUST be built from the real ``scripts/init_database.py``,
never hand-copied here. Two earlier hand-written schema copies drifted from
production and hid real 500s (monsters ``cr`` vs ``challenge``, players' dropped
``class``, and the players-spells JSON parser). Building from the real schema makes
that class of drift structurally impossible.

Fixtures come in two layers:

* **Unit layer** (`test_client`, `seeded_db`, `db_conn`) — the real schema seeded
  with a small, curated set of rows. Fast, function-scoped, safe to mutate. The
  curated spell deliberately populates every JSON-encoded column so serialization
  bugs surface here too, not only against full production data.
* **Integration layer** (`real_client`) — the real schema seeded from the actual
  frozen ``data/seeds/*.json`` via ``scripts/seed_database.py``. Session-scoped and
  read-only; this is what proves the API serializes the real 525 spells / 2734
  monsters / etc. without 500s.
"""

import importlib.util
import io
import json
import shutil
import sqlite3
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "scripts"


def _load_module(name: str, path: Path):
    """Import a standalone script (scripts/ is not a package) by file path."""
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _create_real_schema(db_path: str) -> None:
    """Create the production schema in ``db_path`` using the real init script.

    Guarantees the test DB's tables/columns/constraints match what the app runs
    against in production — no hand-maintained copy to drift.
    """
    init_mod = _load_module("_init_database_for_tests", SCRIPTS_DIR / "init_database.py")
    original = init_mod.DB_PATH
    init_mod.DB_PATH = Path(db_path)
    try:
        with redirect_stdout(io.StringIO()):
            init_mod.init_database()
    finally:
        init_mod.DB_PATH = original


def _seed_real_data(db_path: str) -> None:
    """Populate ``db_path`` from the frozen data/seeds/*.json via the real seeder."""
    seed_mod = _load_module("_seed_database_for_tests", SCRIPTS_DIR / "seed_database.py")
    original = seed_mod.DB_PATH
    seed_mod.DB_PATH = Path(db_path)
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = OFF")
        cursor = conn.cursor()
        with redirect_stdout(io.StringIO()):
            # Same order scripts/seed_database.py:main() uses (FK-safe).
            seed_mod.populate_abilities(cursor, conn)
            seed_mod.populate_damage_types(cursor, conn)
            seed_mod.populate_weapon_properties(cursor, conn)
            seed_mod.populate_weapons(cursor, conn)
            seed_mod.populate_monsters(cursor, conn)
            seed_mod.populate_npcs(cursor, conn)
            seed_mod.populate_quests(cursor, conn)
            seed_mod.populate_spells(cursor, conn)
            seed_mod.populate_conditions(cursor, conn)
            seed_mod.populate_dungeons(cursor, conn)
            seed_mod.populate_encounters(cursor, conn)
            seed_mod.populate_players(cursor, conn)
            seed_mod.populate_player_spells(cursor, conn)
            seed_mod.populate_player_weapons(cursor, conn)
        conn.commit()
        conn.close()
    finally:
        seed_mod.DB_PATH = original


def _seed_curated_data(conn: sqlite3.Connection) -> None:
    """Insert a small, deliberately JSON-rich set of rows into a real-schema DB.

    The spell "Firebolt Test" populates attack_type/heal/damage/components/classes so
    that the nested /api/players/{id}/spells path (which JSON-parses those columns)
    is exercised by the fast unit suite, not only by the real-data integration suite.
    """
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO abilities (code, name, emoji, color, type) VALUES (?, ?, ?, ?, ?)",
        ("str", "Strength", "💪", "#FF5733", "stat"),
    )
    cursor.execute(
        "INSERT INTO conditions (title, icon, explanation) VALUES (?, ?, ?)",
        ("Poisoned", "☠️", "A poisoned creature has disadvantage on attack rolls"),
    )
    cursor.execute(
        "INSERT INTO damage_types (code, name, emoji, color) VALUES (?, ?, ?, ?)",
        ("fire", "Fire", "🔥", "#FFA500"),
    )

    # Plain spell (no JSON metadata) — mirrors legacy sparse rows.
    cursor.execute(
        """INSERT INTO spells
           (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Magic Missile", "✨", "1", "Evocation", "Unerring magical projectiles", "1 action",
         "120 feet", json.dumps(["V", "S"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])),
    )
    cursor.execute(
        """INSERT INTO spells
           (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Fireball", "🔥", "3", "Evocation", "A ball of fire erupts", "1 action", "150 feet",
         json.dumps(["V", "S", "M"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])),
    )
    # JSON-rich spell: every JSON-encoded column populated, matching real data shapes.
    cursor.execute(
        """INSERT INTO spells
           (spell_name, icon, level, school, spell_text, casting_time, range, components,
            duration, classes, damage, heal, attack_type, area_of_effect)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Firebolt Test", "🔥", "0", "Evocation", "A mote of fire", "1 action", "120 feet",
         json.dumps(["V", "S"]), "Instantaneous", json.dumps(["Wizard"]),
         json.dumps([{"amount": "1d10", "type": "fire"}]),
         json.dumps({"amount": "1d4", "temp_hp": True, "max_hp": False}),
         json.dumps([{"name": "initial", "type": "ranged", "save": []}]),
         json.dumps({"shape": "sphere", "size": 20})),
    )

    cursor.execute(
        """INSERT INTO monsters (name, ac, hp, speed, stats, senses, languages, cr, action)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Owlbear", json.dumps({"13": None}), json.dumps({"average": 59, "formula": "7d10+21"}),
         json.dumps({"walk": 40}),
         json.dumps({"str": 20, "dex": 12, "con": 17, "int": 3, "wis": 12, "cha": 7}),
         json.dumps([{"type": "darkvision", "range": 60}]), json.dumps([]), "3",
         json.dumps([{"name": "Beak", "attack": {"type": "melee", "mod": 7,
                     "damage": "1d10+5", "damage_type": "piercing"}}])),
    )

    cursor.execute(
        """INSERT INTO weapons (name, base_weapon, rarity, weapon_category, weight, req_attune,
                                property, focus, attack, entries)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Longsword", "Longsword", None, "martial", 3.0, None, json.dumps(["V"]), json.dumps([]),
         json.dumps([{"type": "melee", "damage": "1d8", "damage_type": "slashing", "hands": 1}]),
         json.dumps([])),
    )

    conn.commit()


# ---------------------------------------------------------------------------
# Temp-dir plumbing
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def test_db_dir():
    """Create and clean up a temporary directory for test databases."""
    tmpdir = tempfile.mkdtemp(prefix="dnd_test_")
    yield tmpdir
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture(scope="function")
def test_db_path(test_db_dir):
    """Provide a fresh test database path for each test."""
    db_path = Path(test_db_dir) / f"test_{id(object())}.db"
    yield str(db_path)
    if db_path.exists():
        db_path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Unit layer — real schema + curated JSON-rich rows (fast, mutable)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def seeded_db(test_db_path):
    """A connection to a fresh real-schema DB seeded with curated rows."""
    _create_real_schema(test_db_path)
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    _seed_curated_data(conn)
    yield conn
    conn.close()


@pytest.fixture
def db_conn(seeded_db):
    """Alias kept for existing tests."""
    return seeded_db


@pytest.fixture
def test_client(monkeypatch, test_db_path):
    """FastAPI TestClient backed by a fresh real-schema DB with curated data."""
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "DB_PATH", test_db_path)

    _create_real_schema(test_db_path)
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    _seed_curated_data(conn)
    conn.close()

    from fastapi.testclient import TestClient
    from backend.app.main import app

    # raise_server_exceptions=False so a 500 is asserted as a 500, not re-raised —
    # lets tests pin down response-model/serialization regressions precisely.
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Integration layer — real schema + full production seeds (session, read-only)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def real_db_path(test_db_dir):
    """Build one real-schema, real-seed DB for the whole session (slow build, once)."""
    db_path = str(Path(test_db_dir) / "real_seeded.db")
    _create_real_schema(db_path)
    _seed_real_data(db_path)
    return db_path


@pytest.fixture
def real_client(real_db_path):
    """TestClient backed by the full production seed data.

    Read-only by contract — tests using this must not create/update/delete, since
    the DB is shared across the session.
    """
    import backend.app.db as db_module
    from fastapi.testclient import TestClient
    from backend.app.main import app

    original = db_module.DB_PATH
    db_module.DB_PATH = real_db_path
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        db_module.DB_PATH = original
