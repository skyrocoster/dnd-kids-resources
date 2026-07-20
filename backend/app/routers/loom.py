from fastapi import APIRouter, HTTPException, Query
from typing import List
import sqlite3

from ..db import get_db, dict_from_row
from ..schemas import (
    LoomSession,
    LoomSessionCreate,
    LoomSessionLogRequest,
    LoomSessionUpdate,
    LoomThread,
    LoomThreadCreate,
    LoomThreadUpdate,
    LoomNode,
    LoomNodeCreate,
    LoomNodeUpdate,
    LoomNodeFulfil,
    LoomThreadItemCreate,
    LoomThreadItemPositionUpdate,
    LoomTapestry,
    LoomTapestryThread,
    LoomNodeMove,
    LoomThreadMoveResult,
)

router = APIRouter(prefix="/api", tags=["loom"])

_SESSION_COLUMNS = "id, ordinal, name, played_on, notes"
_NODE_COLUMNS = """id, thread_id, kind, title, body, session_id, position, carried_count,
                   fulfilled_planned_title,
                   fulfilled_at, banked_from_thread_id"""
_THREAD_COLUMNS = "id, name, color, description, origin_node_id"


def _load_node(cursor, node_id: int) -> dict:
    cursor.execute(f"SELECT {_NODE_COLUMNS} FROM loom_nodes WHERE id = ?", (node_id,))
    row = cursor.fetchone()
    if not row:
        return None
    return dict_from_row(row)


def _thread_ordered(cursor, thread_id: int):
    """Ordered (node_id list, node_id -> position map) for one thread."""
    cursor.execute(
        "SELECT id AS node_id, position FROM loom_nodes WHERE thread_id = ? ORDER BY position ASC",
        (thread_id,),
    )
    rows = cursor.fetchall()
    return [row["node_id"] for row in rows], {row["node_id"]: row["position"] for row in rows}


def _renumber_thread(cursor, thread_id: int, ordered_node_ids: List[int]) -> None:
    for index, node_id in enumerate(ordered_node_ids):
        cursor.execute(
            "UPDATE loom_nodes SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND id = ?",
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
    return dict_from_row(thread_row)


def _fetch_thread_row(cursor, thread_id: int):
    cursor.execute(f"SELECT {_THREAD_COLUMNS} FROM loom_threads WHERE id = ?", (thread_id,))
    return cursor.fetchone()


# ---------------------------------------------------------------------------
# Tapestry
# ---------------------------------------------------------------------------


@router.get("/loom/tapestry", response_model=LoomTapestry)
def get_tapestry():
    """One-shot read: ordered sessions, threads, and thread-exclusive nodes."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(f"SELECT {_SESSION_COLUMNS} FROM loom_sessions ORDER BY ordinal")
        sessions = [dict_from_row(row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT {_THREAD_COLUMNS} FROM loom_threads ORDER BY id")
        threads = [_load_tapestry_thread(cursor, row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT {_NODE_COLUMNS} FROM loom_nodes ORDER BY thread_id, position, id")
        nodes = [dict_from_row(row) for row in cursor.fetchall()]

        return {"sessions": sessions, "threads": threads, "nodes": nodes}


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


@router.get("/loom/sessions", response_model=List[LoomSession])
def list_sessions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {_SESSION_COLUMNS} FROM loom_sessions ORDER BY ordinal LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict_from_row(row) for row in cursor.fetchall()]


@router.post("/loom/sessions", response_model=LoomSession, status_code=201)
def create_session(session: LoomSessionCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO loom_sessions (ordinal, name, played_on, notes) VALUES (?, ?, ?, ?)",
                (session.ordinal, session.name, session.played_on, session.notes),
            )
            session_id = cursor.lastrowid
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A session with this ordinal already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create session: {str(e)}")

        cursor.execute(f"SELECT {_SESSION_COLUMNS} FROM loom_sessions WHERE id = ?", (session_id,))
        return dict_from_row(cursor.fetchone())


@router.put("/loom/sessions/{session_id}", response_model=LoomSession)
def update_session(session_id: int, session: LoomSessionUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_sessions WHERE id = ?", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        try:
            cursor.execute(
                """UPDATE loom_sessions SET ordinal = ?, name = ?, played_on = ?, notes = ?,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (session.ordinal, session.name, session.played_on, session.notes, session_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A session with this ordinal already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update session: {str(e)}")

        cursor.execute(f"SELECT {_SESSION_COLUMNS} FROM loom_sessions WHERE id = ?", (session_id,))
        return dict_from_row(cursor.fetchone())


@router.delete("/loom/sessions/{session_id}", status_code=204)
def delete_session(session_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loom_sessions WHERE id = ?", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        cursor.execute("SELECT 1 FROM loom_nodes WHERE session_id = ? LIMIT 1", (session_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=422, detail="Cannot delete a session with nodes")

        try:
            cursor.execute("DELETE FROM loom_sessions WHERE id = ?", (session_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete session: {str(e)}")


@router.post("/loom/sessions/log", response_model=LoomSession, status_code=201)
def log_session(payload: LoomSessionLogRequest):
    """Log a new session with per-thread outcomes in one transaction."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO loom_sessions (ordinal, name, played_on, notes) VALUES (?, ?, ?, ?)",
                (payload.ordinal, payload.name, payload.played_on, payload.notes),
            )
            session_id = cursor.lastrowid

            for thread_id, thread_outcome in payload.outcomes.items():
                cursor.execute("SELECT id FROM loom_threads WHERE id = ?", (thread_id,))
                if not cursor.fetchone():
                    raise ValueError(f"Unknown thread {thread_id}")

                outcome = thread_outcome.outcome

                if outcome == "quiet":
                    continue

                cursor.execute(
                    """SELECT id, kind, title FROM loom_nodes
                       WHERE thread_id = ? AND kind = 'beat'
                       ORDER BY position ASC LIMIT 1""",
                    (thread_id,),
                )
                beat = cursor.fetchone()
                if not beat:
                    raise ValueError(f"No pending beat on thread {thread_id}")

                beat_id = beat["id"]

                if outcome in ("happened", "fulfilled"):
                    new_title = thread_outcome.title or beat["title"]
                    cursor.execute(
                        """UPDATE loom_nodes SET kind = 'session', title = ?,
                           session_id = ?, fulfilled_planned_title = ?,
                           fulfilled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                           WHERE id = ?""",
                        (new_title, session_id, beat["title"], beat_id),
                    )

                elif outcome in ("not_reached", "carried"):
                    cursor.execute(
                        """UPDATE loom_nodes SET carried_count = carried_count + 1,
                           updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                        (beat_id,),
                    )

                elif outcome == "banked":
                    cursor.execute(
                        """UPDATE loom_nodes SET thread_id = NULL, session_id = NULL,
                           position = 0, banked_from_thread_id = ?,
                           updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                        (thread_id, beat_id),
                    )
                    remaining_ids, _ = _thread_ordered(cursor, thread_id)
                    _renumber_thread(cursor, thread_id, remaining_ids)

            conn.commit()
        except ValueError as e:
            conn.rollback()
            raise HTTPException(status_code=422, detail=str(e))
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A session with this ordinal already exists")
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to log session: {str(e)}")

        cursor.execute(f"SELECT {_SESSION_COLUMNS} FROM loom_sessions WHERE id = ?", (session_id,))
        return dict_from_row(cursor.fetchone())


# ---------------------------------------------------------------------------
# Threads
# --------------------------------------------------------------------------


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

            cursor.execute(
                "INSERT INTO loom_nodes (thread_id, kind, title, position) VALUES (?, 'start', ?, 0)",
                (thread_id, start_title),
            )
            cursor.execute(
                "INSERT INTO loom_nodes (thread_id, kind, title, position) VALUES (?, 'end', ?, 10)",
                (thread_id, end_title),
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

        try:
            cursor.execute("DELETE FROM loom_nodes WHERE thread_id = ?", (thread_id,))
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
        try:
            cursor.execute(
                """INSERT INTO loom_nodes
                   (thread_id, kind, title, body, session_id, position, carried_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    node.thread_id,
                    node.kind,
                    node.title,
                    node.body,
                    node.session_id,
                    node.position,
                    node.carried_count,
                ),
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
                    """UPDATE loom_nodes SET thread_id = ?, kind = 'beat', title = ?, body = ?,
                       session_id = ?, position = ?, carried_count = ?,
                       fulfilled_planned_title = NULL, fulfilled_at = NULL, updated_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    (
                        node.thread_id,
                        node.title,
                        node.body,
                        node.session_id,
                        node.position,
                        node.carried_count,
                        node_id,
                    ),
                )
            else:
                cursor.execute(
                    """UPDATE loom_nodes SET thread_id = ?, title = ?, body = ?,
                       session_id = ?, position = ?, carried_count = ?,
                       updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                    (
                        node.thread_id,
                        node.title,
                        node.body,
                        node.session_id,
                        node.position,
                        node.carried_count,
                        node_id,
                    ),
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
    """Convert a placed beat into a session in place."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT kind, title, thread_id, session_id FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] != "beat":
            raise HTTPException(status_code=422, detail="Only a beat can be fulfilled")
        if row["thread_id"] is None:
            raise HTTPException(status_code=422, detail="Beat must be placed on a thread to be fulfilled")
        if row["session_id"] is None:
            raise HTTPException(status_code=422, detail="Beat must have a session_id to be fulfilled")

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
        cursor.execute("SELECT kind, thread_id FROM loom_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        if row["kind"] != "beat":
            raise HTTPException(status_code=422, detail="Only a beat can be banked")
        if row["thread_id"] is None:
            raise HTTPException(status_code=422, detail="Beat is not placed on a thread")
        thread_id = row["thread_id"]

        try:
            cursor.execute(
                """UPDATE loom_nodes SET thread_id = NULL, session_id = NULL, position = 0,
                   banked_from_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
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

        cursor.execute("SELECT kind, thread_id FROM loom_nodes WHERE id = ?", (item.node_id,))
        node_row = cursor.fetchone()
        if not node_row:
            raise HTTPException(status_code=404, detail="Node not found")
        if node_row["kind"] not in ("beat", "session"):
            raise HTTPException(
                status_code=422, detail="Only beat or session nodes can be placed on a thread"
            )

        if node_row["thread_id"] == thread_id:
            raise HTTPException(status_code=422, detail="Node is already a member of this thread")
        if node_row["thread_id"] is not None:
            raise HTTPException(status_code=422, detail="Node is already placed on another thread")

        existing_ids, positions_by_node = _thread_ordered(cursor, thread_id)
        index = _clamped_index(existing_ids, positions_by_node, item.position)
        new_order = existing_ids[:index] + [item.node_id] + existing_ids[index:]

        try:
            cursor.execute(
                """UPDATE loom_nodes SET thread_id = ?, banked_from_thread_id = NULL,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (thread_id, item.node_id),
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

        cursor.execute("SELECT kind, thread_id FROM loom_nodes WHERE id = ?", (node_id,))
        node_row = cursor.fetchone()
        if not node_row or node_row["thread_id"] != thread_id:
            raise HTTPException(status_code=404, detail="Node is not a member of this thread")
        if node_row["kind"] in ("start", "end"):
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

        cursor.execute("SELECT kind, thread_id FROM loom_nodes WHERE id = ?", (node_id,))
        node_row = cursor.fetchone()
        if not node_row or node_row["thread_id"] != thread_id:
            raise HTTPException(status_code=404, detail="Node is not a member of this thread")
        if node_row["kind"] in ("start", "end"):
            raise HTTPException(
                status_code=422, detail="Cannot remove Start/End; delete the thread instead"
            )

        try:
            cursor.execute(
                """UPDATE loom_nodes SET thread_id = NULL, session_id = NULL, position = 0,
                   banked_from_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (thread_id, node_id),
            )
            remaining_ids, _ = _thread_ordered(cursor, thread_id)
            _renumber_thread(cursor, thread_id, remaining_ids)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to remove node from thread: {str(e)}")


@router.post("/loom/threads/{thread_id}/items/{node_id}/move", response_model=LoomThreadMoveResult)
def move_thread_item(thread_id: int, node_id: int, body: LoomNodeMove):
    with get_db() as conn:
        cursor = conn.cursor()

        # 1 — both threads exist and are different
        source_row = _fetch_thread_row(cursor, thread_id)
        if not source_row:
            raise HTTPException(status_code=404, detail="Thread not found")

        target_row = _fetch_thread_row(cursor, body.target_thread_id)
        if not target_row:
            raise HTTPException(status_code=404, detail="Target thread not found")

        if body.target_thread_id == thread_id:
            raise HTTPException(
                status_code=422, detail="Use the reorder endpoint to move within the same thread"
            )

        cursor.execute("SELECT kind, thread_id FROM loom_nodes WHERE id = ?", (node_id,))
        node_row = cursor.fetchone()
        if not node_row or node_row["thread_id"] != thread_id:
            raise HTTPException(status_code=404, detail="Node is not a member of this thread")

        kind = node_row["kind"]
        if kind in ("start", "end"):
            raise HTTPException(status_code=422, detail="Start/End position is fixed")

        target_thread_id = body.target_thread_id

        source_ids, _ = _thread_ordered(cursor, thread_id)
        source_remaining = [n for n in source_ids if n != node_id]

        target_ids, target_positions = _thread_ordered(cursor, target_thread_id)
        target_index = _clamped_index(target_ids, target_positions, body.position)
        target_new_order = target_ids[:target_index] + [node_id] + target_ids[target_index:]

        try:
            cursor.execute(
                """UPDATE loom_nodes SET thread_id = ?, banked_from_thread_id = NULL,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (target_thread_id, node_id),
            )
            _renumber_thread(cursor, thread_id, source_remaining)
            _renumber_thread(cursor, target_thread_id, target_new_order)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to move node: {str(e)}")

        return {
            "source": _load_tapestry_thread(cursor, _fetch_thread_row(cursor, thread_id)),
            "target": _load_tapestry_thread(cursor, _fetch_thread_row(cursor, target_thread_id)),
        }
