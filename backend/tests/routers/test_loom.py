"""Tests for the Loom router: threads (auto Start/End), node CRUD, ordered
membership (insert/reorder/remove), and the tapestry read."""


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


def test_create_thread_makes_start_and_end(test_client):
    response = test_client.post(
        "/api/loom/threads", json={"name": "The Lost Puppy", "color": "thread-3"}
    )
    assert response.status_code == 201
    thread = response.json()
    assert thread["name"] == "The Lost Puppy"
    assert thread["color"] == "thread-3"
    assert thread["origin_node_id"] is None
    thread_id = thread["id"]

    tapestry = test_client.get("/api/loom/tapestry").json()
    tapestry_thread = next(t for t in tapestry["threads"] if t["id"] == thread_id)
    assert len(tapestry_thread["items"]) == 2
    positions = [item["position"] for item in tapestry_thread["items"]]
    assert positions == sorted(positions)

    node_ids = [item["node_id"] for item in tapestry_thread["items"]]
    kinds = {n["id"]: n["kind"] for n in tapestry["nodes"] if n["id"] in node_ids}
    assert sorted(kinds.values()) == ["end", "start"]
    start_id = next(nid for nid, kind in kinds.items() if kind == "start")
    start_node = next(n for n in tapestry["nodes"] if n["id"] == start_id)
    assert start_node["title"] == "The Lost Puppy"


def test_create_thread_custom_start_end_titles(test_client):
    response = test_client.post(
        "/api/loom/threads",
        json={
            "name": "Custom Titles",
            "color": "thread-1",
            "start_title": "A promise made",
            "end_title": "A promise kept",
        },
    )
    thread_id = response.json()["id"]

    tapestry = test_client.get("/api/loom/tapestry").json()
    nodes_by_id = {n["id"]: n for n in tapestry["nodes"]}
    tapestry_thread = next(t for t in tapestry["threads"] if t["id"] == thread_id)
    titles = {nodes_by_id[item["node_id"]]["kind"]: nodes_by_id[item["node_id"]]["title"] for item in tapestry_thread["items"]}
    assert titles == {"start": "A promise made", "end": "A promise kept"}


def test_create_thread_with_origin_node_id(test_client):
    session = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Met the wizard"}
    ).json()

    response = test_client.post(
        "/api/loom/threads",
        json={"name": "Wizard's Hat", "color": "thread-2", "origin_node_id": session["id"]},
    )
    assert response.status_code == 201
    assert response.json()["origin_node_id"] == session["id"]


def test_create_thread_unknown_origin_node_id_422(test_client):
    response = test_client.post(
        "/api/loom/threads",
        json={"name": "Bad Origin", "color": "thread-1", "origin_node_id": 9999},
    )
    assert response.status_code == 422


def test_create_thread_non_session_origin_node_id_422(test_client):
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Not a session"}).json()
    response = test_client.post(
        "/api/loom/threads",
        json={"name": "Bad Origin Kind", "color": "thread-1", "origin_node_id": beat["id"]},
    )
    assert response.status_code == 422


def test_create_thread_duplicate_name_400(test_client):
    test_client.post("/api/loom/threads", json={"name": "Goblin Trouble", "color": "thread-1"})
    response = test_client.post("/api/loom/threads", json={"name": "Goblin Trouble", "color": "thread-2"})
    assert response.status_code == 400


def test_update_thread_duplicate_name_400(test_client):
    test_client.post("/api/loom/threads", json={"name": "Thread A", "color": "thread-1"})
    second = test_client.post("/api/loom/threads", json={"name": "Thread B", "color": "thread-2"})
    second_id = second.json()["id"]

    response = test_client.put(
        f"/api/loom/threads/{second_id}", json={"name": "Thread A", "color": "thread-2"}
    )
    assert response.status_code == 400


def test_update_thread_404(test_client):
    response = test_client.put("/api/loom/threads/9999", json={"name": "Nope", "color": "thread-1"})
    assert response.status_code == 404


def test_delete_thread_404(test_client):
    response = test_client.delete("/api/loom/threads/9999")
    assert response.status_code == 404


def test_invalid_thread_color_422(test_client):
    response = test_client.post("/api/loom/threads", json={"name": "Bad Color", "color": "thread-9"})
    assert response.status_code == 422


def test_delete_thread_removes_exclusive_nodes_keeps_shared_sessions(test_client):
    shared_session = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Shared event"}
    ).json()

    thread_a = test_client.post("/api/loom/threads", json={"name": "Cascade A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "Cascade B", "color": "thread-2"}).json()

    test_client.post(
        "/api/loom/threads/{}/items".format(thread_a["id"]),
        json={"node_id": shared_session["id"], "position": 5},
    )
    test_client.post(
        "/api/loom/threads/{}/items".format(thread_b["id"]),
        json={"node_id": shared_session["id"], "position": 5},
    )

    beat = test_client.post(
        "/api/loom/nodes", json={"kind": "beat", "title": "Exclusive beat"}
    ).json()
    test_client.post(
        "/api/loom/threads/{}/items".format(thread_a["id"]),
        json={"node_id": beat["id"], "position": 5},
    )

    tapestry_before = test_client.get("/api/loom/tapestry").json()
    thread_a_nodes = {
        item["node_id"] for item in next(t for t in tapestry_before["threads"] if t["id"] == thread_a["id"])["items"]
    }
    start_id = next(
        n["id"] for n in tapestry_before["nodes"] if n["id"] in thread_a_nodes and n["kind"] == "start"
    )
    end_id = next(
        n["id"] for n in tapestry_before["nodes"] if n["id"] in thread_a_nodes and n["kind"] == "end"
    )

    response = test_client.delete(f"/api/loom/threads/{thread_a['id']}")
    assert response.status_code == 204

    tapestry_after = test_client.get("/api/loom/tapestry").json()
    remaining_node_ids = {n["id"] for n in tapestry_after["nodes"]}
    assert start_id not in remaining_node_ids
    assert end_id not in remaining_node_ids
    assert beat["id"] not in remaining_node_ids
    assert shared_session["id"] in remaining_node_ids

    thread_b_after = next(t for t in tapestry_after["threads"] if t["id"] == thread_b["id"])
    assert shared_session["id"] in {item["node_id"] for item in thread_b_after["items"]}


def test_delete_thread_nulls_origin_back_reference_on_other_threads(test_client):
    origin_session = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Origin event"}
    ).json()
    parent = test_client.post("/api/loom/threads", json={"name": "Parent Thread", "color": "thread-1"}).json()
    test_client.post(
        "/api/loom/threads/{}/items".format(parent["id"]),
        json={"node_id": origin_session["id"], "position": 5},
    )
    spawned = test_client.post(
        "/api/loom/threads",
        json={"name": "Spawned Thread", "color": "thread-2", "origin_node_id": origin_session["id"]},
    ).json()

    response = test_client.delete(f"/api/loom/nodes/{origin_session['id']}")
    assert response.status_code == 204

    updated_spawned = next(
        t for t in test_client.get("/api/loom/threads").json() if t["id"] == spawned["id"]
    )
    assert updated_spawned["origin_node_id"] is None


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


def test_create_beat_node(test_client):
    response = test_client.post(
        "/api/loom/nodes", json={"kind": "beat", "title": "Rescue the puppy"}
    )
    assert response.status_code == 201
    node = response.json()
    assert node["kind"] == "beat"
    assert node["thread_ids"] == []
    assert node["fulfilled_planned_title"] is None
    assert node["banked_from_thread_id"] is None


def test_create_session_node(test_client):
    response = test_client.post(
        "/api/loom/nodes",
        json={"kind": "session", "title": "Puppy goes missing", "session_tag": "Session 1"},
    )
    assert response.status_code == 201
    assert response.json()["session_tag"] == "Session 1"


def test_create_start_or_end_node_directly_rejected_422(test_client):
    response = test_client.post("/api/loom/nodes", json={"kind": "start", "title": "Nope"})
    assert response.status_code == 422

    response = test_client.post("/api/loom/nodes", json={"kind": "end", "title": "Nope"})
    assert response.status_code == 422


def test_update_node_kind_immutable_422(test_client):
    node = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Original"}).json()

    response = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={"kind": "session", "title": "Original"},
    )
    assert response.status_code == 422


def test_update_node_edits_title_in_place(test_client):
    node = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Original"}
    ).json()

    response = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={"kind": "session", "title": "Revised", "session_tag": "Session 2"},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Revised"
    assert updated["session_tag"] == "Session 2"


def test_update_node_404(test_client):
    response = test_client.put("/api/loom/nodes/9999", json={"kind": "beat", "title": "Nope"})
    assert response.status_code == 404


def test_delete_node_404(test_client):
    response = test_client.delete("/api/loom/nodes/9999")
    assert response.status_code == 404


def test_delete_start_or_end_node_directly_rejected_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Guarded Thread", "color": "thread-1"}).json()
    tapestry = test_client.get("/api/loom/tapestry").json()
    tapestry_thread = next(t for t in tapestry["threads"] if t["id"] == thread["id"])
    start_id = tapestry_thread["items"][0]["node_id"]

    response = test_client.delete(f"/api/loom/nodes/{start_id}")
    assert response.status_code == 422


def test_patch_node_position_200(test_client):
    node = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Positioned"}).json()
    response = test_client.patch(f"/api/loom/nodes/{node['id']}/position", json={"x": 42, "y": 99})
    assert response.status_code == 200
    body = response.json()
    assert body["x"] == 42
    assert body["y"] == 99


def test_patch_node_position_404(test_client):
    response = test_client.patch("/api/loom/nodes/9999/position", json={"x": 1, "y": 1})
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tapestry
# ---------------------------------------------------------------------------


def test_tapestry_shape_has_no_edges(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Tapestry Thread", "color": "thread-1"}).json()
    response = test_client.get("/api/loom/tapestry")
    assert response.status_code == 200
    data = response.json()
    assert "threads" in data and "nodes" in data
    assert "edges" not in data
    tapestry_thread = next(t for t in data["threads"] if t["id"] == thread["id"])
    assert "items" in tapestry_thread


# ---------------------------------------------------------------------------
# Thread items: insert, reorder, remove
# ---------------------------------------------------------------------------


def _thread_item_node_ids(test_client, thread_id):
    tapestry = test_client.get("/api/loom/tapestry").json()
    tapestry_thread = next(t for t in tapestry["threads"] if t["id"] == thread_id)
    return [item["node_id"] for item in tapestry_thread["items"]]


def test_insert_beat_between_start_and_end_renumbers(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Insert Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Middle beat"}).json()

    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    assert response.status_code == 201
    body = response.json()
    node_ids_in_order = [item["node_id"] for item in body["items"]]
    assert node_ids_in_order[0] != beat["id"]
    assert node_ids_in_order[-1] != beat["id"]
    assert beat["id"] in node_ids_in_order
    positions = [item["position"] for item in body["items"]]
    assert positions == sorted(positions)
    assert len(set(positions)) == len(positions)


def test_insert_same_node_twice_rejected_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Dup Thread", "color": "thread-1"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Event"}).json()

    test_client.post(
        f"/api/loom/threads/{thread['id']}/items", json={"node_id": session["id"], "position": 5}
    )
    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items", json={"node_id": session["id"], "position": 6}
    )
    assert response.status_code == 422


def test_insert_beat_exclusivity_enforced_422(test_client):
    thread_one = test_client.post("/api/loom/threads", json={"name": "Excl One", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Excl Two", "color": "thread-2"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Single-thread beat"}).json()

    first = test_client.post(
        f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    assert first.status_code == 201

    second = test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    assert second.status_code == 422


def test_insert_session_on_multiple_threads_independent_order(test_client):
    thread_one = test_client.post("/api/loom/threads", json={"name": "Shared One", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Shared Two", "color": "thread-2"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared session"}).json()

    r1 = test_client.post(
        f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": session["id"], "position": 5}
    )
    r2 = test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": session["id"], "position": 5}
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert session["id"] in _thread_item_node_ids(test_client, thread_one["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_two["id"])


def test_insert_unknown_thread_404(test_client):
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Orphan beat"}).json()
    response = test_client.post(
        "/api/loom/threads/9999/items", json={"node_id": beat["id"], "position": 5}
    )
    assert response.status_code == 404


def test_insert_unknown_node_404(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Insert 404 Thread", "color": "thread-1"}).json()
    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items", json={"node_id": 9999, "position": 5}
    )
    assert response.status_code == 404


def test_insert_start_or_end_kind_rejected_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "No Pin Insert", "color": "thread-1"}).json()
    other_thread = test_client.post("/api/loom/threads", json={"name": "Pin Source", "color": "thread-2"}).json()
    other_start_id = _thread_item_node_ids(test_client, other_thread["id"])[0]

    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items", json={"node_id": other_start_id, "position": 5}
    )
    assert response.status_code == 422


def test_reorder_beat_clamps_before_start_and_after_end(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Reorder Thread", "color": "thread-1"}).json()
    beat_one = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Beat one"}).json()
    beat_two = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Beat two"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat_one["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat_two["id"], "position": 6})

    response = test_client.patch(
        f"/api/loom/threads/{thread['id']}/items/{beat_two['id']}", json={"position": -1000}
    )
    assert response.status_code == 200
    node_ids_in_order = [item["node_id"] for item in response.json()["items"]]
    assert node_ids_in_order[0] != beat_two["id"]
    assert node_ids_in_order.index(beat_two["id"]) == 1

    response = test_client.patch(
        f"/api/loom/threads/{thread['id']}/items/{beat_two['id']}", json={"position": 1000}
    )
    assert response.status_code == 200
    node_ids_in_order = [item["node_id"] for item in response.json()["items"]]
    assert node_ids_in_order[-1] != beat_two["id"]
    assert node_ids_in_order.index(beat_two["id"]) == len(node_ids_in_order) - 2


def test_reorder_start_or_end_rejected_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Reorder Pin Thread", "color": "thread-1"}).json()
    start_id = _thread_item_node_ids(test_client, thread["id"])[0]

    response = test_client.patch(
        f"/api/loom/threads/{thread['id']}/items/{start_id}", json={"position": 5}
    )
    assert response.status_code == 422


def test_reorder_not_a_member_404(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Reorder 404 Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Unplaced"}).json()

    response = test_client.patch(
        f"/api/loom/threads/{thread['id']}/items/{beat['id']}", json={"position": 5}
    )
    assert response.status_code == 404


def test_remove_membership_renumbers_and_keeps_node(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Remove Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Removable beat"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.delete(f"/api/loom/threads/{thread['id']}/items/{beat['id']}")
    assert response.status_code == 204

    remaining = _thread_item_node_ids(test_client, thread["id"])
    assert beat["id"] not in remaining
    assert len(remaining) == 2

    node_still_exists = test_client.get("/api/loom/tapestry").json()
    assert any(n["id"] == beat["id"] for n in node_still_exists["nodes"])


def test_remove_start_or_end_rejected_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Remove Pin Thread", "color": "thread-1"}).json()
    start_id = _thread_item_node_ids(test_client, thread["id"])[0]

    response = test_client.delete(f"/api/loom/threads/{thread['id']}/items/{start_id}")
    assert response.status_code == 422


def test_remove_not_a_member_404(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Remove 404 Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Unplaced"}).json()

    response = test_client.delete(f"/api/loom/threads/{thread['id']}/items/{beat['id']}")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Beat lifecycle: fulfil, bank, restore, spawn
# ---------------------------------------------------------------------------


def test_fulfil_beat_preserves_order_and_stamps_provenance(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Fulfil Thread", "color": "thread-1"}).json()
    beat_one = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Get the Amulet of Fire"}).json()
    beat_two = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Beat two"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat_one["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat_two["id"], "position": 6})

    order_before = _thread_item_node_ids(test_client, thread["id"])

    response = test_client.post(f"/api/loom/nodes/{beat_one['id']}/fulfil")
    assert response.status_code == 200
    node = response.json()
    assert node["kind"] == "session"
    assert node["title"] == "Get the Amulet of Fire"
    assert node["fulfilled_planned_title"] == "Get the Amulet of Fire"
    assert node["fulfilled_at"] is not None

    assert _thread_item_node_ids(test_client, thread["id"]) == order_before


def test_fulfil_beat_with_new_title(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Fulfil Retitle Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Planned wording"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.post(f"/api/loom/nodes/{beat['id']}/fulfil", json={"title": "What actually happened"})
    assert response.status_code == 200
    node = response.json()
    assert node["title"] == "What actually happened"
    assert node["fulfilled_planned_title"] == "Planned wording"


def test_fulfil_unplaced_beat_422(test_client):
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Unplaced beat"}).json()
    response = test_client.post(f"/api/loom/nodes/{beat['id']}/fulfil")
    assert response.status_code == 422


def test_fulfil_non_beat_422(test_client):
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Already a session"}).json()
    response = test_client.post(f"/api/loom/nodes/{session['id']}/fulfil")
    assert response.status_code == 422


def test_fulfil_404(test_client):
    response = test_client.post("/api/loom/nodes/9999/fulfil")
    assert response.status_code == 404


def test_fulfil_then_revert_restores_wording(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Revert Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Original planned wording"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5})

    fulfilled = test_client.post(
        f"/api/loom/nodes/{beat['id']}/fulfil", json={"title": "What happened instead"}
    ).json()
    assert fulfilled["kind"] == "session"

    revert = test_client.put(
        f"/api/loom/nodes/{beat['id']}",
        json={"kind": "beat", "title": fulfilled["fulfilled_planned_title"]},
    )
    assert revert.status_code == 200
    reverted = revert.json()
    assert reverted["kind"] == "beat"
    assert reverted["title"] == "Original planned wording"
    assert reverted["fulfilled_planned_title"] is None
    assert reverted["fulfilled_at"] is None
    assert beat["id"] in _thread_item_node_ids(test_client, thread["id"])


def test_kind_change_rejected_when_not_a_fulfil_undo(test_client):
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Never fulfilled"}).json()
    response = test_client.put(
        f"/api/loom/nodes/{session['id']}", json={"kind": "beat", "title": "Never fulfilled"}
    )
    assert response.status_code == 422


def test_bank_then_restore_onto_another_thread(test_client):
    thread_one = test_client.post("/api/loom/threads", json={"name": "Bank Source", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Bank Target", "color": "thread-2"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Reusable beat"}).json()
    test_client.post(f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.post(f"/api/loom/nodes/{beat['id']}/bank")
    assert response.status_code == 200
    banked = response.json()
    assert banked["banked_from_thread_id"] == thread_one["id"]
    assert banked["thread_ids"] == []
    assert beat["id"] not in _thread_item_node_ids(test_client, thread_one["id"])

    restore = test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    assert restore.status_code == 201
    assert beat["id"] in _thread_item_node_ids(test_client, thread_two["id"])

    node_after = test_client.get("/api/loom/tapestry").json()
    restored_node = next(n for n in node_after["nodes"] if n["id"] == beat["id"])
    assert restored_node["banked_from_thread_id"] is None


def test_bank_unplaced_beat_422(test_client):
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Never placed"}).json()
    response = test_client.post(f"/api/loom/nodes/{beat['id']}/bank")
    assert response.status_code == 422


def test_bank_non_beat_422(test_client):
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "A session"}).json()
    response = test_client.post(f"/api/loom/nodes/{session['id']}/bank")
    assert response.status_code == 422


def test_bank_404(test_client):
    response = test_client.post("/api/loom/nodes/9999/bank")
    assert response.status_code == 404


def test_spawn_thread_from_session_sets_origin_and_auto_start_end(test_client):
    session = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Met the wizard"}
    ).json()
    spawned = test_client.post(
        "/api/loom/threads",
        json={"name": "Return the Wizard's Hat", "color": "thread-3", "origin_node_id": session["id"]},
    )
    assert spawned.status_code == 201
    body = spawned.json()
    assert body["origin_node_id"] == session["id"]

    items = _thread_item_node_ids(test_client, body["id"])
    kinds = {n["id"]: n["kind"] for n in test_client.get("/api/loom/tapestry").json()["nodes"] if n["id"] in items}
    assert sorted(kinds.values()) == ["end", "start"]


# ---------------------------------------------------------------------------
# Invariant tests (PC0)
# ---------------------------------------------------------------------------


def _count_kind(tapestry, thread_id, kind):
    """Count nodes of a given kind on a specific thread."""
    thread = next(t for t in tapestry["threads"] if t["id"] == thread_id)
    node_ids = {item["node_id"] for item in thread["items"]}
    return sum(1 for n in tapestry["nodes"] if n["id"] in node_ids and n["kind"] == kind)


def test_invariant_exactly_one_start_per_thread(test_client):
    """Every thread must have exactly one start node."""
    thread = test_client.post("/api/loom/threads", json={"name": "Invariant Thread", "color": "thread-1"}).json()
    tapestry = test_client.get("/api/loom/tapestry").json()
    assert _count_kind(tapestry, thread["id"], "start") == 1


def test_invariant_exactly_one_end_per_thread(test_client):
    """Every thread must have exactly one end node."""
    thread = test_client.post("/api/loom/threads", json={"name": "Invariant Thread", "color": "thread-1"}).json()
    tapestry = test_client.get("/api/loom/tapestry").json()
    assert _count_kind(tapestry, thread["id"], "end") == 1


def test_invariant_no_branch_inside_thread(test_client):
    """A beat is thread-exclusive: cannot appear on two threads simultaneously."""
    thread_one = test_client.post("/api/loom/threads", json={"name": "Branch A", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Branch B", "color": "thread-2"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Exclusive beat"}).json()

    test_client.post(
        f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    response = test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": beat["id"], "position": 5}
    )
    assert response.status_code == 422


def test_invariant_shared_session_edit_reflects_everywhere(test_client):
    """Editing a shared session once reflects the change on all threads."""
    thread_one = test_client.post("/api/loom/threads", json={"name": "Shared A", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Shared B", "color": "thread-2"}).json()
    session = test_client.post(
        "/api/loom/nodes", json={"kind": "session", "title": "Original title"}
    ).json()

    test_client.post(
        f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": session["id"], "position": 5}
    )
    test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": session["id"], "position": 5}
    )

    test_client.put(
        f"/api/loom/nodes/{session['id']}",
        json={"kind": "session", "title": "Updated title"},
    )

    tapestry = test_client.get("/api/loom/tapestry").json()
    node = next(n for n in tapestry["nodes"] if n["id"] == session["id"])
    assert node["title"] == "Updated title"
    assert session["id"] in _thread_item_node_ids(test_client, thread_one["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_two["id"])


def test_invariant_remove_shared_session_from_one_thread(test_client):
    """Removing a shared session from one thread leaves it on the other."""
    thread_one = test_client.post("/api/loom/threads", json={"name": "Remove A", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Remove B", "color": "thread-2"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared"}).json()

    test_client.post(
        f"/api/loom/threads/{thread_one['id']}/items", json={"node_id": session["id"], "position": 5}
    )
    test_client.post(
        f"/api/loom/threads/{thread_two['id']}/items", json={"node_id": session["id"], "position": 5}
    )

    test_client.delete(f"/api/loom/threads/{thread_one['id']}/items/{session['id']}")

    assert session["id"] not in _thread_item_node_ids(test_client, thread_one["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_two["id"])


# ---------------------------------------------------------------------------
# Move
# ---------------------------------------------------------------------------


def test_move_beat_between_threads_relocates(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "Move Beat A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "Move Beat B", "color": "thread-2"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Moving beat"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{beat['id']}/move",
        json={"target_thread_id": thread_b["id"], "position": 5},
    )
    assert response.status_code == 200
    body = response.json()
    assert "source" in body and "target" in body

    assert beat["id"] not in _thread_item_node_ids(test_client, thread_a["id"])
    assert beat["id"] in _thread_item_node_ids(test_client, thread_b["id"])


def test_move_sole_session_relocates_without_mode(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "Move Sole A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "Move Sole B", "color": "thread-2"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Sole session"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": session["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{session['id']}/move",
        json={"target_thread_id": thread_b["id"], "position": 5},
    )
    assert response.status_code == 200

    assert session["id"] not in _thread_item_node_ids(test_client, thread_a["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_b["id"])


def test_move_shared_session_no_mode_422(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "Shared NoMode A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "Shared NoMode B", "color": "thread-2"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared session"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": session["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread_b['id']}/items", json={"node_id": session["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{session['id']}/move",
        json={"target_thread_id": thread_b["id"], "position": 5},
    )
    assert response.status_code == 422


def test_move_shared_session_also_add_three_memberships(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "AlsoAdd A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "AlsoAdd B", "color": "thread-2"}).json()
    thread_c = test_client.post("/api/loom/threads", json={"name": "AlsoAdd C", "color": "thread-3"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared session"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": session["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread_b['id']}/items", json={"node_id": session["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{session['id']}/move",
        json={"target_thread_id": thread_c["id"], "position": 5, "mode": "also_add"},
    )
    assert response.status_code == 200

    assert session["id"] in _thread_item_node_ids(test_client, thread_a["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_b["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_c["id"])


def test_move_shared_session_also_add_already_on_target_422(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "AlsoAddDup A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "AlsoAddDup B", "color": "thread-2"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared session"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": session["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread_b['id']}/items", json={"node_id": session["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{session['id']}/move",
        json={"target_thread_id": thread_b["id"], "position": 5, "mode": "also_add"},
    )
    assert response.status_code == 422


def test_move_shared_session_mode_move_leaves_other_memberships(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "MoveMode A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "MoveMode B", "color": "thread-2"}).json()
    thread_c = test_client.post("/api/loom/threads", json={"name": "MoveMode C", "color": "thread-3"}).json()
    session = test_client.post("/api/loom/nodes", json={"kind": "session", "title": "Shared session"}).json()
    test_client.post(f"/api/loom/threads/{thread_a['id']}/items", json={"node_id": session["id"], "position": 5})
    test_client.post(f"/api/loom/threads/{thread_b['id']}/items", json={"node_id": session["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{session['id']}/move",
        json={"target_thread_id": thread_c["id"], "position": 5, "mode": "move"},
    )
    assert response.status_code == 200

    assert session["id"] not in _thread_item_node_ids(test_client, thread_a["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_b["id"])
    assert session["id"] in _thread_item_node_ids(test_client, thread_c["id"])


def test_move_same_thread_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Same Thread", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Staying beat"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items/{beat['id']}/move",
        json={"target_thread_id": thread["id"], "position": 5},
    )
    assert response.status_code == 422


def test_move_not_a_member_404(test_client):
    thread_a = test_client.post("/api/loom/threads", json={"name": "NotMember A", "color": "thread-1"}).json()
    thread_b = test_client.post("/api/loom/threads", json={"name": "NotMember B", "color": "thread-2"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Unplaced beat"}).json()

    response = test_client.post(
        f"/api/loom/threads/{thread_a['id']}/items/{beat['id']}/move",
        json={"target_thread_id": thread_b["id"], "position": 5},
    )
    assert response.status_code == 404


def test_move_nonexistent_target_thread_404(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Bad Target", "color": "thread-1"}).json()
    beat = test_client.post("/api/loom/nodes", json={"kind": "beat", "title": "Placed beat"}).json()
    test_client.post(f"/api/loom/threads/{thread['id']}/items", json={"node_id": beat["id"], "position": 5})

    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items/{beat['id']}/move",
        json={"target_thread_id": 9999, "position": 5},
    )
    assert response.status_code == 404


def test_move_start_or_end_422(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "No Move Pin", "color": "thread-1"}).json()
    other = test_client.post("/api/loom/threads", json={"name": "No Move Target", "color": "thread-2"}).json()
    start_id = _thread_item_node_ids(test_client, thread["id"])[0]

    response = test_client.post(
        f"/api/loom/threads/{thread['id']}/items/{start_id}/move",
        json={"target_thread_id": other["id"], "position": 5},
    )
    assert response.status_code == 422
