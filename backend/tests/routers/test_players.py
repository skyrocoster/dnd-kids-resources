"""Tests for player CRUD and nested spell/weapon endpoints."""


def test_list_players(test_client):
    """Test GET /api/players returns a list."""
    response = test_client.get("/api/players")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


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
        assert any(s["id"] == spell_id for s in player_spells)
        assert all("name" in spell for spell in player_spells)


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
