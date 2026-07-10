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
        db_path.unlink()


@pytest.fixture(scope="function")
def seeded_db(test_db_path):
    """Create and seed a test database with minimal data for testing."""
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create tables (mirror schema from scripts/init_database.py)
    cursor.executescript("""
        CREATE TABLE abilities (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE conditions (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE damage_types (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE weapon_properties (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE weapons (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            damage TEXT,
            damage_type TEXT,
            properties TEXT,
            rarity TEXT,
            description TEXT
        );

        CREATE TABLE spells (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            level INTEGER,
            school TEXT,
            casting_time TEXT,
            range TEXT,
            components TEXT,
            duration TEXT,
            description TEXT,
            classes TEXT,
            damage TEXT,
            healing TEXT,
            condition TEXT,
            attack_bonus TEXT,
            saving_throw TEXT,
            area_of_effect TEXT,
            notes TEXT
        );

        CREATE TABLE monsters (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            ac TEXT,
            hp TEXT,
            speed TEXT,
            attributes TEXT,
            skills TEXT,
            condition_immunities TEXT,
            damage_immunities TEXT,
            damage_resistances TEXT,
            senses TEXT,
            languages TEXT,
            challenge TEXT,
            action TEXT,
            legendary_action TEXT,
            description TEXT,
            environment TEXT
        );

        CREATE TABLE players (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            class TEXT,
            level INTEGER,
            race TEXT,
            background TEXT,
            notes TEXT
        );

        CREATE TABLE player_spells (
            id INTEGER PRIMARY KEY,
            player_id INTEGER NOT NULL,
            spell_id INTEGER NOT NULL,
            FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY(spell_id) REFERENCES spells(id) ON DELETE CASCADE
        );

        CREATE TABLE player_weapons (
            id INTEGER PRIMARY KEY,
            player_id INTEGER NOT NULL,
            weapon_id INTEGER NOT NULL,
            FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY(weapon_id) REFERENCES weapons(id) ON DELETE CASCADE
        );

        CREATE TABLE npcs (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            role TEXT,
            description TEXT,
            notes TEXT
        );

        CREATE TABLE quests (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            description TEXT,
            status TEXT,
            reward TEXT,
            notes TEXT
        );

        CREATE TABLE encounter (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            description TEXT,
            difficulty TEXT,
            creatures TEXT,
            notes TEXT
        );

        CREATE TABLE dungeons (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            data TEXT NOT NULL
        );
    """)

    # Seed minimal test data
    cursor.execute("INSERT INTO abilities (name, description) VALUES (?, ?)",
                   ("Strength", "Physical power"))
    cursor.execute("INSERT INTO conditions (name, description) VALUES (?, ?)",
                   ("Poisoned", "Subject to poison"))
    cursor.execute("INSERT INTO damage_types (name, description) VALUES (?, ?)",
                   ("Fire", "Heat and flame"))
    cursor.execute("INSERT INTO weapon_properties (name, description) VALUES (?, ?)",
                   ("Finesse", "Can use DEX or STR"))

    cursor.execute(
        "INSERT INTO weapons (title, damage, damage_type, properties, description) VALUES (?, ?, ?, ?, ?)",
        ("Longsword", json.dumps({"dice": "1d8", "type": "slashing"}), "slashing", json.dumps([]), "A classic sword"))

    cursor.execute(
        "INSERT INTO spells (title, level, school, casting_time, range, components, duration, description, classes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("Magic Missile", 1, "Evocation", "1 action", "120 feet", json.dumps(["V", "S"]), "Instantaneous",
         "Unerring magical projectiles", json.dumps(["Sorcerer", "Wizard"])))

    cursor.execute(
        "INSERT INTO monsters (title, ac, hp, speed, description) VALUES (?, ?, ?, ?, ?)",
        ("Goblin", json.dumps({"type": "natural", "value": 15}), json.dumps({"average": 7, "dice": "2d6"}),
         json.dumps({"walk": 30}), "Small humanoid"))

    cursor.execute(
        "INSERT INTO players (name, class, level, race, background) VALUES (?, ?, ?, ?, ?)",
        ("Aragorn", "Fighter", 3, "Human", "Soldier"))

    cursor.execute(
        "INSERT INTO npcs (name, role, description) VALUES (?, ?, ?)",
        ("Gandalf", "Wizard", "A wise wizard"))

    cursor.execute(
        "INSERT INTO quests (title, description, status, reward) VALUES (?, ?, ?, ?)",
        ("Retrieve the Amulet", "Find the lost amulet", "active", "500 gold"))

    cursor.execute(
        "INSERT INTO encounter (title, difficulty, description) VALUES (?, ?, ?)",
        ("Goblin Ambush", "Easy", "Five goblins attack"))

    cursor.execute(
        "INSERT INTO dungeons (title, data) VALUES (?, ?)",
        ("Test Dungeon", json.dumps({"rooms": [{"id": 1, "name": "Entrance", "description": "A dark hall"}]})))

    conn.commit()
    yield conn
    conn.close()


@pytest.fixture
def db_conn(seeded_db):
    """Provide a connection to the seeded test database."""
    return seeded_db
