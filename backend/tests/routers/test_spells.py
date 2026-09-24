"""Tests for spell CRUD endpoints."""

import pytest

import backend.app.routers.spells as spells_router


def test_list_spells_with_pagination(test_client):
    """Test spell listing with limit and offset."""
    response = test_client.get("/api/spells?limit=1&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


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
    beta = test_client.post(
        "/api/players", json={"name": "Beta Caster", "class_": "Wizard", "level": 3}
    ).json()
    alpha = test_client.post(
        "/api/players", json={"name": "Alpha Caster", "class_": "Cleric", "level": 4}
    ).json()

    assert test_client.post(f"/api/players/{beta['id']}/spells/{spell_id}").status_code == 201
    assert test_client.post(f"/api/players/{alpha['id']}/spells/{spell_id}").status_code == 201

    response = test_client.get(f"/api/spells/{spell_id}/players")
    assert response.status_code == 200
    assert [player["name"] for player in response.json()] == ["Alpha Caster", "Beta Caster"]


def test_replace_spell_players_replaces_assignments_atomically(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    removed = test_client.post(
        "/api/players", json={"name": "Removed Caster", "class_": "Druid"}
    ).json()
    kept = test_client.post("/api/players", json={"name": "Kept Caster", "class_": "Wizard"}).json()

    assert test_client.post(f"/api/players/{removed['id']}/spells/{spell_id}").status_code == 201

    response = test_client.put(f"/api/spells/{spell_id}/players", json={"player_ids": [kept["id"]]})
    assert response.status_code == 200
    assert [player["id"] for player in response.json()] == [kept["id"]]

    response = test_client.get(f"/api/spells/{spell_id}/players")
    assert [player["id"] for player in response.json()] == [kept["id"]]


def test_replace_spell_players_rejects_duplicate_player_ids(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    player = test_client.post(
        "/api/players", json={"name": "Duplicate Caster", "class_": "Wizard"}
    ).json()

    response = test_client.put(
        f"/api/spells/{spell_id}/players", json={"player_ids": [player["id"], player["id"]]}
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Duplicate player ids"


def test_spell_player_assignment_404s(test_client):
    spell_id = test_client.get("/api/spells").json()[0]["id"]

    assert test_client.get("/api/spells/99999/players").status_code == 404
    assert test_client.put("/api/spells/99999/players", json={"player_ids": []}).status_code == 404
    assert (
        test_client.put(f"/api/spells/{spell_id}/players", json={"player_ids": [99999]}).status_code
        == 404
    )


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
        {
            "name": "Missing Quick Rules",
            "level": 1,
            "description": "Test",
            "range": "Self",
            "duration": "Instantaneous",
            "concentration": False,
            "ritual": False,
        },
        {
            "name": "Blank Quick Rules",
            "level": 1,
            "description": "Test",
            "quick_rules": "   ",
            "range": "Self",
            "duration": "Instantaneous",
            "concentration": False,
            "ritual": False,
        },
        {
            "name": "Malformed Quick Rules",
            "level": 1,
            "description": "Test",
            "quick_rules": "Use {spell_attack_bonus",
            "range": "Self",
            "duration": "Instantaneous",
            "concentration": False,
            "ritual": False,
        },
        {
            "name": "Unknown Quick Rules",
            "level": 1,
            "description": "Test",
            "quick_rules": "Use {weapon_bonus}.",
            "range": "Self",
            "duration": "Instantaneous",
            "concentration": False,
            "ritual": False,
        },
    ],
)
def test_create_spell_rejects_invalid_quick_rules(test_client, payload):
    response = test_client.post("/api/spells", json=payload)
    assert response.status_code == 422
