# Encounters Area Guide

> **Active plan:** None.

## Scope

Owns encounter authoring, the encounter runner, combatant state, and Map Lab encounter docking. It does not own dungeon layout or monster catalog data.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/encounters.py`.
- Frontend: `frontend/src/features/encounters/`.
- Tests: encounter router tests and colocated encounter frontend tests.

## Invariants

- Preserve existing encounter wire models and persistence when changing presentation.
- Monster roster data is consumed from the monster domain; do not duplicate its catalog logic here.

## Work queue

- Create a focused plan for encounter budgeting, templates, quick-add, player HP, or initiative work.

## Cross-references

`../ARCHITECTURE.md`, `../DATA_MODEL.md`, `../complete/encounters_plan.md`, `monsters.md`, and `dungeons.md`.
