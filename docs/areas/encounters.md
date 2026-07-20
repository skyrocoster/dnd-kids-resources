# Encounters Area Guide

> **Active plan:** None.

## Scope

Owns encounter authoring, the encounter runner, combatant state, and Map Lab encounter docking. It does not own dungeon layout or monster catalog data.

## Domain vocabulary

**Encounter**:
A named combat setup holding a roster of participants and tracking turn order.
_Avoid_: battle, combat

**Unit**:
A single participant in an encounter roster entry, either a monster reference or a player reference.
_Avoid_: participant, combatant, which is live runner state.

**Creature**:
The API-facing name for encounter roster units. The database column is `units`; the API surface renames it to `creatures`.
_Avoid_: unit, except for database-level references.

**Combatant**:
A live encounter participant during encounter-runner playback, enriched with client ID, current HP, and conditions.
_Avoid_: active_unit, runner_participant

**Active Index**:
Zero-based index into the creature roster indicating whose turn it currently is.
_Avoid_: current_turn, turn_index

**Round**:
A counter incremented each time all combatants have taken a turn.

**Turn**:
One combatant's action within a round. The runner advances via nextTurn.
_Avoid_: step, phase

**Conditions**:
Status effects applied to combatants during encounters, such as Poisoned, Charmed, or Frightened. Reference data.
_Avoid_: status_effects, debuffs

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
