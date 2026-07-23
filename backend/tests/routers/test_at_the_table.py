def test_get_at_the_table_returns_null_when_nothing_set(test_client):
    """GET /at-the-table returns dungeon_id: null when no row exists"""
    response = test_client.get("/api/at-the-table")
    assert response.status_code == 200
    assert response.json() == {"dungeon_id": None}


def test_put_sets_dungeon_and_get_returns_it(test_client):
    """PUT sets a dungeon; GET returns it"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "At table test", "data": {}}
    ).json()["id"]

    put_response = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_id})
    assert put_response.status_code == 200
    assert put_response.json() == {"dungeon_id": dungeon_id}

    get_response = test_client.get("/api/at-the-table")
    assert get_response.status_code == 200
    assert get_response.json() == {"dungeon_id": dungeon_id}


def test_put_to_nonexistent_dungeon_returns_404(test_client):
    """PUT with a dungeon_id that doesn't exist returns 404"""
    response = test_client.put("/api/at-the-table", json={"dungeon_id": 999})
    assert response.status_code == 404


def test_put_changes_to_different_dungeon_and_get_reflects_change(test_client):
    """PUT a second dungeon overwrites the first"""
    dungeon_1 = test_client.post(
        "/api/dungeons", json={"title": "At table change 1", "data": {}}
    ).json()["id"]
    dungeon_2 = test_client.post(
        "/api/dungeons", json={"title": "At table change 2", "data": {}}
    ).json()["id"]

    test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_1})
    test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_2})

    get_response = test_client.get("/api/at-the-table")
    assert get_response.status_code == 200
    assert get_response.json() == {"dungeon_id": dungeon_2}


def test_put_twice_same_dungeon_is_not_a_conflict(test_client):
    """PUT with the same dungeon twice does not error (single-row upsert works)"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "At table dup test", "data": {}}
    ).json()["id"]

    response_1 = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_id})
    assert response_1.status_code == 200

    response_2 = test_client.put("/api/at-the-table", json={"dungeon_id": dungeon_id})
    assert response_2.status_code == 200
    assert response_2.json() == {"dungeon_id": dungeon_id}
