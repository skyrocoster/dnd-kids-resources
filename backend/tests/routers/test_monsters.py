"""Tests for monster endpoints."""


def test_list_monsters(test_client):
    """Test GET /api/monsters returns a list."""
    response = test_client.get("/api/monsters")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_monster_by_id(test_client):
    """Test GET /api/monsters/{id}."""
    response = test_client.get("/api/monsters")
    monsters = response.json()
    assert monsters, "expected seeded monster data"
    monster_id = monsters[0]["id"]
    response = test_client.get(f"/api/monsters/{monster_id}")
    assert response.status_code == 200
    monster = response.json()
    assert monster["id"] == monster_id
    assert "name" in monster


def test_monster_seed_data_has_cr_and_parsed_json(test_client):
    """Seeded monster should expose cr and parsed JSON columns (senses/languages/action/stats)."""
    response = test_client.get("/api/monsters")
    monster = next(m for m in response.json() if m["name"] == "Owlbear")
    assert monster["cr"] == "3"
    assert monster["senses"] == [{"type": "darkvision", "range": 60}]
    assert monster["stats"]["str"] == 20
    assert monster["action"][0]["attack"]["damage"] == "1d10+5"


def test_get_nonexistent_monster(test_client):
    """Test 404 for nonexistent monster."""
    response = test_client.get("/api/monsters/99999")
    assert response.status_code == 404
