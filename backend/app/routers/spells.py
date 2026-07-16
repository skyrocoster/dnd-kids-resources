from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import json
import sqlite3

from ..db import get_db, parse_spell_row as _parse_spell_row
from ..schemas import Spell, SpellCreate, SpellUpdate

router = APIRouter(prefix="/api", tags=["spells"])

_SPELL_COLUMNS = """
    id, name, level, school, description, alternate_description,
    damage, healing, range, higher_levels, casting_times, duration,
    concentration, ritual, components, materials, attacks, area_of_effect
"""


def _spell_values(spell: SpellCreate) -> tuple:
    data = spell.model_dump()
    return (
        data["name"], data["level"], data["school"], data["description"],
        data["alternate_description"], json.dumps(data["damage"]),
        json.dumps(data["healing"]), data["range"], json.dumps(data["higher_levels"]),
        json.dumps(data["casting_times"]), data["duration"], data["concentration"],
        data["ritual"], json.dumps(data["components"]), data["materials"],
        json.dumps(data["attacks"]), json.dumps(data["area_of_effect"]),
    )


@router.get("/spells", response_model=List[Spell])
def list_spells(
    level: Optional[int] = Query(None, description="Filter by spell level"),
    school: Optional[str] = Query(None, description="Filter by spell school"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all spells with optional filtering."""
    with get_db() as conn:
        cursor = conn.cursor()

        where_clauses = []
        params = []

        if level is not None:
            where_clauses.append("level = ?")
            params.append(level)

        if school is not None:
            where_clauses.append("school = ?")
            params.append(school.lower())

        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"

        query = f"""
            SELECT {_SPELL_COLUMNS}
            FROM spells
            WHERE {where_clause}
            ORDER BY level, name
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [_parse_spell_row(row) for row in rows]


@router.get("/spells/{spell_id}", response_model=Spell)
def get_spell(spell_id: int):
    """Get a specific spell by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {_SPELL_COLUMNS} FROM spells WHERE id = ?",
            (spell_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Spell not found")
        return _parse_spell_row(row)


@router.get("/spells/by-title/{spell_name}", response_model=Spell)
def get_spell_by_title(spell_name: str):
    """Get a specific spell by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {_SPELL_COLUMNS} FROM spells WHERE name = ?",
            (spell_name,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Spell not found")
        return _parse_spell_row(row)


@router.post("/spells", response_model=Spell, status_code=201)
def create_spell(spell: SpellCreate):
    """Create a new spell."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO spells
                   (name, level, school, description, alternate_description, damage, healing,
                    range, higher_levels, casting_times, duration, concentration, ritual,
                    components, materials, attacks, area_of_effect)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                _spell_values(spell),
            )
            conn.commit()
            spell_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A spell with this name already exists")

        # Fetch the created spell
        cursor.execute(
            f"SELECT {_SPELL_COLUMNS} FROM spells WHERE id = ?",
            (spell_id,)
        )
        row = cursor.fetchone()
        return _parse_spell_row(row)


@router.put("/spells/{spell_id}", response_model=Spell)
def update_spell(spell_id: int, spell: SpellUpdate):
    """Update an existing spell."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify spell exists
        cursor.execute("SELECT id FROM spells WHERE id = ?", (spell_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spell not found")

        try:
            cursor.execute(
                """UPDATE spells
                   SET name = ?, level = ?, school = ?, description = ?, alternate_description = ?,
                       damage = ?, healing = ?, range = ?, higher_levels = ?, casting_times = ?,
                       duration = ?, concentration = ?, ritual = ?, components = ?, materials = ?,
                       attacks = ?, area_of_effect = ?
                   WHERE id = ?""",
                (*_spell_values(spell), spell_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.rollback()
            raise HTTPException(status_code=400, detail="A spell with this name already exists")

        # Fetch and return the updated spell
        cursor.execute(
            f"SELECT {_SPELL_COLUMNS} FROM spells WHERE id = ?",
            (spell_id,)
        )
        row = cursor.fetchone()
        return _parse_spell_row(row)


@router.delete("/spells/{spell_id}", status_code=204)
def delete_spell(spell_id: int):
    """Delete a spell."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify spell exists
        cursor.execute("SELECT id FROM spells WHERE id = ?", (spell_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spell not found")

        try:
            cursor.execute("DELETE FROM spells WHERE id = ?", (spell_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete spell: {str(e)}")
