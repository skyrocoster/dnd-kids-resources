"""Tests for spell CRUD endpoints."""

import json


def test_list_spells(test_client):
    """Test GET /api/spells returns a list of spells."""
    response = test_client.get("/api/spells")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # Test DB has at least 2 spells


def test_list_spells_with_pagination(test_client):
    """Test spell listing with limit and offset."""
    response = test_client.get("/api/spells?limit=1&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_list_spells_filter_by_level(test_client):
    """Test filtering spells by level."""
    response = test_client.get("/api/spells?level=1")
    assert response.status_code == 200
    data = response.json()
    # Magic Missile is level 1, Fireball is level 3
    assert any(spell["spell_name"] == "Magic Missile" for spell in data)
    assert not any(spell["spell_name"] == "Fireball" for spell in data)


def test_list_spells_filter_by_school(test_client):
    """Test filtering spells by school."""
    response = test_client.get("/api/spells?school=Evocation")
    assert response.status_code == 200
    data = response.json()
    # Both spells are Evocation
    assert len(data) >= 2


def test_get_spell_by_id(test_client):
    """Test GET /api/spells/{id}."""
    # First get the spell list to find an ID
    response = test_client.get("/api/spells")
    spells = response.json()
    spell_id = spells[0]["id"]

    response = test_client.get(f"/api/spells/{spell_id}")
    assert response.status_code == 200
    spell = response.json()
    assert spell["id"] == spell_id
    assert "spell_name" in spell
    assert "level" in spell


def test_get_spell_by_id_not_found(test_client):
    """Test 404 for nonexistent spell ID."""
    response = test_client.get("/api/spells/99999")
    assert response.status_code == 404


def test_get_spell_by_title(test_client):
    """Test GET /api/spells/by-title/{spell_name}."""
    response = test_client.get("/api/spells/by-title/Magic%20Missile")
    assert response.status_code == 200
    spell = response.json()
    assert spell["spell_name"] == "Magic Missile"
    assert spell["level"] == "1"


def test_spell_json_columns_parsed(test_client):
    """Test that JSON columns are parsed correctly."""
    response = test_client.get("/api/spells/by-title/Magic%20Missile")
    assert response.status_code == 200
    spell = response.json()

    # components should be parsed from JSON to list
    if spell.get("components"):
        assert isinstance(spell["components"], list)
        assert "V" in spell["components"]
        assert "S" in spell["components"]

    # classes should be parsed from JSON to list
    if spell.get("classes"):
        assert isinstance(spell["classes"], list)
        assert "Wizard" in spell["classes"]


def test_create_spell_with_attack_type_round_trips_as_list(test_client):
    """attack_type must parse back as structured JSON, not a raw string (regression)."""
    new_spell = {
        "spell_name": "Scorching Ray",
        "level": "2",
        "school": "Evocation",
        "attack_type": [{"name": "ray", "type": "spell"}],
        "damage": [{"name": "ray", "damage": "2d6", "type": "fire"}],
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["attack_type"], list)
    assert data["attack_type"][0]["type"] == "spell"

    response = test_client.get(f"/api/spells/{data['id']}")
    assert isinstance(response.json()["attack_type"], list)


def test_create_spell(test_client):
    """Test POST /api/spells to create a new spell."""
    new_spell = {
        "spell_name": "Test Spell",
        "level": "2",
        "school": "Transmutation",
        "casting_time": "1 action",
        "range": "30 feet",
        "components": ["V", "S", "M"],
        "duration": "Concentration, up to 1 hour",
        "spell_text": "A test spell",
        "classes": ["Cleric", "Wizard"],
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    data = response.json()
    assert data["spell_name"] == "Test Spell"
    assert data["level"] == "2"
    assert data["id"] is not None


def test_create_spell_duplicate_name_fails(test_client):
    """Test that creating a spell with duplicate spell_name fails."""
    new_spell = {
        "spell_name": "Magic Missile",
        "level": "1",
        "school": "Evocation",
        "casting_time": "1 action",
        "range": "120 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "spell_text": "Duplicate",
        "classes": ["Wizard"],
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 400


def test_update_spell(test_client):
    """Test PUT /api/spells/{id} to update a spell."""
    # Get a spell first
    response = test_client.get("/api/spells")
    spells = response.json()
    spell_id = spells[0]["id"]

    updated_spell = {
        "spell_name": f"{spells[0]['spell_name']} Updated",
        "level": spells[0]["level"],
        "school": spells[0]["school"],
        "casting_time": spells[0]["casting_time"],
        "range": spells[0]["range"],
        "components": spells[0].get("components"),
        "duration": spells[0]["duration"],
        "spell_text": "Updated description",
        "classes": spells[0].get("classes"),
    }

    response = test_client.put(f"/api/spells/{spell_id}", json=updated_spell)
    assert response.status_code == 200
    data = response.json()
    assert "Updated" in data["spell_name"]
    assert data["spell_text"] == "Updated description"


def test_update_nonexistent_spell(test_client):
    """Test updating a nonexistent spell returns 404."""
    update = {
        "spell_name": "Nonexistent",
        "level": "1",
        "school": "Evocation",
        "casting_time": "1 action",
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "spell_text": "Test",
        "classes": ["Wizard"],
    }

    response = test_client.put("/api/spells/99999", json=update)
    assert response.status_code == 404


def test_delete_spell(test_client):
    """Test DELETE /api/spells/{id}."""
    # Create a spell to delete
    new_spell = {
        "spell_name": "Delete Me",
        "level": "1",
        "school": "Evocation",
        "casting_time": "1 action",
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "spell_text": "To be deleted",
        "classes": ["Wizard"],
    }

    response = test_client.post("/api/spells", json=new_spell)
    spell_id = response.json()["id"]

    # Delete it
    response = test_client.delete(f"/api/spells/{spell_id}")
    assert response.status_code == 204

    # Verify it's gone
    response = test_client.get(f"/api/spells/{spell_id}")
    assert response.status_code == 404


def test_delete_nonexistent_spell(test_client):
    """Test deleting a nonexistent spell returns 404."""
    response = test_client.delete("/api/spells/99999")
    assert response.status_code == 404
