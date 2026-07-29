# Reference Area Guide

- **Read trigger:** Spells, weapons, items, or loot

## Scope

Owns the reference data catalog: spells, weapons, items, and loot bundles. It does not own players, monsters, encounters, dungeons, loom, or NPC runtime-authored data.

## Domain vocabulary

See the companion [glossary](reference.words.md).

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, and `../TESTING.md`.

## Source map

- Backend: `backend/app/routers/reference.py`, `spells.py`, `weapons.py`, `items.py`, and `loot.py`.
- Frontend: `frontend/src/features/reference/`, `spells/`, `weapons/`, `items/`, and `loot/`.
- Tests: matching router and colocated frontend tests.

## Change map

| Change type | Source globs |
|---|---|
| Spell browser or editor | `backend/app/routers/spells.py`<br>`frontend/src/features/spells/**` |
| Spell backend tests | `backend/tests/routers/test_spells.py`<br>`backend/tests/routers/test_spells_target_api.py`<br>`backend/tests/routers/test_spells_target_contract.py`<br>`backend/tests/test_migrate_spells.py`<br>`backend/tests/test_parse_helpers.py`<br>`backend/tests/test_reference_text.py` |
| Weapon browser or editor | `backend/app/routers/weapons.py`<br>`frontend/src/features/weapons/**` |
| Weapon backend tests | `backend/tests/routers/test_weapons.py` |
| Item browser or editor | `backend/app/routers/items.py`<br>`frontend/src/features/items/**` |
| Item backend tests | `backend/tests/routers/test_items.py` |
| Loot bundle browser or editor | `backend/app/routers/loot.py`<br>`frontend/src/features/loot/**` |
| Loot backend tests | `backend/tests/routers/test_loot.py` |
| Reference catalog core | `backend/app/routers/reference.py`<br>`backend/tests/routers/test_reference.py`<br>`backend/tests/test_b1_persistence.py`<br>`backend/tests/test_db_helpers.py`<br>`backend/tests/test_integration_real_data.py` |
| Catalog data migration | `scripts/migrate_spells.py` |
| Seed reference data | `data/seeds/seed_spells.json`<br>`data/seeds/seed_weapons.json`<br>`data/seeds/seed_items.json`<br>`data/seeds/seed_loot_bundles.json`<br>`data/seeds/seed_weapon_properties.json`<br>`data/seeds/seed_abilities.json`<br>`data/seeds/seed_conditions.json`<br>`data/seeds/seed_damage_types.json` |

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Spell browser | `/spells` | prep | DM |
| Spell editor | modal over the browser | prep | DM |
| Manage Players dialog | modal over the Spell browser | prep | DM |
| Weapon browser | `/weapons` | prep | DM |
| Item browser | `/items` | prep | DM |
| Loot bundle browser | `/loot` | prep | DM |
| Weapon, Item, and Loot bundle editors | modal over each browser | prep | DM |

The browsers are prep surfaces even though they are also consulted at the table, because they carry create and delete. A future read-only kid-operated lookup surface would be a new surface here, not a mode change to these.

## Invariants

- Keep catalog contracts canonical in the API and data-model references.
- Seed-backed catalog changes begin in `data/seeds/`.
- Keep domain-specific data mappings and validation intact when sharing UI primitives.
- Update the data-model reference with any seed-shape or import/export change.
- Keep items and loot bundles distinct while preserving their documented map integration.

## Work queue

<!-- GENERATED:AREA_PLANS:reference:START -->
_No plan is in flight for this area._
<!-- GENERATED:AREA_PLANS:reference:END -->

What the table cannot derive:

- [Weapon Quick Reference](../plans/done/weapon-quick-reference/weapon-quick-reference.md) shipped required quick_rules on every weapon, optional sheet-ready totals, Copy as New, cascade-aware delete confirmation, and an authored quick-rules pass across all 218 seeded weapons.
- Create a focused plan for spell class/source curation or executable mechanics.
- Catalog, bundle, and map-loot expansion remains deferred and needs a design phase.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../plans/done/spells_plan/spells_plan.md`, `../plans/done/validated-reference-text/validated-reference-text.md`, `../plans/done/loot_plan/loot_plan.md`, `../plans/done/weapon-quick-reference/weapon-quick-reference.md`, `monsters.md`, `players.md`, `dungeons.md`, and `encounters.md`.
