from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value, parse_spell_row as _parse_spell_row
from ..schemas import Player, PlayerCreate, PlayerUpdate, PlayerDetail, PlayerSpellAssignments, PlayerWeaponAssignments, PlayerSpellbookCharacter, Spell, Weapon

router = APIRouter(prefix="/api", tags=["players"])

PLAYER_FIELDS = [
    "name",
    "child_name",
    "class_",
    "subclass",
    "level",
    "ancestry",
    "background",
    "sizes",
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
    "features",
    "initiative",
    "proficiency_bonus",
    "spell_attack_bonus",
    "spell_save_dc",
    "max_spell_slots",
    "notes",
]
PLAYER_COLUMNS = ["class" if field == "class_" else field for field in PLAYER_FIELDS]
PLAYER_SELECT_COLUMNS = [
    "class AS class_" if field == "class_" else field for field in PLAYER_FIELDS
]
JSON_COLUMNS = {
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
    "max_spell_slots",
}


def _parse_player_row(row) -> dict:
    """Convert player row, parsing JSON columns."""
    player = dict_from_row(row)
    if player is None:
        return None

    for field in JSON_COLUMNS:
        if player.get(field) is not None:
            player[field] = parse_json_value(player[field])

    return player


def _serialize_player(player: PlayerCreate | PlayerUpdate) -> dict:
    values = player.model_dump(mode="json")
    for field in JSON_COLUMNS:
        values[field] = json.dumps(values[field]) if values.get(field) is not None else None
    return values


def _select_player(cursor, player_id: int) -> dict:
    columns = ", ".join(["id", *PLAYER_SELECT_COLUMNS, "created_at", "updated_at"])
    cursor.execute(f"SELECT {columns} FROM players WHERE id = ?", (player_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    return _parse_player_row(row)


@router.get("/players", response_model=List[Player], response_model_by_alias=False)
def list_players(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all players."""
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT id, name, class AS class_, level
            FROM players
            ORDER BY name
            LIMIT ? OFFSET ?
        """

        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/players/spellbook", response_model=List[PlayerSpellbookCharacter])
def get_player_spellbook():
    """Get every player's assigned spells as a combined spellbook bootstrap."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT p.id AS player_id, p.name AS player_name,
                      s.id, s.name, s.level, s.school, s.description, s.alternate_description,
                      s.quick_rules, s.damage, s.healing, s.range, s.higher_levels,
                      s.casting_times, s.duration, s.concentration, s.ritual, s.components,
                      s.materials, s.attacks, s.area_of_effect, s.categories
               FROM players p
               LEFT JOIN player_spells ps ON p.id = ps.player_id
               LEFT JOIN spells s ON s.id = ps.spell_id
               ORDER BY p.name, s.name"""
        )

        characters = {}
        for row in cursor.fetchall():
            player_id = row["player_id"]
            character = characters.setdefault(
                player_id, {"id": player_id, "name": row["player_name"], "spells": []}
            )
            if row["id"] is not None:
                spell_row = dict_from_row(row)
                spell_row.pop("player_id")
                spell_row.pop("player_name")
                character["spells"].append(_parse_spell_row(spell_row))

        return sorted(characters.values(), key=lambda character: character["name"])


@router.get("/players/{player_id}", response_model=Player, response_model_by_alias=False)
def get_player(player_id: int):
    """Get a specific player by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        return _select_player(cursor, player_id)


@router.post("/players", response_model=Player, status_code=201, response_model_by_alias=False)
def create_player(player: PlayerCreate):
    """Create a new player."""
    values = _serialize_player(player)
    placeholders = ", ".join("?" for _ in PLAYER_COLUMNS)

    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                f"""INSERT INTO players ({', '.join(PLAYER_COLUMNS)})
                   VALUES ({placeholders})""",
                tuple(values[field] for field in PLAYER_FIELDS),
            )
            conn.commit()
            player_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create player: {str(e)}")

        return _select_player(cursor, player_id)


@router.put("/players/{player_id}", response_model=Player, response_model_by_alias=False)
def update_player(player_id: int, player: PlayerUpdate):
    """Update an existing player."""
    values = _serialize_player(player)
    assignments = ", ".join(f"{column} = ?" for column in PLAYER_COLUMNS)

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        try:
            cursor.execute(
                f"""UPDATE players
                   SET {assignments}, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (*tuple(values[field] for field in PLAYER_FIELDS), player_id),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update player: {str(e)}")

        return _select_player(cursor, player_id)


@router.delete("/players/{player_id}", status_code=204)
def delete_player(player_id: int):
    """Delete a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        try:
            # Delete related player_spells and player_weapons
            cursor.execute("DELETE FROM player_spells WHERE player_id = ?", (player_id,))
            cursor.execute("DELETE FROM player_weapons WHERE player_id = ?", (player_id,))
            cursor.execute("DELETE FROM players WHERE id = ?", (player_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete player: {str(e)}")


@router.get("/players/{player_id}/spells", response_model=List[Spell])
def get_player_spells(player_id: int):
    """Get all spells assigned to a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify player exists
        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        cursor.execute(
            """SELECT s.id, s.name, s.level, s.school, s.description, s.alternate_description, s.quick_rules,
                       s.damage, s.healing, s.range, s.higher_levels, s.casting_times, s.duration,
                       s.concentration, s.ritual, s.components, s.materials, s.attacks, s.area_of_effect,
                       s.categories
               FROM spells s
               JOIN player_spells ps ON s.id = ps.spell_id
               WHERE ps.player_id = ?
                ORDER BY s.name""",
            (player_id,)
        )
        rows = cursor.fetchall()
        return [_parse_spell_row(row) for row in rows]


@router.post("/players/{player_id}/spells/{spell_id}", status_code=201)
def add_spell_to_player(player_id: int, spell_id: int):
    """Assign a spell to a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify player and spell exist
        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        cursor.execute("SELECT id FROM spells WHERE id = ?", (spell_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spell not found")

        try:
            cursor.execute(
                """INSERT INTO player_spells (player_id, spell_id) VALUES (?, ?)""",
                (player_id, spell_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Spell already assigned to player")
            raise HTTPException(status_code=400, detail=f"Failed to assign spell: {str(e)}")

        return {"message": "Spell assigned successfully"}


@router.put("/players/{player_id}/spells", response_model=List[Spell])
def replace_player_spells(player_id: int, assignments: PlayerSpellAssignments):
    """Replace all spell assignments for a player."""
    spell_ids = assignments.spell_ids
    if len(spell_ids) != len(set(spell_ids)):
        raise HTTPException(status_code=400, detail="Duplicate spell ids")

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        if spell_ids:
            placeholders = ",".join("?" for _ in spell_ids)
            cursor.execute(f"SELECT id FROM spells WHERE id IN ({placeholders})", spell_ids)
            found = {row["id"] for row in cursor.fetchall()}
            missing = [sid for sid in spell_ids if sid not in found]
            if missing:
                raise HTTPException(status_code=400, detail="Spell not found")

        try:
            cursor.execute("DELETE FROM player_spells WHERE player_id = ?", (player_id,))
            cursor.executemany(
                "INSERT INTO player_spells (player_id, spell_id) VALUES (?, ?)",
                [(player_id, sid) for sid in spell_ids],
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to replace player spells: {str(e)}")

        cursor.execute(
            """SELECT s.id, s.name, s.level, s.school, s.description, s.alternate_description, s.quick_rules,
                      s.damage, s.healing, s.range, s.higher_levels, s.casting_times, s.duration,
                      s.concentration, s.ritual, s.components, s.materials, s.attacks, s.area_of_effect,
                      s.categories
               FROM spells s
               JOIN player_spells ps ON s.id = ps.spell_id
               WHERE ps.player_id = ?
               ORDER BY s.name""",
            (player_id,),
        )
        return [_parse_spell_row(row) for row in cursor.fetchall()]


@router.delete("/players/{player_id}/spells/{spell_id}", status_code=204)
def remove_spell_from_player(player_id: int, spell_id: int):
    """Remove a spell from a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify assignment exists
        cursor.execute(
            "SELECT id FROM player_spells WHERE player_id = ? AND spell_id = ?",
            (player_id, spell_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Spell assignment not found")

        try:
            cursor.execute(
                "DELETE FROM player_spells WHERE player_id = ? AND spell_id = ?",
                (player_id, spell_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to remove spell: {str(e)}")


@router.get("/players/{player_id}/weapons", response_model=List[Weapon])
def get_player_weapons(player_id: int):
    """Get all weapons assigned to a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify player exists
        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        cursor.execute(
            """SELECT w.id, w.name, w.rarity
               FROM weapons w
               JOIN player_weapons pw ON w.id = pw.weapon_id
               WHERE pw.player_id = ?
               ORDER BY w.name""",
            (player_id,)
        )
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.put("/players/{player_id}/weapons", response_model=List[Weapon])
def replace_player_weapons(player_id: int, assignments: PlayerWeaponAssignments):
    """Replace all weapon assignments for a player."""
    weapon_ids = assignments.weapon_ids
    if len(weapon_ids) != len(set(weapon_ids)):
        raise HTTPException(status_code=400, detail="Duplicate weapon ids")

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        if weapon_ids:
            placeholders = ",".join("?" for _ in weapon_ids)
            cursor.execute(f"SELECT id FROM weapons WHERE id IN ({placeholders})", weapon_ids)
            found = {row["id"] for row in cursor.fetchall()}
            missing = [wid for wid in weapon_ids if wid not in found]
            if missing:
                raise HTTPException(status_code=400, detail="Weapon not found")

        try:
            cursor.execute("DELETE FROM player_weapons WHERE player_id = ?", (player_id,))
            cursor.executemany(
                "INSERT INTO player_weapons (player_id, weapon_id) VALUES (?, ?)",
                [(player_id, wid) for wid in weapon_ids],
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to replace player weapons: {str(e)}")

        cursor.execute(
            """SELECT w.id, w.name, w.rarity
               FROM weapons w
               JOIN player_weapons pw ON w.id = pw.weapon_id
               WHERE pw.player_id = ?
               ORDER BY w.name""",
            (player_id,),
        )
        return [dict_from_row(row) for row in cursor.fetchall()]


@router.get("/players/{player_id}/detail", response_model=PlayerDetail, response_model_by_alias=False)
def get_player_detail(player_id: int):
    """Fetch complete player detail with spells and weapons."""
    with get_db() as conn:
        cursor = conn.cursor()
        player = _select_player(cursor, player_id)

        cursor.execute(
            """SELECT s.id, s.name, s.level, s.school, s.description, s.alternate_description, s.quick_rules,
                      s.damage, s.healing, s.range, s.higher_levels, s.casting_times, s.duration,
                       s.concentration, s.ritual, s.components, s.materials, s.attacks, s.area_of_effect,
                       s.categories
               FROM spells s
               JOIN player_spells ps ON s.id = ps.spell_id
               WHERE ps.player_id = ?
               ORDER BY s.name""",
            (player_id,)
        )
        spells = [_parse_spell_row(row) for row in cursor.fetchall()]

        cursor.execute(
            """SELECT w.id, w.name, w.rarity
               FROM weapons w
               JOIN player_weapons pw ON w.id = pw.weapon_id
               WHERE pw.player_id = ?
               ORDER BY w.name""",
            (player_id,)
        )
        weapons = [dict_from_row(row) for row in cursor.fetchall()]

        return {**player, "spells": spells, "weapons": weapons}


@router.post("/players/{player_id}/weapons/{weapon_id}", status_code=201)
def add_weapon_to_player(player_id: int, weapon_id: int):
    """Assign a weapon to a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify player and weapon exist
        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        cursor.execute("SELECT id FROM weapons WHERE id = ?", (weapon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Weapon not found")

        try:
            cursor.execute(
                """INSERT INTO player_weapons (player_id, weapon_id) VALUES (?, ?)""",
                (player_id, weapon_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Weapon already assigned to player")
            raise HTTPException(status_code=400, detail=f"Failed to assign weapon: {str(e)}")

        return {"message": "Weapon assigned successfully"}


@router.delete("/players/{player_id}/weapons/{weapon_id}", status_code=204)
def remove_weapon_from_player(player_id: int, weapon_id: int):
    """Remove a weapon from a player."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify assignment exists
        cursor.execute(
            "SELECT id FROM player_weapons WHERE player_id = ? AND weapon_id = ?",
            (player_id, weapon_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Weapon assignment not found")

        try:
            cursor.execute(
                "DELETE FROM player_weapons WHERE player_id = ? AND weapon_id = ?",
                (player_id, weapon_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to remove weapon: {str(e)}")
