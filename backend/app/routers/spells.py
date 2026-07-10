from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import json

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Spell, SpellCreate, SpellUpdate

router = APIRouter(prefix="/api", tags=["spells"])


def _parse_spell_row(row) -> dict:
    """Convert a spell row, parsing JSON columns."""
    spell = dict_from_row(row)
    if spell is None:
        return None

    # Parse JSON columns
    for field in ["damage", "heal", "heal_at_spell_slots", "components", "classes", "subclasses", "area_of_effect"]:
        if spell.get(field):
            spell[field] = parse_json_value(spell[field])

    return spell


@router.get("/spells", response_model=List[Spell])
def list_spells(
    level: Optional[str] = Query(None, description="Filter by spell level"),
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
            params.append(school)

        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"

        query = f"""
            SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text,
                   damage, heal, heal_at_spell_slots, range, higher_levels,
                   damage_at_higher_levels, casting_time, duration, concentration,
                   ritual, components, materials, attack_type, area_of_effect,
                   action, classes, subclasses
            FROM spells
            WHERE {where_clause}
            ORDER BY level, spell_name
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
            """SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text,
                      damage, heal, heal_at_spell_slots, range, higher_levels,
                      damage_at_higher_levels, casting_time, duration, concentration,
                      ritual, components, materials, attack_type, area_of_effect,
                      action, classes, subclasses
               FROM spells WHERE id = ?""",
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
            """SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text,
                      damage, heal, heal_at_spell_slots, range, higher_levels,
                      damage_at_higher_levels, casting_time, duration, concentration,
                      ritual, components, materials, attack_type, area_of_effect,
                      action, classes, subclasses
               FROM spells WHERE spell_name = ?""",
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
                   (spell_name, icon, level, school, spell_text, spell_alt_text,
                    damage, heal, heal_at_spell_slots, range, higher_levels,
                    damage_at_higher_levels, casting_time, duration, concentration,
                    ritual, components, materials, attack_type, area_of_effect,
                    action, classes, subclasses)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    spell.spell_name,
                    spell.icon,
                    spell.level,
                    spell.school,
                    spell.spell_text,
                    spell.spell_alt_text,
                    json.dumps(spell.damage) if spell.damage else None,
                    json.dumps(spell.heal) if spell.heal else None,
                    json.dumps(spell.heal_at_spell_slots) if spell.heal_at_spell_slots else None,
                    spell.range,
                    spell.higher_levels,
                    spell.damage_at_higher_levels,
                    spell.casting_time,
                    spell.duration,
                    spell.concentration,
                    spell.ritual,
                    json.dumps(spell.components) if spell.components else None,
                    spell.materials,
                    spell.attack_type,
                    json.dumps(spell.area_of_effect) if spell.area_of_effect else None,
                    spell.action,
                    json.dumps(spell.classes) if spell.classes else None,
                    json.dumps(spell.subclasses) if spell.subclasses else None,
                )
            )
            conn.commit()
            spell_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create spell: {str(e)}")

        # Fetch the created spell
        cursor.execute(
            """SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text,
                      damage, heal, heal_at_spell_slots, range, higher_levels,
                      damage_at_higher_levels, casting_time, duration, concentration,
                      ritual, components, materials, attack_type, area_of_effect,
                      action, classes, subclasses
               FROM spells WHERE id = ?""",
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
                   SET spell_name = ?, icon = ?, level = ?, school = ?, spell_text = ?,
                       spell_alt_text = ?, damage = ?, heal = ?, heal_at_spell_slots = ?,
                       range = ?, higher_levels = ?, damage_at_higher_levels = ?,
                       casting_time = ?, duration = ?, concentration = ?, ritual = ?,
                       components = ?, materials = ?, attack_type = ?, area_of_effect = ?,
                       action = ?, classes = ?, subclasses = ?
                   WHERE id = ?""",
                (
                    spell.spell_name,
                    spell.icon,
                    spell.level,
                    spell.school,
                    spell.spell_text,
                    spell.spell_alt_text,
                    json.dumps(spell.damage) if spell.damage else None,
                    json.dumps(spell.heal) if spell.heal else None,
                    json.dumps(spell.heal_at_spell_slots) if spell.heal_at_spell_slots else None,
                    spell.range,
                    spell.higher_levels,
                    spell.damage_at_higher_levels,
                    spell.casting_time,
                    spell.duration,
                    spell.concentration,
                    spell.ritual,
                    json.dumps(spell.components) if spell.components else None,
                    spell.materials,
                    spell.attack_type,
                    json.dumps(spell.area_of_effect) if spell.area_of_effect else None,
                    spell.action,
                    json.dumps(spell.classes) if spell.classes else None,
                    json.dumps(spell.subclasses) if spell.subclasses else None,
                    spell_id,
                )
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update spell: {str(e)}")

        # Fetch and return the updated spell
        cursor.execute(
            """SELECT id, spell_name, icon, level, school, spell_text, spell_alt_text,
                      damage, heal, heal_at_spell_slots, range, higher_levels,
                      damage_at_higher_levels, casting_time, duration, concentration,
                      ritual, components, materials, attack_type, area_of_effect,
                      action, classes, subclasses
               FROM spells WHERE id = ?""",
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
