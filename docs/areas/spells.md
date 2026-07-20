# Spells Area Guide

> **Active plan:** None.

## Scope

Owns spell catalog behavior, spell editing, and spell seed-backed data. It does not own executable game mechanics.

## Domain vocabulary

**Spell**:
A D&D 5e spell described by level, school, components, damage, healing, range, and casting time. Each spell has an optional kid-friendly alternate description.
_Avoid_: spell_card

**Spell Level**:
Numeric tier 0-9, where 0 is a Cantrip.
_Avoid_: slot_level, which refers to spell slot tracking.

**School**:
Magical school of a spell: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, or Transmutation.
_Avoid_: discipline, tradition

**Spell Component**:
One of three casting requirements: Verbal (V), Somatic (S), or Material (M).
_Avoid_: component, which is too generic.

**Concentration**:
Whether a spell requires sustained focus to maintain.

**Ritual**:
Whether the spell can be cast as a ritual with no slot cost and a longer casting time.

**At Will**:
A flag on player-spell assignments indicating the player knows this spell without slot cost.

**Spell Slots**:
Per-player tracked spell slot usage stored as total and current counts.
_Avoid_: slots, slot_tracker

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, and `../TESTING.md`.

## Source map

- Backend: `backend/app/routers/spells.py`.
- Frontend: `frontend/src/features/spells/`.
- Tests: spell router tests and colocated spell frontend tests.

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Spell browser | `/spells` | prep | DM |
| Spell editor | modal over the browser | prep | DM |

## Invariants

- `data/seeds/` remains canonical for spell seed data.
- Update the data-model reference with any seed-shape or import/export change.

## Work queue

- Create a focused plan for spell class/source curation or executable mechanics.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../complete/spells_plan.md`, and `monsters.md`.
