import json
from typing import List

from fastapi import Query

from ..api_errors import ApiError, ApiRouter, error_responses
from ..caching import cached_get
from ..db import dict_from_row, get_db, parse_json_value
from ..schemas import Dungeon, DungeonCreate, DungeonUpdate
from ..schemas.errors import DungeonError

router = ApiRouter(prefix="/api", tags=["dungeons"])


def _parse_dungeon_row(row) -> dict:
    """Convert a dungeon row, parsing JSON data."""
    dungeon = dict_from_row(row)
    if dungeon is None:
        return None

    # Parse JSON data column
    if dungeon.get("data"):
        dungeon["data"] = parse_json_value(dungeon["data"])

    return dungeon


@router.get("/dungeons", response_model=List[Dungeon], operation_id="listDungeons")
@cached_get("dungeons")
def list_dungeons(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all dungeons."""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, title, data
            FROM dungeons
            ORDER BY title
            LIMIT ? OFFSET ?
        """

        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()
        return [_parse_dungeon_row(row) for row in rows]


@router.get(
    "/dungeons/{dungeon_id}",
    response_model=Dungeon,
    operation_id="getDungeon",
    responses=error_responses(DungeonError, 404),
)
@cached_get("dungeons")
def get_dungeon(dungeon_id: int):
    """Get a specific dungeon by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""SELECT id, title, data FROM dungeons WHERE id = ?""", (dungeon_id,))
        row = cursor.fetchone()
        if not row:
            raise ApiError(404, DungeonError(code="dungeon_not_found", message="Dungeon not found"))
        return _parse_dungeon_row(row)


@router.post(
    "/dungeons",
    response_model=Dungeon,
    status_code=201,
    operation_id="createDungeon",
    responses=error_responses(DungeonError, 400),
)
def create_dungeon(dungeon: DungeonCreate):
    """Create a new dungeon."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO dungeons (title, data)
                   VALUES (?, ?)""",
                (dungeon.title, json.dumps(dungeon.data)),
            )
            conn.commit()
            dungeon_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise ApiError(
                400,
                DungeonError(
                    code="failed_to_create_dungeon", message=f"Failed to create dungeon: {str(e)}"
                ),
            )

        cursor.execute("""SELECT id, title, data FROM dungeons WHERE id = ?""", (dungeon_id,))
        row = cursor.fetchone()
        return _parse_dungeon_row(row)


@router.put(
    "/dungeons/{dungeon_id}",
    response_model=Dungeon,
    operation_id="updateDungeon",
    responses=error_responses(DungeonError, 400, 404),
)
def update_dungeon(dungeon_id: int, dungeon: DungeonUpdate):
    """Update an existing dungeon."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise ApiError(404, DungeonError(code="dungeon_not_found", message="Dungeon not found"))

        try:
            cursor.execute(
                """UPDATE dungeons
                   SET title = ?, data = ?
                   WHERE id = ?""",
                (dungeon.title, json.dumps(dungeon.data), dungeon_id),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(
                400,
                DungeonError(
                    code="failed_to_update_dungeon", message=f"Failed to update dungeon: {str(e)}"
                ),
            )

        cursor.execute("""SELECT id, title, data FROM dungeons WHERE id = ?""", (dungeon_id,))
        row = cursor.fetchone()
        return _parse_dungeon_row(row)


@router.delete(
    "/dungeons/{dungeon_id}",
    status_code=204,
    operation_id="deleteDungeon",
    responses=error_responses(DungeonError, 400, 404),
)
def delete_dungeon(dungeon_id: int):
    """Delete a dungeon."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise ApiError(404, DungeonError(code="dungeon_not_found", message="Dungeon not found"))

        try:
            cursor.execute("DELETE FROM dungeons WHERE id = ?", (dungeon_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(
                400,
                DungeonError(
                    code="failed_to_delete_dungeon", message=f"Failed to delete dungeon: {str(e)}"
                ),
            )
