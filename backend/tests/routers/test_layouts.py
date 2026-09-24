import pytest
import backend.app.db as db_module

from backend.tests.conftest import db_failure_conn

_AUTH_STATE = {
    "open": False,
    "obstacles": {
        "concealment": {"armed": False},
        "lock": {"armed": True, "shown": True},
        "trap": {"armed": False, "shown": False},
    },
}


def test_layout_get_put_and_not_found(test_client):
    """PUT upserts a layout; GET round-trips it; missing dungeon/layout 404s"""
    assert test_client.get("/api/dungeons/999/layout").status_code == 404

    layout = {
        "meta": {"cellSizeFt": 5, "padding": 3},
        "rooms": [{"room_id": 1, "z": 0, "origin": [0, 0], "cells": [[0, 0]]}],
        "doors": [],
        "stairs": [],
        "floors": [{"z": 0, "title": "Ground Floor"}],
        "items": [],
    }

    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout test", "data": {}}
    ).json()["id"]
    put_response = test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": layout})
    assert put_response.status_code == 200
    assert put_response.json()["data"] == layout

    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/layout")
    assert get_response.status_code == 200
    assert get_response.json()["data"] == layout

    assert test_client.put("/api/dungeons/999/layout", json={"data": {}}).status_code == 404


def _layout(*, doors=(), stairs=(), props=(), portals=()):
    """A minimal layout carrying fixtures of the four kinds."""
    return {
        "meta": {"cellSizeFt": 5, "padding": 3},
        "rooms": [],
        "doors": list(doors),
        "stairs": list(stairs),
        "props": list(props),
        "portals": list(portals),
        "floors": [],
        "items": [],
    }


def _fixture(kind: str, **overrides) -> dict:
    """A layout fixture of the given kind with authored state, matching the editor shape."""
    if kind == "doors":
        fixture = {
            "door_id": 1,
            "cell": [2, 3],
            "side": "N",
            "z": 0,
            "title": "Oak Door",
            "state": _AUTH_STATE,
        }
    elif kind == "stairs":
        fixture = {
            "stair_id": 1,
            "from": {"z": 0, "cell": [2, 3]},
            "to": {"z": 1, "cell": [2, 3]},
            "title": "Stair",
            "state": _AUTH_STATE,
        }
    elif kind == "props":
        fixture = {
            "prop_id": 1,
            "kind": "chest",
            "cell": [2, 3],
            "z": 0,
            "title": "Chest",
            "state": _AUTH_STATE,
        }
    else:
        fixture = {
            "portal_id": 1,
            "cell": [2, 3],
            "z": 0,
            "to": {"z": 1, "cell": [4, 5]},
            "title": "Portal",
            "state": _AUTH_STATE,
        }
    fixture.update(overrides)
    return fixture


_FIXTURE_KINDS = ("doors", "stairs", "props", "portals")


def _moved_fixture(kind: str) -> dict:
    """The same fixture with geometry moved, per the settled geometry identity."""
    if kind == "doors":
        return _fixture(kind, cell=[9, 9], side="S", z=1)
    if kind == "stairs":
        return _fixture(kind, **{"from": {"z": 0, "cell": [9, 9]}, "to": {"z": 1, "cell": [9, 9]}})
    if kind == "props":
        return _fixture(kind, cell=[9, 9], z=1)
    return _fixture(kind, cell=[9, 9], z=1, to={"z": 1, "cell": [8, 8]})


def _changed_authored_open(kind: str) -> dict:
    """Same fixture, same geometry, but authored open flipped to True."""
    return _fixture(
        kind,
        state={**_AUTH_STATE, "open": True},
    )


@pytest.mark.parametrize("kind", _FIXTURE_KINDS)
def test_save_dungeon_layout_upserts_on_second_call(test_client, kind):
    """A second PUT replaces the row and prunes session overrides by the settled rules:
    deletion/geometry drop the complete fixture override; authored open/obstacle armed/shown
    changes drop only the matching leaves; descriptive changes preserve; partyRoomId is kept;
    and a session row with nothing left is deleted."""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout upsert test", "data": {}}
    ).json()["id"]

    def put_layout(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": data})

    def put_session(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": data})

    def get_session():
        response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
        if response.status_code == 404:
            return None
        return response.json()["data"]

    # --- plain upsert: a second PUT replaces the row rather than conflicting ---
    first = _layout(doors=[_fixture("doors")])
    second = {**_layout(doors=[_fixture("doors")]), "rooms": [{"room_id": 1, "z": 0, "origin": [0, 0], "cells": [[0, 0]]}]}
    put_layout(first)
    put_response = put_layout(second)
    assert put_response.status_code == 200
    get_response = test_client.get(f"/api/dungeons/{dungeon_id}/layout")
    assert get_response.json()["data"] == second

    # --- deletion: fixture removed from the layout drops its complete override ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session({kind: {"1": {"open": True}}, "partyRoomId": 6})
    put_layout(_layout())
    assert get_session() == {"partyRoomId": 6}

    # --- geometry change: moving the fixture drops its complete override ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session({kind: {"1": {"open": True}}, "partyRoomId": 6})
    put_layout(_layout(**{kind: [_moved_fixture(kind)]}))
    assert get_session() == {"partyRoomId": 6}

    # --- authored open change: only the matching open leaf is dropped ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session({kind: {"1": {"open": True, "obstacles": {"lock": {"armed": False}}}}})
    put_layout(_layout(**{kind: [_changed_authored_open(kind)]}))
    assert get_session() == {kind: {"1": {"obstacles": {"lock": {"armed": False}}}}}

    # --- authored obstacle armed change: only that leaf is dropped ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session(
        {
            kind: {
                "1": {
                    "open": True,
                    "obstacles": {"lock": {"armed": False}, "trap": {"shown": True}},
                }
            }
        }
    )
    put_layout(
        _layout(
            **{
                kind: [
                    _fixture(
                        kind,
                        state={
                            **_AUTH_STATE,
                            "obstacles": {
                                "concealment": {"armed": False},
                                "lock": {"armed": False, "shown": True},
                                "trap": {"armed": False, "shown": False},
                            },
                        },
                    )
                ]
            }
        )
    )
    assert get_session() == {kind: {"1": {"open": True, "obstacles": {"trap": {"shown": True}}}}}

    # --- descriptive change: title/kind/loot edits preserve every override ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session({kind: {"1": {"open": True, "obstacles": {"lock": {"armed": False}}}}, "partyRoomId": 6})
    if kind == "props":
        put_layout(_layout(**{kind: [_fixture(kind, title="Table")]}))
    else:
        put_layout(_layout(**{kind: [_fixture(kind, title="Renamed Door")]}))
    assert get_session() == {
        kind: {"1": {"open": True, "obstacles": {"lock": {"armed": False}}}},
        "partyRoomId": 6,
    }

    # --- empty-row cleanup: no overrides and no partyRoomId left -> session row deleted ---
    put_layout(_layout(**{kind: [_fixture(kind)]}))
    put_session({kind: {"1": {"open": True}}})
    put_layout(_layout())
    assert get_session() is None


def test_deleting_dungeon_removes_its_layout(test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout cleanup test", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": {}})

    assert test_client.delete(f"/api/dungeons/{dungeon_id}").status_code == 204
    assert test_client.get(f"/api/dungeons/{dungeon_id}/layout").status_code == 404


def test_incoming_gateways(test_client):
    """A portal in dungeon A pointing at dungeon B shows up in B's list; empty and 404 cases."""
    dungeon_a = test_client.post(
        "/api/dungeons", json={"title": "The Castle", "data": {}}
    ).json()["id"]
    dungeon_b = test_client.post(
        "/api/dungeons", json={"title": "The Sewers", "data": {}}
    ).json()["id"]

    layout_a = {
        "meta": {"cellSizeFt": 5, "padding": 3},
        "rooms": [],
        "doors": [],
        "stairs": [],
        "floors": [],
        "items": [],
        "portals": [
            {
                "portal_id": 1,
                "cell": [2, 9],
                "z": 0,
                "title": "Trapdoor",
                "to": {"z": 0, "cell": [0, 0], "dungeon_id": dungeon_b},
            }
        ],
    }
    test_client.put(f"/api/dungeons/{dungeon_a}/layout", json={"data": layout_a})
    test_client.put(f"/api/dungeons/{dungeon_b}/layout", json={"data": {}})

    response = test_client.get(f"/api/dungeons/{dungeon_b}/incoming-gateways")
    assert response.status_code == 200
    gateways = response.json()
    assert len(gateways) == 1
    assert gateways[0]["dungeon_id"] == dungeon_a
    assert gateways[0]["dungeon_title"] == "The Castle"
    assert gateways[0]["portal_id"] == 1
    assert gateways[0]["title"] == "Trapdoor"
    assert gateways[0]["z"] == 0
    assert gateways[0]["cell"] == [2, 9]

    isolated = test_client.post(
        "/api/dungeons", json={"title": "Isolated Keep", "data": {}}
    ).json()["id"]
    test_client.put(f"/api/dungeons/{isolated}/layout", json={"data": {}})
    assert test_client.get(f"/api/dungeons/{isolated}/incoming-gateways").json() == []
    assert test_client.get("/api/dungeons/999/incoming-gateways").status_code == 404


def test_save_layout_db_failure(monkeypatch, test_client):
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Layout DB Fail", "data": {}}
    ).json()["id"]
    monkeypatch.setattr(db_module, "get_conn", db_failure_conn)
    response = test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": {}})
    assert response.status_code == 400


def test_authored_leaves_legacy_top_level_open_obstacles(test_client):
    """A prior layout carrying legacy top-level open/obstacles (no state key) prunes only the
    changed authored leaf when the new layout uses nested editor state."""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Legacy leaf prune", "data": {}}
    ).json()["id"]

    def put_layout(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": data})

    def put_session(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": data})

    def get_session():
        response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
        if response.status_code == 404:
            return None
        return response.json()["data"]

    legacy_prior = _fixture(
        "doors",
        open=False,
        obstacles={
            "concealment": {"armed": False},
            "lock": {"armed": True, "shown": True},
            "trap": {"armed": False, "shown": False},
        },
    )
    del legacy_prior["state"]

    put_layout(_layout(doors=[legacy_prior]))
    put_session({"doors": {"1": {"open": True, "obstacles": {"lock": {"armed": False}}}}})
    response = put_layout(_layout(doors=[_fixture("doors", state={**_AUTH_STATE, "open": True})]))
    assert response.status_code == 200
    assert get_session() == {"doors": {"1": {"obstacles": {"lock": {"armed": False}}}}}


def test_authored_leaves_passage_flags_derivation(test_client):
    """A prior door authored only via PassageFlags (hidden/locked/trapped, no state/open/obstacles)
    prunes the derived leaves whose values changed when a nested-state layout lands."""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Flag leaf prune", "data": {}}
    ).json()["id"]

    def put_layout(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": data})

    def put_session(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": data})

    def get_session():
        response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
        if response.status_code == 404:
            return None
        return response.json()["data"]

    flags_prior = _fixture("doors", hidden=True, locked=False, trapped=True)
    del flags_prior["state"]

    put_layout(_layout(doors=[flags_prior]))
    put_session(
        {
            "doors": {
                "1": {
                    "open": True,
                    "obstacles": {
                        "concealment": {"armed": True},
                        "lock": {"armed": False},
                        "trap": {"shown": True},
                    },
                }
            }
        }
    )
    response = put_layout(_layout(doors=[_fixture("doors")]))
    assert response.status_code == 200
    assert get_session() == {"doors": {"1": {"open": True}}}


def test_authored_leaves_malformed_obstacle_non_dict(test_client):
    """A non-dict obstacle value in a prior legacy fixture is skipped during leaf collection,
    so pruning proceeds without a 500/400 error."""
    dungeon_id = test_client.post(
        "/api/dungeons", json={"title": "Malformed leaf prune", "data": {}}
    ).json()["id"]

    def put_layout(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/layout", json={"data": data})

    def put_session(data):
        return test_client.put(f"/api/dungeons/{dungeon_id}/session-state", json={"data": data})

    def get_session():
        response = test_client.get(f"/api/dungeons/{dungeon_id}/session-state")
        if response.status_code == 404:
            return None
        return response.json()["data"]

    malformed_prior = _fixture("doors", open=False, obstacles={"lock": "stuck"})
    del malformed_prior["state"]

    put_layout(_layout(doors=[malformed_prior]))
    put_session({"doors": {"1": {"open": True}}})
    response = put_layout(_layout(doors=[_fixture("doors")]))
    assert response.status_code == 200
    assert get_session() == {"doors": {"1": {"open": True}}}
