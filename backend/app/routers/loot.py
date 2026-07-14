import json
from typing import List

from fastapi import APIRouter, HTTPException, Query

from ..db import dict_from_row, get_db, parse_json_value
from ..schemas import LootBundle, LootBundleCreate, LootBundleUpdate

router = APIRouter(prefix="/api", tags=["loot"])

SELECT_COLUMNS = "id, name, gold, contents"


def _parse_loot_bundle_row(row) -> dict:
    """Convert a loot-bundle row, parsing its JSON contents."""
    bundle = dict_from_row(row)
    if bundle is None:
        return None

    if bundle.get("contents"):
        bundle["contents"] = parse_json_value(bundle["contents"])

    return bundle


@router.get("/loot-bundles", response_model=List[LootBundle])
def list_loot_bundles(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List loot bundles."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {SELECT_COLUMNS} FROM loot_bundle ORDER BY name LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [_parse_loot_bundle_row(row) for row in cursor.fetchall()]


@router.get("/loot-bundles/{bundle_id}", response_model=LootBundle)
def get_loot_bundle(bundle_id: int):
    """Get a loot bundle by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM loot_bundle WHERE id = ?", (bundle_id,))
        bundle = _parse_loot_bundle_row(cursor.fetchone())
        if bundle is None:
            raise HTTPException(status_code=404, detail="Loot bundle not found")
        return bundle


@router.post("/loot-bundles", response_model=LootBundle, status_code=201)
def create_loot_bundle(bundle: LootBundleCreate):
    """Create a loot bundle."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO loot_bundle (name, gold, contents) VALUES (?, ?, ?)""",
                (bundle.name, bundle.gold, json.dumps(bundle.contents) if bundle.contents else json.dumps([])),
            )
            conn.commit()
            bundle_id = cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to create loot bundle: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM loot_bundle WHERE id = ?", (bundle_id,))
        return _parse_loot_bundle_row(cursor.fetchone())


@router.put("/loot-bundles/{bundle_id}", response_model=LootBundle)
def update_loot_bundle(bundle_id: int, bundle: LootBundleUpdate):
    """Update a loot bundle."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loot_bundle WHERE id = ?", (bundle_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Loot bundle not found")

        try:
            cursor.execute(
                """UPDATE loot_bundle
                   SET name = ?, gold = ?, contents = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (
                    bundle.name,
                    bundle.gold,
                    json.dumps(bundle.contents) if bundle.contents else json.dumps([]),
                    bundle_id,
                ),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to update loot bundle: {str(e)}")

        cursor.execute(f"SELECT {SELECT_COLUMNS} FROM loot_bundle WHERE id = ?", (bundle_id,))
        return _parse_loot_bundle_row(cursor.fetchone())


@router.delete("/loot-bundles/{bundle_id}", status_code=204)
def delete_loot_bundle(bundle_id: int):
    """Delete a loot bundle."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM loot_bundle WHERE id = ?", (bundle_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Loot bundle not found")

        try:
            cursor.execute("DELETE FROM loot_bundle WHERE id = ?", (bundle_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to delete loot bundle: {str(e)}")
