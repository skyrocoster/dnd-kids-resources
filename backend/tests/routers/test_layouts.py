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

    put_response = test_client.put("/api/dungeons/4/layout", json={"data": layout})
    assert put_response.status_code == 200
    assert put_response.json()["data"] == layout

    get_response = test_client.get("/api/dungeons/4/layout")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == layout


def test_save_dungeon_layout_upserts_on_second_call(test_client):
    """A second PUT for the same dungeon_id replaces the row rather than conflicting"""
    first = {"meta": {"cellSizeFt": 5, "padding": 3}, "rooms": [], "doors": [], "stairs": [], "floors": [], "items": []}
    second = {**first, "rooms": [{"room_id": 1, "z": 0, "origin": [0, 0], "cells": [[0, 0]]}]}

    test_client.put("/api/dungeons/5/layout", json={"data": first})
    put_response = test_client.put("/api/dungeons/5/layout", json={"data": second})
    assert put_response.status_code == 200

    get_response = test_client.get("/api/dungeons/5/layout")
    assert get_response.json()["data"] == second
