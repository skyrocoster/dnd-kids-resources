from fastapi import APIRouter, HTTPException, Query
from typing import List

from ..db import get_db, dict_from_row
from ..schemas import Quest, QuestCreate, QuestUpdate

router = APIRouter(prefix="/api", tags=["quests"])


@router.get("/quests", response_model=List[Quest])
def list_quests(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all quests."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name as title, summary as description, reward FROM quests
               ORDER BY name LIMIT ? OFFSET ?""",
            (limit, offset)
        )
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/quests/{quest_id}", response_model=Quest)
def get_quest(quest_id: int):
    """Get a specific quest by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, name as title, summary as description, reward FROM quests WHERE id = ?""",
            (quest_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quest not found")
        return dict_from_row(row)


@router.post("/quests", response_model=Quest, status_code=201)
def create_quest(quest: QuestCreate):
    """Create a new quest."""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute(
                """INSERT INTO quests (name, summary, reward) VALUES (?, ?, ?)""",
                (quest.title, quest.description, quest.reward)
            )
            conn.commit()
            quest_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create quest: {str(e)}")

        cursor.execute(
            """SELECT id, name as title, summary as description, reward FROM quests WHERE id = ?""",
            (quest_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


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
                """UPDATE quests SET name = ?, summary = ?, reward = ? WHERE id = ?""",
                (quest.title, quest.description, quest.reward, quest_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update quest: {str(e)}")

        cursor.execute(
            """SELECT id, name as title, summary as description, reward FROM quests WHERE id = ?""",
            (quest_id,)
        )
        row = cursor.fetchone()
        return dict_from_row(row)


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
