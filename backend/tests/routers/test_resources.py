"""Tests for remaining CRUD endpoints (weapons, NPCs, quests, encounters, dungeons)."""


# Weapons
def test_list_weapons(test_client):
    """Test GET /api/weapons."""
    response = test_client.get("/api/weapons")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_weapon(test_client):
    """Test POST /api/weapons."""
    weapon = {
        "name": "Test Sword",
        "damage": "1d8",
        "damage_type": "slashing",
    }

    response = test_client.post("/api/weapons", json=weapon)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Sword"


def test_weapon_crud(test_client):
    """Test full weapon CRUD cycle."""
    # Create
    weapon = {"name": "CRUD Weapon", "damage": "1d6"}
    response = test_client.post("/api/weapons", json=weapon)
    weapon_id = response.json()["id"]

    # Read
    response = test_client.get(f"/api/weapons/{weapon_id}")
    assert response.status_code == 200

    # Update
    weapon["name"] = "CRUD Weapon Updated"
    response = test_client.put(f"/api/weapons/{weapon_id}", json=weapon)
    assert response.status_code == 200

    # Delete
    response = test_client.delete(f"/api/weapons/{weapon_id}")
    assert response.status_code == 204


# NPCs
def test_list_npcs(test_client):
    """Test GET /api/npcs."""
    response = test_client.get("/api/npcs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_npc(test_client):
    """Test POST /api/npcs."""
    npc = {"name": "Test NPC", "role": "Innkeeper"}

    response = test_client.post("/api/npcs", json=npc)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test NPC"


def test_npc_crud(test_client):
    """Test full NPC CRUD cycle."""
    npc = {"name": "CRUD NPC"}
    response = test_client.post("/api/npcs", json=npc)
    npc_id = response.json()["id"]

    response = test_client.get(f"/api/npcs/{npc_id}")
    assert response.status_code == 200

    npc["name"] = "CRUD NPC Updated"
    response = test_client.put(f"/api/npcs/{npc_id}", json=npc)
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
    quest = {"title": "Test Quest", "status": "active"}

    response = test_client.post("/api/quests", json=quest)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Quest"


def test_quest_crud(test_client):
    """Test full quest CRUD cycle."""
    quest = {"title": "CRUD Quest"}
    response = test_client.post("/api/quests", json=quest)
    quest_id = response.json()["id"]

    response = test_client.get(f"/api/quests/{quest_id}")
    assert response.status_code == 200

    quest["title"] = "CRUD Quest Updated"
    response = test_client.put(f"/api/quests/{quest_id}", json=quest)
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
    encounter = {"title": "Test Encounter", "difficulty": "Easy"}

    response = test_client.post("/api/encounters", json=encounter)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Encounter"


def test_encounter_crud(test_client):
    """Test full encounter CRUD cycle."""
    encounter = {"title": "CRUD Encounter"}
    response = test_client.post("/api/encounters", json=encounter)
    encounter_id = response.json()["id"]

    response = test_client.get(f"/api/encounters/{encounter_id}")
    assert response.status_code == 200

    encounter["title"] = "CRUD Encounter Updated"
    response = test_client.put(f"/api/encounters/{encounter_id}", json=encounter)
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


def test_dungeon_crud(test_client):
    """Test full dungeon CRUD cycle."""
    dungeon = {"title": "CRUD Dungeon", "data": {"rooms": []}}
    response = test_client.post("/api/dungeons", json=dungeon)
    dungeon_id = response.json()["id"]

    response = test_client.get(f"/api/dungeons/{dungeon_id}")
    assert response.status_code == 200

    dungeon["title"] = "CRUD Dungeon Updated"
    response = test_client.put(f"/api/dungeons/{dungeon_id}", json=dungeon)
    assert response.status_code == 200

    response = test_client.delete(f"/api/dungeons/{dungeon_id}")
    assert response.status_code == 204
