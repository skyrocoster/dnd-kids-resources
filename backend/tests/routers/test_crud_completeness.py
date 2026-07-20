"""Update paths, assignment flows, and error branches for the CRUD routers.

The list/create/delete happy paths live in test_resources.py and test_players.py.
This file locks down the parts most likely to regress as the next stage is built:
PUT/update round-trips, the player<->spell/weapon assignment lifecycle, and the
404/400 error branches every editor UI depends on.
"""

import sqlite3
import backend.app.db as db_module

from unittest.mock import MagicMock


def _raise_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


# ---------------------------------------------------------------------------
# Players: spell & weapon assignment lifecycle
# ---------------------------------------------------------------------------


def _make_player(client, name="Assign Test"):
    resp = client.post("/api/players", json={"name": name, "class_": "Wizard", "level": 3})
    assert resp.status_code == 201
    return resp.json()["id"]


def test_player_spell_assignment_lifecycle(test_client):
    pid = _make_player(test_client, "Spell Assigner")
    spell_id = test_client.get("/api/spells").json()[0]["id"]

    # assign
    assert test_client.post(f"/api/players/{pid}/spells/{spell_id}").status_code == 201
    # appears in the player's spell list
    spells = test_client.get(f"/api/players/{pid}/spells")
    assert spells.status_code == 200
    assert any(s["id"] == spell_id for s in spells.json())
    assert all("name" in spell for spell in spells.json())
    # duplicate assignment is rejected
    assert test_client.post(f"/api/players/{pid}/spells/{spell_id}").status_code == 400
    # remove
    assert test_client.delete(f"/api/players/{pid}/spells/{spell_id}").status_code == 204
    # gone
    assert all(s["id"] != spell_id for s in test_client.get(f"/api/players/{pid}/spells").json())


def test_player_weapon_assignment_lifecycle(test_client):
    pid = _make_player(test_client, "Weapon Assigner")
    weapon_id = test_client.get("/api/weapons").json()[0]["id"]

    assert test_client.post(f"/api/players/{pid}/weapons/{weapon_id}").status_code == 201
    weapons = test_client.get(f"/api/players/{pid}/weapons")
    assert weapons.status_code == 200
    assert any(w["id"] == weapon_id for w in weapons.json())
    assert test_client.post(f"/api/players/{pid}/weapons/{weapon_id}").status_code == 400
    assert test_client.delete(f"/api/players/{pid}/weapons/{weapon_id}").status_code == 204


def test_add_spell_to_player_db_failure(monkeypatch, test_client):
    pid = _make_player(test_client, "Spell Fail")
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.post(f"/api/players/{pid}/spells/{spell_id}")
    assert response.status_code == 400


def test_remove_spell_from_player_db_failure(monkeypatch, test_client):
    pid = _make_player(test_client, "Spell Remove Fail")
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    test_client.post(f"/api/players/{pid}/spells/{spell_id}")
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.delete(f"/api/players/{pid}/spells/{spell_id}")
    assert response.status_code == 400


def test_add_weapon_to_player_db_failure(monkeypatch, test_client):
    pid = _make_player(test_client, "Weapon Fail")
    weapon_id = test_client.get("/api/weapons").json()[0]["id"]
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.post(f"/api/players/{pid}/weapons/{weapon_id}")
    assert response.status_code == 400


def test_remove_weapon_from_player_db_failure(monkeypatch, test_client):
    pid = _make_player(test_client, "Weapon Remove Fail")
    weapon_id = test_client.get("/api/weapons").json()[0]["id"]
    test_client.post(f"/api/players/{pid}/weapons/{weapon_id}")
    monkeypatch.setattr(db_module, "get_conn", _raise_db_failure)
    response = test_client.delete(f"/api/players/{pid}/weapons/{weapon_id}")
    assert response.status_code == 400


def test_player_assignment_404s(test_client):
    pid = _make_player(test_client, "404 Player")
    spell_id = test_client.get("/api/spells").json()[0]["id"]
    weapon_id = test_client.get("/api/weapons").json()[0]["id"]

    # nonexistent player
    assert test_client.get("/api/players/99999/spells").status_code == 404
    assert test_client.get("/api/players/99999/weapons").status_code == 404
    assert test_client.post(f"/api/players/99999/spells/{spell_id}").status_code == 404
    assert test_client.post(f"/api/players/99999/weapons/{weapon_id}").status_code == 404
    # nonexistent spell/weapon on a valid player
    assert test_client.post(f"/api/players/{pid}/spells/99999").status_code == 404
    assert test_client.post(f"/api/players/{pid}/weapons/99999").status_code == 404
    # removing an assignment that isn't there
    assert test_client.delete(f"/api/players/{pid}/spells/{spell_id}").status_code == 404
    assert test_client.delete(f"/api/players/{pid}/weapons/{weapon_id}").status_code == 404


def test_get_player_404(test_client):
    assert test_client.get("/api/players/99999").status_code == 404
    assert test_client.delete("/api/players/99999").status_code == 404
    assert test_client.put("/api/players/99999", json={"name": "X", "level": 1}).status_code == 404


# ---------------------------------------------------------------------------
# Weapons: update + fetch-by-name + 404s
# ---------------------------------------------------------------------------


def test_weapon_update_round_trip(test_client):
    wid = test_client.post("/api/weapons", json={"name": "Upgradeable", "rarity": "common"}).json()["id"]
    resp = test_client.put(
        f"/api/weapons/{wid}",
        json={"name": "Upgraded", "rarity": "rare", "property": ["F"],
              "attack": [{"type": "ranged", "damage": "1d6", "damage_type": "piercing"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Upgraded"
    assert data["rarity"] == "rare"
    assert data["property"] == ["F"]
    assert data["attack"][0]["damage"] == "1d6"


def test_weapon_update_db_failure(monkeypatch, test_client):
    import backend.app.db as db_module
    wid = test_client.post("/api/weapons", json={"name": "Upgradeable", "rarity": "common"}).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    resp = test_client.put(
        f"/api/weapons/{wid}",
        json={"name": "Upgraded", "rarity": "rare", "property": ["F"],
              "attack": [{"type": "ranged", "damage": "1d6", "damage_type": "piercing"}]},
    )
    assert resp.status_code == 400


def test_weapon_get_by_name(test_client):
    resp = test_client.get("/api/weapons/by-name/Longsword")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Longsword"


def test_weapon_404s(test_client):
    assert test_client.get("/api/weapons/99999").status_code == 404
    assert test_client.get("/api/weapons/by-name/NoSuchWeapon").status_code == 404
    assert test_client.put("/api/weapons/99999", json={"name": "X"}).status_code == 404
    assert test_client.delete("/api/weapons/99999").status_code == 404


# ---------------------------------------------------------------------------
# NPCs: update + 404s
# ---------------------------------------------------------------------------


def test_npc_update_round_trip(test_client):
    nid = test_client.post("/api/npcs", json={"name": "Mutable NPC", "race": "Human"}).json()["id"]
    resp = test_client.put(
        f"/api/npcs/{nid}",
        json={"name": "Mutable NPC", "race": "Dwarf", "hit_points": 20,
              "stats": {"strength": 15}, "notes": "grumpy"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["race"] == "Dwarf"
    assert data["hit_points"] == 20
    assert data["stats"] == {"strength": 15}


def test_npc_update_db_failure(monkeypatch, test_client):
    import backend.app.db as db_module
    nid = test_client.post("/api/npcs", json={"name": "Mutable NPC", "race": "Human"}).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    resp = test_client.put(
        f"/api/npcs/{nid}",
        json={"name": "Mutable NPC", "race": "Dwarf", "hit_points": 20,
              "stats": {"strength": 15}, "notes": "grumpy"},
    )
    assert resp.status_code == 400


def test_npc_404s(test_client):
    assert test_client.get("/api/npcs/99999").status_code == 404
    assert test_client.put("/api/npcs/99999", json={"name": "X"}).status_code == 404
    assert test_client.delete("/api/npcs/99999").status_code == 404


# ---------------------------------------------------------------------------
# Encounters: update + 404s
# ---------------------------------------------------------------------------


def test_encounter_update_round_trip(test_client):
    eid = test_client.post(
        "/api/encounters", json={"title": "Mutable Encounter", "creatures": []}
    ).json()["id"]
    resp = test_client.put(
        f"/api/encounters/{eid}",
        json={"title": "Updated Encounter",
              "creatures": [{"monster_id": 1, "name": "Goblin", "hp_current": 7,
                             "hp_max": 7, "ac": 15, "status": "alive", "conditions": []}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Encounter"
    assert data["creatures"][0]["name"] == "Goblin"


def test_encounter_update_db_failure(monkeypatch, test_client):
    import backend.app.db as db_module
    eid = test_client.post(
        "/api/encounters", json={"title": "Mutable Encounter", "creatures": []}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    resp = test_client.put(
        f"/api/encounters/{eid}",
        json={"title": "Updated Encounter",
              "creatures": [{"monster_id": 1, "name": "Goblin", "hp_current": 7,
                             "hp_max": 7, "ac": 15, "status": "alive", "conditions": []}]},
    )
    assert resp.status_code == 400


def test_encounter_404s(test_client):
    assert test_client.get("/api/encounters/99999").status_code == 404
    assert test_client.put("/api/encounters/99999", json={"title": "X", "creatures": []}).status_code == 404
    assert test_client.delete("/api/encounters/99999").status_code == 404


def test_encounter_active_index_round_trip(test_client):
    """active_index (the turn-order pointer) persists on create and update."""
    created = test_client.post(
        "/api/encounters",
        json={"title": "Turn Order Test", "creatures": [], "active_index": 2},
    ).json()
    assert created["active_index"] == 2

    eid = created["id"]
    resp = test_client.put(
        f"/api/encounters/{eid}",
        json={"title": "Turn Order Test", "creatures": [], "active_index": 5},
    )
    assert resp.status_code == 200
    assert resp.json()["active_index"] == 5

    # a legacy row with no active_index set still reads back cleanly as null
    legacy = test_client.post(
        "/api/encounters", json={"title": "Legacy Encounter", "creatures": []}
    ).json()
    assert legacy["active_index"] is None
    assert test_client.get(f"/api/encounters/{legacy['id']}").json()["active_index"] is None


# ---------------------------------------------------------------------------
# Dungeons: update + detail + 404s
# ---------------------------------------------------------------------------


def test_dungeon_update_round_trip(test_client):
    did = test_client.post(
        "/api/dungeons", json={"title": "Mutable Dungeon", "data": {"rooms": []}}
    ).json()["id"]
    resp = test_client.put(
        f"/api/dungeons/{did}",
        json={"title": "Updated Dungeon", "data": {"rooms": [{"id": 1, "name": "Hall"}]}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Dungeon"
    assert data["data"]["rooms"][0]["name"] == "Hall"


def test_dungeon_update_db_failure(monkeypatch, test_client):
    import backend.app.db as db_module
    did = test_client.post(
        "/api/dungeons", json={"title": "Mutable Dungeon", "data": {"rooms": []}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    resp = test_client.put(
        f"/api/dungeons/{did}",
        json={"title": "Updated Dungeon", "data": {"rooms": [{"id": 1, "name": "Hall"}]}},
    )
    assert resp.status_code == 400


def test_dungeon_detail_and_404s(test_client):
    did = test_client.post(
        "/api/dungeons", json={"title": "Detailable", "data": {"rooms": []}}
    ).json()["id"]
    assert test_client.get(f"/api/dungeons/{did}").status_code == 200
    assert test_client.get("/api/dungeons/99999").status_code == 404
    assert test_client.put("/api/dungeons/99999", json={"title": "X", "data": {}}).status_code == 404
    assert test_client.delete("/api/dungeons/99999").status_code == 404
