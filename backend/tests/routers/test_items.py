def test_list_items_starts_empty_in_curated_database(test_client):
    response = test_client.get("/api/items")

    assert response.status_code == 200
    assert response.json() == []


def test_list_items_returns_real_seed_catalog(real_client):
    response = real_client.get("/api/items")

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == [
        "Potion of Healing",
        "Ruby",
        "Silk Rope",
    ]


def test_item_crud_allows_duplicate_names(test_client):
    payload = {
        "name": "Ruby",
        "value_gp": 50.5,
        "category": "gem",
        "description": "A polished red gemstone.",
    }
    created = test_client.post("/api/items", json=payload)

    assert created.status_code == 201
    item = created.json()
    assert item == {"id": item["id"], **payload}

    duplicate = test_client.post("/api/items", json={**payload, "value_gp": 500})
    assert duplicate.status_code == 201

    updated = test_client.put(
        f"/api/items/{item['id']}",
        json={**payload, "name": "Star Ruby", "value_gp": 75},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Star Ruby"
    assert updated.json()["value_gp"] == 75

    assert test_client.delete(f"/api/items/{item['id']}").status_code == 204
    assert test_client.get(f"/api/items/{item['id']}").status_code == 404


def test_item_mutations_return_not_found_for_unknown_item(test_client):
    payload = {"name": "Missing", "value_gp": 0}

    assert test_client.get("/api/items/9999").status_code == 404
    assert test_client.put("/api/items/9999", json=payload).status_code == 404
    assert test_client.delete("/api/items/9999").status_code == 404
