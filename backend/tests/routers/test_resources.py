"""Tests for CRUD endpoints (weapons, NPCs, encounters, dungeons)."""

from unittest.mock import MagicMock


def _mock_db_failure():
    """Return a mock connection whose commit() raises."""
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


# Weapons
def test_list_weapons(test_client):
    """Test GET /api/weapons."""
    response = test_client.get("/api/weapons")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_weapon(test_client):
    """Test POST /api/weapons."""
    weapon = {"name": "Test Sword", "rarity": "uncommon"}

    response = test_client.post("/api/weapons", json=weapon)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Sword"


def test_weapon_crud(test_client):
    """Test full weapon CRUD."""
    weapon = {"name": "CRUD Test", "rarity": "rare"}
    response = test_client.post("/api/weapons", json=weapon)
    assert response.status_code == 201
    weapon_id = response.json()["id"]

    response = test_client.get(f"/api/weapons/{weapon_id}")
    assert response.status_code == 200

    response = test_client.delete(f"/api/weapons/{weapon_id}")
    assert response.status_code == 204


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
    }
    response = test_client.post("/api/weapons", json=weapon)
    assert response.status_code == 201
    data = response.json()
    assert data["property"] == ["H", "2H"]
    assert data["attack"][0]["damage"] == "1d12"


def test_create_weapon_db_failure(monkeypatch, test_client):
    """Test POST /api/weapons when DB commit fails."""
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.post("/api/weapons", json={"name": "Fail", "rarity": "common"})
    assert response.status_code == 400


def test_delete_weapon_db_failure(monkeypatch, test_client):
    """Test DELETE /api/weapons when DB commit fails."""
    response = test_client.post("/api/weapons", json={"name": "FailDelete", "rarity": "common"})
    weapon_id = response.json()["id"]
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/weapons/{weapon_id}")
    assert response.status_code == 400


# NPCs
def test_list_npcs(test_client):
    """Test GET /api/npcs."""
    response = test_client.get("/api/npcs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


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


def test_create_npc_db_failure(monkeypatch, test_client):
    """Test POST /api/npcs when DB commit fails."""
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.post("/api/npcs", json={"name": "Fail"})
    assert response.status_code == 400


def test_delete_npc_db_failure(monkeypatch, test_client):
    """Test DELETE /api/npcs when DB commit fails."""
    response = test_client.post("/api/npcs", json={"name": "FailDelete"})
    npc_id = response.json()["id"]
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/npcs/{npc_id}")
    assert response.status_code == 400


# Encounters
def test_list_encounters(test_client):
    """Test GET /api/encounters."""
    response = test_client.get("/api/encounters")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_encounter(test_client):
    """Test POST /api/encounters."""
    encounter = {"title": "Test Encounter", "creatures": []}

    response = test_client.post("/api/encounters", json=encounter)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Encounter"


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


def test_create_encounter_db_failure(monkeypatch, test_client):
    """Test POST /api/encounters when DB commit fails."""
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.post("/api/encounters", json={"title": "Fail", "creatures": []})
    assert response.status_code == 400


def test_delete_encounter_db_failure(monkeypatch, test_client):
    """Test DELETE /api/encounters when DB commit fails."""
    response = test_client.post("/api/encounters", json={"title": "FailDelete", "creatures": []})
    encounter_id = response.json()["id"]
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/encounters/{encounter_id}")
    assert response.status_code == 400


# Dungeons
def test_list_dungeons(test_client):
    """Test GET /api/dungeons."""
    response = test_client.get("/api/dungeons")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_dungeon(test_client):
    """Test POST /api/dungeons."""
    dungeon = {
        "title": "Test Dungeon",
        "data": {"rooms": [{"id": 1, "name": "Entrance"}]},
    }

    response = test_client.post("/api/dungeons", json=dungeon)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Dungeon"
    assert "rooms" in data["data"]


def test_delete_dungeon(test_client):
    """Test DELETE /api/dungeons/{id}."""
    dungeon = {"title": "Delete Test", "data": {"rooms": []}}
    response = test_client.post("/api/dungeons", json=dungeon)
    dungeon_id = response.json()["id"]

    response = test_client.delete(f"/api/dungeons/{dungeon_id}")
    assert response.status_code == 204


def test_create_dungeon_db_failure(monkeypatch, test_client):
    """Test POST /api/dungeons when DB commit fails."""
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.post("/api/dungeons", json={"title": "Fail", "data": {}})
    assert response.status_code == 400


def test_delete_dungeon_db_failure(monkeypatch, test_client):
    """Test DELETE /api/dungeons when DB commit fails."""
    response = test_client.post("/api/dungeons", json={"title": "FailDelete", "data": {}})
    dungeon_id = response.json()["id"]
    import backend.app.db as db_module
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/dungeons/{dungeon_id}")
    assert response.status_code == 400
