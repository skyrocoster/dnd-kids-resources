from unittest.mock import MagicMock
import backend.app.db as db_module


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def test_get_dungeon_knowledge_not_found(test_client):
    """GET with no saved knowledge row for that dungeon returns 404"""
    response = test_client.get("/api/dungeons/999/knowledge")
    assert response.status_code == 404


def test_save_and_get_dungeon_knowledge(test_client):
    """PUT upserts knowledge; GET round-trips the same data back"""
    knowledge = {
        "monsters": {"goblin_king": {"exists": True}},
        "doors": {"secret_entrance": {"lock": "riddle_of_water"}},
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": knowledge})
    assert put_response.status_code == 200
    assert put_response.json()["data"] == knowledge

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/knowledge")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == knowledge


def test_save_dungeon_knowledge_replaces_on_second_put(test_client):
    """A second PUT replaces the document — both adding and clearing independent fact keys"""
    first = {
        "traps": {"pit_1": {"exists": True}},
        "notes": {"lore": "ancient tomb"},
    }
    second = {
        "traps": {"pit_1": {"exists": False}},  # changed from True to False
        "monsters": {"goblin_king": {"exists": True}},  # new key group added
        # "notes" key cleared entirely
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge replacement test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": first})
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": second})
    assert put_response.status_code == 200

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/knowledge")
    assert get_response.json()["data"] == second


def test_save_dungeon_knowledge_requires_existing_dungeon(test_client):
    response = test_client.put("/api/dungeons/999/knowledge", json={"data": {}})
    assert response.status_code == 404


def test_deleting_dungeon_removes_its_knowledge(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge cleanup test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": {}})

    assert test_client.delete(f"/api/dungeons/{dungeon_id}").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/knowledge").status_code == 404


def test_save_knowledge_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge DB Fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": {}})
    assert response.status_code == 400


def test_reset_dungeon_knowledge_when_row_exists(test_client):
    """DELETE on the knowledge resource removes an existing row and returns 204"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge reset test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/knowledge", json={"data": {"traps": {}, "monsters": {}}})

    response = test_client.delete(f"/api/dungeons/{dungeon_id}/knowledge")
    assert response.status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/knowledge").status_code == 404


def test_reset_dungeon_knowledge_when_no_row_exists(test_client):
    """Resetting a dungeon with no saved knowledge row is not an error"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Knowledge reset no-op test", "data": {}}
    ).json()["id"]

    response = test_client.delete(f"/api/dungeons/{dungeon_id}/knowledge")
    assert response.status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/knowledge").status_code == 404
