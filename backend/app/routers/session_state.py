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


_VALID_FIXTURE_KINDS = ("doors", "stairs", "props", "portals")
_VALID_OBSTACLE_LEAVES = ("armed", "shown")


def _normalize_session_state(data: dict) -> dict:
    """Keep only valid sparse runtime overrides: open, obstacle armed/shown, and partyRoomId.

    Prunes DC overrides and any layout/identity/descriptive/unknown leaves so session state
    holds runtime overrides only, preserving explicit false values. Empty obstacle parents,
    fixture entries, kind maps, and a final state with no overrides and no non-null
    partyRoomId are removed.
    """
    normalized: dict = {}
    for kind in _VALID_FIXTURE_KINDS:
        raw_fixtures = data.get(kind)
        if not isinstance(raw_fixtures, dict):
            continue
        fixtures: dict = {}
        for fixture_id, raw_entry in raw_fixtures.items():
            if not isinstance(raw_entry, dict):
                continue
            entry: dict = {}
            if "open" in raw_entry and isinstance(raw_entry["open"], bool):
                entry["open"] = raw_entry["open"]
            raw_obstacles = raw_entry.get("obstacles")
            if isinstance(raw_obstacles, dict):
                obstacles: dict = {}
                for obstacle_kind, raw_obstacle in raw_obstacles.items():
                    if not isinstance(raw_obstacle, dict):
                        continue
                    obstacle = {
                        leaf: value
                        for leaf, value in raw_obstacle.items()
                        if leaf in _VALID_OBSTACLE_LEAVES and isinstance(value, bool)
                    }
                    if obstacle:
                        obstacles[obstacle_kind] = obstacle
                if obstacles:
                    entry["obstacles"] = obstacles
            if entry:
                fixtures[fixture_id] = entry
        if fixtures:
            normalized[kind] = fixtures

    if data.get("partyRoomId") is not None:
        normalized["partyRoomId"] = data["partyRoomId"]
    return normalized


@router.put("/dungeons/{dungeon_id}/session-state", response_model=MapSessionStateBlob)
def save_dungeon_session_state(dungeon_id: int, blob: MapSessionStateBlob) -> dict:
    """Save/upsert normalized runtime toggle state, or clear the row when nothing remains"""
    normalized = _normalize_session_state(blob.data)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
        try:
            if normalized:
                cursor.execute(
                    """INSERT INTO map_session_state (dungeon_id, data) VALUES (?, ?)
                       ON CONFLICT(dungeon_id) DO UPDATE SET data = excluded.data""",
                    (dungeon_id, json.dumps(normalized)),
                )
            else:
                cursor.execute("DELETE FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to save session state: {str(e)}")

    return {"data": normalized}


@router.delete("/dungeons/{dungeon_id}/session-state", status_code=204)
def reset_dungeon_session_state(dungeon_id: int) -> Response:
    """Reset a dungeon's toggle state to its authored defaults (removes the saved row, if any)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
        conn.commit()
        return Response(status_code=204)
