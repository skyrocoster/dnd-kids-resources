"""Tests for the Loom router's session-grid contract."""


def _tapestry(test_client):
    response = test_client.get("/api/loom/tapestry")
    assert response.status_code == 200
    return response.json()


def _nodes_for_thread(test_client, thread_id):
    nodes = [node for node in _tapestry(test_client)["nodes"] if node["thread_id"] == thread_id]
    return sorted(nodes, key=lambda node: node["position"])


def _node(test_client, node_id):
    return next(node for node in _tapestry(test_client)["nodes"] if node["id"] == node_id)


def _create_session(test_client, ordinal=1, name="Session 1"):
    response = test_client.post(
        "/api/loom/sessions",
        json={"ordinal": ordinal, "name": name, "played_on": "2026-01-01", "notes": None},
    )
    assert response.status_code == 201
    return response.json()


def _create_thread(test_client, name="Thread", color="thread-1", **extra):
    payload = {"name": name, "color": color, **extra}
    response = test_client.post("/api/loom/threads", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_node(test_client, **payload):
    response = test_client.post("/api/loom/nodes", json=payload)
    assert response.status_code == 201
    return response.json()


# ---------------------------------------------------------------------------
# Tapestry and sessions
# ---------------------------------------------------------------------------


def test_tapestry_returns_sessions_threads_and_nodes(test_client):
    _create_session(test_client, ordinal=2, name="Second")
    _create_session(test_client, ordinal=1, name="First")
    thread = _create_thread(test_client, name="Tapestry Thread")

    data = _tapestry(test_client)

    assert sorted(data) == ["nodes", "sessions", "threads"]
    assert [session["ordinal"] for session in data["sessions"]] == [1, 2]
    assert "items" not in data["threads"][0]
    assert any(node["thread_id"] == thread["id"] for node in data["nodes"])
    assert "edges" not in data


def test_session_crud_and_delete_guard(test_client):
    session = _create_session(test_client, ordinal=1, name="Session 1")

    listed = test_client.get("/api/loom/sessions").json()
    assert [row["id"] for row in listed] == [session["id"]]

    duplicate = test_client.post(
        "/api/loom/sessions",
        json={"ordinal": 1, "name": "Duplicate", "played_on": None, "notes": None},
    )
    assert duplicate.status_code == 400

    updated = test_client.put(
        f"/api/loom/sessions/{session['id']}",
        json={"ordinal": 2, "name": "Renamed", "played_on": "2026-02-01", "notes": "Moved"},
    )
    assert updated.status_code == 200
    assert updated.json()["ordinal"] == 2
    assert updated.json()["notes"] == "Moved"

    thread = _create_thread(test_client, name="Delete Guard")
    node = _create_node(
        test_client,
        thread_id=thread["id"],
        kind="session",
        title="Played card",
        session_id=session["id"],
        position=10,
    )
    blocked = test_client.delete(f"/api/loom/sessions/{session['id']}")
    assert blocked.status_code == 422

    assert test_client.delete(f"/api/loom/nodes/{node['id']}").status_code == 204
    assert test_client.delete(f"/api/loom/sessions/{session['id']}").status_code == 204
    assert test_client.delete("/api/loom/sessions/9999").status_code == 404


def test_session_update_duplicate_ordinal_400(test_client):
    _create_session(test_client, ordinal=1, name="One")
    session_two = _create_session(test_client, ordinal=2, name="Two")

    missing = test_client.put(
        "/api/loom/sessions/9999",
        json={"ordinal": 3, "name": "Missing", "played_on": None, "notes": None},
    )
    assert missing.status_code == 404

    response = test_client.put(
        f"/api/loom/sessions/{session_two['id']}",
        json={"ordinal": 1, "name": "Collision", "played_on": None, "notes": None},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


def test_create_thread_makes_thread_exclusive_start_and_end(test_client):
    thread = _create_thread(
        test_client,
        name="Custom Titles",
        color="thread-3",
        start_title="A promise made",
        end_title="A promise kept",
    )

    nodes = _nodes_for_thread(test_client, thread["id"])
    assert [(node["kind"], node["title"], node["position"]) for node in nodes] == [
        ("start", "A promise made", 0),
        ("end", "A promise kept", 10),
    ]


def test_create_thread_origin_must_be_existing_session_node(test_client):
    session = _create_node(test_client, kind="session", title="Met the wizard")
    beat = _create_node(test_client, kind="beat", title="Not a session")

    created = test_client.post(
        "/api/loom/threads",
        json={"name": "Spawn", "color": "thread-2", "origin_node_id": session["id"]},
    )
    assert created.status_code == 201
    assert created.json()["origin_node_id"] == session["id"]

    unknown = test_client.post(
        "/api/loom/threads",
        json={"name": "Unknown Origin", "color": "thread-1", "origin_node_id": 9999},
    )
    assert unknown.status_code == 422

    wrong_kind = test_client.post(
        "/api/loom/threads",
        json={"name": "Wrong Origin", "color": "thread-1", "origin_node_id": beat["id"]},
    )
    assert wrong_kind.status_code == 422


def test_thread_update_and_validation_errors(test_client):
    _create_thread(test_client, name="Thread A", color="thread-1")
    second = _create_thread(test_client, name="Thread B", color="thread-2")

    created_duplicate = test_client.post(
        "/api/loom/threads", json={"name": "Thread A", "color": "thread-3"}
    )
    assert created_duplicate.status_code == 400

    updated = test_client.put(
        f"/api/loom/threads/{second['id']}",
        json={"name": "Thread C", "color": "thread-3", "description": "Updated"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Thread C"
    assert updated.json()["description"] == "Updated"

    duplicate = test_client.put(
        f"/api/loom/threads/{second['id']}",
        json={"name": "Thread A", "color": "thread-2", "description": None},
    )
    assert duplicate.status_code == 400

    missing = test_client.put(
        "/api/loom/threads/9999",
        json={"name": "Missing", "color": "thread-1", "description": None},
    )
    assert missing.status_code == 404

    bad_color = test_client.post("/api/loom/threads", json={"name": "Bad Color", "color": "thread-9"})
    assert bad_color.status_code == 422


def test_delete_thread_removes_all_its_nodes_and_nulls_spawn_origin(test_client):
    parent = _create_thread(test_client, name="Parent")
    origin = _create_node(
        test_client,
        thread_id=parent["id"],
        kind="session",
        title="Origin event",
        position=5,
    )
    spawned = _create_thread(
        test_client,
        name="Spawned",
        color="thread-2",
        origin_node_id=origin["id"],
    )
    other = _create_thread(test_client, name="Other", color="thread-3")

    response = test_client.delete(f"/api/loom/threads/{parent['id']}")
    assert response.status_code == 204

    data = _tapestry(test_client)
    assert parent["id"] not in {thread["id"] for thread in data["threads"]}
    assert not any(node["thread_id"] == parent["id"] for node in data["nodes"])
    assert any(node["thread_id"] == other["id"] for node in data["nodes"])

    updated_spawned = next(thread for thread in test_client.get("/api/loom/threads").json() if thread["id"] == spawned["id"])
    assert updated_spawned["origin_node_id"] is None

    assert test_client.delete("/api/loom/threads/9999").status_code == 404


# ---------------------------------------------------------------------------
# Nodes and placement
# ---------------------------------------------------------------------------


def test_create_update_delete_node_on_new_columns(test_client):
    session = _create_session(test_client)
    thread = _create_thread(test_client, name="Node Thread")
    node = _create_node(
        test_client,
        thread_id=thread["id"],
        kind="beat",
        title="Planned",
        body="Notes",
        session_id=session["id"],
        position=30,
        carried_count=2,
    )

    assert node["thread_id"] == thread["id"]
    assert node["session_id"] == session["id"]
    assert node["position"] == 30
    assert node["carried_count"] == 2
    assert "thread_ids" not in node
    assert "x" not in node and "y" not in node and "session_tag" not in node

    updated = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={
            "thread_id": thread["id"],
            "kind": "beat",
            "title": "Revised",
            "body": None,
            "session_id": None,
            "position": 40,
            "carried_count": 3,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Revised"
    assert updated.json()["session_id"] is None
    assert updated.json()["carried_count"] == 3

    assert test_client.delete(f"/api/loom/nodes/{node['id']}").status_code == 204
    assert not any(n["id"] == node["id"] for n in _tapestry(test_client)["nodes"])


def test_create_start_or_end_node_directly_rejected_422(test_client):
    assert test_client.post("/api/loom/nodes", json={"kind": "start", "title": "Nope"}).status_code == 422
    assert test_client.post("/api/loom/nodes", json={"kind": "end", "title": "Nope"}).status_code == 422


def test_update_node_kind_immutable_except_fulfil_undo(test_client):
    beat = _create_node(test_client, kind="beat", title="Original")
    assert test_client.put("/api/loom/nodes/9999", json={"kind": "beat", "title": "Missing"}).status_code == 404

    response = test_client.put(f"/api/loom/nodes/{beat['id']}", json={"kind": "session", "title": "Original"})
    assert response.status_code == 422

    session = _create_node(test_client, kind="session", title="Never fulfilled")
    response = test_client.put(f"/api/loom/nodes/{session['id']}", json={"kind": "beat", "title": "Nope"})
    assert response.status_code == 422


def test_delete_start_or_end_node_directly_rejected_422(test_client):
    thread = _create_thread(test_client, name="Guarded")
    start = next(node for node in _nodes_for_thread(test_client, thread["id"]) if node["kind"] == "start")

    response = test_client.delete(f"/api/loom/nodes/{start['id']}")
    assert response.status_code == 422
    assert test_client.delete("/api/loom/nodes/9999").status_code == 404


def test_no_canvas_position_route(test_client):
    node = _create_node(test_client, kind="beat", title="No canvas")
    response = test_client.patch(f"/api/loom/nodes/{node['id']}/position", json={"x": 1, "y": 2})
    assert response.status_code == 404


def test_one_card_per_thread_per_session_rejected_by_api(test_client):
    session = _create_session(test_client)
    thread = _create_thread(test_client, name="Unique Session")
    _create_node(
        test_client,
        thread_id=thread["id"],
        kind="session",
        title="First card",
        session_id=session["id"],
        position=20,
    )

    response = test_client.post(
        "/api/loom/nodes",
        json={
            "thread_id": thread["id"],
            "kind": "session",
            "title": "Duplicate column",
            "session_id": session["id"],
            "position": 30,
        },
    )
    assert response.status_code == 400


def test_thread_item_routes_place_reorder_remove_and_restore_nodes(test_client):
    source = _create_thread(test_client, name="Source")
    target = _create_thread(test_client, name="Target", color="thread-2")
    beat = _create_node(test_client, kind="beat", title="Banked")

    placed = test_client.post(
        f"/api/loom/threads/{source['id']}/items",
        json={"node_id": beat["id"], "position": 5},
    )
    assert placed.status_code == 201
    assert _node(test_client, beat["id"])["thread_id"] == source["id"]
    assert _nodes_for_thread(test_client, source["id"])[1]["id"] == beat["id"]

    reordered = test_client.patch(
        f"/api/loom/threads/{source['id']}/items/{beat['id']}",
        json={"position": 1000},
    )
    assert reordered.status_code == 200
    assert _nodes_for_thread(test_client, source["id"])[-2]["id"] == beat["id"]

    removed = test_client.delete(f"/api/loom/threads/{source['id']}/items/{beat['id']}")
    assert removed.status_code == 204
    banked = _node(test_client, beat["id"])
    assert banked["thread_id"] is None
    assert banked["banked_from_thread_id"] == source["id"]

    restored = test_client.post(
        f"/api/loom/threads/{target['id']}/items",
        json={"node_id": beat["id"], "position": 5},
    )
    assert restored.status_code == 201
    restored_node = _node(test_client, beat["id"])
    assert restored_node["thread_id"] == target["id"]
    assert restored_node["banked_from_thread_id"] is None


def test_thread_item_error_paths(test_client):
    thread = _create_thread(test_client, name="Errors")
    other = _create_thread(test_client, name="Other", color="thread-2")
    beat = _create_node(test_client, thread_id=thread["id"], kind="beat", title="Placed", position=5)
    start = next(node for node in _nodes_for_thread(test_client, thread["id"]) if node["kind"] == "start")

    assert test_client.post("/api/loom/threads/9999/items", json={"node_id": beat["id"], "position": 5}).status_code == 404
    assert test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": 9999, "position": 5}).status_code == 404
    assert test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": start["id"], "position": 5}).status_code == 422
    assert test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5}).status_code == 422
    assert test_client.post(f"/api/loom/threads/{other['id']}/items", json={"node_id": beat["id"], "position": 5}).status_code == 422
    assert test_client.patch("/api/loom/threads/9999/items/1", json={"position": 5}).status_code == 404
    assert test_client.patch(f"/api/loom/threads/{other['id']}/items/{beat['id']}", json={"position": 5}).status_code == 404
    assert test_client.patch(f"/api/loom/threads/{thread['id']}/items/{start['id']}", json={"position": 5}).status_code == 422
    assert test_client.delete("/api/loom/threads/9999/items/1").status_code == 404
    assert test_client.delete(f"/api/loom/threads/{other['id']}/items/{beat['id']}").status_code == 404
    assert test_client.delete(f"/api/loom/threads/{thread['id']}/items/{start['id']}").status_code == 422


# ---------------------------------------------------------------------------
# Beat lifecycle and move
# ---------------------------------------------------------------------------


def test_fulfil_beat_requires_thread_and_session_and_stamps_provenance(test_client):
    session = _create_session(test_client)
    thread = _create_thread(test_client, name="Fulfil")
    unplaced = _create_node(test_client, kind="beat", title="Unplaced")
    unscheduled = _create_node(test_client, thread_id=thread["id"], kind="beat", title="No Session", position=5)
    beat = _create_node(
        test_client,
        thread_id=thread["id"],
        kind="beat",
        title="Planned wording",
        session_id=session["id"],
        position=20,
    )

    assert test_client.post(f"/api/loom/nodes/{unplaced['id']}/fulfil").status_code == 422
    assert test_client.post(f"/api/loom/nodes/{unscheduled['id']}/fulfil").status_code == 422

    response = test_client.post(
        f"/api/loom/nodes/{beat['id']}/fulfil",
        json={"title": "What actually happened"},
    )
    assert response.status_code == 200
    fulfilled = response.json()
    assert fulfilled["kind"] == "session"
    assert fulfilled["title"] == "What actually happened"
    assert fulfilled["fulfilled_planned_title"] == "Planned wording"
    assert fulfilled["fulfilled_at"] is not None
    assert fulfilled["thread_id"] == thread["id"]
    assert fulfilled["session_id"] == session["id"]

    reverted = test_client.put(
        f"/api/loom/nodes/{beat['id']}",
        json={
            "thread_id": thread["id"],
            "kind": "beat",
            "title": fulfilled["fulfilled_planned_title"],
            "session_id": session["id"],
            "position": fulfilled["position"],
            "carried_count": fulfilled["carried_count"],
        },
    )
    assert reverted.status_code == 200
    assert reverted.json()["fulfilled_planned_title"] is None
    assert reverted.json()["fulfilled_at"] is None


def test_fulfil_and_bank_error_paths(test_client):
    session_node = _create_node(test_client, kind="session", title="Already session")
    assert test_client.post(f"/api/loom/nodes/{session_node['id']}/fulfil").status_code == 422
    assert test_client.post("/api/loom/nodes/9999/fulfil").status_code == 404

    unplaced = _create_node(test_client, kind="beat", title="Never placed")
    assert test_client.post(f"/api/loom/nodes/{unplaced['id']}/bank").status_code == 422
    assert test_client.post(f"/api/loom/nodes/{session_node['id']}/bank").status_code == 422
    assert test_client.post("/api/loom/nodes/9999/bank").status_code == 404


def test_bank_beat_unplaces_and_preserves_provenance(test_client):
    thread = _create_thread(test_client, name="Bank")
    beat = _create_node(test_client, thread_id=thread["id"], kind="beat", title="To bank", position=5)

    response = test_client.post(f"/api/loom/nodes/{beat['id']}/bank")
    assert response.status_code == 200
    banked = response.json()
    assert banked["thread_id"] is None
    assert banked["session_id"] is None
    assert banked["position"] == 0
    assert banked["banked_from_thread_id"] == thread["id"]


def test_move_node_between_threads_and_error_paths(test_client):
    source = _create_thread(test_client, name="Move Source")
    target = _create_thread(test_client, name="Move Target", color="thread-2")
    beat = _create_node(test_client, thread_id=source["id"], kind="beat", title="Move me", position=5)
    start = next(node for node in _nodes_for_thread(test_client, source["id"]) if node["kind"] == "start")
    unplaced = _create_node(test_client, kind="beat", title="Unplaced")

    response = test_client.post(
        f"/api/loom/threads/{source['id']}/items/{beat['id']}/move",
        json={"target_thread_id": target["id"], "position": 5, "mode": "also_add"},
    )
    assert response.status_code == 200
    assert _node(test_client, beat["id"])["thread_id"] == target["id"]
    assert beat["id"] not in [node["id"] for node in _nodes_for_thread(test_client, source["id"])]
    assert beat["id"] in [node["id"] for node in _nodes_for_thread(test_client, target["id"])]

    assert test_client.post(
        f"/api/loom/threads/9999/items/{beat['id']}/move",
        json={"target_thread_id": target["id"], "position": 5},
    ).status_code == 404
    assert test_client.post(
        f"/api/loom/threads/{target['id']}/items/{beat['id']}/move",
        json={"target_thread_id": target["id"], "position": 5},
    ).status_code == 422
    assert test_client.post(
        f"/api/loom/threads/{source['id']}/items/{unplaced['id']}/move",
        json={"target_thread_id": target["id"], "position": 5},
    ).status_code == 404
    assert test_client.post(
        f"/api/loom/threads/{source['id']}/items/{start['id']}/move",
        json={"target_thread_id": target["id"], "position": 5},
    ).status_code == 422
    assert test_client.post(
        f"/api/loom/threads/{target['id']}/items/{beat['id']}/move",
        json={"target_thread_id": 9999, "position": 5},
    ).status_code == 404


# ---------------------------------------------------------------------------
# Frozen fixture edge cases
# ---------------------------------------------------------------------------


def test_real_fixture_exercises_session_grid_edge_cases(real_client):
    response = real_client.get("/api/loom/tapestry")
    assert response.status_code == 200
    data = response.json()

    assert len(data["threads"]) == 6
    assert len(data["sessions"]) == 8
    assert len(data["nodes"]) == 45
    assert [session["ordinal"] for session in data["sessions"]] == list(range(1, 9))

    nodes = {node["id"]: node for node in data["nodes"]}
    assert nodes[6]["kind"] == "end"
    assert nodes[6]["thread_id"] == 1
    assert nodes[6]["session_id"] == 5
    assert nodes[13]["carried_count"] == 3
    assert nodes[17]["session_id"] == 3
    assert nodes[25]["session_id"] == 6
    assert nodes[34]["title"] == "Outshot the vale's best archer"
    assert nodes[34]["fulfilled_planned_title"] == "Prove yourselves at the hunt"
    assert nodes[38]["thread_id"] == 6
    assert nodes[38]["session_id"] == 8
    assert nodes[43]["thread_id"] is None and nodes[43]["banked_from_thread_id"] == 1
    assert nodes[44]["thread_id"] is None and nodes[44]["banked_from_thread_id"] == 2
    assert nodes[45]["thread_id"] is None and nodes[45]["banked_from_thread_id"] is None
    assert nodes[23]["thread_id"] == 3 and nodes[23]["banked_from_thread_id"] == 1

    threads = {thread["id"]: thread for thread in data["threads"]}
    assert threads[3]["origin_node_id"] == 10
    assert threads[4]["origin_node_id"] == 20


def test_real_fixture_has_no_shared_session_memberships(real_client):
    data = real_client.get("/api/loom/tapestry").json()
    session_nodes = [node for node in data["nodes"] if node["kind"] == "session"]
    assert all(isinstance(node["thread_id"], int) for node in session_nodes)

    thread_session_pairs = [
        (node["thread_id"], node["session_id"])
        for node in session_nodes
        if node["thread_id"] is not None and node["session_id"] is not None
    ]
    assert len(thread_session_pairs) == len(set(thread_session_pairs))
