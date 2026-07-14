from typing import List

from fastapi import APIRouter, HTTPException, Query

from ..db import dict_from_row, get_db
from ..schemas import Item, ItemCreate, ItemUpdate

router = APIRouter(prefix="/api", tags=["items"])

SELECT_COLUMNS = "id, name, value_gp, category, description"


@router.get("/items", response_model=List[Item])
def list_items(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List catalog items."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {SELECT_COLUMNS} FROM items ORDER BY name, id LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict_from_row(row) for row in cursor.fetchall()]


@router.get("/items/{item_id}", response_model=Item)
def get_item(item_id: int):
    """Get a catalog item by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM items WHERE id = ?", (item_id,))
        item = dict_from_row(cursor.fetchone())
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")
        return item


@router.post("/items", response_model=Item, status_code=201)
def create_item(item: ItemCreate):
    """Create a catalog item."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO items (name, value_gp, category, description)
               VALUES (?, ?, ?, ?)""",
            (item.name, item.value_gp, item.category, item.description),
        )
        conn.commit()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM items WHERE id = ?", (cursor.lastrowid,))
        return dict_from_row(cursor.fetchone())


@router.put("/items/{item_id}", response_model=Item)
def update_item(item_id: int, item: ItemUpdate):
    """Update a catalog item."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM items WHERE id = ?", (item_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Item not found")

        cursor.execute(
            """UPDATE items
               SET name = ?, value_gp = ?, category = ?, description = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (item.name, item.value_gp, item.category, item.description, item_id),
        )
        conn.commit()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM items WHERE id = ?", (item_id,))
        return dict_from_row(cursor.fetchone())


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    """Delete a catalog item."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM items WHERE id = ?", (item_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Item not found")
        cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
