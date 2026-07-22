"""Tests for player CRUD and nested spell/weapon endpoints."""

from unittest.mock import MagicMock

import sqlite3
import backend.app.db as db_module
from pathlib import Path


def _raise_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def test_list_players(test_client):
    """Test GET /api/players returns a list."""
    response = test_client.get("/api/players")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_player_db_failure(monkeypatch, test_client):
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.post("/api/players", json={"name": "Fail", "class_": "Wizard", "level": 1})
    assert response.status_code == 400


def test_update_player_db_failure(monkeypatch, test_client):
    response = test_client.post("/api/players", json={"name": "Update Fail", "class_": "Wizard", "level": 2})
    player_id = response.json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.put(f"/api/players/{player_id}", json={"name": "Update Fail", "class_": "Wizard", "level": 5})
    assert response.status_code == 400


def test_delete_player_db_failure(monkeypatch, test_client):
    response = test_client.post("/api/players", json={"name": "Delete Fail", "class_": "Paladin"})
    player_id = response.json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.delete(f"/api/players/{player_id}")
    assert response.status_code == 400


def test_create_player(test_client):
    """Test POST /api/players."""
    new_player = {
        "name": "Test Player",
        "class_": "Fighter",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Player"
    assert data["level"] == 5
    assert data["id"] is not None


def test_get_player(test_client):
    """Test GET /api/players/{id}."""
    # Create a player first
    new_player = {
        "name": "Retrieval Test",
        "class_": "Rogue",
        "level": 3,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    response = test_client.get(f"/api/players/{player_id}")
    assert response.status_code == 200
    player = response.json()
    assert player["id"] == player_id
    assert player["name"] == "Retrieval Test"
    assert player["class_"] == "Rogue"


def test_list_players_includes_class(test_client):
    """GET /api/players must not silently drop the class column (regression: was returning None)."""
    test_client.post("/api/players", json={"name": "List Class Test", "class_": "Wizard", "level": 4})

    response = test_client.get("/api/players")
    assert response.status_code == 200
    player = next(p for p in response.json() if p["name"] == "List Class Test")
    assert player["class_"] == "Wizard"


def test_update_player(test_client):
    """Test PUT /api/players/{id}."""
    new_player = {
        "name": "Update Test",
        "class_": "Wizard",
        "level": 2,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    update = {
        "name": "Update Test",
        "class_": "Wizard",
        "level": 5,
    }

    response = test_client.put(f"/api/players/{player_id}", json=update)
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == 5


def test_delete_player(test_client):
    """Test DELETE /api/players/{id}."""
    new_player = {
        "name": "Delete Test",
        "class_": "Paladin",
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    response = test_client.delete(f"/api/players/{player_id}")
    assert response.status_code == 204

    response = test_client.get(f"/api/players/{player_id}")
    assert response.status_code == 404


def test_get_player_spells(test_client):
    """Test GET /api/players/{id}/spells."""
    new_player = {
        "name": "Spellcaster",
        "class_": "Wizard",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    # Get available spells
    response = test_client.get("/api/spells?limit=1")
    spells = response.json()
    if spells:
        spell_id = spells[0]["id"]

        # Assign spell to player
        response = test_client.post(f"/api/players/{player_id}/spells/{spell_id}")
        assert response.status_code == 201

        # Get player spells
        response = test_client.get(f"/api/players/{player_id}/spells")
        assert response.status_code == 200
        player_spells = response.json()
        player_spell = next(s for s in player_spells if s["id"] == spell_id)
        assert "quick_rules" in player_spell
        assert player_spell["quick_rules"] == spells[0]["quick_rules"]
        assert all("name" in spell for spell in player_spells)


def test_create_player_with_abilities(test_client):
    """Nested abilities dict must be preserved exactly on round-trip."""
    new_player = {
        "name": "Ability Test",
        "class_": "Fighter",
        "level": 3,
        "abilities": {"str": 16, "dex": 12, "con": 14, "int": 10, "wis": 8, "cha": 13},
    }

    response = test_client.post("/api/players", json=new_player)
    assert response.status_code == 201
    data = response.json()
    assert data["abilities"] == new_player["abilities"]

    response = test_client.get(f"/api/players/{data['id']}")
    assert response.status_code == 200
    assert response.json()["abilities"] == new_player["abilities"]


def test_create_player_with_max_spell_slots(test_client):
    """max_spell_slots dict must be preserved on round-trip."""
    new_player = {
        "name": "Slots Test",
        "class_": "Wizard",
        "level": 3,
        "max_spell_slots": {"1": 2, "2": 1},
    }

    response = test_client.post("/api/players", json=new_player)
    assert response.status_code == 201
    data = response.json()
    assert data["max_spell_slots"] == {"1": 2, "2": 1}

    response = test_client.get(f"/api/players/{data['id']}")
    assert response.status_code == 200
    assert response.json()["max_spell_slots"] == {"1": 2, "2": 1}


def test_update_player_ac_hp(test_client):
    """ac/hp fields must survive an update round-trip."""
    new_player = {
        "name": "AC HP Test",
        "class_": "Fighter",
        "level": 3,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    update = {
        "name": "AC HP Test",
        "class_": "Fighter",
        "level": 3,
        "ac": {"value": 16, "note": "chain mail"},
        "hp": {"average": 28, "formula": "4d10+8"},
    }

    response = test_client.put(f"/api/players/{player_id}", json=update)
    assert response.status_code == 200
    data = response.json()
    assert data["ac"] == {**update["ac"], "alternatives": []}
    assert data["hp"] == update["hp"]


def test_get_player_weapons(test_client):
    """Test GET /api/players/{id}/weapons."""
    new_player = {
        "name": "Warrior",
        "class_": "Fighter",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    response = test_client.get(f"/api/players/{player_id}/weapons")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_player_detail(test_client):
    """Test GET /api/players/{id}/detail returns player with spells and weapons."""
    new_player = {
        "name": "Detail Test",
        "class_": "Wizard",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    if spells:
        spell_id = spells[0]["id"]
        test_client.post(f"/api/players/{player_id}/spells/{spell_id}")

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    if weapons:
        weapon_id = weapons[0]["id"]
        test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

    response = test_client.get(f"/api/players/{player_id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == player_id
    assert "spells" in data
    assert "weapons" in data
    assert isinstance(data["spells"], list)
    assert isinstance(data["weapons"], list)

    if spells:
        assert data["spells"][0]["id"] == spells[0]["id"]
    if weapons:
        assert data["weapons"][0]["id"] == weapons[0]["id"]


def test_replace_player_spells(test_client):
    """Test PUT /api/players/{id}/spells replaces all spell assignments."""
    new_player = {"name": "Replace Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=2")
    spells = spells_resp.json()
    assert len(spells) >= 2
    spell_ids = [s["id"] for s in spells]

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": spell_ids},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    returned_ids = {s["id"] for s in data}
    assert returned_ids == set(spell_ids)

    get_resp = test_client.get(f"/api/players/{player_id}/spells")
    assert get_resp.status_code == 200
    get_ids = {s["id"] for s in get_resp.json()}
    assert get_ids == set(spell_ids)


def test_replace_player_spells_empty(test_client):
    """Test PUT /api/players/{id}/spells with empty list removes all spells."""
    new_player = {"name": "Empty Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    if spells:
        test_client.post(f"/api/players/{player_id}/spells/{spells[0]['id']}")

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": []},
    )
    assert response.status_code == 200
    data = response.json()
    assert data == []

    get_resp = test_client.get(f"/api/players/{player_id}/spells")
    assert get_resp.json() == []


def test_replace_player_spells_not_found(test_client):
    """Test PUT /api/players/{id}/spells returns 404 for nonexistent player."""
    response = test_client.put(
        "/api/players/99999/spells",
        json={"spell_ids": [1]},
    )
    assert response.status_code == 404


def test_replace_player_spells_duplicate(test_client):
    """Test PUT /api/players/{id}/spells returns 400 for duplicate spell ids."""
    new_player = {"name": "Dup Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    assert spells
    spell_id = spells[0]["id"]

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": [spell_id, spell_id]},
    )
    assert response.status_code == 400


def test_replace_player_spells_invalid_spell(test_client):
    """Test PUT /api/players/{id}/spells returns 400 for nonexistent spell id."""
    new_player = {"name": "Bad Spell Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": [99999]},
    )
    assert response.status_code == 400


def test_replace_player_weapons(test_client):
    """Test PUT /api/players/{id}/weapons replaces all weapon assignments."""
    new_player = {"name": "Weapon Replace", "class_": "Fighter", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    weapons_resp = test_client.get("/api/weapons?limit=500")
    weapons = weapons_resp.json()
    assert weapons
    weapon_ids = [w["id"] for w in weapons]

    response = test_client.put(
        f"/api/players/{player_id}/weapons",
        json={"weapon_ids": weapon_ids},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == len(weapon_ids)
    returned_ids = {w["id"] for w in data}
    assert returned_ids == set(weapon_ids)

    get_resp = test_client.get(f"/api/players/{player_id}/weapons")
    assert get_resp.status_code == 200
    get_ids = {w["id"] for w in get_resp.json()}
    assert get_ids == set(weapon_ids)


def test_replace_player_weapons_empty(test_client):
    """Test PUT /api/players/{id}/weapons with empty list removes all weapons."""
    new_player = {"name": "Weapon Empty", "class_": "Fighter", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    if weapons:
        test_client.post(f"/api/players/{player_id}/weapons/{weapons[0]['id']}")

    response = test_client.put(
        f"/api/players/{player_id}/weapons",
        json={"weapon_ids": []},
    )
    assert response.status_code == 200
    data = response.json()
    assert data == []

    get_resp = test_client.get(f"/api/players/{player_id}/weapons")
    assert get_resp.json() == []


def test_replace_player_weapons_not_found(test_client):
    """Test PUT /api/players/{id}/weapons returns 404 for nonexistent player."""
    response = test_client.put(
        "/api/players/99999/weapons",
        json={"weapon_ids": [1]},
    )
    assert response.status_code == 404


def test_replace_player_weapons_duplicate(test_client):
    """Test PUT /api/players/{id}/weapons returns 400 for duplicate weapon ids."""
    new_player = {"name": "Weapon Dup", "class_": "Fighter", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    assert weapons
    weapon_id = weapons[0]["id"]

    response = test_client.put(
        f"/api/players/{player_id}/weapons",
        json={"weapon_ids": [weapon_id, weapon_id]},
    )
    assert response.status_code == 400


def test_replace_player_weapons_invalid_weapon(test_client):
    """Test PUT /api/players/{id}/weapons returns 400 for nonexistent weapon id."""
    new_player = {"name": "Weapon Bad", "class_": "Fighter", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    response = test_client.put(
        f"/api/players/{player_id}/weapons",
        json={"weapon_ids": [99999]},
    )
    assert response.status_code == 400


def test_delete_player_cleans_junction(test_client, test_db_path):
    """Deleting a player removes junction rows but preserves catalog records."""
    new_player = {"name": "Cascade Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    assert spells
    spell_id = spells[0]["id"]
    test_client.post(f"/api/players/{player_id}/spells/{spell_id}")

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    assert weapons
    weapon_id = weapons[0]["id"]
    test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

    test_client.delete(f"/api/players/{player_id}")

    spell_resp = test_client.get(f"/api/spells/{spell_id}")
    assert spell_resp.status_code == 200

    weapon_resp = test_client.get(f"/api/weapons/{weapon_id}")
    assert weapon_resp.status_code == 200

    conn = sqlite3.connect(test_db_path)
    try:
        cur = conn.execute("SELECT COUNT(*) FROM player_spells WHERE player_id = ?", (player_id,))
        assert cur.fetchone()[0] == 0
        cur = conn.execute("SELECT COUNT(*) FROM player_weapons WHERE player_id = ?", (player_id,))
        assert cur.fetchone()[0] == 0
    finally:
        conn.close()


def test_delete_player_preserves_other_players_spells(test_client):
    """Deleting a player does not remove spells shared by another player."""
    player1 = test_client.post("/api/players", json={"name": "Shared A", "class_": "Wizard", "level": 5}).json()
    player2 = test_client.post("/api/players", json={"name": "Shared B", "class_": "Wizard", "level": 5}).json()

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    assert spells
    spell_id = spells[0]["id"]

    test_client.post(f"/api/players/{player1['id']}/spells/{spell_id}")
    test_client.post(f"/api/players/{player2['id']}/spells/{spell_id}")

    test_client.delete(f"/api/players/{player1['id']}")

    spells2_resp = test_client.get(f"/api/players/{player2['id']}/spells")
    assert spells2_resp.status_code == 200
    player2_spells = spells2_resp.json()
    assert any(s["id"] == spell_id for s in player2_spells)

