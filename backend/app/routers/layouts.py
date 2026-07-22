from fastapi import APIRouter, HTTPException
from typing import List
import json

from ..db import get_db, parse_json_value
from ..schemas import MapLayoutBlob, IncomingGateway

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


@router.get("/dungeons/{dungeon_id}/incoming-gateways", response_model=List[IncomingGateway])
def get_incoming_gateways(dungeon_id: int) -> list:
    """List every portal in every other dungeon's layout that links into this dungeon"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")

        cursor.execute(
            """SELECT map_layout.dungeon_id AS dungeon_id, dungeons.title AS dungeon_title,
                      map_layout.data AS data
               FROM map_layout JOIN dungeons ON dungeons.id = map_layout.dungeon_id
               WHERE map_layout.dungeon_id != ?""",
            (dungeon_id,),
        )
        rows = cursor.fetchall()

    gateways = []
    for row in rows:
        layout = parse_json_value(row["data"])
        for portal in layout.get("portals", []):
            to = portal.get("to") or {}
            if to.get("dungeon_id") != dungeon_id:
                continue
            gateways.append(
                {
                    "dungeon_id": row["dungeon_id"],
                    "dungeon_title": row["dungeon_title"],
                    "portal_id": portal.get("portal_id"),
                    "title": portal.get("title"),
                    "z": portal.get("z"),
                    "cell": portal.get("cell"),
                }
            )
    return gateways


@router.put("/dungeons/{dungeon_id}/layout", response_model=MapLayoutBlob)
def save_dungeon_layout(dungeon_id: int, blob: MapLayoutBlob) -> dict:
    """Save/upsert the layout for a dungeon (Map Lab editor stage)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
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
