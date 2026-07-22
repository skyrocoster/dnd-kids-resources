from fastapi import APIRouter, HTTPException, Response
import json

from ..db import get_db, parse_json_value
from ..schemas import MapSessionStateBlob

router = APIRouter(prefix="/api", tags=["session_state"])


@router.get("/dungeons/{dungeon_id}/session-state", response_model=MapSessionStateBlob)
def get_dungeon_session_state(dungeon_id: int) -> dict:
    """Get the permanent door/stair/portal toggle state for a dungeon"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session state not found")
        return {"data": parse_json_value(row["data"])}


@router.put("/dungeons/{dungeon_id}/session-state", response_model=MapSessionStateBlob)
def save_dungeon_session_state(dungeon_id: int, blob: MapSessionStateBlob) -> dict:
    """Save/upsert the door/stair/portal toggle state for a dungeon"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
        try:
            cursor.execute(
                """INSERT INTO map_session_state (dungeon_id, data) VALUES (?, ?)
                   ON CONFLICT(dungeon_id) DO UPDATE SET data = excluded.data""",
                (dungeon_id, json.dumps(blob.data)),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to save session state: {str(e)}")

        cursor.execute("SELECT data FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        return {"data": parse_json_value(row["data"])}


@router.delete("/dungeons/{dungeon_id}/session-state", status_code=204)
def reset_dungeon_session_state(dungeon_id: int) -> Response:
    """Reset a dungeon's toggle state to its authored defaults (removes the saved row, if any)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
        conn.commit()
        return Response(status_code=204)
