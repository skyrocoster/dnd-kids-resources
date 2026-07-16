# Spells Area Guide

> **Active plan:** None.

## Scope

Owns spell catalog behavior, spell editing, and spell seed-backed data. It does not own executable game mechanics.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, and `../TESTING.md`.

## Source map

- Backend: `backend/app/routers/spells.py`.
- Frontend: `frontend/src/features/spells/`.
- Tests: spell router tests and colocated spell frontend tests.

## Invariants

- `data/seeds/` remains canonical for spell seed data.
- Update the data-model reference with any seed-shape or import/export change.

## Work queue

- Create a focused plan for spell class/source curation or executable mechanics.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../complete/spells_plan.md`, and `monsters.md`.
