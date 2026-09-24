"""App boot + API contract tests (merged).

Combines the former ``test_api_errors.py`` (3 tests), ``test_app_factory.py``
(3 tests), ``test_main.py`` (1 test), and ``test_openapi_contract.py``
(1 test): 8 tests, 1 file. Each test below is unchanged apart from imports —
deleted 3 files, 0 behavior lost.
"""

import importlib
import sqlite3
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.db import get_db_path
from backend.app.main import app, create_app
from backend.app.schemas.common import StrictModel

# ---------------------------------------------------------------------------
# Structured error bodies (from test_api_errors.py)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# App factory (from test_app_factory.py)
# ---------------------------------------------------------------------------


def test_create_app_builds_api_with_retained_lan_cors_origin():
    app = create_app()

    assert isinstance(app, FastAPI)
    client = TestClient(app)
    response = client.options(
        "/api/spells",
        headers={
            "Origin": "http://192.168.1.175:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://192.168.1.175:5173"
    assert set(response.headers["access-control-allow-methods"].split(", ")) == {
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    }


def test_db_path_dependency_override_selects_database(tmp_path):
    db_path = tmp_path / "override.db"
    with sqlite3.connect(db_path) as conn:
        conn.execute("CREATE TABLE abilities (id INTEGER, code TEXT, name TEXT)")
        conn.execute("INSERT INTO abilities VALUES (1, 'str', 'Strength')")

    app = create_app()
    app.dependency_overrides[get_db_path] = lambda: db_path

    response = TestClient(app).get("/api/abilities")

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "code": "str", "name": "Strength", "description": None}]


def test_strict_model_rejects_coercion():
    class StrictProbe(StrictModel):
        value: int

    with pytest.raises(ValidationError):
        StrictProbe.model_validate({"value": "1"})


# ---------------------------------------------------------------------------
# Root endpoint without built frontend (from test_main.py)
#
# Lines 67-70 of backend/app/main.py (the SPA fallback when ``frontend/dist``
# exists) are the opposite branch of the same ``if FRONTEND_DIST.is_dir():`` /
# ``else:``. They require ``frontend/dist`` to exist at *import time*, so a
# single test run cannot cover both sides. Those lines are exercised in
# production when the frontend is built.
# ---------------------------------------------------------------------------


def test_root_returns_api_info_when_frontend_not_built(monkeypatch):
    import backend.app.main as main_mod

    monkeypatch.setattr(Path, "is_dir", lambda self: False)
    importlib.reload(main_mod)

    client = TestClient(main_mod.app, raise_server_exceptions=False)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "D&D Kids Resources API v2",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


# ---------------------------------------------------------------------------
# OpenAPI operation-id contract (from test_openapi_contract.py)
# ---------------------------------------------------------------------------


def test_openapi_declares_stable_ids_for_api_operations_without_spa_catch_all():
    paths = app.openapi()["paths"]
    api_operations = [
        operation
        for path, methods in paths.items()
        if path.startswith("/api/")
        for operation in methods.values()
    ]
    operation_ids = [operation.get("operationId") for operation in api_operations]

    assert len(api_operations) == 97
    assert all(operation_ids)
    assert len(operation_ids) == len(set(operation_ids))
    assert {"listSpells", "getSpell"} <= set(operation_ids)
    assert "/{full_path}" not in paths
    assert all(path.startswith("/api/") or path == "/" for path in paths)
