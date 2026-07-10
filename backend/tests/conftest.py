import pytest
import sqlite3
import json
import tempfile
import shutil
from pathlib import Path


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


@pytest.fixture(scope="function")
def seeded_db(test_db_path):
    """Create and seed a test database with minimal data for testing."""
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create tables matching production schema (from init_database.py)
    cursor.execute("""CREATE TABLE abilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT,
        color TEXT,
        type TEXT DEFAULT 'stat',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        icon TEXT,
        explanation TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE damage_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE weapon_properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE spells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spell_name TEXT NOT NULL UNIQUE,
        icon TEXT,
        level TEXT,
        school TEXT,
        spell_text TEXT,
        spell_alt_text TEXT,
        damage TEXT,
        heal TEXT,
        heal_at_spell_slots TEXT,
        range TEXT,
        higher_levels TEXT,
        damage_at_higher_levels TEXT,
        casting_time TEXT,
        duration TEXT,
        concentration BOOLEAN,
        ritual BOOLEAN,
        components TEXT,
        materials TEXT,
        attack_type TEXT,
        area_of_effect TEXT,
        action TEXT,
        classes TEXT,
        subclasses TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE monsters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        ac TEXT,
        hp TEXT,
        speed TEXT,
        stats TEXT,
        senses TEXT,
        languages TEXT,
        challenge TEXT,
        action TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        class TEXT,
        level INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE player_spells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        spell_id INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY(spell_id) REFERENCES spells(id) ON DELETE CASCADE
    )""")

    cursor.execute("""CREATE TABLE player_weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        weapon_id INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY(weapon_id) REFERENCES weapons(id) ON DELETE CASCADE
    )""")

    cursor.execute("""CREATE TABLE weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        rarity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE npcs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        summary TEXT,
        reward TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE encounter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        units TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE dungeons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    # Seed test data
    cursor.execute("INSERT INTO abilities (code, name, emoji, color, type) VALUES (?, ?, ?, ?, ?)",
                   ("STR", "Strength", "💪", "#FF5733", "stat"))
    cursor.execute("INSERT INTO conditions (title, icon, explanation) VALUES (?, ?, ?)",
                   ("Poisoned", "☠️", "A poisoned creature has disadvantage on attack rolls"))
    cursor.execute("INSERT INTO damage_types (code, name, emoji, color) VALUES (?, ?, ?, ?)",
                   ("fire", "Fire", "🔥", "#FFA500"))

    cursor.execute("""INSERT INTO spells
        (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Magic Missile", "✨", "1", "Evocation", "Unerring magical projectiles", "1 action", "120 feet",
         json.dumps(["V", "S"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])))

    cursor.execute("""INSERT INTO spells
        (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Fireball", "🔥", "3", "Evocation", "A ball of fire erupts", "1 action", "150 feet",
         json.dumps(["V", "S", "M"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])))

    conn.commit()
    yield conn
    conn.close()


@pytest.fixture
def db_conn(seeded_db):
    """Provide a connection to the seeded test database."""
    return seeded_db


@pytest.fixture
def test_client(monkeypatch, test_db_path):
    """Provide a FastAPI test client with a test database."""
    # Monkeypatch the DB_PATH to use test database
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "DB_PATH", test_db_path)

    # Now seed the test database (reuse logic from seeded_db)
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create all tables
    cursor.execute("""CREATE TABLE abilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT,
        color TEXT,
        type TEXT DEFAULT 'stat',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        icon TEXT,
        explanation TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE damage_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        emoji TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE weapon_properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE spells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spell_name TEXT NOT NULL UNIQUE,
        icon TEXT,
        level TEXT,
        school TEXT,
        spell_text TEXT,
        spell_alt_text TEXT,
        damage TEXT,
        heal TEXT,
        heal_at_spell_slots TEXT,
        range TEXT,
        higher_levels TEXT,
        damage_at_higher_levels TEXT,
        casting_time TEXT,
        duration TEXT,
        concentration BOOLEAN,
        ritual BOOLEAN,
        components TEXT,
        materials TEXT,
        attack_type TEXT,
        area_of_effect TEXT,
        action TEXT,
        classes TEXT,
        subclasses TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE monsters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        ac TEXT,
        hp TEXT,
        speed TEXT,
        stats TEXT,
        senses TEXT,
        languages TEXT,
        challenge TEXT,
        action TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        class TEXT,
        level INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE player_spells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        spell_id INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY(spell_id) REFERENCES spells(id) ON DELETE CASCADE
    )""")

    cursor.execute("""CREATE TABLE player_weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        weapon_id INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY(weapon_id) REFERENCES weapons(id) ON DELETE CASCADE
    )""")

    cursor.execute("""CREATE TABLE weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        rarity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE npcs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        summary TEXT,
        reward TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE encounter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        units TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    cursor.execute("""CREATE TABLE dungeons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    # Seed test data
    cursor.execute("INSERT INTO abilities (code, name, emoji, color, type) VALUES (?, ?, ?, ?, ?)",
                   ("STR", "Strength", "💪", "#FF5733", "stat"))
    cursor.execute("INSERT INTO conditions (title, icon, explanation) VALUES (?, ?, ?)",
                   ("Poisoned", "☠️", "A poisoned creature has disadvantage on attack rolls"))
    cursor.execute("INSERT INTO damage_types (code, name, emoji, color) VALUES (?, ?, ?, ?)",
                   ("fire", "Fire", "🔥", "#FFA500"))

    cursor.execute("""INSERT INTO spells
        (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Magic Missile", "✨", "1", "Evocation", "Unerring magical projectiles", "1 action", "120 feet",
         json.dumps(["V", "S"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])))

    cursor.execute("""INSERT INTO spells
        (spell_name, icon, level, school, spell_text, casting_time, range, components, duration, classes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("Fireball", "🔥", "3", "Evocation", "A ball of fire erupts", "1 action", "150 feet",
         json.dumps(["V", "S", "M"]), "Instantaneous", json.dumps(["Sorcerer", "Wizard"])))

    conn.commit()
    conn.close()

    # Import and create test client
    from fastapi.testclient import TestClient
    from backend.app.main import app

    return TestClient(app)
