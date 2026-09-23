from fastapi import Query
from typing import List
import json

from ..api_errors import ApiError, ApiRouter, error_responses
from ..caching import cached_get
from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Player, Weapon, WeaponCreate, WeaponUpdate
from ..schemas.errors import WeaponError

router = ApiRouter(prefix="/api", tags=["weapons"])

SELECT_COLUMNS = (
    "id, name, base_weapon, rarity, weapon_category, weight, req_attune, "
    "property, focus, attack, entries, quick_rules, "
    "weapon_attack_bonus, weapon_damage_bonus"
)
JSON_FIELDS = ["property", "focus", "attack", "entries"]


def _parse_weapon_row(row) -> dict:
    """Convert a weapon row, parsing JSON columns."""
    weapon = dict_from_row(row)
    if weapon is None:
        return None

    for field in JSON_FIELDS:
        if weapon.get(field):
            weapon[field] = parse_json_value(weapon[field])

    return weapon


@router.get("/weapons", response_model=List[Weapon], operation_id="listWeapons")
@cached_get("weapons")
def list_weapons(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all weapons."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {SELECT_COLUMNS} FROM weapons ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [_parse_weapon_row(row) for row in rows]


@router.get(
    "/weapons/{weapon_id}",
    response_model=Weapon,
    operation_id="getWeapon",
    responses=error_responses(WeaponError, 404),
)
@cached_get("weapons")
def get_weapon(weapon_id: int):
    """Get a specific weapon by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        if not row:
            raise ApiError(404, WeaponError(code="weapon_not_found", message="Weapon not found"))
        return _parse_weapon_row(row)


@router.get(
    "/weapons/by-name/{name}",
    response_model=Weapon,
    operation_id="getWeaponByName",
    responses=error_responses(WeaponError, 404),
)
@cached_get("weapons")
def get_weapon_by_name(name: str):
    """Get a specific weapon by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM weapons WHERE name = ?", (name,))
        row = cursor.fetchone()
        if not row:
            raise ApiError(404, WeaponError(code="weapon_not_found", message="Weapon not found"))
        return _parse_weapon_row(row)


@router.post(
    "/weapons",
    response_model=Weapon,
    status_code=201,
    operation_id="createWeapon",
    responses=error_responses(WeaponError, 400),
)
def create_weapon(weapon: WeaponCreate):
    """Create a new weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO weapons
                   (name, base_weapon, rarity, weapon_category, weight, req_attune,
                    property, focus, attack, entries, quick_rules,
                    weapon_attack_bonus, weapon_damage_bonus)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    weapon.name,
                    weapon.base_weapon,
                    weapon.rarity,
                    weapon.weapon_category,
                    weapon.weight,
                    weapon.req_attune,
                    # These columns are NOT NULL DEFAULT '[]' in the real schema —
                    # an empty JSON array, never NULL.
                    json.dumps(weapon.property) if weapon.property else "[]",
                    json.dumps(weapon.focus) if weapon.focus else "[]",
                    json.dumps(weapon.attack) if weapon.attack else "[]",
                    json.dumps(weapon.entries) if weapon.entries else "[]",
                    weapon.quick_rules,
                    weapon.weapon_attack_bonus,
                    weapon.weapon_damage_bonus,
                )
            )
            conn.commit()
            weapon_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise ApiError(400, WeaponError(code="failed_to_create_weapon", message=f"Failed to create weapon: {str(e)}"))

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        return _parse_weapon_row(row)


@router.put(
    "/weapons/{weapon_id}",
    response_model=Weapon,
    operation_id="updateWeapon",
    responses=error_responses(WeaponError, 400, 404),
)
def update_weapon(weapon_id: int, weapon: WeaponUpdate):
    """Update an existing weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise ApiError(404, WeaponError(code="weapon_not_found", message="Weapon not found"))

        try:
            cursor.execute(
                """UPDATE weapons
                   SET name = ?, base_weapon = ?, rarity = ?, weapon_category = ?,
                       weight = ?, req_attune = ?, property = ?, focus = ?, attack = ?,
                       entries = ?, quick_rules = ?,
                       weapon_attack_bonus = ?, weapon_damage_bonus = ?
                   WHERE id = ?""",
                (
                    weapon.name,
                    weapon.base_weapon,
                    weapon.rarity,
                    weapon.weapon_category,
                    weapon.weight,
                    weapon.req_attune,
                    # These columns are NOT NULL DEFAULT '[]' in the real schema —
                    # an empty JSON array, never NULL.
                    json.dumps(weapon.property) if weapon.property else "[]",
                    json.dumps(weapon.focus) if weapon.focus else "[]",
                    json.dumps(weapon.attack) if weapon.attack else "[]",
                    json.dumps(weapon.entries) if weapon.entries else "[]",
                    weapon.quick_rules,
                    weapon.weapon_attack_bonus,
                    weapon.weapon_damage_bonus,
                    weapon_id,
                )
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(400, WeaponError(code="failed_to_update_weapon", message=f"Failed to update weapon: {str(e)}"))

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM weapons WHERE id = ?", (weapon_id,))
        row = cursor.fetchone()
        return _parse_weapon_row(row)


@router.get(
    "/weapons/{weapon_id}/players",
    response_model=List[Player],
    operation_id="getWeaponPlayers",
    responses=error_responses(WeaponError, 404),
)
@cached_get("weapons")
def get_weapon_players(weapon_id: int):
    """List the players a weapon is assigned to."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise ApiError(404, WeaponError(code="weapon_not_found", message="Weapon not found"))

        cursor.execute(
            """SELECT p.id, p.name, p.class AS class_, p.level
               FROM players p
               JOIN player_weapons pw ON p.id = pw.player_id
               WHERE pw.weapon_id = ?
               ORDER BY p.name""",
            (weapon_id,)
        )
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.delete(
    "/weapons/{weapon_id}",
    status_code=204,
    operation_id="deleteWeapon",
    responses=error_responses(WeaponError, 400, 404),
)
def delete_weapon(weapon_id: int):
    """Delete a weapon."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise ApiError(404, WeaponError(code="weapon_not_found", message="Weapon not found"))

        try:
            cursor.execute("DELETE FROM weapons WHERE id = ?", (weapon_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise ApiError(400, WeaponError(code="failed_to_delete_weapon", message=f"Failed to delete weapon: {str(e)}"))
