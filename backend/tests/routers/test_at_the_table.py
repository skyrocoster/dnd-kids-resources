import pytest

import backend.app.db as db_module

from backend.tests.conftest import db_failure_conn


def test_get_at_the_table_returns_null_when_nothing_set(test_client):
    """GET /at-the-table returns dungeon_id: null when no row exists"""
    response = test_client.get("/api/at-the-table")
    assert response.status_code == 200
    assert response.json() == {"dungeon_id": None}


def test_put_upsert_lifecycle(test_client):
    """PUT sets, overwrites, and re-putting the same dungeon is not a conflict."""
    dungeon_1 = test_client.post(
        "/api/dungeons", json={"title": "At table change 1", "data": {}}
    ).json()["id"]
    dungeon_2 = test_client.post(
        "/api/dungeons", json={"title": "At table change 2", "data": {}}
    ).json()["id"]

    first_put = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_1})
    assert first_put.status_code == 200
    assert first_put.json() == {"dungeon_id": dungeon_1}

    second_put = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_2})
    assert second_put.status_code == 200

    repeat_put = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_2})
    assert repeat_put.status_code == 200
    assert repeat_put.json() == {"dungeon_id": dungeon_2}

    get_response = test_client.get("/api/at-the-table")
    assert get_response.status_code == 200
    assert get_response.json() == {"dungeon_id": dungeon_2}


def test_put_to_nonexistent_dungeon_returns_404(test_client):
    """PUT with a dungeon_id that doesn't exist returns 404"""
    response = test_client.put("/api/at-the-table", json={"dungeon_id": 999})
    assert response.status_code == 404


def test_put_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "At table fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    assert test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_id}).status_code == 400
