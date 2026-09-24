from ..api_errors import ApiError, ApiRouter, error_responses
from ..caching import cached_get
from ..db import get_db
from ..schemas import RevealedCellsBlob
from ..schemas.errors import FogError

router = ApiRouter(prefix="/api", tags=["fog"])


@router.get(
    "/dungeons/{dungeon_id}/revealed-cells",
    response_model=RevealedCellsBlob,
    operation_id="getRevealedCells",
)
@cached_get("fog")
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


@router.put(
    "/dungeons/{dungeon_id}/revealed-cells",
    response_model=RevealedCellsBlob,
    operation_id="revealCells",
    responses=error_responses(FogError, 400, 404),
)
def reveal_cells(dungeon_id: int, blob: RevealedCellsBlob) -> dict:
    """Reveal fog cells (union write — cells can only be added, never removed)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise ApiError(404, FogError(code="dungeon_not_found", message="Dungeon not found"))
        try:
            for cell in blob.cells:
                cursor.execute(
                    "INSERT OR IGNORE INTO revealed_cells (dungeon_id, x, y) VALUES (?, ?, ?)",
                    (dungeon_id, cell.x, cell.y),
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(
                400,
                FogError(
                    code="failed_to_reveal_cells", message=f"Failed to reveal cells: {str(e)}"
                ),
            )

        cursor.execute(
            "SELECT x, y FROM revealed_cells WHERE dungeon_id = ? ORDER BY x, y",
            (dungeon_id,),
        )
        rows = cursor.fetchall()
        return {"cells": [{"x": row["x"], "y": row["y"]} for row in rows]}
