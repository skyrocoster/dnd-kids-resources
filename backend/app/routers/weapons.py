from fastapi import APIRouter, HTTPException, Query
from typing import List

from ..db import get_db, dict_from_row
from ..schemas import Weapon, WeaponCreate, WeaponUpdate

router = APIRouter(prefix="/api", tags=["weapons"])


@router.get("/weapons", response_model=List[Weapon])
def list_weapons(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all weapons."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, rarity FROM weapons ORDER BY name LIMIT ? OFFSET ?""",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/weapons/{weapon_id}", response_model=Weapon)
def get_weapon(weapon_id: int):
    """Get a specific weapon by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, rarity FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Weapon not found")
        return dict_from_row(row)


@router.get("/weapons/by-name/{name}", response_model=Weapon)
def get_weapon_by_name(name: str):
    """Get a specific weapon by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, rarity FROM weapons WHERE name = ?", (name,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Weapon not found")
        return dict_from_row(row)


@router.post("/weapons", response_model=Weapon, status_code=201)
def create_weapon(weapon: WeaponCreate):
    """Create a new weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO weapons (name, rarity) VALUES (?, ?)",
                (weapon.name, weapon.rarity)
            )
            conn.commit()
            weapon_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create weapon: {str(e)}")

        cursor.execute("SELECT id, name, rarity FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        return dict_from_row(row)


@router.put("/weapons/{weapon_id}", response_model=Weapon)
def update_weapon(weapon_id: int, weapon: WeaponUpdate):
    """Update an existing weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Weapon not found")

        try:
            cursor.execute(
                "UPDATE weapons SET name = ?, rarity = ? WHERE id = ?",
                (weapon.name, weapon.rarity, weapon_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update weapon: {str(e)}")

        cursor.execute("SELECT id, name, rarity FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        return dict_from_row(row)


@router.delete("/weapons/{weapon_id}", status_code=204)
def delete_weapon(weapon_id: int):
    """Delete a weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Weapon not found")

        try:
            cursor.execute("DELETE FROM weapons WHERE id = ?", (weapon_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete weapon: {str(e)}")
