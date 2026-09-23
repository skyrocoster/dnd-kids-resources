"""Behavioral and OpenAPI checks for structured feature error responses."""

from backend.app.main import app


def _assert_error(response, status_code, code, message):
    assert response.status_code == status_code
    assert response.json() == {"code": code, "message": message}


def test_structured_error_bodies_cover_documented_statuses(test_client):
    duplicate_players = test_client.put(
        "/api/spells/1/players",
        json={"player_ids": [1, 1]},
    )
    _assert_error(duplicate_players, 400, "duplicate_player_ids", "Duplicate player ids")

    missing_item = test_client.get("/api/items/99999")
    _assert_error(missing_item, 404, "item_not_found", "Item not found")

    duplicate_monster = test_client.post("/api/monsters", json={"name": "Owlbear"})
    _assert_error(
        duplicate_monster,
        409,
        "monster_name_already_exists",
        "Monster name already exists",
    )

    unknown_thread_origin = test_client.post(
        "/api/loom/threads",
        json={"name": "Unknown Origin", "color": "thread-1", "origin_node_id": 99999},
    )
    _assert_error(unknown_thread_origin, 422, "unknown_origin_node_id", "Unknown origin_node_id")

    invalid_request = test_client.post("/api/loom/threads", json={})
    assert invalid_request.status_code == 422
    assert "detail" in invalid_request.json()
    assert "code" not in invalid_request.json()


def test_unknown_api_route_returns_structured_not_found(test_client):
    response = test_client.get("/api/not-a-real-endpoint")

    _assert_error(response, 404, "api_not_found", "Not Found")


def test_openapi_documents_feature_error_schemas_and_validation_union():
    paths = app.openapi()["paths"]

    spell_error = paths["/api/spells/{spell_id}/players"]["put"]["responses"]["400"]
    assert spell_error["content"]["application/json"]["schema"]["$ref"] == (
        "#/components/schemas/SpellError"
    )

    item_error = paths["/api/items/{item_id}"]["get"]["responses"]["404"]
    assert item_error["content"]["application/json"]["schema"]["$ref"] == (
        "#/components/schemas/ItemError"
    )

    monster_error = paths["/api/monsters"]["post"]["responses"]["409"]
    assert monster_error["content"]["application/json"]["schema"]["$ref"] == (
        "#/components/schemas/MonsterError"
    )

    loom_error = paths["/api/loom/threads"]["post"]["responses"]["422"]
    union_refs = {
        alternative["$ref"]
        for alternative in loom_error["content"]["application/json"]["schema"]["anyOf"]
    }
    assert union_refs == {
        "#/components/schemas/LoomError",
        "#/components/schemas/FastAPIValidationErrorResponse",
    }

    components = app.openapi()["components"]["schemas"]
    assert components["SpellError"]["properties"]["code"]["enum"]
    assert set(components["SpellError"]["properties"]) == {"code", "message"}
