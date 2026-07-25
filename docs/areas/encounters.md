# Encounters Area Guide

> **Plan queue:** None.

## Scope

Owns encounter authoring, the encounter runner, combatant state, Map Lab encounter docking, monster catalog and stat blocks, and NPC management. Monster catalog data remains distinct from live encounter-runner state even though both now share one upgrade area.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/encounters.py`, `backend/app/routers/monsters.py`, and `backend/app/routers/npcs.py`.
- Frontend: `frontend/src/features/encounters/`, `frontend/src/features/monsters/`, and `frontend/src/features/npcs/`.
- Tests: Encounter, monster, and NPC router tests with colocated frontend tests.

## Change map

| Change type | Source globs |
|---|---|
| Encounter authoring or runner | `backend/app/routers/encounters.py`<br>`frontend/src/features/encounters/**` |
| Monster catalog or stat block | `backend/app/routers/monsters.py`<br>`frontend/src/features/monsters/**` |
| Monster backend tests | `backend/tests/routers/test_monsters.py` |
| NPC management | `backend/app/routers/npcs.py`<br>`frontend/src/features/npcs/**` |
| Monster data migration | `scripts/migrate_monsters.py`<br>`backend/tests/test_migrate_monsters.py` |
| Encounter seed data | `data/seeds/seed_encounters.json`<br>`data/seeds/seed_monsters.json`<br>`data/seeds/seed_npcs.json` |

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Encounter browser | `/encounters` | prep | DM |
| Encounter editor | modal over the browser | prep | DM |
| Encounter runner | `/encounters/:id/run` | play | DM |
| Encounter runner dock | `FloatingWindow`, opened from play surfaces | play | DM |
| Monster browser | `/monsters` | prep | DM |
| Monster editor | `/monsters/new`, `/monsters/:id/edit` | prep | DM |
| NPC browser | `/npcs` | prep | DM |
| NPC editor | modal over NPC browser | prep | DM |
| Pull from monster dialog | modal over NPC browser detail pane | prep | DM |
| Add to encounter dialog | modal over NPC browser detail pane | prep | DM |
| NPC dossier dock | `FloatingWindow`, opened from play surfaces | play | DM |

The runner and its dock are the app's most play-mode surfaces: HP changes are direct controls with no save step, and nothing there may open a blocking modal.

## Invariants

- Preserve existing encounter wire models and persistence when changing presentation.
- Monster roster data is consumed from the monster domain; do not duplicate its catalog logic here.
- Preserve the routed full-page Monster Editor and its stat-card presentation unless a focused plan explicitly changes them.
- Keep catalog contracts canonical in the API and data-model references.

## Work queue

- Create a focused plan for encounter budgeting, templates, quick-add, player HP, or initiative work.
- Create a focused plan for monster curation, sound playback, deep links, or stat calculations.

## Cross-references

`../ARCHITECTURE.md`, `../DATA_MODEL.md`, `../plans/done/encounters_plan/encounters_plan.md`, `../plans/done/monsters_plan/monsters_plan.md`, and `dungeons.md`.
