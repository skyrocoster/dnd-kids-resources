# Kid Spellbook — Give children a read-only assigned-spell reference

> **Status:** Stages 1–3 shipped; the unshipped browse surface and final verification were superseded by FL-15 and FL-16 in the Frontend Layout Redesign master plan.

- **Areas:** players, reference, design
- **Read trigger:** When changing the kid spellbook route, assigned-spell payload, spell categories, or the DM spell editor's category assignment.

## What this Plan shipped

This Plan established `/play/spells` as a personal, read-only play route for the two children sharing
the tablet. It shipped the fixed spell-category data contract and DM correction flow, then added the
kid route, assigned-spell response, character switch, `Map` action, sticky session foundation, and
resilient polling.

The visible browse surface and inline reference were not completed here. Their destination moved to the
Frontend Layout Redesign master plan so this archived record does not remain a second implementation
source.

## Stages

1. Extend the spell data contract with the fixed ten-category vocabulary, persisted multi-category values, validation, seed assignment, and assigned-spell API serialization; preserve seed export/rebuild round-tripping.
2. Add DM category editing to the existing Spell editor as a constrained multi-select, including request/response typing and focused persistence/validation coverage.
3. Add the `/play/spells` route, kid API client contract, two-character bootstrap, polling, last-good-frame behavior, Map navigation, and per-character sticky view state without crossing the `player/` import boundary.

Stages 4 and 5 were not implemented from this Plan. Their settled browse behavior, exclusions,
verification obligations, and human gates now live only in FL-15 and FL-16 of the
[Frontend Layout Redesign master plan](../../../master-plans/frontend-layout-redesign.md). Each slice
must be selected and autonomously routed by `to-plan` before implementation.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added the fixed normalized spell-category contract across schema, SQLite storage, CRUD and assigned-spell responses, plus `GET /api/players/spellbook`. All 525 canonical spell seeds now carry semantic categories that survive rebuild/export round-tripping. |
| 2 | Added the fixed category vocabulary to frontend spell response, request, and form contracts, then exposed `Categories` in the existing DM Spell editor as a constrained multi-select. Focused form and create/update serialization coverage verifies selections pass through the existing Save flow. |
| 3 | Added `/play/spells` outside `AppShell` with two response-driven character tabs, persistent Map navigation, and PlayerShell-scoped per-character in-memory view state. The abort-aware bootstrap now polls every five seconds and on visibility wake while retaining the last good frame through background failures. |

## Touches
- `backend/app/routers/spells.py`
- `backend/app/routers/players.py`
- `backend/app/schemas.py`
- `backend/app/db.py`
- `scripts/init_database.py`
- `scripts/seed_database.py`
- `scripts/export_db_seeds.py`
- `data/seeds/seed_spells.json`
- `data/seeds/seed_players.json`
- `data/seeds/seed_player_spells.json`
- `frontend/src/api/**`
- `frontend/src/player/**`
- `frontend/src/features/spells/**`
- `frontend/src/features/players/**`
- `frontend/src/router.tsx`
- `backend/tests/routers/**`
- `backend/tests/test_b1_persistence.py`
- `backend/tests/test_db_helpers.py`
- `frontend/src/player/__tests__/**`
- `frontend/src/features/spells/__tests__/**`
- `frontend/src/features/players/__tests__/**`
- `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx`
- `frontend/src/__tests__/router.test.tsx`
- `docs/areas/players.md`
- `docs/API_REFERENCE.md`
- `docs/DATA_MODEL.md`
- `docs/TESTING.md`
