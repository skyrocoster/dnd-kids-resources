from fastapi import APIRouter, HTTPException, Query
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_list
from ..schemas import Quest, QuestCreate, QuestUpdate

router = APIRouter(prefix="/api", tags=["quests"])

SELECT_COLUMNS = (
    "id, name as title, summary, reward, objectives, details, "
    "quest_giver, dungeon_id, location"
)
LIST_JSON_FIELDS = ["reward", "objectives", "details"]


def _parse_quest_row(row) -> dict:
    """Convert a quest row, parsing JSON list columns."""
    quest = dict_from_row(row)
    if quest is None:
        return None

    for field in LIST_JSON_FIELDS:
        if quest.get(field):
            quest[field] = parse_json_list(quest[field])

    return quest


@router.get("/quests", response_model=List[Quest])
def list_quests(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all quests."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {SELECT_COLUMNS} FROM quests ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [_parse_quest_row(row) for row in rows]


@router.get("/quests/{quest_id}", response_model=Quest)
def get_quest(quest_id: int):
    """Get a specific quest by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM quests WHERE id = ?", (quest_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quest not found")
        return _parse_quest_row(row)


@router.post("/quests", response_model=Quest, status_code=201)
def create_quest(quest: QuestCreate):
    """Create a new quest."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO quests
                   (name, summary, reward, objectives, details, quest_giver, dungeon_id, location)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    quest.title,
                    quest.summary,
                    json.dumps(quest.reward) if quest.reward else json.dumps([]),
                    json.dumps(quest.objectives) if quest.objectives else json.dumps([]),
                    json.dumps(quest.details) if quest.details else json.dumps([]),
                    quest.quest_giver,
                    quest.dungeon_id,
                    quest.location,
                )
            )
            conn.commit()
            quest_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create quest: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM quests WHERE id = ?", (quest_id,))
        row = cursor.fetchone()
        return _parse_quest_row(row)


@router.put("/quests/{quest_id}", response_model=Quest)
def update_quest(quest_id: int, quest: QuestUpdate):
    """Update an existing quest."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM quests WHERE id = ?", (quest_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Quest not found")

        try:
            cursor.execute(
                """UPDATE quests
                   SET name = ?, summary = ?, reward = ?, objectives = ?, details = ?,
                       quest_giver = ?, dungeon_id = ?, location = ?
                   WHERE id = ?""",
                (
                    quest.title,
                    quest.summary,
                    json.dumps(quest.reward) if quest.reward else json.dumps([]),
                    json.dumps(quest.objectives) if quest.objectives else json.dumps([]),
                    json.dumps(quest.details) if quest.details else json.dumps([]),
                    quest.quest_giver,
                    quest.dungeon_id,
                    quest.location,
                    quest_id,
                )
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update quest: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM quests WHERE id = ?", (quest_id,))
        row = cursor.fetchone()
        return _parse_quest_row(row)


@router.delete("/quests/{quest_id}", status_code=204)
def delete_quest(quest_id: int):
    """Delete a quest."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM quests WHERE id = ?", (quest_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Quest not found")

        try:
            cursor.execute("DELETE FROM quests WHERE id = ?", (quest_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete quest: {str(e)}")
