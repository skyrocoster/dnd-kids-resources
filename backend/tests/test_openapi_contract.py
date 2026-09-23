"""Focused checks for the checked-in API contract's operation identifiers."""

from backend.app.main import app


def test_openapi_declares_stable_ids_for_api_operations_without_spa_catch_all():
    paths = app.openapi()["paths"]
    api_operations = [
        operation
        for path, methods in paths.items()
        if path.startswith("/api/")
        for operation in methods.values()
    ]
    operation_ids = [operation.get("operationId") for operation in api_operations]

    assert len(api_operations) == 96
    assert all(operation_ids)
    assert len(operation_ids) == len(set(operation_ids))
    assert {"listSpells", "getSpell"} <= set(operation_ids)
    assert "/{full_path}" not in paths
    assert all(path.startswith("/api/") or path == "/" for path in paths)
