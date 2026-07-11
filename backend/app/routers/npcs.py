from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value, parse_json_list
from ..schemas import NPC, NPCCreate, NPCUpdate

router = APIRouter(prefix="/api", tags=["npcs"])

SELECT_COLUMNS = (
    "id, name, race, gender, background, size, stats, armor_class, hit_points, "
    "speed, saving_throws, skills, senses, languages, appearance, notes"
)
DICT_JSON_FIELDS = ["stats", "saving_throws", "skills", "appearance"]
LIST_JSON_FIELDS = ["senses"]


def _parse_npc_row(row) -> dict:
    """Convert an NPC row, parsing JSON columns."""
    npc = dict_from_row(row)
    if npc is None:
        return None

    for field in DICT_JSON_FIELDS:
        if npc.get(field):
            npc[field] = parse_json_value(npc[field])
    for field in LIST_JSON_FIELDS:
        if npc.get(field):
            npc[field] = parse_json_list(npc[field])

    return npc


@router.get("/npcs", response_model=List[NPC])
def list_npcs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all NPCs."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {SELECT_COLUMNS} FROM npcs ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [_parse_npc_row(row) for row in rows]


@router.get("/npcs/{npc_id}", response_model=NPC)
def get_npc(npc_id: int):
    """Get a specific NPC by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM npcs WHERE id = ?", (npc_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="NPC not found")
        return _parse_npc_row(row)


@router.post("/npcs", response_model=NPC, status_code=201)
def create_npc(npc: NPCCreate):
    """Create a new NPC."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO npcs
                   (name, race, gender, background, size, stats, armor_class, hit_points,
                    speed, saving_throws, skills, senses, languages, appearance, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    npc.name,
                    npc.race,
                    npc.gender,
                    npc.background,
                    npc.size,
                    json.dumps(npc.stats) if npc.stats else json.dumps({}),
                    npc.armor_class,
                    npc.hit_points,
                    npc.speed,
                    json.dumps(npc.saving_throws) if npc.saving_throws else None,
                    json.dumps(npc.skills) if npc.skills else None,
                    json.dumps(npc.senses) if npc.senses else None,
                    npc.languages,
                    json.dumps(npc.appearance) if npc.appearance else None,
                    npc.notes,
                )
            )
            conn.commit()
            npc_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create NPC: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM npcs WHERE id = ?", (npc_id,))
        row = cursor.fetchone()
        return _parse_npc_row(row)


@router.put("/npcs/{npc_id}", response_model=NPC)
def update_npc(npc_id: int, npc: NPCUpdate):
    """Update an existing NPC."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM npcs WHERE id = ?", (npc_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="NPC not found")

        try:
            cursor.execute(
                """UPDATE npcs
                   SET name = ?, race = ?, gender = ?, background = ?, size = ?, stats = ?,
                       armor_class = ?, hit_points = ?, speed = ?, saving_throws = ?, skills = ?,
                       senses = ?, languages = ?, appearance = ?, notes = ?
                   WHERE id = ?""",
                (
                    npc.name,
                    npc.race,
                    npc.gender,
                    npc.background,
                    npc.size,
                    json.dumps(npc.stats) if npc.stats else json.dumps({}),
                    npc.armor_class,
                    npc.hit_points,
                    npc.speed,
                    json.dumps(npc.saving_throws) if npc.saving_throws else None,
                    json.dumps(npc.skills) if npc.skills else None,
                    json.dumps(npc.senses) if npc.senses else None,
                    npc.languages,
                    json.dumps(npc.appearance) if npc.appearance else None,
                    npc.notes,
                    npc_id,
                )
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update NPC: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM npcs WHERE id = ?", (npc_id,))
        row = cursor.fetchone()
        return _parse_npc_row(row)


@router.delete("/npcs/{npc_id}", status_code=204)
def delete_npc(npc_id: int):
    """Delete an NPC."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM npcs WHERE id = ?", (npc_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="NPC not found")

        try:
            cursor.execute("DELETE FROM npcs WHERE id = ?", (npc_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete NPC: {str(e)}")
