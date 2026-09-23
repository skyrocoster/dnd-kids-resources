"""Tests for spell CRUD endpoints."""
from unittest.mock import MagicMock
import pytest
import backend.app.db as db_module
import backend.app.routers.spells as spells_router


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


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
    assert any(spell["name"] == "Magic Missile" for spell in data)
    assert not any(spell["name"] == "Fireball" for spell in data)
    assert all(spell["level"] == 1 for spell in data)


def test_list_spells_filter_by_school(test_client):
    """Test filtering spells by school."""
    response = test_client.get("/api/spells?school=evocation")
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
    assert "name" in spell
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
    assert spell["name"] == "Magic Missile"
    assert spell["level"] == 1
    assert spell["quick_rules"] is None


def test_spell_json_columns_parsed(test_client):
    """Test that JSON columns are parsed correctly."""
    response = test_client.get("/api/spells/by-title/Magic%20Missile")
    assert response.status_code == 200
    spell = response.json()

    assert spell["components"] == ["V", "S"]
    assert set(spell["healing"]) == {"amount", "temp_hp", "max_hp"}
    assert spell["quick_rules"] is None


def test_create_spell_with_attacks_round_trips_as_list(test_client):
    """attacks must parse back as structured JSON, not a raw string."""
    new_spell = {
        "name": "Scorching Ray",
        "level": 2,
        "description": "Three rays of fire.",
        "quick_rules": "Deal {spell_attack_bonus} damage.",
        "range": "120 feet",
        "duration": "Instantaneous",
        "concentration": False,
        "ritual": False,
        "components": ["V", "S"],
        "attacks": [{"kind": "ranged", "saving_throws": []}],
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["attacks"], list)
    assert data["attacks"][0]["kind"] == "ranged"
    assert data["quick_rules"] == "Deal {spell_attack_bonus} damage."

    response = test_client.get(f"/api/spells/{data['id']}")
    assert isinstance(response.json()["attacks"], list)
    assert response.json()["quick_rules"] == "Deal {spell_attack_bonus} damage."


def test_create_spell_preserves_literal_quick_rules_exactly(test_client):
    new_spell = {
        "name": "Literal Rules Test",
        "level": 1,
        "school": "abjuration",
        "description": "Literal test",
        "quick_rules": "  Literal text with spaces.  ",
        "casting_times": ["1 action"],
        "range": "Self",
        "components": ["V"],
        "duration": "Instantaneous",
        "concentration": False,
        "ritual": False,
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    data = response.json()
    assert data["quick_rules"] == "  Literal text with spaces.  "

    response = test_client.get(f"/api/spells/{data['id']}")
    assert response.json()["quick_rules"] == "  Literal text with spaces.  "


def test_create_spell(test_client):
    """Test POST /api/spells to create a new spell."""
    new_spell = {
        "name": "Test Spell",
        "level": 2,
        "school": "transmutation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S", "M"],
        "duration": "Concentration, up to 1 hour",
        "description": "A test spell",
        "quick_rules": "A test spell.",
        "concentration": False,
        "ritual": False,
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Spell"
    assert data["level"] == 2
    assert data["id"] is not None


def test_create_spell_categories_round_trip(test_client):
    new_spell = {
        "name": "Category Round Trip Spell",
        "level": 1,
        "school": "evocation",
        "description": "A categorized spell",
        "quick_rules": "Cast it, deal damage.",
        "range": "60 feet",
        "duration": "Instantaneous",
        "components": ["V"],
        "concentration": False,
        "ritual": False,
        "categories": ["Damage", "Protect"],
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 201
    spell_id = response.json()["id"]
    assert response.json()["categories"] == ["Damage", "Protect"]
    assert test_client.get(f"/api/spells/by-title/{new_spell['name']}").json()["categories"] == ["Damage", "Protect"]
    assert test_client.get(f"/api/spells/{spell_id}").json()["categories"] == ["Damage", "Protect"]


def test_create_spell_duplicate_name_fails(test_client):
    """Test that creating a spell with a duplicate name fails."""
    new_spell = {
        "name": "Magic Missile",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "120 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "Duplicate",
        "quick_rules": "Duplicate.",
        "concentration": False,
        "ritual": False,
    }

    response = test_client.post("/api/spells", json=new_spell)
    assert response.status_code == 400


def test_update_spell_duplicate_name_fails(test_client):
    """Test that updating a spell to a duplicate name fails."""
    # Create two spells with unique names
    spell_a = {
        "name": "Duplicate Test A",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "First spell",
        "quick_rules": "First spell.",
        "concentration": False,
        "ritual": False,
    }
    response = test_client.post("/api/spells", json=spell_a)
    assert response.status_code == 201
    spell_a_id = response.json()["id"]

    spell_b = {
        "name": "Duplicate Test B",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "Second spell",
        "quick_rules": "Second spell.",
        "concentration": False,
        "ritual": False,
    }
    response = test_client.post("/api/spells", json=spell_b)
    assert response.status_code == 201
    spell_b_id = response.json()["id"]

    # Update spell B to have spell A's name
    spell_b["name"] = "Duplicate Test A"
    response = test_client.put(f"/api/spells/{spell_b_id}", json=spell_b)
    assert response.status_code == 400
    assert response.json()["message"] == "A spell with this name already exists"


def test_update_spell(test_client):
    """Test PUT /api/spells/{id} to update a spell."""
    # Get a spell first
    response = test_client.get("/api/spells")
    spells = response.json()
    spell_id = spells[0]["id"]

    updated_spell = {
        "name": f"{spells[0]['name']} Updated",
        "level": spells[0]["level"],
        "school": spells[0]["school"],
        "casting_times": spells[0]["casting_times"],
        "range": spells[0]["range"],
        "components": spells[0].get("components"),
        "duration": spells[0]["duration"],
        "description": "Updated description",
        "quick_rules": "Updated description.",
        "concentration": spells[0]["concentration"],
        "ritual": spells[0]["ritual"],
    }

    response = test_client.put(f"/api/spells/{spell_id}", json=updated_spell)
    assert response.status_code == 200
    data = response.json()
    assert "Updated" in data["name"]
    assert data["description"] == "Updated description"
    assert data["quick_rules"] == "Updated description."


def test_update_nonexistent_spell(test_client):
    """Test updating a nonexistent spell returns 404."""
    update = {
        "name": "Nonexistent",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "Test",
        "quick_rules": "Test.",
        "concentration": False,
        "ritual": False,
    }

    response = test_client.put("/api/spells/99999", json=update)
    assert response.status_code == 404


def test_get_spell_players_returns_assigned_players_sorted(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    beta = test_client.post("/api/players", json={"name": "Beta Caster", "class_": "Wizard", "level": 3}).json()
    alpha = test_client.post("/api/players", json={"name": "Alpha Caster", "class_": "Cleric", "level": 4}).json()

    assert test_client.post(f"/api/players/{beta['id']}/spells/{spell_id}").status_code == 201
    assert test_client.post(f"/api/players/{alpha['id']}/spells/{spell_id}").status_code == 201

    response = test_client.get(f"/api/spells/{spell_id}/players")
    assert response.status_code == 200
    assert [player["name"] for player in response.json()] == ["Alpha Caster", "Beta Caster"]


def test_replace_spell_players_replaces_assignments_atomically(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    removed = test_client.post("/api/players", json={"name": "Removed Caster", "class_": "Druid"}).json()
    kept = test_client.post("/api/players", json={"name": "Kept Caster", "class_": "Wizard"}).json()

    assert test_client.post(f"/api/players/{removed['id']}/spells/{spell_id}").status_code == 201

    response = test_client.put(f"/api/spells/{spell_id}/players", json={"player_ids": [kept["id"]]})
    assert response.status_code == 200
    assert [player["id"] for player in response.json()] == [kept["id"]]

    response = test_client.get(f"/api/spells/{spell_id}/players")
    assert [player["id"] for player in response.json()] == [kept["id"]]


def test_replace_spell_players_rejects_duplicate_player_ids(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    player = test_client.post("/api/players", json={"name": "Duplicate Caster", "class_": "Wizard"}).json()

    response = test_client.put(f"/api/spells/{spell_id}/players", json={"player_ids": [player["id"], player["id"]]})
    assert response.status_code == 400
    assert response.json()["message"] == "Duplicate player ids"


def test_spell_player_assignment_404s(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]

    assert test_client.get("/api/spells/99999/players").status_code == 404
    assert test_client.put("/api/spells/99999/players", json={"player_ids": []}).status_code == 404
    assert test_client.put(f"/api/spells/{spell_id}/players", json={"player_ids": [99999]}).status_code == 404


def test_replace_spell_players_db_failure_rolls_back(monkeypatch, test_client):
    class FailingCursor:
        def execute(self, query, params=()):
            return None

        def fetchone(self):
            return {"id": 1}

        def fetchall(self):
            return [{"id": 1}]

        def executemany(self, query, params):
            raise Exception("Simulated database failure")

    class FailingConnection:
        def __init__(self):
            self.rolled_back = False

        def cursor(self):
            return FailingCursor()

        def commit(self):
            raise AssertionError("commit should not run after executemany fails")

        def rollback(self):
            self.rolled_back = True

    class FailingContext:
        def __init__(self, conn):
            self.conn = conn

        def __enter__(self):
            return self.conn

        def __exit__(self, exc_type, exc, tb):
            return False

    conn = FailingConnection()
    monkeypatch.setattr(spells_router, "get_db", lambda: FailingContext(conn))

    response = test_client.put("/api/spells/1/players", json={"player_ids": [1]})

    assert response.status_code == 400
    assert conn.rolled_back is True


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "Missing Quick Rules", "level": 1, "description": "Test", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Blank Quick Rules", "level": 1, "description": "Test", "quick_rules": "   ", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Malformed Quick Rules", "level": 1, "description": "Test", "quick_rules": "Use {spell_attack_bonus", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Unknown Quick Rules", "level": 1, "description": "Test", "quick_rules": "Use {weapon_bonus}.", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
    ],
)
def test_create_spell_rejects_invalid_quick_rules(test_client, payload):
    response = test_client.post("/api/spells", json=payload)
    assert response.status_code == 422


def test_update_spell_rejects_invalid_quick_rules(test_client):
    base_spell = {
        "name": "Update Quick Rules Base",
        "level": 1,
        "description": "Base spell",
        "quick_rules": "Base spell.",
        "range": "Self",
        "duration": "Instantaneous",
        "concentration": False,
        "ritual": False,
    }
    response = test_client.post("/api/spells", json=base_spell)
    assert response.status_code == 201
    spell_id = response.json()["id"]

    for payload in (
        {"name": "Missing Quick Rules Update", "level": 1, "description": "Test", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Blank Quick Rules Update", "level": 1, "description": "Test", "quick_rules": "   ", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Malformed Quick Rules Update", "level": 1, "description": "Test", "quick_rules": "Use {spell_attack_bonus", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
        {"name": "Unknown Quick Rules Update", "level": 1, "description": "Test", "quick_rules": "Use {weapon_bonus}.", "range": "Self", "duration": "Instantaneous", "concentration": False, "ritual": False},
    ):
        response = test_client.put(f"/api/spells/{spell_id}", json=payload)
        assert response.status_code == 422


def test_delete_spell(test_client):
    """Test DELETE /api/spells/{id}."""
    # Create a spell to delete
    new_spell = {
        "name": "Delete Me",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "To be deleted",
        "quick_rules": "To be deleted.",
        "concentration": False,
        "ritual": False,
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


def test_delete_spell_db_failure(monkeypatch, test_client):
    new_spell = {
        "name": "Delete DB Fail",
        "level": 1,
        "school": "evocation",
        "casting_times": ["1 action"],
        "range": "30 feet",
        "components": ["V", "S"],
        "duration": "Instantaneous",
        "description": "DB failure test",
        "quick_rules": "DB failure test.",
        "concentration": False,
        "ritual": False,
    }
    response = test_client.post("/api/spells", json=new_spell)
    spell_id = response.json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/spells/{spell_id}")
    assert response.status_code == 400


