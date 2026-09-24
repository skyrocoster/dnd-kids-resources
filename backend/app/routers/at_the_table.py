from ..api_errors import ApiError, ApiRouter, error_responses
from ..caching import cached_get
from ..db import get_db
from ..schemas import AtTheTableResponse, AtTheTableSet
from ..schemas.errors import AtTheTableError

router = ApiRouter(prefix="/api", tags=["at_the_table"])


@router.get("/at-the-table", response_model=AtTheTableResponse, operation_id="getAtTheTable")
@cached_get("at_the_table")
def get_at_the_table() -> dict:
    """Get the dungeon currently set as 'at the table'"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT dungeon_id FROM at_the_table WHERE lock = 1")
        row = cursor.fetchone()
        if not row:
            return {"dungeon_id": None}
        return {"dungeon_id": row["dungeon_id"]}


@router.put(
    "/at-the-table",
    response_model=AtTheTableResponse,
    operation_id="setAtTheTable",
    responses=error_responses(AtTheTableError, 400, 404),
)
def set_at_the_table(blob: AtTheTableSet) -> dict:
    """Set which dungeon is at the table"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (blob.dungeon_id,))
        if not cursor.fetchone():
            raise ApiError(
                404,
                AtTheTableError(code="dungeon_not_found", message="Dungeon not found"),
            )
        try:
            cursor.execute(
                """INSERT INTO at_the_table (lock, dungeon_id) VALUES (1, ?)
                   ON CONFLICT(lock) DO UPDATE SET dungeon_id = excluded.dungeon_id""",
                (blob.dungeon_id,),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(
                400,
                AtTheTableError(
                    code="failed_to_set_at_the_table",
                    message=f"Failed to set at-the-table: {str(e)}",
                ),
            )

        return {"dungeon_id": blob.dungeon_id}
