"""Tests for reference endpoints (abilities, conditions, skills, etc.)."""


def test_reference_lists(test_client):
    """All static reference lists return usable rows in one pass."""
    response = test_client.get("/api/abilities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify structure
    ability = data[0]
    assert "id" in ability
    assert "code" in ability
    assert "name" in ability
    assert "description" in ability
    assert ability["code"] == ability["code"].lower()

    conditions = test_client.get("/api/conditions")
    assert conditions.status_code == 200
    assert isinstance(conditions.json(), list)
    assert len(conditions.json()) > 0

    damage_types = test_client.get("/api/damage_types")
    assert damage_types.status_code == 200
    assert isinstance(damage_types.json(), list)
    assert len(damage_types.json()) > 0
    assert "code" in damage_types.json()[0]

    weapon_properties = test_client.get("/api/weapon_properties")
    assert weapon_properties.status_code == 200
    assert isinstance(weapon_properties.json(), list)

    skills = test_client.get("/api/skills")
    assert skills.status_code == 200
    skill_data = skills.json()
    assert isinstance(skill_data, list)
    assert len(skill_data) == 18  # Standard D&D 5e has 18 skills
    assert "name" in skill_data[0]
    assert "ability" in skill_data[0]
    assert "description" in skill_data[0]

    components = test_client.get("/api/spell-components")
    assert components.status_code == 200
    assert len(components.json()) == 3
    assert {item["code"] for item in components.json()} == {"V", "S", "M"}
