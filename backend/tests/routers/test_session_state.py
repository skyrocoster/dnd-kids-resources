from unittest.mock import MagicMock
import backend.app.db as db_module


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def test_get_dungeon_session_state_not_found(test_client):
    """GET with no saved session state row for that dungeon returns 404"""
    response = test_client.get("/api/dungeons/999/session-state")
    assert response.status_code == 404


def test_save_and_get_dungeon_session_state(test_client):
    """PUT upserts session state; GET round-trips the same data back"""
    state = {
        "doors": {"1": {"isOpen": True, "isLocked": False, "trapDisarmed": False}},
        "stairs": {},
        "portals": {},
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": state})
    assert put_response.status_code == 200
    assert put_response.json()["data"] == state

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == state


def test_save_dungeon_session_state_upserts_on_second_call(test_client):
    """A second PUT for the same dungeon_id replaces the row rather than conflicting"""
    first = {"doors": {}, "stairs": {}, "portals": {}}
    second = {"doors": {"1": {"isOpen": True, "isLocked": False, "trapDisarmed": False}}, "stairs": {}, "portals": {}}

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state upsert test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": first})
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": second})
    assert put_response.status_code == 200

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
    assert get_response.json()["data"] == second


def test_save_dungeon_session_state_requires_existing_dungeon(test_client):
    response = test_client.put("/api/dungeons/999/session-state", json={"data": {}})
    assert response.status_code == 404


def test_deleting_dungeon_removes_its_session_state(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state cleanup test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": {}})

    assert test_client.delete(f"/api/dungeons/{dungeon_id}").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404


def test_save_session_state_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state DB Fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": {}})
    assert response.status_code == 400


def test_reset_dungeon_session_state_when_row_exists(test_client):
    """DELETE on the session-state resource removes an existing row and returns 204"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state reset test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": {"doors": {}, "stairs": {}, "portals": {}}})

    response = test_client.delete(f"/api/dungeons/{dungeon_id}/session-state")
    assert response.status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404


def test_reset_dungeon_session_state_when_no_row_exists(test_client):
    """Resetting a dungeon already at its authored defaults (no saved row) is not an error"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state reset no-op test", "data": {}}
    ).json()["id"]

    response = test_client.delete(f"/api/dungeons/{dungeon_id}/session-state")
    assert response.status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404
