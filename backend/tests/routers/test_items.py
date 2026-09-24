import pytest

import backend.app.db as db_module
from backend.tests.conftest import db_failure_conn

_PAYLOAD = {
    "name": "Audit Ruby",
    "value_gp": 50.5,
    "category": "gem",
    "description": "A polished red gemstone.",
}


def test_item_crud_and_seed_catalog(test_client, real_client):
    """CRUD lifecycle on the curated test DB; seeded catalog visible on the real DB."""
    created = test_client.post("/api/items", json=_PAYLOAD)
    assert created.status_code == 201
    item = created.json()
    assert item == {"id": item["id"], **_PAYLOAD}

    updated = test_client.put(
        f"/api/items/{item['id']}",
        json={**_PAYLOAD, "name": "Star Ruby", "value_gp": 75},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Star Ruby"
    assert updated.json()["value_gp"] == 75

    assert test_client.delete(f"/api/items/{item['id']}").status_code == 204
    assert test_client.get(f"/api/items/{item['id']}").status_code == 404

    real = real_client.get("/api/items")
    assert real.status_code == 200
    items_by_name = {i["name"]: i for i in real.json()}
    assert {"Potion of Healing", "Ruby", "Silk Rope"} <= set(items_by_name)
    assert items_by_name["Ruby"]["value_gp"] == 50
    assert items_by_name["Silk Rope"]["category"] == "gear"

    unknown = {"name": "Missing", "value_gp": 0}
    assert test_client.get("/api/items/9999").status_code == 404
    assert test_client.put("/api/items/9999", json=unknown).status_code == 404
    assert test_client.delete("/api/items/9999").status_code == 404


@pytest.mark.parametrize(
    ("operation", "expected"), [("create", 500), ("update", 500), ("delete", 500)]
)
def test_item_mutations_db_failure(monkeypatch, test_client, operation, expected):
    """Items lack the shared except-handler that maps DB failures to 400, so
    create/update/delete DB failures surface as 500 — locked here as-is."""
    item_id = test_client.post("/api/items", json=_PAYLOAD).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    if operation == "create":
        response = test_client.post("/api/items", json=_PAYLOAD)
    elif operation == "update":
        response = test_client.put(f"/api/items/{item_id}", json=_PAYLOAD)
    else:
        response = test_client.delete(f"/api/items/{item_id}")
    assert response.status_code == expected
