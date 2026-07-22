from unittest.mock import MagicMock
import backend.app.db as db_module


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def test_get_dungeon_layout_not_found(test_client):
    """GET with no saved layout row for that dungeon returns 404"""
    response = test_client.get("/api/dungeons/999/layout")
    assert response.status_code == 404


def test_save_and_get_dungeon_layout(test_client):
    """PUT upserts a layout; GET round-trips the same data back"""
    layout = {
        "meta": {"cellSizeFt": 5, "padding": 3},
        "rooms": [{"room_id": 1, "z": 0, "origin": [0, 0], "cells": [[0, 0]]}],
        "doors": [],
        "stairs": [],
        "floors": [{"z": 0, "title": "Ground Floor"}],
        "items": [],
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": layout})
    assert put_response.status_code == 200
    assert put_response.json()["data"] == layout

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/layout")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == layout


def test_save_dungeon_layout_upserts_on_second_call(test_client):
    """A second PUT for the same dungeon_id replaces the row rather than conflicting"""
    first = {"meta": {"cellSizeFt": 5, "padding": 3}, "rooms": [], "doors": [], "stairs": [], "floors": [], "items": []}
    second = {**first, "rooms": [{"room_id": 1, "z": 0, "origin": [0, 0], "cells": [[0, 0]]}]}

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout upsert test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": first})
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": second})
    assert put_response.status_code == 200

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/layout")
    assert get_response.json()["data"] == second


def test_save_dungeon_layout_requires_existing_dungeon(test_client):
    response = test_client.put("/api/dungeons/999/layout", json={"data": {}})
    assert response.status_code == 404


def test_deleting_dungeon_removes_its_layout(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout cleanup test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": {}})

    assert test_client.delete(f"/api/dungeons/{dungeon_id}").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/layout").status_code == 404


def test_incoming_gateways_finds_portal_from_other_dungeon(test_client):
    """A portal in dungeon A pointing at dungeon B shows up in B's incoming-gateways list"""
    dungeon_a = test_client.post(
        "/api/dungeons", json={"title": "The Castle", "data": {}}
    ).json()["id"]
    dungeon_b = test_client.post(
        "/api/dungeons", json={"title": "The Sewers", "data": {}}
    ).json()["id"]

    layout_a = {
        "meta": {"cellSizeFt": 5, "padding": 3},
        "rooms": [],
        "doors": [],
        "stairs": [],
        "floors": [],
        "items": [],
        "portals": [
            {
                "portal_id": 1,
                "cell": [2, 9],
                "z": 0,
                "title": "Trapdoor",
                "to": {"z": 0, "cell": [0, 0], "dungeon_id": dungeon_b},
            }
        ],
    }
    test_client.put(f"/api/dungeons/{dungeon_a}/layout", json={"data": layout_a})
    test_client.put(f"/api/dungeons/{dungeon_b}/layout", json={"data": {}})

    response = test_client.get(f"/api/dungeons/{dungeon_b}/incoming-gateways")
    assert response.status_code == 200
    gateways = response.json()
    assert len(gateways) == 1
    assert gateways[0]["dungeon_id"] == dungeon_a
    assert gateways[0]["dungeon_title"] == "The Castle"
    assert gateways[0]["portal_id"] == 1
    assert gateways[0]["title"] == "Trapdoor"
    assert gateways[0]["z"] == 0
    assert gateways[0]["cell"] == [2, 9]


def test_incoming_gateways_empty_when_none_link_here(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Isolated Keep", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": {}})

    response = test_client.get(f"/api/dungeons/{dungeon_id}/incoming-gateways")
    assert response.status_code == 200
    assert response.json() == []


def test_incoming_gateways_404_for_nonexistent_dungeon(test_client):
    response = test_client.get("/api/dungeons/999/incoming-gateways")
    assert response.status_code == 404


def test_save_layout_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout DB Fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": {}})
    assert response.status_code == 400
