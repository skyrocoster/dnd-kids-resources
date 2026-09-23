import sqlite3

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.db import get_db_path
from backend.app.main import create_app
from backend.app.schemas.common import StrictModel


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
    assert response.json() == [
        {"id": 1, "code": "str", "name": "Strength", "description": None}
    ]


def test_strict_model_rejects_coercion():
    class StrictProbe(StrictModel):
        value: int

    with pytest.raises(ValidationError):
        StrictProbe.model_validate({"value": "1"})
