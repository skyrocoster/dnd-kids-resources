"""Tests for player CRUD and nested spell/weapon endpoints."""

import sqlite3

import pytest

import backend.app.db as db_module
from backend.tests.conftest import db_failure_conn


def test_player_crud_lifecycle(test_client):
    created = test_client.post(
        "/api/players", json={"name": "Lifecycle", "class_": "Wizard", "level": 2}
    )
    assert created.status_code == 201
    player_id = created.json()["id"]

    fetched = test_client.get(f"/api/players/{player_id}")
    assert fetched.status_code == 200
    assert fetched.json()["class_"] == "Wizard"

    listed = test_client.get("/api/players")
    assert listed.status_code == 200
    assert next(p for p in listed.json() if p["name"] == "Lifecycle")["class_"] == "Wizard"

    updated = test_client.put(
        f"/api/players/{player_id}", json={"name": "Lifecycle", "class_": "Wizard", "level": 5}
    )
    assert updated.status_code == 200
    assert updated.json()["level"] == 5

    assert test_client.delete(f"/api/players/{player_id}").status_code == 204
    assert test_client.get(f"/api/players/{player_id}").status_code == 404


@pytest.mark.parametrize("operation", ["create", "update", "delete"])
def test_player_mutations_db_failure(monkeypatch, test_client, operation):
    player_id = test_client.post(
        "/api/players", json={"name": "DB Fail", "class_": "Wizard", "level": 2}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    if operation == "create":
        response = test_client.post(
            "/api/players", json={"name": "Fail", "class_": "Wizard", "level": 1}
        )
    elif operation == "update":
        response = test_client.put(
            f"/api/players/{player_id}", json={"name": "DB Fail", "class_": "Wizard", "level": 5}
        )
    else:
        response = test_client.delete(f"/api/players/{player_id}")
    assert response.status_code == 400


def test_get_player_spells(test_client):
    """Test GET /api/players/{id}/spells."""
    assert test_client.get("/api/players/spellbook").json() == []

    new_player = {
        "name": "Spellcaster",
        "class_": "Wizard",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    # Get available spells
    response = test_client.get("/api/spells?limit=1")
    spells = response.json()
    if spells:
        spell_id = spells[0]["id"]

        # Assign spell to player
        response = test_client.post(f"/api/players/{player_id}/spells/{spell_id}")
        assert response.status_code == 201

        # Get player spells
        response = test_client.get(f"/api/players/{player_id}/spells")
        assert response.status_code == 200
        player_spells = response.json()
        player_spell = next(s for s in player_spells if s["id"] == spell_id)
        assert "quick_rules" in player_spell
        assert player_spell["quick_rules"] == spells[0]["quick_rules"]
        assert isinstance(player_spell["categories"], list)
        assert all("name" in spell for spell in player_spells)

        spellbook = test_client.get("/api/players/spellbook")
        assert spellbook.status_code == 200
        assert spellbook.json()[0]["id"] == player_id
        assert spellbook.json()[0]["spells"][0]["id"] == spell_id


def test_create_player_preserves_structured_fields(test_client):
    """Nested abilities/slots/ac/hp dicts must survive create, update, and get."""
    new_player = {
        "name": "Structured Test",
        "class_": "Fighter",
        "level": 3,
        "abilities": {"str": 16, "dex": 12, "con": 14, "int": 10, "wis": 8, "cha": 13},
        "max_spell_slots": {"1": 2, "2": 1},
    }
    created = test_client.post("/api/players", json=new_player)
    assert created.status_code == 201
    player_id = created.json()["id"]
    assert created.json()["abilities"] == new_player["abilities"]
    assert created.json()["max_spell_slots"] == {"1": 2, "2": 1}

    updated = test_client.put(
        f"/api/players/{player_id}",
        json={
            **new_player,
            "ac": {"value": 16, "note": "chain mail"},
            "hp": {"average": 28, "formula": "4d10+8"},
        },
    )
    assert updated.status_code == 200
    assert updated.json()["ac"] == {"value": 16, "note": "chain mail", "alternatives": []}
    assert updated.json()["hp"] == {"average": 28, "formula": "4d10+8"}

    fetched = test_client.get(f"/api/players/{player_id}")
    assert fetched.json()["abilities"] == new_player["abilities"]
    assert fetched.json()["max_spell_slots"] == {"1": 2, "2": 1}


def test_get_player_detail(test_client):
    """Test GET /api/players/{id}/detail returns player with spells and weapons."""
    new_player = {
        "name": "Detail Test",
        "class_": "Wizard",
        "level": 5,
    }

    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    if spells:
        spell_id = spells[0]["id"]
        test_client.post(f"/api/players/{player_id}/spells/{spell_id}")

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    if weapons:
        weapon_id = weapons[0]["id"]
        test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

    response = test_client.get(f"/api/players/{player_id}/detail")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == player_id
    assert "spells" in data
    assert "weapons" in data
    assert isinstance(data["spells"], list)
    assert isinstance(data["weapons"], list)

    if spells:
        assert data["spells"][0]["id"] == spells[0]["id"]
        assert isinstance(data["spells"][0]["categories"], list)
    if weapons:
        assert data["weapons"][0]["id"] == weapons[0]["id"]


def test_replace_player_spells(test_client):
    """Test PUT /api/players/{id}/spells replaces all spell assignments."""
    new_player = {"name": "Replace Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=2")
    spells = spells_resp.json()
    assert len(spells) >= 2
    spell_ids = [s["id"] for s in spells]

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": spell_ids},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    returned_ids = {s["id"] for s in data}
    assert returned_ids == set(spell_ids)

    get_resp = test_client.get(f"/api/players/{player_id}/spells")
    assert get_resp.status_code == 200
    get_ids = {s["id"] for s in get_resp.json()}
    assert get_ids == set(spell_ids)


def test_replace_player_spells_empty(test_client):
    """Test PUT /api/players/{id}/spells with empty list removes all spells."""
    new_player = {"name": "Empty Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    if spells:
        test_client.post(f"/api/players/{player_id}/spells/{spells[0]['id']}")

    response = test_client.put(
        f"/api/players/{player_id}/spells",
        json={"spell_ids": []},
    )
    assert response.status_code == 200
    data = response.json()
    assert data == []

    get_resp = test_client.get(f"/api/players/{player_id}/spells")
    assert get_resp.json() == []


@pytest.mark.parametrize("kind", ["spells", "weapons"])
def test_replace_player_assignments_lifecycle(test_client, kind):
    """PUT /api/players/{id}/{kind} replaces assignments; empty clears them."""
    player_id = test_client.post(
        "/api/players", json={"name": f"Replace {kind}", "class_": "Wizard", "level": 5}
    ).json()["id"]

    resources = []
    for n in (1, 2):
        payload = {
            "weapons": {
                "name": f"Replace Weapon {n}",
                "rarity": "common",
                "quick_rules": (
                    "Attack +{weapon_attack_bonus}, deal 1d8 slashing damage "
                    "+{weapon_damage_bonus}."
                ),
            },
        }.get(
            kind,
            {
                "name": f"Replace Spell {n}",
                "level": 1,
                "description": "Replace test.",
                "quick_rules": "Replace test.",
                "range": "Self",
                "duration": "Instantaneous",
                "concentration": False,
                "ritual": False,
            },
        )
        created = test_client.post(f"/api/{kind}", json=payload)
        assert created.status_code == 201, created.text
        resources.append(created.json())
    resource_ids = [r["id"] for r in resources]

    response = test_client.put(
        f"/api/players/{player_id}/{kind}",
        json={f"{kind[:-1]}_ids": resource_ids},
    )
    assert response.status_code == 200
    returned_ids = {r["id"] for r in response.json()}
    assert returned_ids == set(resource_ids)

    get_resp = test_client.get(f"/api/players/{player_id}/{kind}")
    assert {r["id"] for r in get_resp.json()} == set(resource_ids)

    cleared = test_client.put(f"/api/players/{player_id}/{kind}", json={f"{kind[:-1]}_ids": []})
    assert cleared.status_code == 200
    assert cleared.json() == []
    assert test_client.get(f"/api/players/{player_id}/{kind}").json() == []


@pytest.mark.parametrize("kind", ["spells", "weapons"])
def test_replace_player_assignments_error_paths(test_client, kind):
    """PUT /api/players/{id}/{kind} rejects nonexistent player, duplicate ids, unknown ids."""
    player = test_client.post(
        "/api/players", json={"name": f"Err {kind}", "class_": "Wizard"}
    ).json()
    resource_id = test_client.get(f"/api/{kind}?limit=1").json()[0]["id"]
    field = f"{kind[:-1]}_ids"

    assert test_client.put(f"/api/players/99999/{kind}", json={field: [1]}).status_code == 404
    assert (
        test_client.put(
            f"/api/players/{player['id']}/{kind}", json={field: [resource_id, resource_id]}
        ).status_code
        == 400
    )
    assert (
        test_client.put(f"/api/players/{player['id']}/{kind}", json={field: [99999]}).status_code
        == 400
    )


def test_delete_player_cleans_junction(test_client, test_db_path):
    """Deleting a player removes junction rows but preserves catalog records."""
    new_player = {"name": "Cascade Test", "class_": "Wizard", "level": 5}
    response = test_client.post("/api/players", json=new_player)
    player_id = response.json()["id"]

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    assert spells
    spell_id = spells[0]["id"]
    test_client.post(f"/api/players/{player_id}/spells/{spell_id}")

    weapons_resp = test_client.get("/api/weapons?limit=1")
    weapons = weapons_resp.json()
    assert weapons
    weapon_id = weapons[0]["id"]
    test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

    test_client.delete(f"/api/players/{player_id}")

    spell_resp = test_client.get(f"/api/spells/{spell_id}")
    assert spell_resp.status_code == 200

    weapon_resp = test_client.get(f"/api/weapons/{weapon_id}")
    assert weapon_resp.status_code == 200

    conn = sqlite3.connect(test_db_path)
    try:
        cur = conn.execute("SELECT COUNT(*) FROM player_spells WHERE player_id = ?", (player_id,))
        assert cur.fetchone()[0] == 0
        cur = conn.execute("SELECT COUNT(*) FROM player_weapons WHERE player_id = ?", (player_id,))
        assert cur.fetchone()[0] == 0
    finally:
        conn.close()


def test_delete_player_preserves_other_players_spells(test_client):
    """Deleting a player does not remove spells shared by another player."""
    player1 = test_client.post(
        "/api/players", json={"name": "Shared A", "class_": "Wizard", "level": 5}
    ).json()
    player2 = test_client.post(
        "/api/players", json={"name": "Shared B", "class_": "Wizard", "level": 5}
    ).json()

    spells_resp = test_client.get("/api/spells?limit=1")
    spells = spells_resp.json()
    assert spells
    spell_id = spells[0]["id"]

    test_client.post(f"/api/players/{player1['id']}/spells/{spell_id}")
    test_client.post(f"/api/players/{player2['id']}/spells/{spell_id}")

    test_client.delete(f"/api/players/{player1['id']}")

    spells2_resp = test_client.get(f"/api/players/{player2['id']}/spells")
    assert spells2_resp.status_code == 200
    player2_spells = spells2_resp.json()
    assert any(s["id"] == spell_id for s in player2_spells)
