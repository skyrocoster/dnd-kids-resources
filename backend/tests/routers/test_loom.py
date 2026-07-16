"""Tests for the Loom router: thread/node/edge CRUD, tapestry read, cycle guard."""


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


def test_thread_crud(test_client):
    response = test_client.post(
        "/api/loom/threads", json={"name": "The Lost Puppy", "color": "thread-3"}
    )
    assert response.status_code == 201
    thread = response.json()
    assert thread["name"] == "The Lost Puppy"
    assert thread["color"] == "thread-3"
    thread_id = thread["id"]

    response = test_client.get("/api/loom/threads")
    assert response.status_code == 200
    assert any(t["id"] == thread_id for t in response.json())

    response = test_client.put(
        f"/api/loom/threads/{thread_id}",
        json={"name": "The Lost Puppy", "color": "thread-1", "description": "renamed"},
    )
    assert response.status_code == 200
    assert response.json()["color"] == "thread-1"

    response = test_client.delete(f"/api/loom/threads/{thread_id}")
    assert response.status_code == 204

    response = test_client.get("/api/loom/threads")
    assert not any(t["id"] == thread_id for t in response.json())


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


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


def test_create_node_with_memberships(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Membership Thread", "color": "thread-1"})
    thread_id = thread.json()["id"]

    response = test_client.post(
        "/api/loom/nodes",
        json={
            "kind": "update",
            "title": "Puppy goes missing",
            "x": 10,
            "y": 20,
            "thread_ids": [thread_id],
        },
    )
    assert response.status_code == 201
    node = response.json()
    assert node["thread_ids"] == [thread_id]
    assert node["status"] is None


def test_create_node_unknown_thread_id_422(test_client):
    response = test_client.post(
        "/api/loom/nodes",
        json={"kind": "update", "title": "Orphan", "x": 0, "y": 0, "thread_ids": [9999]},
    )
    assert response.status_code == 422


def test_create_anchor_without_status_422(test_client):
    response = test_client.post(
        "/api/loom/nodes",
        json={"kind": "anchor", "title": "Confront the goblin chief", "x": 0, "y": 0},
    )
    assert response.status_code == 422


def test_create_update_with_status_422(test_client):
    response = test_client.post(
        "/api/loom/nodes",
        json={"kind": "update", "title": "Bad update", "status": "planned", "x": 0, "y": 0},
    )
    assert response.status_code == 422


def test_update_node_junction_replace(test_client):
    thread_one = test_client.post("/api/loom/threads", json={"name": "Thread One", "color": "thread-1"}).json()
    thread_two = test_client.post("/api/loom/threads", json={"name": "Thread Two", "color": "thread-2"}).json()

    node = test_client.post(
        "/api/loom/nodes",
        json={"kind": "update", "title": "Original", "x": 0, "y": 0, "thread_ids": [thread_one["id"]]},
    ).json()

    response = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={
            "kind": "update",
            "title": "Revised",
            "x": 5,
            "y": 5,
            "thread_ids": [thread_two["id"]],
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Revised"
    assert updated["thread_ids"] == [thread_two["id"]]


def test_update_node_kind_immutable_422(test_client):
    node = test_client.post(
        "/api/loom/nodes", json={"kind": "update", "title": "Original", "x": 0, "y": 0}
    ).json()

    response = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={"kind": "anchor", "title": "Original", "status": "planned", "x": 0, "y": 0},
    )
    assert response.status_code == 422


def test_update_node_404(test_client):
    response = test_client.put(
        "/api/loom/nodes/9999", json={"kind": "update", "title": "Nope", "x": 0, "y": 0}
    )
    assert response.status_code == 404


def test_anchor_status_transition(test_client):
    node = test_client.post(
        "/api/loom/nodes",
        json={"kind": "anchor", "title": "Secret tunnel discovered", "status": "planned", "x": 0, "y": 0},
    ).json()

    response = test_client.put(
        f"/api/loom/nodes/{node['id']}",
        json={"kind": "anchor", "title": "Secret tunnel discovered", "status": "reached", "x": 0, "y": 0},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "reached"


def test_delete_node_404(test_client):
    response = test_client.delete("/api/loom/nodes/9999")
    assert response.status_code == 404


def test_delete_node_cascades_edges_and_memberships(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Cascade Thread", "color": "thread-1"}).json()
    a = test_client.post(
        "/api/loom/nodes", json={"kind": "update", "title": "A", "x": 0, "y": 0, "thread_ids": [thread["id"]]}
    ).json()
    b = test_client.post("/api/loom/nodes", json={"kind": "update", "title": "B", "x": 0, "y": 0}).json()
    edge = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]}).json()

    response = test_client.delete(f"/api/loom/nodes/{a['id']}")
    assert response.status_code == 204

    tapestry = test_client.get("/api/loom/tapestry").json()
    assert not any(e["id"] == edge["id"] for e in tapestry["edges"])
    assert not any(n["id"] == a["id"] for n in tapestry["nodes"])


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------


def _make_node(test_client, title, kind="update", status=None):
    payload = {"kind": kind, "title": title, "x": 0, "y": 0}
    if status is not None:
        payload["status"] = status
    return test_client.post("/api/loom/nodes", json=payload).json()


def test_create_edge_201(test_client):
    a = _make_node(test_client, "A")
    b = _make_node(test_client, "B")
    response = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]})
    assert response.status_code == 201
    assert response.json()["source_id"] == a["id"]
    assert response.json()["target_id"] == b["id"]


def test_create_edge_duplicate_409(test_client):
    a = _make_node(test_client, "A")
    b = _make_node(test_client, "B")
    test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]})
    response = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]})
    assert response.status_code == 409


def test_create_edge_self_loop_422(test_client):
    a = _make_node(test_client, "A")
    response = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": a["id"]})
    assert response.status_code == 422


def test_create_edge_unknown_node_422(test_client):
    a = _make_node(test_client, "A")
    response = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": 9999})
    assert response.status_code == 422


def test_create_edge_cycle_rejected_422(test_client):
    a = _make_node(test_client, "A")
    b = _make_node(test_client, "B")
    c = _make_node(test_client, "C")
    test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]})
    test_client.post("/api/loom/edges", json={"source_id": b["id"], "target_id": c["id"]})

    response = test_client.post("/api/loom/edges", json={"source_id": c["id"], "target_id": a["id"]})
    assert response.status_code == 422


def test_delete_edge_204(test_client):
    a = _make_node(test_client, "A")
    b = _make_node(test_client, "B")
    edge = test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]}).json()

    response = test_client.delete(f"/api/loom/edges/{edge['id']}")
    assert response.status_code == 204


def test_delete_edge_404(test_client):
    response = test_client.delete("/api/loom/edges/9999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tapestry
# ---------------------------------------------------------------------------


def test_tapestry_shape(test_client):
    thread = test_client.post("/api/loom/threads", json={"name": "Tapestry Thread", "color": "thread-1"}).json()
    a = test_client.post(
        "/api/loom/nodes", json={"kind": "update", "title": "A", "x": 0, "y": 0, "thread_ids": [thread["id"]]}
    ).json()
    b = _make_node(test_client, "B")
    test_client.post("/api/loom/edges", json={"source_id": a["id"], "target_id": b["id"]})

    response = test_client.get("/api/loom/tapestry")
    assert response.status_code == 200
    data = response.json()
    assert "threads" in data and "nodes" in data and "edges" in data
    node_a = next(n for n in data["nodes"] if n["id"] == a["id"])
    assert node_a["thread_ids"] == [thread["id"]]
