# Monsters Area Guide

> **Active plan:** None.

## Scope

Owns the monster catalog, stat blocks, monster editor, and monster data consumed by encounters. It does not own encounter-runner state.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/monsters.py`.
- Frontend: `frontend/src/features/monsters/`.
- Tests: monster router tests and colocated monster frontend tests.

## Invariants

- Preserve the routed full-page Monster Editor and its stat-card presentation unless a focused plan explicitly changes them.
- Keep catalog contracts canonical in the API and data-model references.

## Work queue

- Create a focused plan for monster curation, sound playback, deep links, or stat calculations.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../complete/monsters_plan.md`, and `encounters.md`.
