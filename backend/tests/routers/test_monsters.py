"""Tests for monster endpoints."""

import sqlite3

import pytest
from pydantic import ValidationError

from backend.app.schemas import MonsterCreate


def _monster_payload(name="Tiny Test Drake"):
    return {
        "name": name,
        "aliases": ["test drake"],
        "sizes": ["small"],
        "alignment": "unaligned",
        "creature_type": {"category": "dragon", "tags": ["test"], "swarm_size": None},
        "ac": {"value": 14, "note": "natural armor", "alternatives": []},
        "hp": {"average": 22, "formula": "4d6 + 8"},
        "speed": [{"mode": "walk", "feet": 30, "note": None, "hover": False}],
        "abilities": {"str": 12, "dex": 14, "con": 15, "int": 4, "wis": 11, "cha": 8},
        "saving_throws": {"dex": 4},
        "skills": {"perception": 2},
        "passive_perception": 12,
        "damage_resistances": [{"damage_type": "fire", "note": None, "conditional": False}],
        "condition_immunities": ["frightened"],
        "senses": [{"type": "darkvision", "range": 60, "note": None}],
        "languages": ["Draconic"],
        "features": {
            "traits": [
                {"name": "Keen Smell", "description": "Advantage on smell checks.", "attack": None}
            ],
            "actions": [
                {
                    "name": "Bite",
                    "description": "Melee Weapon Attack: hit for 1d6 + 2 piercing damage.",
                    "attack": {
                        "kind": "melee_weapon",
                        "attack_bonus": 4,
                        "automatic_hit": False,
                        "range_ft": 5,
                        "long_range_ft": None,
                        "targets": 1,
                        "damage": [{"formula": "1d6", "bonus": 2, "damage_types": ["piercing"]}],
                    },
                }
            ],
        },
        "cr": "1/2",
        "experience_points": 100,
    }


def _raise_db_failure(self):
    raise Exception("Simulated database failure")


def _raise_integrity_non_unique(self):
    raise sqlite3.IntegrityError("NOT NULL constraint failed: monsters.name")


def _mock_conn(commit_side_effect):
    from unittest.mock import MagicMock

    conn = MagicMock()
    conn.commit.side_effect = commit_side_effect
    return conn


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


def test_get_monster_by_name_not_found(test_client):
    """Test 404 for a nonexistent monster name."""
    response = test_client.get("/api/monsters/by-name/NoSuchBeast")
    assert response.status_code == 404


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


def test_update_monster_duplicate_name(test_client):
    created = test_client.post("/api/monsters", json=_monster_payload()).json()
    payload = _monster_payload("Owlbear")

    response = test_client.put(f"/api/monsters/{created['id']}", json=payload)

    assert response.status_code == 409


def test_delete_nonexistent_monster_returns_404(test_client):
    """GET/PUT/DELETE on a nonexistent monster all 404."""
    assert test_client.get("/api/monsters/99999").status_code == 404
    assert test_client.put("/api/monsters/99999", json=_monster_payload()).status_code == 404
    assert test_client.delete("/api/monsters/99999").status_code == 404


def test_create_monster(test_client):
    """POST /api/monsters with valid data returns 201 and persists."""
    payload = _monster_payload()

    response = test_client.post("/api/monsters", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == payload["name"]
    assert data["cr_sort"] == 0.5
    assert data["ac"] == payload["ac"]
    assert data["saving_throws"] == {"dex": 4}
    assert data["damage_resistances"][0]["damage_type"] == "fire"
    assert data["features"]["actions"][0]["attack"]["damage"][0]["formula"] == "1d6"

    fetched = test_client.get(f"/api/monsters/{data['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["features"] == data["features"]


def test_create_monster_duplicate(test_client):
    """POST /api/monsters with an existing name returns 409."""
    response = test_client.post("/api/monsters", json=_monster_payload("Owlbear"))
    assert response.status_code == 409


def test_update_monster(test_client):
    """PUT /api/monsters/{id} returns the updated monster."""
    created = test_client.post("/api/monsters", json=_monster_payload()).json()
    payload = _monster_payload("Tiny Test Drake Updated")
    payload["hp"] = {"average": 31, "formula": "6d6 + 10"}
    payload["features"]["actions"][0]["name"] = "Fiery Bite"
    payload["cr"] = "2"

    response = test_client.put(f"/api/monsters/{created['id']}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["name"] == "Tiny Test Drake Updated"
    assert data["hp"]["average"] == 31
    assert data["features"]["actions"][0]["name"] == "Fiery Bite"
    assert data["cr_sort"] == 2.0


@pytest.mark.parametrize(
    ("operation", "use_existing"),
    [
        ("create", False),
        ("update", True),
        ("delete", True),
    ],
)
def test_monster_mutations_db_failure(monkeypatch, test_client, operation, use_existing):
    """DB commit failures map to 400 for create/update/delete."""
    created_id = (
        test_client.post("/api/monsters", json=_monster_payload()).json()["id"]
        if use_existing
        else None
    )
    monkeypatch.setattr(
        "backend.app.db.get_conn",
        lambda: _mock_conn(Exception("Simulated database failure")),
    )
    if operation == "create":
        response = test_client.post("/api/monsters", json=_monster_payload())
    elif operation == "update":
        response = test_client.put(f"/api/monsters/{created_id}", json=_monster_payload())
    else:
        response = test_client.delete(f"/api/monsters/{created_id}")
    assert response.status_code == 400


def test_monster_create_integrity_non_unique(monkeypatch, test_client):
    """Non-unique IntegrityErrors (e.g. NOT NULL) map to 400, not 500."""
    monkeypatch.setattr(
        "backend.app.db.get_conn",
        lambda: _mock_conn(sqlite3.IntegrityError("NOT NULL constraint failed: monsters.name")),
    )
    assert test_client.post("/api/monsters", json=_monster_payload()).status_code == 400


def test_monster_audio_path_device_name_guard():
    with pytest.raises(ValidationError, match="audio_path uses a reserved Windows device name"):
        MonsterCreate(audio_path="con.mp3", name="Test")
    assert MonsterCreate(audio_path="owlbear.mp3", name="Test").audio_path == "owlbear.mp3"
