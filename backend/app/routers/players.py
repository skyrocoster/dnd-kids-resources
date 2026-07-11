from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value, parse_spell_row as _parse_spell_row
from ..schemas import Player, PlayerCreate, PlayerUpdate, Spell, Weapon

router = APIRouter(prefix="/api", tags=["players"])


def _parse_player_row(row) -> dict:
    """Convert player row, parsing JSON columns."""
    player = dict_from_row(row)
    if player is None:
        return None

    if player.get("stats"):
        player["stats"] = parse_json_value(player["stats"])
    if player.get("skills"):
        player["skills"] = parse_json_value(player["skills"])

    return player


@router.get("/players", response_model=List[Player])
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


@router.get("/players/{player_id}", response_model=Player)
def get_player(player_id: int):
    """Get a specific player by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name, class AS class_, level FROM players WHERE id = ?""",
            (player_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found")
        return dict_from_row(row)


@router.post("/players", response_model=Player, status_code=201)
def create_player(player: PlayerCreate):
    """Create a new player."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO players (name, class, level)
                   VALUES (?, ?, ?)""",
                (player.name, player.class_, player.level)
            )
            conn.commit()
            player_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create player: {str(e)}")

        cursor.execute(
            """SELECT id, name, class AS class_, level FROM players WHERE id = ?""",
            (player_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


@router.put("/players/{player_id}", response_model=Player)
def update_player(player_id: int, player: PlayerUpdate):
    """Update an existing player."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM players WHERE id = ?", (player_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Player not found")

        try:
            cursor.execute(
                """UPDATE players
                   SET name = ?, class = ?, level = ?
                   WHERE id = ?""",
                (player.name, player.class_, player.level, player_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update player: {str(e)}")

        cursor.execute(
            """SELECT id, name, class AS class_, level FROM players WHERE id = ?""",
            (player_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


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
            """SELECT s.id, s.spell_name, s.icon, s.level, s.school, s.spell_text,
                      s.spell_alt_text, s.damage, s.heal, s.heal_at_spell_slots, s.range,
                      s.higher_levels, s.damage_at_higher_levels, s.casting_time, s.duration,
                      s.concentration, s.ritual, s.components, s.materials, s.attack_type,
                      s.area_of_effect, s.action, s.classes, s.subclasses
               FROM spells s
               JOIN player_spells ps ON s.id = ps.spell_id
               WHERE ps.player_id = ?
               ORDER BY s.spell_name""",
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
