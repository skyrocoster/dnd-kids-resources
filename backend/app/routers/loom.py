from fastapi import APIRouter, HTTPException, Query
from typing import List
import sqlite3

from ..db import get_db, dict_from_row
from ..schemas import (
    LoomThread,
    LoomThreadCreate,
    LoomThreadUpdate,
    LoomNode,
    LoomNodeCreate,
    LoomNodeUpdate,
    LoomEdge,
    LoomEdgeCreate,
    LoomTapestry,
)

router = APIRouter(prefix="/api", tags=["loom"])

# Any row returned means target can already reach source: inserting source->target
# would close a cycle.
_CYCLE_CHECK_SQL = """
    WITH RECURSIVE reachable(id) AS (
        SELECT ?
        UNION
        SELECT e.target_id FROM loom_edges e JOIN reachable r ON e.source_id = r.id
    )
    SELECT 1 FROM reachable WHERE id = ? LIMIT 1
"""


def _would_cycle(cursor, source_id: int, target_id: int) -> bool:
    cursor.execute(_CYCLE_CHECK_SQL, (target_id, source_id))
    return cursor.fetchone() is not None


def _node_thread_ids(cursor, node_ids: List[int]) -> dict:
    """One junction query, grouped in Python: node_id -> [thread_id, ...]."""
    if not node_ids:
        return {}
    placeholders = ",".join("?" for _ in node_ids)
    cursor.execute(
        f"SELECT node_id, thread_id FROM loom_node_threads WHERE node_id IN ({placeholders})",
        node_ids,
    )
    result: dict = {node_id: [] for node_id in node_ids}
    for row in cursor.fetchall():
        result[row["node_id"]].append(row["thread_id"])
    return result


def _load_node(cursor, node_id: int) -> dict:
    cursor.execute(
        "SELECT id, kind, title, body, status, session_tag, x, y FROM loom_nodes WHERE id = ?",
        (node_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    node = dict_from_row(row)
    node["thread_ids"] = _node_thread_ids(cursor, [node_id]).get(node_id, [])
    return node


# ---------------------------------------------------------------------------
# Tapestry
# ---------------------------------------------------------------------------


@router.get("/loom/tapestry", response_model=LoomTapestry)
def get_tapestry():
    """One-shot read of the whole flat DAG: threads, nodes (with thread_ids), edges."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id, name, color, description FROM loom_threads ORDER BY id")
        threads = [dict_from_row(row) for row in cursor.fetchall()]

        cursor.execute(
            "SELECT id, kind, title, body, status, session_tag, x, y FROM loom_nodes ORDER BY id"
        )
        nodes = [dict_from_row(row) for row in cursor.fetchall()]
        memberships = _node_thread_ids(cursor, [node["id"] for node in nodes])
        for node in nodes:
            node["thread_ids"] = memberships.get(node["id"], [])

        cursor.execute("SELECT id, source_id, target_id FROM loom_edges ORDER BY id")
        edges = [dict_from_row(row) for row in cursor.fetchall()]

        return {"threads": threads, "nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


@router.get("/loom/threads", response_model=List[LoomThread])
def list_threads(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, color, description FROM loom_threads ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict_from_row(row) for row in cursor.fetchall()]


@router.post("/loom/threads", response_model=LoomThread, status_code=201)
def create_thread(thread: LoomThreadCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO loom_threads (name, color, description) VALUES (?, ?, ?)",
                (thread.name, thread.color, thread.description),
            )
            conn.commit()
            thread_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A thread with this name already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create thread: {str(e)}")

        cursor.execute("SELECT id, name, color, description FROM loom_threads WHERE id = ?", (thread_id,))
        return dict_from_row(cursor.fetchone())


@router.put("/loom/threads/{thread_id}", response_model=LoomThread)
def update_thread(thread_id: int, thread: LoomThreadUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_threads WHERE id = ?", (thread_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Thread not found")

        try:
            cursor.execute(
                "UPDATE loom_threads SET name = ?, color = ?, description = ? WHERE id = ?",
                (thread.name, thread.color, thread.description, thread_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A thread with this name already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update thread: {str(e)}")

        cursor.execute("SELECT id, name, color, description FROM loom_threads WHERE id = ?", (thread_id,))
        return dict_from_row(cursor.fetchone())


@router.delete("/loom/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_threads WHERE id = ?", (thread_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Thread not found")

        try:
            cursor.execute("DELETE FROM loom_threads WHERE id = ?", (thread_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete thread: {str(e)}")


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


@router.post("/loom/nodes", response_model=LoomNode, status_code=201)
def create_node(node: LoomNodeCreate):
    with get_db() as conn:
        cursor = conn.cursor()

        if node.thread_ids:
            placeholders = ",".join("?" for _ in node.thread_ids)
            cursor.execute(
                f"SELECT id FROM loom_threads WHERE id IN ({placeholders})", node.thread_ids
            )
            found = {row["id"] for row in cursor.fetchall()}
            missing = set(node.thread_ids) - found
            if missing:
                raise HTTPException(status_code=422, detail=f"Unknown thread_id(s): {sorted(missing)}")

        try:
            cursor.execute(
                """INSERT INTO loom_nodes (kind, title, body, status, session_tag, x, y)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (node.kind, node.title, node.body, node.status, node.session_tag, node.x, node.y),
            )
            node_id = cursor.lastrowid
            for thread_id in node.thread_ids:
                cursor.execute(
                    "INSERT INTO loom_node_threads (node_id, thread_id) VALUES (?, ?)",
                    (node_id, thread_id),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create node: {str(e)}")

        return _load_node(cursor, node_id)


@router.put("/loom/nodes/{node_id}", response_model=LoomNode)
def update_node(node_id: int, node: LoomNodeUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] != node.kind:
            raise HTTPException(status_code=422, detail="Node kind is immutable")

        if node.thread_ids:
            placeholders = ",".join("?" for _ in node.thread_ids)
            cursor.execute(
                f"SELECT id FROM loom_threads WHERE id IN ({placeholders})", node.thread_ids
            )
            found = {row["id"] for row in cursor.fetchall()}
            missing = set(node.thread_ids) - found
            if missing:
                raise HTTPException(status_code=422, detail=f"Unknown thread_id(s): {sorted(missing)}")

        try:
            cursor.execute(
                """UPDATE loom_nodes SET title = ?, body = ?, status = ?, session_tag = ?, x = ?, y = ?,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (node.title, node.body, node.status, node.session_tag, node.x, node.y, node_id),
            )
            cursor.execute("DELETE FROM loom_node_threads WHERE node_id = ?", (node_id,))
            for thread_id in node.thread_ids:
                cursor.execute(
                    "INSERT INTO loom_node_threads (node_id, thread_id) VALUES (?, ?)",
                    (node_id, thread_id),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update node: {str(e)}")

        return _load_node(cursor, node_id)


@router.delete("/loom/nodes/{node_id}", status_code=204)
def delete_node(node_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_nodes WHERE id = ?", (node_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node not found")

        try:
            cursor.execute("DELETE FROM loom_nodes WHERE id = ?", (node_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete node: {str(e)}")


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------


@router.post("/loom/edges", response_model=LoomEdge, status_code=201)
def create_edge(edge: LoomEdgeCreate):
    if edge.source_id == edge.target_id:
        raise HTTPException(status_code=422, detail="An edge cannot connect a node to itself")

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM loom_nodes WHERE id IN (?, ?)", (edge.source_id, edge.target_id))
        found = {row["id"] for row in cursor.fetchall()}
        if edge.source_id not in found or edge.target_id not in found:
            raise HTTPException(status_code=422, detail="Unknown source_id or target_id")

        if _would_cycle(cursor, edge.source_id, edge.target_id):
            raise HTTPException(status_code=422, detail="This edge would create a cycle")

        try:
            cursor.execute(
                "INSERT INTO loom_edges (source_id, target_id) VALUES (?, ?)",
                (edge.source_id, edge.target_id),
            )
            conn.commit()
            edge_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=409, detail="These nodes are already connected")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create edge: {str(e)}")

        cursor.execute("SELECT id, source_id, target_id FROM loom_edges WHERE id = ?", (edge_id,))
        return dict_from_row(cursor.fetchone())


@router.delete("/loom/edges/{edge_id}", status_code=204)
def delete_edge(edge_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_edges WHERE id = ?", (edge_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Edge not found")

        try:
            cursor.execute("DELETE FROM loom_edges WHERE id = ?", (edge_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete edge: {str(e)}")
