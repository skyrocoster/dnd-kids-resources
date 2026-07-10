from fastapi import APIRouter, HTTPException, Query
from typing import List

from ..db import get_db, dict_from_row
from ..schemas import NPC, NPCCreate, NPCUpdate

router = APIRouter(prefix="/api", tags=["npcs"])


@router.get("/npcs", response_model=List[NPC])
def list_npcs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all NPCs."""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, name
            FROM npcs
            ORDER BY name
            LIMIT ? OFFSET ?
        """

        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/npcs/{npc_id}", response_model=NPC)
def get_npc(npc_id: int):
    """Get a specific NPC by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name FROM npcs WHERE id = ?""",
            (npc_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="NPC not found")
        return dict_from_row(row)


@router.post("/npcs", response_model=NPC, status_code=201)
def create_npc(npc: NPCCreate):
    """Create a new NPC."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO npcs (name)
                   VALUES (?)""",
                (npc.name,)
            )
            conn.commit()
            npc_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create NPC: {str(e)}")

        cursor.execute(
            """SELECT id, name FROM npcs WHERE id = ?""",
            (npc_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


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
                   SET name = ?
                   WHERE id = ?""",
                (npc.name, npc_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update NPC: {str(e)}")

        cursor.execute(
            """SELECT id, name FROM npcs WHERE id = ?""",
            (npc_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


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
