# Test audit — aggressive cut-down (running document)

Goal: cut from 183 files / ~2,096 tests to far fewer without losing behavior that matters.
Method: file by file — DELETE, COMBINE, or JUSTIFY. This file is the log.

## Starting point (measured 2026-09-24)

* Backend: 30 files, 481 tests collected (`pytest -o addopts="" --collect-only -q`), 442 `def test_` definitions.
* Frontend unit: 151 files under `frontend/src/`, ~1,610 `test(`/`it(` blocks.
* Frontend e2e: 2 files (`frontend/tests/e2e/*.spec.ts`), 5 `test(` blocks.
* Storybook: 4 `*.stories.*` files (run via `test:storybook` project).
* Total: 183 test/spec files, ~2,096 tests + storybook expansion.

Commands used:

```text
.venv/Scripts/python.exe -m pytest -o addopts="" --collect-only -q
rg --files frontend/src frontend/tests --glob '*.test.*' --glob '*.spec.*'
rg -o '\b(test|it)(\.skip|\.only|\.todo|\.each)?\s*\(' frontend/src frontend/tests
rg -c "def test_" backend/tests
```

## Rules (aggressive, direct)

1. DELETE trivial render-only tests (`renders without crashing`, single-class-assert, snapshot locks implementation not behavior).
2. DELETE duplicate coverage of the same code path through a different layer when one layer already locks it.
3. COMBINE type-shape / field-presence matrix tests (10 tests doing the same GET + one assert) into 1 test with all asserts.
4. COMBINE split files for the same page/model (`MapLabPage.*`, `maplabModel.*`, `maplabEditor.*`, `MapLabEditorPage.*`) into 1 file per area.
5. COMBINE tiny boot files (1–3 tests each) into 1 file.
6. JUSTIFY and KEEP: OpenAPI/contract tests, migration tests, persistence tests, error-branch tests the UI depends on, integration against real seed data, critical user flows (encounter runner, player spellbook, maplab session).
7. Do NOT delete frontend tests for files with uncommitted baseUI migration work without checking `git status` first. Backend tree is clean — cut there first.
8. Every DELETE/COMBINE must still pass its targeted pytest/vitest run.

Worktree warning: `git status --short` shows ~40+ modified frontend source+test files (baseUI migration in progress) plus 3 untracked test files. Backend `backend/` is clean. So Batch 1 = backend only.

## Running totals

| Batch | Action | Files delta | Tests delta | New totals |
|-------|--------|-------------|-------------|------------|
| 0 | start | — | — | 183 files / ~2,096 tests (481 backend collected) |
| 1 | `test_spells_target_api.py`: 10 type-shape tests -> 1 `test_list_field_types` | 0 files | -9 backend tests | 183 files / ~2,087 tests (472 backend collected) |
| 2a | 7 copy-pasted DB-failure helpers -> 1 `db_failure_conn` in `conftest.py` (25 call sites) | 0 files | 0 tests | 183 files / ~2,087 tests |
| 2b | `test_spells_target_contract.py`: 10 nested-model tests -> 5; 4 quick-rules rejects -> 1 parametrized (4 cases) | 0 files | -5 backend tests | 183 files / ~2,082 tests (467 backend collected) |
| 2c | `test_api_errors` + `test_app_factory` + `test_main` + `test_openapi_contract` (8 tests) -> `test_app_boot.py` | -3 files | 0 tests | **180 files / ~2,078 tests** |

## Backend — file by file (30 files)

### Boot / contract (4 files, 8 tests) — COMBINE to 1 file (planned Batch 2)

* `backend/tests/test_api_errors.py` (3): JUSTIFY content, COMBINE file. `test_structured_error_bodies_cover_documented_statuses` covers 5 error paths in 1 test — good, keep. Other 2 lock error schema + 404 shape — keep. Verdict: keep tests, merge file into `test_app_boot.py`.
* `backend/tests/test_app_factory.py` (3): JUSTIFY content, COMBINE file. CORS origin, DB override, StrictModel — 3 unrelated but each 1 test, keep all, merge file.
* `backend/tests/test_main.py` (1): JUSTIFY content, COMBINE file. Root endpoint when `frontend/dist` missing — keep, merge file.
* `backend/tests/test_openapi_contract.py` (1): JUSTIFY KEEP. Locks 96 operations, unique operationIds, no SPA catch-all. Brittle by design. Keep test, merge file.

### Helpers (3 files, 38 tests) — COMBINE to 1 file (planned Batch 2)

* `backend/tests/test_db_helpers.py` (12): COMBINE. `test_parse_json_value_*` (2), `test_parse_json_list_*` (2), `test_dict_from_row_none` + `test_parse_spell_row_none` (2) are one-liners — merge into 2 parametrized tests. Keep `test_parse_spell_row_decodes_every_json_column` and `test_parse_spell_row_empty_collections_survive` as-is (regression for players-spells 500). Net: 12 -> ~6.
* `backend/tests/test_parse_helpers.py` (16): COMBINE. Read next — expected same one-liner matrix. Target 16 -> ~6.
* `backend/tests/test_reference_text.py` (10): COMBINE. Read next. Target 10 -> ~4.

### Migrations (4 files, 74 tests) — COMBINE to 1 file (planned Batch 3)

* `backend/tests/test_migrate_spells.py` (36): COMBINE. Per-field migration checks — parametrize. Target 36 -> ~10.
* `backend/tests/test_migrate_loom_v2.py` (15): JUSTIFY content, COMBINE file into `test_migrations.py`.
* `backend/tests/test_migrate_map_obstacle_state.py` (14): JUSTIFY content, COMBINE file.
* `backend/tests/test_migrate_monsters.py` (9): JUSTIFY content, COMBINE file.

### Core behavior (5 files, 50 tests) — KEEP, small trims

* `backend/tests/test_b1_persistence.py` (23): JUSTIFY KEEP. Persistence is the point. No cut without data-loss risk.
* `backend/tests/test_integration_real_data.py` (19): JUSTIFY KEEP. Only suite exercising full frozen `data/seeds/*.json` read-only. Keep all.
* `backend/tests/test_caching.py` (4): JUSTIFY KEEP all 4. Each covers distinct behavior (hit+invalidate, query-arg isolation, DB-path isolation, single-flight concurrency). Already dense.
* `backend/tests/test_db_helpers.py` covered above.
* `backend/tests/test_api_errors.py` covered above.

### Routers (16 files, ~276 defs)

* `backend/tests/routers/test_spells_target_api.py` (35) — BATCH 1 DONE (partial). 10 list-shape type tests (`test_list_level_is_integer`, `test_list_concentration_is_bool`, `test_list_ritual_is_bool`, `test_list_damage_is_list`, `test_list_components_is_list`, `test_list_casting_times_is_list`, `test_list_attacks_is_list`, `test_list_healing_is_object`, `test_list_higher_levels_is_object`, `test_list_area_of_effect_is_object`) each did `GET /api/spells` + 1 assert. COMBINED into 1 `test_list_field_types`. Saves 9 tests, 9 HTTP round-trips per run. Remaining: `test_list_response_has_target_fields` + `test_list_response_excludes_legacy_fields` (keep — exact key-set lock), detail/by-title pairs (combine detail+by-title exclude-legacy into parametrized next batch), level-filter pair (combine next batch), create/update/delete lifecycle (keep).
* `backend/tests/routers/test_spells_target_contract.py` (25): COMBINE next. `TestNestedModelConstruction` 10 tests (damage/healing/higher-levels/attack/aoe defaults+populated pairs) -> 5 tests or 2 parametrized. `test_from_sample` + `test_create_round_trip` keep (canonical seed lock). Quick-rules reject matrix (4 tests) -> 1 parametrized.
* `backend/tests/routers/test_spells.py` (26) + `test_spells_target_api.py` + `test_spells_target_contract.py`: three files for one resource — aggressive target is 2 files (schema + API) or 1. Decide after reading `test_spells.py` fully (Batch 2).
* `backend/tests/routers/test_crud_completeness.py` (23): JUSTIFY KEEP tests. Contains two identical 4-line helpers (`_raise_db_failure`, `_mock_db_failure`) — both are USED (4 call sites each), so no in-file delete. Real fix is Batch 2 conftest consolidation (see Action log). Docstring says list/create/delete happy paths live in `test_resources.py`/`test_players.py` — so this file is the update/assign/error-branch lock. Keep lifecycle tests (`test_player_spell_assignment_lifecycle`, `test_player_weapon_assignment_lifecycle` cover assign+duplicate+remove in 1 test each — good density, keep).
* `backend/tests/routers/test_resources.py` (24): read next. Expected generic CRUD happy paths — if fully covered by `test_crud_completeness.py` + per-router files, DELETE redundant happy-path duplicates. Target: keep 1 smoke per resource, delete rest.
* `backend/tests/routers/test_players.py` (27): JUSTIFY KEEP assignment lifecycle (UI depends on it). Trim pure CRUD repeats covered by completeness file.
* `backend/tests/routers/test_monsters.py` (21), `test_weapons.py` (18), `test_loot.py` (6), `test_items.py` (4), `test_reference.py` (6), `test_layouts.py` (12), `test_loom.py` (26), `test_session_state.py` (10), `test_fog.py` (5), `test_at_the_table.py` (5): read in Batch 2/3. Default aggressive stance: per-router CRUD happy-path tests that duplicate `test_crud_completeness.py`/`test_resources.py` get DELETED; error branches + assignment + state-transition tests get KEPT.

## Frontend — file by file (151 unit files grouped; full per-test pass deferred — worktree dirty)

Worktree is mid-migration. No frontend deletes this turn. Aggressive targets locked for next batches once migration settles:

* `maplabModel.geometry.test.ts` (63): worst bloat. COMBINE to ~15 parametrized geometry cases. Saves ~48.
* `MapLabPage.rendering/navigation/inspector/session/layout-controls` (32+27+24+19+20=122 across 5 files): COMBINE to 1 `MapLabPage.test.tsx` (~30 tests). Saves ~90, deletes 4 files.
* `MapLabEditorPage.*` (8 files: chrome 22, canvas 23, props 11, terrain-controls 20, + shell/marker-layout/ghost-floor/stairs-portals): COMBINE to 1 file (~25 tests). Saves ~50+, deletes 7 files.
* `maplabModel.session/presentation/persistence/markers` (11+18+11+15=55 + geometry 63 = 118 across 5 files): COMBINE to 1 `maplabModel.test.ts` (~30). Saves ~88, deletes 4 files.
* `maplabEditor.*` (stairs-portals 19, rooms 23, + passages/objects/history/counters): COMBINE to 1 file. Saves ~40+, deletes ~5 files.
* `LoomPage.test.tsx` (42), `PlayerMapRenderer.test.tsx` (32), `BrowserLayout.vw0.test.tsx` (29), `encounterRunner.test.ts` (34), `LoomSwimlanes.test.tsx` (28), `EncounterRunnerPage.test.tsx` (26): each TRIM to ~10 behavior tests (delete viewport-matrix / render-variant bloat). Saves ~120.
* Trivial primitives (`Button`, `Card`, `Dialog` 16, `Tooltip`, `Popover`, `SearchList` 13, `SplitPane`, `FloatingWindow` 12, `GlossaryTerm` 12, form fields): DELETE render-only cases, keep 1 smoke per component or delete file if covered by page usage. Estimated save: ~80.
* Feature Browser/Editor pairs (Monster/Spell/Weapon/Player/NPC/Item/Loot/Encounter/Dungeon: each has BrowserPage ~11-16 + Editor ~10-14 + form/model ~10-21): COMBINE form+model into 1 per feature, DELETE BrowserPage render-variant duplicates covered by e2e. Estimated save: ~150.
* `SpellContract.audit.test.ts`, `queryInvalidation`, `noAdoption`, `healthClient`, `generatedSurface`, `client`: JUSTIFY KEEP (contract + API surface locks).
* E2E (`app.spec.ts`, `weapons.spec.ts`, 5 tests): JUSTIFY KEEP all — only true browser coverage.

Frontend aggressive estimate: 151 files -> ~90 files, 1,610 tests -> ~900 tests (saves ~700 tests, ~60 files).

## E2E + Storybook

* `frontend/tests/e2e/app.spec.ts` + `weapons.spec.ts` (5 tests): KEEP all 5. Only Playwright coverage.
* 4 `*.stories.*`: KEEP. They are docs + visual tests, not unit bloat.

## Action log (granular, direct)

* Batch 1a (KEPT): `backend/tests/routers/test_spells_target_api.py` — deleted 10 single-assert type tests (`test_list_level_is_integer`, `test_list_concentration_is_bool`, `test_list_ritual_is_bool`, `test_list_damage_is_list`, `test_list_components_is_list`, `test_list_casting_times_is_list`, `test_list_attacks_is_list`, `test_list_healing_is_object`, `test_list_higher_levels_is_object`, `test_list_area_of_effect_is_object`), replaced with 1 `test_list_field_types` covering level/concentration/ritual/damage/components/casting_times/attacks/healing/higher_levels/area_of_effect in a single GET. Verified: `test_spells_target_api.py` + `test_crud_completeness.py` = 49 passed; full collect = 472 (was 481). -9 tests, 0 behavior lost (same asserts, 1 request instead of 10).
* Batch 2a: 7 identical `_raise_db_failure`/`_mock_db_failure` factories (in `test_crud_completeness.py` x2, `test_players.py`, `test_resources.py`, `test_spells.py`, `test_loot.py`, `test_layouts.py`, `test_session_state.py`) replaced by 1 shared `db_failure_conn()` in `backend/tests/conftest.py`; 25 call sites swapped; 7 now-unused `MagicMock` imports removed. `test_monsters.py` left alone (different pattern: raising version + generic `_mock_conn(side_effect)` factory, already self-contained). Verified: 162 passed across the 9 touched files; `rg` confirms zero leftover references. 0 tests changed — pure duplication removal (~40 lines).
* Batch 2b: `test_spells_target_contract.py` — `TestNestedModelConstruction` 10 tests (defaults+populated pairs per model) -> 5 (one per model); 4 quick-rules rejection tests -> 1 parametrized test (`missing`/`blank`/`malformed`/`unknown-token`, still 4 collected cases). Verified: 20 passed. -5 collected. Canonical-seed lock (`test_from_sample`), round-trip, categories, spellbook-character, edge-case, and strictness tests untouched.
* Batch 2c: created `backend/tests/test_app_boot.py` (8 tests, moved verbatim) and deleted `test_api_errors.py`, `test_app_factory.py`, `test_main.py`, `test_openapi_contract.py`. Verified: 8 passed. -3 files, 0 tests lost.
* Full backend suite after Batch 2: coverage gate PASSES (97.19% >= 97%), 1 failure in `test_parse_helpers.py::test_select_monster_404` — proven PRE-EXISTING by running it on a clean HEAD worktree (fails there too; expects no raise from `_select_monster`, product raises `ApiError`). Not touched by this audit; flagged, not fixed (out of scope: product-vs-test mismatch, needs owner decision).
* Batch 1b (REVERTED — my mistake, direct): I deleted `_mock_db_failure` from `test_crud_completeness.py` thinking it was dead code. It is used at 4 call sites (lines 159, 242, 289, 368); only `_raise_db_failure` (lines 66–92) was the other copy. Deleting it broke 4 tests. Fix: restored the helper, file is byte-identical to HEAD. Lesson logged: grep the whole file for callers before deleting a helper, not just the first 80 lines. The real fix for this duplication is cross-file, not in-file: the same 4-line DB-failure helper is copy-pasted in 8 files (`_raise_db_failure` in `test_crud_completeness.py`, `test_players.py`, `test_monsters.py` (method); `_mock_db_failure` in `test_resources.py`, `test_spells.py`, `test_loot.py`, `test_layouts.py`, `test_session_state.py`). Batch 2: move one copy to `backend/tests/conftest.py` and delete all 8 copies (saves 8 helper defs, 0 tests).
* Incident (my fault, repaired): a `git stash push` with wrong argument order failed, then `git stash pop` applied a stale stash entry and left conflict markers in `backend/app/main.py`, `.gitignore`, `docs/PLAN_TEMPLATE.md` plus 8 stale file restorations. This broke the entire backend suite (49 errors, `SyntaxError` on markers). Repair: `main.py`/`.gitignore`/`PLAN_TEMPLATE.md` restored to HEAD (verified HEAD matches pre-existing worktree state in each case), 8 stale restorations removed (verified HEAD does not contain those paths), index unmerged entries cleared with `git reset HEAD -- <paths>`. Verified after repair: 0 unmerged paths, 0 conflict markers, targeted 49 passed, full collect 472. No user work lost: all pre-existing worktree modifications (baseUI migration files, docs deletions, untracked files) plus Batch 1a and this audit doc are intact. Rule from here on: no `git stash` commands during this audit; verify helper callers across the whole file before any delete.
