"""Tests for CRUD endpoints (weapons, NPCs, quests, encounters, dungeons)."""


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


# NPCs
def test_list_npcs(test_client):
    """Test GET /api/npcs."""
    response = test_client.get("/api/npcs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_npc(test_client):
    """Test POST /api/npcs."""
    npc = {"name": "Test NPC"}

    response = test_client.post("/api/npcs", json=npc)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test NPC"


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


# Quests
def test_list_quests(test_client):
    """Test GET /api/quests."""
    response = test_client.get("/api/quests")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_quest(test_client):
    """Test POST /api/quests."""
    quest = {"title": "Test Quest", "description": "A test quest", "reward": "100 gp"}

    response = test_client.post("/api/quests", json=quest)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Quest"


def test_quest_crud(test_client):
    """Test full quest CRUD."""
    quest = {"title": "CRUD Test", "description": "Test", "reward": "50 gp"}
    response = test_client.post("/api/quests", json=quest)
    assert response.status_code == 201
    quest_id = response.json()["id"]

    response = test_client.get(f"/api/quests/{quest_id}")
    assert response.status_code == 200

    response = test_client.delete(f"/api/quests/{quest_id}")
    assert response.status_code == 204


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
