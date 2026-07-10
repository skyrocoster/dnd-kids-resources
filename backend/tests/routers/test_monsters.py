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
    if monsters:
        monster_id = monsters[0]["id"]
        response = test_client.get(f"/api/monsters/{monster_id}")
        assert response.status_code == 200
        monster = response.json()
        assert monster["id"] == monster_id
        assert "name" in monster


def test_get_nonexistent_monster(test_client):
    """Test 404 for nonexistent monster."""
    response = test_client.get("/api/monsters/99999")
    assert response.status_code == 404
