"""Example test file demonstrating testing patterns for the backend.

This file shows how to:
- Use the seeded_db fixture for database tests
- Test database queries
- Verify JSON column parsing

Delete or extend this file as real tests are written.
"""

import json


def test_db_seeded_with_weapons(db_conn):
    """Test that the database has seeded weapons."""
    cursor = db_conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM weapons")
    count = cursor.fetchone()["count"]
    assert count == 1


def test_db_seeded_with_spells(db_conn):
    """Test that the database has seeded spells."""
    cursor = db_conn.cursor()
    cursor.execute("SELECT * FROM spells WHERE title = 'Magic Missile'")
    spell = cursor.fetchone()
    assert spell is not None
    assert spell["title"] == "Magic Missile"
    assert spell["level"] == 1


def test_json_column_parsing(db_conn):
    """Test that JSON columns are correctly handled."""
    cursor = db_conn.cursor()
    cursor.execute("SELECT * FROM spells WHERE title = 'Magic Missile'")
    spell = cursor.fetchone()

    # Parse JSON columns
    components = json.loads(spell["components"])
    classes = json.loads(spell["classes"])

    assert "V" in components  # Verbal component
    assert "S" in components  # Somatic component
    assert "Wizard" in classes


def test_db_relationships(db_conn):
    """Test that the database relationships are intact."""
    cursor = db_conn.cursor()

    # Insert a player-spell relationship
    cursor.execute("SELECT id FROM players WHERE name = 'Aragorn'")
    player = cursor.fetchone()
    cursor.execute("SELECT id FROM spells WHERE title = 'Magic Missile'")
    spell = cursor.fetchone()

    cursor.execute(
        "INSERT INTO player_spells (player_id, spell_id) VALUES (?, ?)",
        (player["id"], spell["id"])
    )
    db_conn.commit()

    # Verify the relationship
    cursor.execute(
        "SELECT * FROM player_spells WHERE player_id = ? AND spell_id = ?",
        (player["id"], spell["id"])
    )
    rel = cursor.fetchone()
    assert rel is not None
