"""Tests for main.py — root endpoint when frontend is not built.

Lines 67–70 (the SPA fallback when ``frontend/dist`` exists) are the opposite
branch of the same ``if FRONTEND_DIST.is_dir():`` / ``else:``. They require
``frontend/dist`` to exist at *import time*, so a single test run cannot cover
both sides. Those lines are exercised in production when the frontend is built.
"""

import importlib
from pathlib import Path

from fastapi.testclient import TestClient


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
