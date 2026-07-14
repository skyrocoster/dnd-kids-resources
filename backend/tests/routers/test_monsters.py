"""Tests for monster endpoints."""

import pytest

from backend.app.schemas import MonsterCreate, MonsterUpdate


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
    """Seeded monster should expose cr and parsed JSON columns in the M2 shape."""
    response = test_client.get("/api/monsters")
    monster = next(m for m in response.json() if m["name"] == "Owlbear")
    assert monster["cr"] == "3"
    assert monster["cr_sort"] == 3.0
    assert monster["ac"] == {"value": 13, "note": "natural armour", "alternatives": []}
    assert monster["senses"] == [{"type": "darkvision", "range": 60, "note": None}]
    assert monster["abilities"]["str"] == 20
    assert monster["features"]["actions"][1]["attack"]["damage"] == [
        {"formula": "1d10", "bonus": 5, "damage_types": ["piercing"]}
    ]


def test_get_nonexistent_monster(test_client):
    """Test 404 for nonexistent monster."""
    response = test_client.get("/api/monsters/99999")
    assert response.status_code == 404


def test_get_monster_by_name(test_client):
    """Test GET /api/monsters/by-name/{name}."""
    response = test_client.get("/api/monsters/by-name/Owlbear")
    assert response.status_code == 200
    assert response.json()["name"] == "Owlbear"


def test_monster_input_rejects_unknown_fields_and_cr_sort():
    with pytest.raises(ValueError):
        MonsterCreate.model_validate({"name": "Bad", "unknown": True})
    with pytest.raises(ValueError):
        MonsterCreate.model_validate({"name": "Bad", "cr_sort": 1.0})
    with pytest.raises(ValueError):
        MonsterUpdate.model_validate({"name": "Bad", "cr_sort": 1.0})


def test_get_monster_by_name_not_found(test_client):
    """Test 404 for a nonexistent monster name."""
    response = test_client.get("/api/monsters/by-name/NoSuchBeast")
    assert response.status_code == 404


# ── M2/M3 test stubs ────────────────────────────────────────────────────────────

@pytest.mark.skip(reason="M2: seed-migration shape (AC→value/note, tag-strip, cr_sort)")
def test_migrated_ac_shape():
    """Assert the M2 migration transforms inverted AC keys to {value, note}."""


@pytest.mark.skip(reason="M2: tag-stripping — {@creature x} becomes display text")
def test_migrated_tag_stripping():
    """Assert {@tag } markup is removed from action/trait text during migration."""


@pytest.mark.skip(reason="M3: POST /monsters creates and returns a new monster")
def test_create_monster():
    """POST /api/monsters with valid data returns 201 and persists."""


@pytest.mark.skip(reason="M3: POST /monsters with duplicate name returns 409")
def test_create_monster_duplicate():
    """POST /api/monsters with an existing name returns 409."""


@pytest.mark.skip(reason="M3: PUT /monsters/{id} updates fields")
def test_update_monster():
    """PUT /api/monsters/{id} returns the updated monster."""


@pytest.mark.skip(reason="M3: PUT /monsters/{id} returns 404 for unknown id")
def test_update_nonexistent_monster():
    """PUT /api/monsters/99999 returns 404."""


@pytest.mark.skip(reason="M3: DELETE /monsters/{id} returns 204")
def test_delete_monster():
    """DELETE /api/monsters/{id} returns 204, then GET returns 404."""


@pytest.mark.skip(reason="M3: DELETE /monsters/{id} returns 404 for unknown id")
def test_delete_nonexistent_monster():
    """DELETE /api/monsters/99999 returns 404."""
