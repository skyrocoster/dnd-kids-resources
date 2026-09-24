import backend.app.db as db_module
from backend.tests.conftest import db_failure_conn


def test_save_get_and_upsert_dungeon_session_state(test_client):
    """PUT upserts session state (second PUT replaces), GET round-trips, missing dungeon 404s"""
    assert test_client.get("/api/dungeons/999/session-state").status_code == 404
    assert test_client.put("/api/dungeons/999/session-state", json={"data": {}}).status_code == 404

    state = {
        "doors": {"1": {"open": False}},
        "stairs": {"2": {"open": True}},
        "props": {"3": {"obstacles": {"lock": {"armed": False}, "trap": {"shown": True}}}},
        "portals": {"4": {"open": False}},
        "partyRoomId": 6,
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state", json={"data": state}
    )
    assert put_response.status_code == 200
    assert put_response.json()["data"] == state

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == state

    second = {"doors": {"1": {"open": True}}}
    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state", json={"data": second}
    )
    assert put_response.status_code == 200
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").json()["data"] == second


def test_save_dungeon_session_state_prunes_invalid_and_dc_leaves(test_client):
    """PUT keeps only open / obstacle armed / obstacle shown / partyRoomId; DCs, geometry,
    identity, descriptive fields, and unknown keys are stripped from the saved payload"""
    state = {
        "doors": {
            "1": {
                "open": False,
                "isOpen": True,
                "isLocked": False,
                "trapDisarmed": False,
                "door_id": 1,
                "cell": [8, 4],
                "z": 0,
                "title": "Oak Door",
            }
        },
        "props": {
            "17": {
                "kind": "chest",
                "prop_id": 17,
                "cell": [8, 4],
                "title": "Oak Chest",
                "obstacles": {
                    "lock": {"armed": False, "breakDc": 15, "pickDc": 12},
                    "trap": {"shown": True, "disarmDc": 14},
                    "concealment": {"armed": True, "perceptionDc": 13},
                },
            }
        },
        "stairs": {"3": {"open": False, "notes": "secret stair"}},
        "portals": {"4": {"open": True, "destinations": ["5"]}},
        "partyRoomId": 6,
        "strayTopLevelKey": "nope",
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state prune test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state", json={"data": state}
    )
    assert put_response.status_code == 200
    assert put_response.json()["data"] == {
        "doors": {"1": {"open": False}},
        "props": {
            "17": {
                "obstacles": {
                    "lock": {"armed": False},
                    "trap": {"shown": True},
                    "concealment": {"armed": True},
                }
            }
        },
        "stairs": {"3": {"open": False}},
        "portals": {"4": {"open": True}},
        "partyRoomId": 6,
    }

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
    assert get_response.json()["data"] == put_response.json()["data"]


def test_save_dungeon_session_state_deletes_row_when_normalized_empty(test_client):
    """PUT whose content normalizes away returns normalized empty data and leaves GET at 404"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state empty test", "data": {}}
    ).json()["id"]
    test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state",
        json={"data": {"doors": {"1": {"open": True}}}},
    )
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 200

    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state",
        json={"data": {"doors": {"1": {"isOpen": True}}, "partyRoomId": None}},
    )
    assert put_response.status_code == 200
    assert put_response.json()["data"] == {}
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404


def test_deleting_dungeon_removes_its_session_state(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state cleanup test", "data": {}}
    ).json()["id"]
    test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state",
        json={"data": {"doors": {"1": {"open": True}}}},
    )

    assert test_client.delete(f"/api/dungeons/{dungeon_id}").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404


def test_save_session_state_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state DB Fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    response = test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": {}})
    assert response.status_code == 400


def test_reset_dungeon_session_state(test_client):
    """DELETE removes an existing row; resetting with no row is a no-op."""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Session state reset test", "data": {}}
    ).json()["id"]

    # No row yet: reset is a no-op success
    assert test_client.delete(f"/api/dungeons/{dungeon_id}/session-state").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404

    test_client.put(
        f"/api/dungeons/{dungeon_id}/session-state",
        json={"data": {"doors": {"1": {"open": False}}}},
    )
    assert test_client.delete(f"/api/dungeons/{dungeon_id}/session-state").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/session-state").status_code == 404
