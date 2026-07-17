# Reference Catalogs Area Guide

> **Active plan:** None.

## Scope

Owns weapons, items outside loot bundles, players, and NPCs. It does not own spells, monsters, loot bundles, encounters, dungeons, or loom.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, and `../TESTING.md`.

## Source map

- Backend: `backend/app/routers/weapons.py`, `items.py`, `players.py`, and `npcs.py`.
- Frontend: `frontend/src/features/weapons/`, `items/`, `players/`, and `npcs/`.
- Tests: matching router and colocated frontend tests.

## Invariants

- Seed-backed catalog changes begin in `data/seeds/`.
- Keep domain-specific data mappings and validation intact when sharing UI primitives.

## Work queue

- Create a focused plan before changing any catalog contract or cross-domain workflow.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `loot.md`, and `encounters.md`.
