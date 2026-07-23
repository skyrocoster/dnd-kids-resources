from typing import Optional

from fastapi import APIRouter, HTTPException

from ..db import get_db
from ..schemas import AtTheTableResponse, AtTheTableSet

router = APIRouter(prefix="/api", tags=["at_the_table"])


@router.get("/at-the-table", response_model=AtTheTableResponse)
def get_at_the_table() -> dict:
    """Get the dungeon currently set as 'at the table'"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT dungeon_id FROM at_the_table WHERE lock = 1")
        row = cursor.fetchone()
        if not row:
            return {"dungeon_id": None}
        return {"dungeon_id": row["dungeon_id"]}


@router.put("/at-the-table", response_model=AtTheTableResponse)
def set_at_the_table(blob: AtTheTableSet) -> dict:
    """Set which dungeon is at the table"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (blob.dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
        try:
            cursor.execute(
                """INSERT INTO at_the_table (lock, dungeon_id) VALUES (1, ?)
                   ON CONFLICT(lock) DO UPDATE SET dungeon_id = excluded.dungeon_id""",
                (blob.dungeon_id,),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to set at-the-table: {str(e)}")

        return {"dungeon_id": blob.dungeon_id}
