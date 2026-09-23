from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Event, Lock
from time import sleep

from fastapi.testclient import TestClient

from backend.app.caching import cached_read, invalidate_cache
import backend.app.db as db_module
from backend.app.main import create_app


def test_repeated_get_hits_cache_and_successful_write_invalidates_it(
    monkeypatch, test_client
):
    original_get_conn = db_module.get_conn
    connection_count = 0

    def count_connections(*args, **kwargs):
        nonlocal connection_count
        connection_count += 1
        return original_get_conn(*args, **kwargs)

    monkeypatch.setattr(db_module, "get_conn", count_connections)

    first = test_client.get("/api/items")
    second = test_client.get("/api/items")
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json() == []
    assert connection_count == 1

    created = test_client.post(
        "/api/items",
        json={"name": "Cache invalidation test", "value_gp": 5, "category": "tool"},
    )
    assert created.status_code == 201

    after_write = test_client.get("/api/items")
    assert after_write.status_code == 200
    assert [item["name"] for item in after_write.json()] == ["Cache invalidation test"]
    assert connection_count == 3


def test_get_query_arguments_select_distinct_cache_entries(test_client):
    level_zero = test_client.get("/api/spells?level=0&limit=10")
    level_three = test_client.get("/api/spells?level=3&limit=10")

    assert level_zero.status_code == level_three.status_code == 200
    assert [spell["name"] for spell in level_zero.json()] == ["Firebolt Test"]
    assert [spell["name"] for spell in level_three.json()] == ["Fireball"]


def test_cache_isolated_by_injected_database_path(test_client, tmp_path):
    created = test_client.post(
        "/api/items",
        json={"name": "Default database", "value_gp": 2, "category": "tool"},
    )
    assert created.status_code == 201
    assert [item["name"] for item in test_client.get("/api/items").json()] == [
        "Default database"
    ]

    override_path = tmp_path / "override.db"
    with sqlite3.connect(override_path) as conn:
        conn.execute(
            """CREATE TABLE items (
                   id INTEGER PRIMARY KEY,
                   name TEXT NOT NULL,
                   value_gp REAL NOT NULL,
                   category TEXT,
                   description TEXT,
                   updated_at TEXT DEFAULT CURRENT_TIMESTAMP
               )"""
        )
        conn.execute(
            "INSERT INTO items (name, value_gp, category) VALUES (?, ?, ?)",
            ("Override database", 7, "gear"),
        )

    override_client = TestClient(create_app(database_path=override_path))
    override_response = override_client.get("/api/items")
    assert override_response.status_code == 200
    assert [item["name"] for item in override_response.json()] == ["Override database"]

    # The same GET path and arguments still return the default app's distinct DB data.
    assert [item["name"] for item in test_client.get("/api/items").json()] == [
        "Default database"
    ]


def test_concurrent_identical_reads_share_one_loader(monkeypatch, tmp_path):
    db_path = tmp_path / "single-flight.db"
    monkeypatch.setattr(db_module, "DB_PATH", db_path)
    invalidate_cache(db_path=db_path)

    loader_started = Event()
    release_loader = Event()
    second_call_started = Event()
    count_lock = Lock()
    loader_calls = 0

    def loader():
        nonlocal loader_calls
        with count_lock:
            loader_calls += 1
        loader_started.set()
        if not release_loader.wait(timeout=2):
            raise TimeoutError("test did not release the single-flight loader")
        return {"result": [1, 2, 3]}

    def second_caller():
        second_call_started.set()
        return cached_read("test-single-flight", ("shared-key",), loader)

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            first = executor.submit(
                cached_read, "test-single-flight", ("shared-key",), loader
            )
            assert loader_started.wait(timeout=2)
            second = executor.submit(second_caller)
            assert second_call_started.wait(timeout=2)
            sleep(0.05)
            assert loader_calls == 1
            release_loader.set()
            assert first.result(timeout=2) == {"result": [1, 2, 3]}
            assert second.result(timeout=2) == {"result": [1, 2, 3]}
        assert loader_calls == 1
    finally:
        release_loader.set()
