from fastapi import APIRouter, HTTPException, Query
from typing import List
from fractions import Fraction
import json
import sqlite3

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Monster, MonsterCreate, MonsterUpdate

router = APIRouter(prefix="/api", tags=["monsters"])

MONSTER_COLUMNS = [
    "id",
    "name",
    "aliases",
    "sizes",
    "family",
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
    "audio_path",
    "features",
    "cr",
    "cr_sort",
    "cr_note",
    "experience_points",
]
JSON_COLUMNS = {
    "aliases",
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
}


def _parse_monster_row(row) -> dict:
    """Convert a monster row, parsing JSON columns."""
    monster = dict_from_row(row)
    if monster is None:
        return None

    for field in JSON_COLUMNS:
        if monster.get(field) is not None:
            monster[field] = parse_json_value(monster[field])

    return monster


def _cr_sort(value: str | None) -> float | None:
    if value is None or value == "Unknown":
        return None
    try:
        if "/" in value:
            return float(Fraction(value))
        return float(value)
    except (ValueError, ZeroDivisionError):
        return None


def _serialize_monster(monster: MonsterCreate | MonsterUpdate) -> dict:
    values = monster.model_dump(mode="json")
    values["cr_sort"] = _cr_sort(values.get("cr"))
    for field in JSON_COLUMNS:
        values[field] = json.dumps(values[field]) if values.get(field) is not None else None
    return values


def _select_monster(cursor, monster_id: int) -> dict:
    columns = ", ".join(MONSTER_COLUMNS)
    cursor.execute(f"SELECT {columns} FROM monsters WHERE id = ?", (monster_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Monster not found")
    return _parse_monster_row(row)


@router.get("/monsters", response_model=List[Monster])
def list_monsters(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all monsters."""
    with get_db() as conn:
        cursor = conn.cursor()

        columns = ", ".join(MONSTER_COLUMNS)
        query = f"""
            SELECT {columns}
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
        columns = ", ".join(MONSTER_COLUMNS)
        cursor.execute(f"SELECT {columns} FROM monsters WHERE id = ?", (monster_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Monster not found")
        return _parse_monster_row(row)


@router.get("/monsters/by-name/{name}", response_model=Monster)
def get_monster_by_name(name: str):
    """Get a specific monster by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        columns = ", ".join(MONSTER_COLUMNS)
        cursor.execute(f"SELECT {columns} FROM monsters WHERE name = ?", (name,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Monster not found")
        return _parse_monster_row(row)


@router.post("/monsters", response_model=Monster, status_code=201)
def create_monster(monster: MonsterCreate):
    """Create a new monster."""
    values = _serialize_monster(monster)
    columns = [column for column in MONSTER_COLUMNS if column != "id"]
    placeholders = ", ".join("?" for _ in columns)

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"INSERT INTO monsters ({', '.join(columns)}) VALUES ({placeholders})",
                tuple(values[column] for column in columns),
            )
            conn.commit()
            monster_id = cursor.lastrowid
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            if "UNIQUE" in str(exc).upper():
                raise HTTPException(status_code=409, detail="Monster name already exists")
            raise HTTPException(status_code=400, detail=f"Failed to create monster: {str(exc)}")
        except Exception as exc:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create monster: {str(exc)}")

        return _select_monster(cursor, monster_id)


@router.put("/monsters/{monster_id}", response_model=Monster)
def update_monster(monster_id: int, monster: MonsterUpdate):
    """Update an existing monster."""
    values = _serialize_monster(monster)
    columns = [column for column in MONSTER_COLUMNS if column != "id"]
    assignments = ", ".join(f"{column} = ?" for column in columns)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM monsters WHERE id = ?", (monster_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Monster not found")

        try:
            cursor.execute(
                f"UPDATE monsters SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (*tuple(values[column] for column in columns), monster_id),
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            if "UNIQUE" in str(exc).upper():
                raise HTTPException(status_code=409, detail="Monster name already exists")
            raise HTTPException(status_code=400, detail=f"Failed to update monster: {str(exc)}")
        except Exception as exc:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update monster: {str(exc)}")

        return _select_monster(cursor, monster_id)


@router.delete("/monsters/{monster_id}", status_code=204)
def delete_monster(monster_id: int):
    """Delete a monster."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM monsters WHERE id = ?", (monster_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Monster not found")

        try:
            cursor.execute("DELETE FROM monsters WHERE id = ?", (monster_id,))
            conn.commit()
        except Exception as exc:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete monster: {str(exc)}")
