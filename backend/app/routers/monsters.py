from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import json

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Monster, MonsterCreate, MonsterUpdate

router = APIRouter(prefix="/api", tags=["monsters"])


def _parse_monster_row(row) -> dict:
    """Convert a monster row, parsing JSON columns."""
    monster = dict_from_row(row)
    if monster is None:
        return None

    # Parse JSON columns
    for field in ["ac", "hp", "speed", "stats", "senses", "languages", "action"]:
        if monster.get(field):
            monster[field] = parse_json_value(monster[field])

    return monster


@router.get("/monsters", response_model=List[Monster])
def list_monsters(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all monsters."""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, name, ac, hp, speed, stats, senses, languages, cr, action
            FROM monsters
            ORDER BY name
            LIMIT ? OFFSET ?
        """

        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()
        return [_parse_monster_row(row) for row in rows]


@router.get("/monsters/{monster_id}", response_model=Monster)
def get_monster(monster_id: int):
    """Get a specific monster by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, ac, hp, speed, stats, senses, languages, cr, action
               FROM monsters WHERE id = ?""",
            (monster_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Monster not found")
        return _parse_monster_row(row)


@router.get("/monsters/by-name/{name}", response_model=Monster)
def get_monster_by_name(name: str):
    """Get a specific monster by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, ac, hp, speed, stats, senses, languages, cr, action
               FROM monsters WHERE name = ?""",
            (name,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Monster not found")
        return _parse_monster_row(row)


# ── CRUD stubs (M3 will implement) ──────────────────────────────────────────────

@router.post("/monsters", status_code=501)
def create_monster(_monster: MonsterCreate):
    """Create a new monster (stub — M2 replaces schema, M3 implements)."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.put("/monsters/{monster_id}", status_code=501)
def update_monster(monster_id: int, _monster: MonsterUpdate):
    """Update a monster (stub — M3 implements)."""
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/monsters/{monster_id}", status_code=501)
def delete_monster(monster_id: int):
    """Delete a monster (stub — M3 implements)."""
    raise HTTPException(status_code=501, detail="Not implemented")
