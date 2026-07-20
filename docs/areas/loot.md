# Loot Area Guide

> **Active plan:** None.

## Scope

Owns items, loot bundles, and loot-on-map behavior. It does not own generic dungeon layout or encounter execution.

## Domain vocabulary

**Item**:
A generic treasure or reference object, such as gems, art, coins, consumables, scrolls, trade goods, or gear. Distinct from weapons.
_Avoid_: object, loot_item

**Loot Bundle**:
A named, hand-authored collection of items and weapons with a gold value. Attached to map props or awarded manually.
_Avoid_: loot_table, treasure_pack

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/items.py` and `loot.py`.
- Frontend: `frontend/src/features/items/` and `loot/`.
- Tests: item and loot router tests plus colocated frontend tests.

## Invariants

- Keep items and loot bundles distinct while preserving their documented map integration.
- Seed-backed catalog changes start in `data/seeds/`.

## Work queue

- Create a focused plan before expanding catalog, bundle, or map-loot behavior.

## Cross-references

`../DATA_MODEL.md`, `../complete/loot_plan.md`, and `dungeons.md`.
