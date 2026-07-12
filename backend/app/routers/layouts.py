from fastapi import APIRouter, HTTPException
import json

from ..db import get_db, parse_json_value
from ..schemas import MapLayoutBlob

router = APIRouter(prefix="/api", tags=["layouts"])


@router.get("/dungeons/{dungeon_id}/layout", response_model=MapLayoutBlob)
def get_dungeon_layout(dungeon_id: int) -> dict:
    """Get the layout for a dungeon (Map Lab editor stage)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Layout not found")
        return {"data": parse_json_value(row["data"])}


@router.put("/dungeons/{dungeon_id}/layout", response_model=MapLayoutBlob)
def save_dungeon_layout(dungeon_id: int, blob: MapLayoutBlob) -> dict:
    """Save/upsert the layout for a dungeon (Map Lab editor stage)"""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO map_layout (dungeon_id, data) VALUES (?, ?)
                   ON CONFLICT(dungeon_id) DO UPDATE SET data = excluded.data""",
                (dungeon_id, json.dumps(blob.data)),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to save layout: {str(e)}")

        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        return {"data": parse_json_value(row["data"])}
