"""Tests for reference endpoints (abilities, conditions, skills, etc.)."""


def test_get_abilities(test_client):
    """Test GET /api/abilities returns a list."""
    response = test_client.get("/api/abilities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify structure
    ability = data[0]
    assert "id" in ability
    assert "name" in ability
    assert "description" in ability


def test_get_conditions(test_client):
    """Test GET /api/conditions returns a list."""
    response = test_client.get("/api/conditions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_damage_types(test_client):
    """Test GET /api/damage_types returns a list."""
    response = test_client.get("/api/damage_types")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_weapon_properties(test_client):
    """Test GET /api/weapon_properties returns a list."""
    response = test_client.get("/api/weapon_properties")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_skills(test_client):
    """Test GET /api/skills returns D&D 5e skills."""
    response = test_client.get("/api/skills")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 18  # Standard D&D 5e has 18 skills

    # Verify structure
    skill = data[0]
    assert "name" in skill
    assert "ability" in skill
    assert "description" in skill


def test_get_spell_components(test_client):
    """Test GET /api/spell-components returns V, S, M."""
    response = test_client.get("/api/spell-components")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    codes = {item["code"] for item in data}
    assert codes == {"V", "S", "M"}
