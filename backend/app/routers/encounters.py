from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Encounter, EncounterCreate, EncounterUpdate

router = APIRouter(prefix="/api", tags=["encounters"])


def _parse_encounter_row(row) -> dict:
    """Convert an encounter row, parsing JSON columns."""
    encounter = dict_from_row(row)
    if encounter is None:
        return None

    # Parse JSON columns
    if encounter.get("creatures"):
        encounter["creatures"] = parse_json_value(encounter["creatures"])

    return encounter


@router.get("/encounters", response_model=List[Encounter])
def list_encounters(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all encounters."""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, title, description, difficulty, creatures, notes
            FROM encounter
            ORDER BY title
            LIMIT ? OFFSET ?
        """

        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()
        return [_parse_encounter_row(row) for row in rows]


@router.get("/encounters/{encounter_id}", response_model=Encounter)
def get_encounter(encounter_id: int):
    """Get a specific encounter by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, title, description, difficulty, creatures, notes
               FROM encounter WHERE id = ?""",
            (encounter_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Encounter not found")
        return _parse_encounter_row(row)


@router.post("/encounters", response_model=Encounter, status_code=201)
def create_encounter(encounter: EncounterCreate):
    """Create a new encounter."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO encounter (title, description, difficulty, creatures, notes)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    encounter.title,
                    encounter.description,
                    encounter.difficulty,
                    json.dumps(encounter.creatures) if encounter.creatures else None,
                    encounter.notes,
                )
            )
            conn.commit()
            encounter_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create encounter: {str(e)}")

        cursor.execute(
            """SELECT id, title, description, difficulty, creatures, notes
               FROM encounter WHERE id = ?""",
            (encounter_id,)
        )
        row = cursor.fetchone()
        return _parse_encounter_row(row)


@router.put("/encounters/{encounter_id}", response_model=Encounter)
def update_encounter(encounter_id: int, encounter: EncounterUpdate):
    """Update an existing encounter."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM encounter WHERE id = ?", (encounter_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Encounter not found")

        try:
            cursor.execute(
                """UPDATE encounter
                   SET title = ?, description = ?, difficulty = ?, creatures = ?, notes = ?
                   WHERE id = ?""",
                (
                    encounter.title,
                    encounter.description,
                    encounter.difficulty,
                    json.dumps(encounter.creatures) if encounter.creatures else None,
                    encounter.notes,
                    encounter_id,
                )
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update encounter: {str(e)}")

        cursor.execute(
            """SELECT id, title, description, difficulty, creatures, notes
               FROM encounter WHERE id = ?""",
            (encounter_id,)
        )
        row = cursor.fetchone()
        return _parse_encounter_row(row)


@router.delete("/encounters/{encounter_id}", status_code=204)
def delete_encounter(encounter_id: int):
    """Delete an encounter."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM encounter WHERE id = ?", (encounter_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Encounter not found")

        try:
            cursor.execute("DELETE FROM encounter WHERE id = ?", (encounter_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete encounter: {str(e)}")
