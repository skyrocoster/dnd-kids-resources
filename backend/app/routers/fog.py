from fastapi import APIRouter, HTTPException

from ..db import get_db
from ..schemas import RevealedCell, RevealedCellsBlob

router = APIRouter(prefix="/api", tags=["fog"])


@router.get("/dungeons/{dungeon_id}/revealed-cells", response_model=RevealedCellsBlob)
def get_revealed_cells(dungeon_id: int) -> dict:
    """Get all revealed fog cells for a dungeon"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT x, y FROM revealed_cells WHERE dungeon_id = ? ORDER BY x, y",
            (dungeon_id,),
        )
        rows = cursor.fetchall()
        return {"cells": [{"x": row["x"], "y": row["y"]} for row in rows]}


@router.put("/dungeons/{dungeon_id}/revealed-cells", response_model=RevealedCellsBlob)
def reveal_cells(dungeon_id: int, blob: RevealedCellsBlob) -> dict:
    """Reveal fog cells (union write — cells can only be added, never removed)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
        try:
            for cell in blob.cells:
                cursor.execute(
                    "INSERT OR IGNORE INTO revealed_cells (dungeon_id, x, y) VALUES (?, ?, ?)",
                    (dungeon_id, cell.x, cell.y),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to reveal cells: {str(e)}")

        cursor.execute(
            "SELECT x, y FROM revealed_cells WHERE dungeon_id = ? ORDER BY x, y",
            (dungeon_id,),
        )
        rows = cursor.fetchall()
        return {"cells": [{"x": row["x"], "y": row["y"]} for row in rows]}
