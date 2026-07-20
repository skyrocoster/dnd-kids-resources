# Reference Catalogs Area Guide

> **Active plan:** None.

## Scope

Owns weapons, items outside loot bundles, players, and NPCs. It does not own spells, monsters, loot bundles, encounters, dungeons, or loom.

## Domain vocabulary

**Weapon**:
A D&D 5e weapon entry, either a base mundane weapon or a magical variant with rarity and attunement requirements.
_Avoid_: armament, gear

**Item**:
A generic treasure or reference object, such as gems, art, coins, consumables, scrolls, trade goods, or gear. Distinct from weapons and loot bundles.
_Avoid_: object, loot_item

**Player**:
A player character record: name, class, level, spell slots, assigned spells, and assigned weapons.
_Avoid_: character, pc, hero

**Class**:
A player character's D&D class. One of 13 supported classes.
_Avoid_: character_class, archetype

**NPC**:
A non-player character with richer detail than monsters: race, gender, background, appearance, and notes. Runtime-authored, not from seeds.
_Avoid_: monster, which is for stat-block creatures; character.

**Appearance**:
An NPC's visual description: hair, eyes, height, and distinctive features.
_Avoid_: description, look

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
