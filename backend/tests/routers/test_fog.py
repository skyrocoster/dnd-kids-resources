def test_get_revealed_cells_not_found_is_empty_list(test_client):
    """GET with no cells revealed for a nonexistent dungeon returns empty cells, not 404"""
    response = test_client.get("/api/dungeons/999/revealed-cells")
    assert response.status_code == 200
    assert response.json() == {"cells": []}


def test_get_revealed_cells_empty_for_fresh_dungeon(test_client):
    """A freshly created dungeon has no revealed cells"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Fog test", "data": {}}
    ).json()["id"]
    response = test_client.get(f"/api/dungeons/{dungeon_id}/revealed-cells")
    assert response.status_code == 200
    assert response.json() == {"cells": []}


def test_put_reveals_cells_and_get_returns_union(test_client):
    """PUT reveals cells; GET round-trips the same set back"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Fog reveal test", "data": {}}
    ).json()["id"]

    cells = [{"x": 0, "y": 0}, {"x": 1, "y": 2}, {"x": 3, "y": 4}]
    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/revealed-cells", json={"cells": cells}
    )
    assert put_response.status_code == 200
    assert put_response.json() == {"cells": cells}

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/revealed-cells")
    assert get_response.status_code == 200
    assert get_response.json() == {"cells": cells}


def test_put_duplicate_cells_returns_set_without_duplicates(test_client):
    """PUT with duplicate cells still returns the exact revealed set (no dupes, no error)"""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Fog dupes test", "data": {}}
    ).json()["id"]

    put_response = test_client.put(
        f"/api/dungeons/{dungeon_id}/revealed-cells",
        json={"cells": [{"x": 0, "y": 0}, {"x": 0, "y": 0}, {"x": 1, "y": 1}]},
    )
    assert put_response.status_code == 200
    assert put_response.json() == {"cells": [{"x": 0, "y": 0}, {"x": 1, "y": 1}]}


def test_put_to_nonexistent_dungeon_returns_404(test_client):
    """PUT to a dungeon that does not exist returns 404"""
    response = test_client.put(
        "/api/dungeons/999/revealed-cells", json={"cells": [{"x": 0, "y": 0}]}
    )
    assert response.status_code == 404
