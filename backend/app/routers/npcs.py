from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import NPC, NPCCreate, NPCUpdate

router = APIRouter(prefix="/api", tags=["npcs"])

NPC_COLUMNS = [
    "id",
    "name",
    "race",
    "gender",
    "background",
    "sizes",
    "alignment",
    "creature_type",
    "ac",
    "hp",
    "speed",
    "abilities",
    "saving_throws",
    "skills",
    "passive_perception",
    "damage_resistances",
    "damage_immunities",
    "damage_vulnerabilities",
    "condition_immunities",
    "senses",
    "languages",
    "features",
    "cr",
    "cr_note",
    "experience_points",
    "appearance",
    "notes",
]
JSON_COLUMNS = {
    "sizes",
    "creature_type",
    "ac",
    "hp",
    "speed",
    "abilities",
    "saving_throws",
    "skills",
    "damage_resistances",
    "damage_immunities",
    "damage_vulnerabilities",
    "condition_immunities",
    "senses",
    "languages",
    "features",
    "appearance",
}


def _parse_npc_row(row) -> dict:
    """Convert an NPC row, parsing JSON columns."""
    npc = dict_from_row(row)
    if npc is None:
        return None

    for field in JSON_COLUMNS:
        if npc.get(field) is not None:
            npc[field] = parse_json_value(npc[field])

    return npc


def _serialize_npc(npc: NPCCreate | NPCUpdate) -> dict:
    values = npc.model_dump(mode="json")
    for field in JSON_COLUMNS:
        values[field] = json.dumps(values[field]) if values.get(field) is not None else None
    return values


def _select_npc(cursor, npc_id: int) -> dict:
    columns = ", ".join(NPC_COLUMNS)
    cursor.execute(f"SELECT {columns} FROM npcs WHERE id = ?", (npc_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="NPC not found")
    return _parse_npc_row(row)


@router.get("/npcs", response_model=List[NPC])
def list_npcs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all NPCs."""
    with get_db() as conn:
        cursor = conn.cursor()
        columns = ", ".join(NPC_COLUMNS)
        cursor.execute(
            f"SELECT {columns} FROM npcs ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [_parse_npc_row(row) for row in rows]


@router.get("/npcs/{npc_id}", response_model=NPC)
def get_npc(npc_id: int):
    """Get a specific NPC by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        return _select_npc(cursor, npc_id)


@router.post("/npcs", response_model=NPC, status_code=201)
def create_npc(npc: NPCCreate):
    """Create a new NPC."""
    values = _serialize_npc(npc)
    columns = [column for column in NPC_COLUMNS if column != "id"]
    placeholders = ", ".join("?" for _ in columns)

    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                f"INSERT INTO npcs ({', '.join(columns)}) VALUES ({placeholders})",
                tuple(values[column] for column in columns),
            )
            conn.commit()
            npc_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create NPC: {str(e)}")

        return _select_npc(cursor, npc_id)


@router.put("/npcs/{npc_id}", response_model=NPC)
def update_npc(npc_id: int, npc: NPCUpdate):
    """Update an existing NPC."""
    values = _serialize_npc(npc)
    columns = [column for column in NPC_COLUMNS if column != "id"]
    assignments = ", ".join(f"{column} = ?" for column in columns)

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM npcs WHERE id = ?", (npc_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="NPC not found")

        try:
            cursor.execute(
                f"UPDATE npcs SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (*tuple(values[column] for column in columns), npc_id),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update NPC: {str(e)}")

        return _select_npc(cursor, npc_id)


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
