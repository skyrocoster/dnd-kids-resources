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
    LoomNodePosition,
    LoomNodeFulfil,
    LoomThreadItemCreate,
    LoomThreadItemPositionUpdate,
    LoomTapestry,
    LoomTapestryThread,
)

router = APIRouter(prefix="/api", tags=["loom"])

_NODE_COLUMNS = """id, kind, title, body, session_tag, x, y, fulfilled_planned_title,
                   fulfilled_at, banked_from_thread_id"""
_THREAD_COLUMNS = "id, name, color, description, origin_node_id"


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
    cursor.execute(f"SELECT {_NODE_COLUMNS} FROM loom_nodes WHERE id = ?", (node_id,))
    row = cursor.fetchone()
    if not row:
        return None
    node = dict_from_row(row)
    node["thread_ids"] = _node_thread_ids(cursor, [node_id]).get(node_id, [])
    return node


def _thread_ordered(cursor, thread_id: int):
    """Ordered (node_id list, node_id -> position map) for one thread."""
    cursor.execute(
        "SELECT node_id, position FROM loom_node_threads WHERE thread_id = ? ORDER BY position ASC",
        (thread_id,),
    )
    rows = cursor.fetchall()
    return [row["node_id"] for row in rows], {row["node_id"]: row["position"] for row in rows}


def _renumber_thread(cursor, thread_id: int, ordered_node_ids: List[int]) -> None:
    for index, node_id in enumerate(ordered_node_ids):
        cursor.execute(
            "UPDATE loom_node_threads SET position = ? WHERE thread_id = ? AND node_id = ?",
            (index * 10, thread_id, node_id),
        )


def _clamped_index(existing_ids: List[int], positions_by_node: dict, requested_position: int) -> int:
    """Index to insert at among *existing_ids* (Start first, End last), never before Start or after End."""
    index = 0
    for node_id in existing_ids:
        if positions_by_node[node_id] < requested_position:
            index += 1
        else:
            break
    return max(1, min(index, len(existing_ids) - 1))


def _load_tapestry_thread(cursor, thread_row) -> dict:
    thread = dict_from_row(thread_row)
    cursor.execute(
        "SELECT node_id, position FROM loom_node_threads WHERE thread_id = ? ORDER BY position ASC",
        (thread["id"],),
    )
    thread["items"] = [dict_from_row(row) for row in cursor.fetchall()]
    return thread


def _fetch_thread_row(cursor, thread_id: int):
    cursor.execute(f"SELECT {_THREAD_COLUMNS} FROM loom_threads WHERE id = ?", (thread_id,))
    return cursor.fetchone()


# ---------------------------------------------------------------------------
# Tapestry
# ---------------------------------------------------------------------------


@router.get("/loom/tapestry", response_model=LoomTapestry)
def get_tapestry():
    """One-shot read: threads with ordered membership, and node identities."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(f"SELECT {_THREAD_COLUMNS} FROM loom_threads ORDER BY id")
        threads = [_load_tapestry_thread(cursor, row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT {_NODE_COLUMNS} FROM loom_nodes ORDER BY id")
        nodes = [dict_from_row(row) for row in cursor.fetchall()]
        memberships = _node_thread_ids(cursor, [node["id"] for node in nodes])
        for node in nodes:
            node["thread_ids"] = memberships.get(node["id"], [])

        return {"threads": threads, "nodes": nodes}


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
            f"SELECT {_THREAD_COLUMNS} FROM loom_threads ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict_from_row(row) for row in cursor.fetchall()]


@router.post("/loom/threads", response_model=LoomThread, status_code=201)
def create_thread(thread: LoomThreadCreate):
    with get_db() as conn:
        cursor = conn.cursor()

        if thread.origin_node_id is not None:
            cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (thread.origin_node_id,))
            origin_row = cursor.fetchone()
            if not origin_row:
                raise HTTPException(status_code=422, detail="Unknown origin_node_id")
            if origin_row["kind"] != "session":
                raise HTTPException(
                    status_code=422, detail="origin_node_id must reference a session node"
                )

        try:
            cursor.execute(
                "INSERT INTO loom_threads (name, color, description, origin_node_id) VALUES (?, ?, ?, ?)",
                (thread.name, thread.color, thread.description, thread.origin_node_id),
            )
            thread_id = cursor.lastrowid

            start_title = thread.start_title or thread.name
            end_title = thread.end_title or f"Resolve: {thread.name}"

            cursor.execute("INSERT INTO loom_nodes (kind, title) VALUES ('start', ?)", (start_title,))
            start_id = cursor.lastrowid
            cursor.execute("INSERT INTO loom_nodes (kind, title) VALUES ('end', ?)", (end_title,))
            end_id = cursor.lastrowid

            cursor.execute(
                "INSERT INTO loom_node_threads (node_id, thread_id, position) VALUES (?, ?, 0)",
                (start_id, thread_id),
            )
            cursor.execute(
                "INSERT INTO loom_node_threads (node_id, thread_id, position) VALUES (?, ?, 10)",
                (end_id, thread_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A thread with this name already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create thread: {str(e)}")

        return dict_from_row(_fetch_thread_row(cursor, thread_id))


@router.put("/loom/threads/{thread_id}", response_model=LoomThread)
def update_thread(thread_id: int, thread: LoomThreadUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_threads WHERE id = ?", (thread_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Thread not found")

        try:
            cursor.execute(
                "UPDATE loom_threads SET name = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (thread.name, thread.color, thread.description, thread_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A thread with this name already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update thread: {str(e)}")

        return dict_from_row(_fetch_thread_row(cursor, thread_id))


@router.delete("/loom/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_threads WHERE id = ?", (thread_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Thread not found")

        # start/end/beat members are thread-exclusive; sessions may be shared and survive.
        cursor.execute(
            """SELECT lnt.node_id FROM loom_node_threads lnt
               JOIN loom_nodes ln ON ln.id = lnt.node_id
               WHERE lnt.thread_id = ? AND ln.kind IN ('start', 'end', 'beat')""",
            (thread_id,),
        )
        exclusive_node_ids = [row["node_id"] for row in cursor.fetchall()]

        try:
            cursor.execute("DELETE FROM loom_threads WHERE id = ?", (thread_id,))
            if exclusive_node_ids:
                placeholders = ",".join("?" for _ in exclusive_node_ids)
                cursor.execute(
                    f"DELETE FROM loom_nodes WHERE id IN ({placeholders})", exclusive_node_ids
                )
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
        try:
            cursor.execute(
                "INSERT INTO loom_nodes (kind, title, body, session_tag, x, y) VALUES (?, ?, ?, ?, ?, ?)",
                (node.kind, node.title, node.body, node.session_tag, node.x, node.y),
            )
            node_id = cursor.lastrowid
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create node: {str(e)}")

        return _load_node(cursor, node_id)


@router.put("/loom/nodes/{node_id}", response_model=LoomNode)
def update_node(node_id: int, node: LoomNodeUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind, fulfilled_planned_title FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")

        is_fulfil_undo = (
            row["kind"] == "session" and node.kind == "beat" and row["fulfilled_planned_title"] is not None
        )
        if row["kind"] != node.kind and not is_fulfil_undo:
            raise HTTPException(status_code=422, detail="Node kind is immutable")

        try:
            if is_fulfil_undo:
                cursor.execute(
                    """UPDATE loom_nodes SET kind = 'beat', title = ?, body = ?, session_tag = ?, x = ?, y = ?,
                       fulfilled_planned_title = NULL, fulfilled_at = NULL, updated_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    (node.title, node.body, node.session_tag, node.x, node.y, node_id),
                )
            else:
                cursor.execute(
                    """UPDATE loom_nodes SET title = ?, body = ?, session_tag = ?, x = ?, y = ?,
                       updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                    (node.title, node.body, node.session_tag, node.x, node.y, node_id),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update node: {str(e)}")

        return _load_node(cursor, node_id)


@router.patch("/loom/nodes/{node_id}/position", response_model=LoomNode)
def patch_node_position(node_id: int, position: LoomNodePosition):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_nodes WHERE id = ?", (node_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node not found")

        cursor.execute(
            "UPDATE loom_nodes SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (position.x, position.y, node_id),
        )
        conn.commit()

        return _load_node(cursor, node_id)


@router.delete("/loom/nodes/{node_id}", status_code=204)
def delete_node(node_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] in ("start", "end"):
            raise HTTPException(
                status_code=422, detail="Delete the thread to remove its Start/End nodes"
            )

        try:
            cursor.execute("DELETE FROM loom_nodes WHERE id = ?", (node_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete node: {str(e)}")


@router.post("/loom/nodes/{node_id}/fulfil", response_model=LoomNode)
def fulfil_beat(node_id: int, payload: LoomNodeFulfil = LoomNodeFulfil()):
    """Convert a placed beat into a session in place; memberships/positions untouched."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind, title FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] != "beat":
            raise HTTPException(status_code=422, detail="Only a beat can be fulfilled")

        cursor.execute("SELECT 1 FROM loom_node_threads WHERE node_id = ?", (node_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=422, detail="Beat must be placed on a thread to be fulfilled")

        new_title = payload.title if payload.title else row["title"]
        cursor.execute(
            """UPDATE loom_nodes SET kind = 'session', title = ?, fulfilled_planned_title = ?,
               fulfilled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
            (new_title, row["title"], node_id),
        )
        conn.commit()

        return _load_node(cursor, node_id)


@router.post("/loom/nodes/{node_id}/bank", response_model=LoomNode)
def bank_beat(node_id: int):
    """Unplace a beat, keeping it in the Beat Bank for later reuse."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] != "beat":
            raise HTTPException(status_code=422, detail="Only a beat can be banked")

        cursor.execute("SELECT thread_id FROM loom_node_threads WHERE node_id = ?", (node_id,))
        membership = cursor.fetchone()
        if not membership:
            raise HTTPException(status_code=422, detail="Beat is not placed on a thread")
        thread_id = membership["thread_id"]

        try:
            cursor.execute("DELETE FROM loom_node_threads WHERE node_id = ?", (node_id,))
            cursor.execute(
                "UPDATE loom_nodes SET banked_from_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (thread_id, node_id),
            )
            remaining_ids, _ = _thread_ordered(cursor, thread_id)
            _renumber_thread(cursor, thread_id, remaining_ids)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to bank beat: {str(e)}")

        return _load_node(cursor, node_id)


# ---------------------------------------------------------------------------
# Thread items (ordered membership)
# ---------------------------------------------------------------------------


@router.post("/loom/threads/{thread_id}/items", response_model=LoomTapestryThread, status_code=201)
def add_thread_item(thread_id: int, item: LoomThreadItemCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        if not _fetch_thread_row(cursor, thread_id):
            raise HTTPException(status_code=404, detail="Thread not found")

        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (item.node_id,))
        node_row = cursor.fetchone()
        if not node_row:
            raise HTTPException(status_code=404, detail="Node not found")
        if node_row["kind"] not in ("beat", "session"):
            raise HTTPException(
                status_code=422, detail="Only beat or session nodes can be placed on a thread"
            )

        cursor.execute(
            "SELECT 1 FROM loom_node_threads WHERE node_id = ? AND thread_id = ?",
            (item.node_id, thread_id),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=422, detail="Node is already a member of this thread")

        if node_row["kind"] == "beat":
            cursor.execute("SELECT 1 FROM loom_node_threads WHERE node_id = ?", (item.node_id,))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=422, detail="Beat is already placed on another thread; bank it first"
                )

        existing_ids, positions_by_node = _thread_ordered(cursor, thread_id)
        index = _clamped_index(existing_ids, positions_by_node, item.position)
        new_order = existing_ids[:index] + [item.node_id] + existing_ids[index:]

        try:
            cursor.execute(
                "INSERT INTO loom_node_threads (node_id, thread_id, position) VALUES (?, ?, -1)",
                (item.node_id, thread_id),
            )
            cursor.execute(
                """UPDATE loom_nodes SET banked_from_thread_id = NULL, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND banked_from_thread_id IS NOT NULL""",
                (item.node_id,),
            )
            _renumber_thread(cursor, thread_id, new_order)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to place node: {str(e)}")

        return _load_tapestry_thread(cursor, _fetch_thread_row(cursor, thread_id))


@router.patch("/loom/threads/{thread_id}/items/{node_id}", response_model=LoomTapestryThread)
def reorder_thread_item(thread_id: int, node_id: int, body: LoomThreadItemPositionUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        if not _fetch_thread_row(cursor, thread_id):
            raise HTTPException(status_code=404, detail="Thread not found")

        cursor.execute(
            "SELECT 1 FROM loom_node_threads WHERE node_id = ? AND thread_id = ?",
            (node_id, thread_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node is not a member of this thread")

        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (node_id,))
        if cursor.fetchone()["kind"] in ("start", "end"):
            raise HTTPException(status_code=422, detail="Start/End position is fixed")

        existing_ids, positions_by_node = _thread_ordered(cursor, thread_id)
        remaining = [n for n in existing_ids if n != node_id]
        index = _clamped_index(remaining, positions_by_node, body.position)
        new_order = remaining[:index] + [node_id] + remaining[index:]

        try:
            _renumber_thread(cursor, thread_id, new_order)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to reorder node: {str(e)}")

        return _load_tapestry_thread(cursor, _fetch_thread_row(cursor, thread_id))


@router.delete("/loom/threads/{thread_id}/items/{node_id}", status_code=204)
def remove_thread_item(thread_id: int, node_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        if not _fetch_thread_row(cursor, thread_id):
            raise HTTPException(status_code=404, detail="Thread not found")

        cursor.execute(
            "SELECT 1 FROM loom_node_threads WHERE node_id = ? AND thread_id = ?",
            (node_id, thread_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Node is not a member of this thread")

        cursor.execute("SELECT kind FROM loom_nodes WHERE id = ?", (node_id,))
        if cursor.fetchone()["kind"] in ("start", "end"):
            raise HTTPException(
                status_code=422, detail="Cannot remove Start/End; delete the thread instead"
            )

        try:
            cursor.execute(
                "DELETE FROM loom_node_threads WHERE node_id = ? AND thread_id = ?",
                (node_id, thread_id),
            )
            remaining_ids, _ = _thread_ordered(cursor, thread_id)
            _renumber_thread(cursor, thread_id, remaining_ids)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to remove node from thread: {str(e)}")
