"""Tests for CRUD endpoints (weapons, NPCs, encounters, dungeons)."""

import pytest

import backend.app.db as db_module

from backend.tests.conftest import db_failure_conn


# Weapons (list/create/delete covered in test_weapons.py; seed JSON locks live here)
def test_weapon_seed_data_has_attack_and_property(test_client):
    """Seeded weapon should round-trip its structured attack/property JSON fields."""
    response = test_client.get("/api/weapons")
    assert response.status_code == 200
    weapon = next(w for w in response.json() if w["name"] == "Longsword")
    assert weapon["property"] == ["V"]
    assert weapon["attack"][0]["damage"] == "1d8"


def test_create_weapon_with_structured_fields(test_client):
    """Test POST /api/weapons with attack/property/entries JSON fields."""
    weapon = {
        "name": "Test Greataxe",
        "rarity": None,
        "weapon_category": "martial",
        "property": ["H", "2H"],
        "attack": [{"type": "melee", "damage": "1d12", "damage_type": "slashing"}],
        "entries": ["A brutal two-handed axe."],
        "quick_rules": "Attack +{weapon_attack_bonus}, deal 1d8 slashing damage +{weapon_damage_bonus}.",
    }
    response = test_client.post("/api/weapons", json=weapon)
    assert response.status_code == 201
    data = response.json()
    assert data["property"] == ["H", "2H"]
    assert data["attack"][0]["damage"] == "1d12"


# NPCs
def test_create_npc(test_client):
    """Test POST /api/npcs with name-only statblock defaults."""
    npc = {"name": "Test NPC"}

    response = test_client.post("/api/npcs", json=npc)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test NPC"
    assert data["sizes"] == []
    assert data["creature_type"] is None
    assert data["ac"] is None
    assert data["hp"] is None
    assert data["speed"] == []
    assert data["abilities"] is None
    assert data["saving_throws"] == {}
    assert data["skills"] == {}
    assert data["damage_resistances"] == []
    assert data["condition_immunities"] == []
    assert data["senses"] == []
    assert data["languages"] == []
    assert data["features"]["actions"] == []
    assert data["appearance"] is None


def test_npc_crud(test_client):
    """Test full NPC CRUD."""
    npc = {"name": "CRUD Test NPC"}
    response = test_client.post("/api/npcs", json=npc)
    assert response.status_code == 201
    npc_id = response.json()["id"]

    response = test_client.get(f"/api/npcs/{npc_id}")
    assert response.status_code == 200

    response = test_client.delete(f"/api/npcs/{npc_id}")
    assert response.status_code == 204


def test_npc_full_columns_round_trip(test_client):
    """NPC statblock fields must persist and parse with identity fields intact."""
    npc = {
        "name": "Full NPC",
        "race": "Elf",
        "gender": "Female",
        "background": "Sage",
        "sizes": ["medium"],
        "alignment": "neutral good",
        "creature_type": {"category": "humanoid", "tags": ["elf"]},
        "ac": {"value": 14, "note": "leather armor"},
        "hp": {"average": 12, "formula": "3d8"},
        "speed": [{"mode": "walk", "feet": 30}],
        "abilities": {"str": 8, "dex": 16, "con": 10, "int": 14, "wis": 12, "cha": 11},
        "saving_throws": {"dex": 5},
        "skills": {"arcana": 4},
        "passive_perception": 11,
        "damage_resistances": [{"damage_type": "necrotic", "note": "while warded"}],
        "damage_immunities": [{"damage_type": "poison"}],
        "damage_vulnerabilities": [{"damage_type": "radiant", "conditional": True}],
        "condition_immunities": ["charmed"],
        "senses": [{"type": "darkvision", "range": 60}],
        "languages": ["Common", "Elvish"],
        "features": {"traits": [{"name": "Old Lore", "description": "Knows forbidden history."}]},
        "cr": "1/4",
        "cr_note": "support NPC",
        "experience_points": 50,
        "appearance": {"hair_colour": "silver"},
        "notes": "Keeper of old secrets.",
    }
    response = test_client.post("/api/npcs", json=npc)
    assert response.status_code == 201
    data = response.json()
    assert data["race"] == "Elf"
    assert data["gender"] == "Female"
    assert data["background"] == "Sage"
    assert data["sizes"] == ["medium"]
    assert data["creature_type"]["tags"] == ["elf"]
    assert data["ac"]["value"] == 14
    assert data["hp"]["formula"] == "3d8"
    assert data["speed"] == [{"mode": "walk", "feet": 30, "note": None, "hover": False}]
    assert data["abilities"]["dex"] == 16
    assert data["saving_throws"] == {"dex": 5}
    assert data["damage_resistances"][0]["damage_type"] == "necrotic"
    assert data["senses"] == [{"type": "darkvision", "range": 60, "note": None}]
    assert data["languages"] == ["Common", "Elvish"]
    assert data["features"]["traits"][0]["name"] == "Old Lore"
    assert data["appearance"] == {"hair_colour": "silver"}


# Encounters
def test_encounter_crud(test_client):
    """Test full encounter CRUD."""
    encounter = {"title": "Delete Test", "creatures": []}
    response = test_client.post("/api/encounters", json=encounter)
    assert response.status_code == 201
    encounter_id = response.json()["id"]

    response = test_client.get(f"/api/encounters/{encounter_id}")
    assert response.status_code == 200

    response = test_client.delete(f"/api/encounters/{encounter_id}")
    assert response.status_code == 204


def test_encounter_creatures_round_trip_structured_units(test_client):
    """Creature entries are rich dicts (monster_id, hp_current, status, ...), not plain strings."""
    encounter = {
        "title": "Structured Encounter",
        "creatures": [
            {
                "monster_id": 1,
                "original_name": "Goblin",
                "name": "Goblin",
                "hp_current": 7,
                "hp_max": 7,
                "ac": 15,
                "status": "alive",
                "conditions": [],
            }
        ],
    }
    response = test_client.post("/api/encounters", json=encounter)
    assert response.status_code == 201
    data = response.json()
    assert data["creatures"][0]["monster_id"] == 1
    assert data["creatures"][0]["status"] == "alive"

    response = test_client.get(f"/api/encounters/{data['id']}")
    assert response.status_code == 200
    assert response.json()["creatures"][0]["name"] == "Goblin"


# Dungeons
def test_delete_dungeon(test_client):
    """Test DELETE /api/dungeons/{id}."""
    dungeon = {"title": "Delete Test", "data": {"rooms": []}}
    response = test_client.post("/api/dungeons", json=dungeon)
    dungeon_id = response.json()["id"]

    response = test_client.delete(f"/api/dungeons/{dungeon_id}")
    assert response.status_code == 204


@pytest.mark.parametrize(
    ("resource", "payload"),
    [
        ("weapons", {"name": "Fail", "rarity": "common", "quick_rules": "Attack +{weapon_attack_bonus}, deal 1d8 slashing damage +{weapon_damage_bonus}."}),
        ("npcs", {"name": "Fail"}),
        ("encounters", {"title": "Fail", "creatures": []}),
        ("dungeons", {"title": "Fail", "data": {}}),
    ],
)
def test_create_db_failure(monkeypatch, test_client, resource, payload):
    """POST maps DB failures to 400 on every resource."""
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    assert test_client.post(f"/api/{resource}", json=payload).status_code == 400


@pytest.mark.parametrize("resource", ["weapons", "npcs", "encounters", "dungeons"])
def test_delete_db_failure(monkeypatch, test_client, resource):
    """DELETE maps DB failures to 400 on every resource."""
    seed = {
        "weapons": {"name": "FailDelete", "rarity": "common", "quick_rules": "Attack +{weapon_attack_bonus}, deal 1d8 slashing damage +{weapon_damage_bonus}."},
        "npcs": {"name": "FailDelete"},
        "encounters": {"title": "FailDelete", "creatures": []},
        "dungeons": {"title": "FailDelete", "data": {}},
    }[resource]
    resource_id = test_client.post(f"/api/{resource}", json=seed).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    assert test_client.delete(f"/api/{resource}/{resource_id}").status_code == 400
