# Dungeons Area Guide

> **Active plan:** None.

## Scope

Owns dungeon CRUD, Map Lab viewer/editor composition, room content, layouts, and dungeon-to-encounter/NPC links. It does not own encounter-runner rules or shared visual primitives.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/dungeons.py` and `layouts.py`.
- Frontend: `frontend/src/features/dungeons/`.
- Tests: dungeon router tests and colocated dungeon frontend tests.

## Invariants

- Runtime-authored dungeons and layouts are not seed data and are never exported.
- Preserve Map Lab geometry, reducer, autosave, zoom/pan, fullscreen, and layout persistence unless a focused plan explicitly owns them.

## Work queue

- Create a focused plan before deferred dungeon work, including passage-session persistence or cross-reference pop-outs.

## Cross-references

`../ARCHITECTURE.md`, `../DATA_MODEL.md`, `../complete/dungeon_plan.md`, and `encounters.md`.
