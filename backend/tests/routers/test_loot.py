from unittest.mock import MagicMock
import backend.app.db as db_module


def _mock_db_failure():
    conn = MagicMock()
    conn.commit.side_effect = Exception("Simulated database failure")
    return conn


def test_list_loot_bundles_returns_real_seed_bundle(real_client):
    response = real_client.get("/api/loot-bundles")

    assert response.status_code == 200
    bundles_by_name = {bundle["name"]: bundle for bundle in response.json()}
    assert "Bandit Captain's Cache" in bundles_by_name
    assert bundles_by_name["Bandit Captain's Cache"] == {
        "id": 1,
        "name": "Bandit Captain's Cache",
        "gold": 12.5,
        "contents": [
            {
                "kind": "item",
                "ref_id": 1,
                "name": "Ruby",
                "value_gp": 50,
                "category": "gem",
                "quantity": 2,
            },
            {
                "kind": "weapon",
                "ref_id": 1,
                "name": "+1 Moon Sickle",
                "value_gp": None,
                "quantity": 1,
            },
        ],
    }


def test_loot_bundle_crud_round_trips_mixed_snapshot_contents(test_client):
    contents = [
        {
            "kind": "item",
            "ref_id": 42,
            "name": "Moonstone",
            "value_gp": 50.25,
            "category": "gem",
            "quantity": 3,
        },
        {
            "kind": "weapon",
            "ref_id": 7,
            "name": "Silver Dagger",
            "value_gp": None,
            "quantity": 2,
        },
    ]
    payload = {"name": "Moonlit Find", "gold": 14.75, "contents": contents}

    created = test_client.post("/api/loot-bundles", json=payload)

    assert created.status_code == 201
    bundle = created.json()
    assert bundle == {"id": bundle["id"], **payload}
    assert test_client.get(f"/api/loot-bundles/{bundle['id']}").json() == bundle

    updated_contents = [*contents, {"kind": "item", "ref_id": 43, "name": "Map", "value_gp": 5, "quantity": 1}]
    updated = test_client.put(
        f"/api/loot-bundles/{bundle['id']}",
        json={"name": "Moonlit Hoard", "gold": 25, "contents": updated_contents},
    )
    assert updated.status_code == 200
    assert updated.json() == {
        "id": bundle["id"],
        "name": "Moonlit Hoard",
        "gold": 25,
        "contents": updated_contents,
    }

    assert test_client.delete(f"/api/loot-bundles/{bundle['id']}").status_code == 204
    assert test_client.get(f"/api/loot-bundles/{bundle['id']}").status_code == 404


def test_loot_bundle_mutations_return_not_found_for_unknown_bundle(test_client):
    payload = {"name": "Missing", "gold": 0, "contents": []}

    assert test_client.get("/api/loot-bundles/9999").status_code == 404
    assert test_client.put("/api/loot-bundles/9999", json=payload).status_code == 404
    assert test_client.delete("/api/loot-bundles/9999").status_code == 404


def test_create_loot_bundle_db_failure(monkeypatch, test_client):
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    payload = {"name": "Fail Test", "gold": 10, "contents": []}
    response = test_client.post("/api/loot-bundles", json=payload)
    assert response.status_code == 400


def test_update_loot_bundle_db_failure(monkeypatch, test_client):
    payload = {"name": "Fail Test", "gold": 10, "contents": []}
    created = test_client.post("/api/loot-bundles", json=payload)
    bundle_id = created.json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.put(f"/api/loot-bundles/{bundle_id}", json=payload)
    assert response.status_code == 400


def test_delete_loot_bundle_db_failure(monkeypatch, test_client):
    payload = {"name": "Fail Test", "gold": 10, "contents": []}
    created = test_client.post("/api/loot-bundles", json=payload)
    bundle_id = created.json()["id"]
    monkeypatch.setattr(db_module, "get_conn", _mock_db_failure)
    response = test_client.delete(f"/api/loot-bundles/{bundle_id}")
    assert response.status_code == 400
