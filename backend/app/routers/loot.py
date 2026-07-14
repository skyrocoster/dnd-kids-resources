from typing import List

from fastapi import APIRouter

from ..schemas import LootBundle

router = APIRouter(prefix="/api", tags=["loot"])


@router.get("/loot-bundles", response_model=List[LootBundle])
def list_loot_bundles():
    """List loot bundles. Full CRUD arrives in L3."""
    return []
