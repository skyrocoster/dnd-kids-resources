# Test audit — aggressive cut-down (running document)

Goal: cut from 183 files / ~2,096 tests to far fewer without losing behavior that matters.
Method: file by file — DELETE, COMBINE, or JUSTIFY. This file is the log.

## Starting point (measured 2026-09-24)

* Backend: 30 files, 481 tests collected (`pytest -o addopts="" --collect-only -q`), 442 `def test_` definitions.
* Frontend unit: 151 files under `frontend/src/`, ~1,610 `test(`/`it(` blocks.
* Frontend e2e: 2 files (`frontend/tests/e2e/*.spec.ts`), 5 `test(` blocks.
* Storybook: 4 `*.stories.*` files (run via `test:storybook` project).
* Total: 183 test/spec files, ~2,096 tests + storybook expansion.

## Second measurement — RE-AUDIT (2026-09-24, after 4 commits + post-log backend cuts)

Considerable changes landed after the log below: 4 commits (`3ad32e2 rebuild start`, `5f17aaa removing useless stuff`, `ef820fb Further factor`, `ec0d764 migration to baseUI`) plus a large unlogged worktree batch that cut ~2,255 backend test lines. Re-measured with the same commands:

```text
.venv/Scripts/python.exe -m pytest -o addopts="" --collect-only -q   → 333 tests collected
.venv/Scripts/python.exe -m pytest -o addopts="" -q                 → 333 passed, 0 failures (52.5s)
.venv/Scripts/python.exe -m pytest -q   (default addopts, coverage)  → TOTAL 97.23%, gate 97% PASSES
rg -c "def test_" backend/tests                                      → 28 files incl. conftest.py, 268 defs
rg --files frontend/src frontend/tests --glob '*.test.*' --glob '*.spec.*' → 154 files
rg -o '\b(test|it)(\.skip|\.only|\.todo|\.each)?\s*\(' frontend/src frontend/tests → 1,645 blocks
```

* Backend: **27 test files + `conftest.py`, 333 tests collected (was 467 at last log row), 333 pass, 0 failures.** Coverage gate: 97.23% (was 97.19%).
* Frontend unit: **152 files, 1,640 `test(`/`it(` blocks** (was 151 / ~1,610). Grew: migration work added 6 test files (`Popover`, `InspectorPanel`, `MapLabEditorSelection`, `RoomContentEditor`, `AddMonsterPanel`, `PlayerSpellbookRoute`); `importRule.test.ts` was deleted. Zero frontend cuts made (rule 7 — worktree still dirty).
* Frontend e2e: 2 files, 5 blocks (unchanged). Storybook: 4 files (unchanged).
* Totals convention (matches the table, excludes stories): backend test files + frontend test/spec files = **181**; plus 4 story files = **185 total files**. Tests: **~1,978** (333 backend + 1,645 frontend incl. 5 e2e).
* vs baseline 183 / ~2,096: **−118 tests, +1 counted file (+4 with stories).** The real win is backend (−148 tests); frontend grew +30 because new migration tests outnumber cuts (there are none yet).
* The pre-existing `test_parse_helpers.py::test_select_monster_404` failure flagged in the Action log is GONE — `test_parse_helpers.py` was cut 16 → 4 defs. **The backend suite is fully green for the first time this audit.**

## Worktree status (re-audit)

`git status --short`: **both** trees are now dirty. Backend worktree vs HEAD: 30 files changed (+521/−2,255), incl. the 4 Batch-2c deletions plus untracked `test_app_boot.py`. Frontend: ~140 modified src+test files + 6 untracked test files (baseUI migration still uncommitted). The 4 commits on HEAD also deleted 10 coordinator-harness backend test files (`test_browser_validation`, `test_check_orders`, `test_check_wrappers`, 5× `test_coordinator_test_*_contract`, `test_read_guard`, `test_large_read_guard`) — workflow harness, not product coverage.

## Commands used

```text
.venv/Scripts/python.exe -m pytest -o addopts="" --collect-only -q
.venv/Scripts/python.exe -m pytest -q                 # full run + coverage gate (default addopts)
rg --files frontend/src frontend/tests --glob '*.test.*' --glob '*.spec.*'
rg -o '\b(test|it)(\.skip|\.only|\.todo|\.each)?\s*\(' frontend/src frontend/tests
rg -c "def test_" backend/tests
rg -c -e 'test\(' -e 'it\(' frontend/src frontend/tests --glob '*.test.*' --glob '*.spec.*'
```

## Rules (aggressive, direct)

1. DELETE trivial render-only tests (`renders without crashing`, single-class-assert, snapshot locks implementation not behavior).
2. DELETE duplicate coverage of the same code path through a different layer when one layer already locks it.
3. COMBINE type-shape / field-presence matrix tests (10 tests doing the same GET + one assert) into 1 test with all asserts.
4. COMBINE split files for the same page/model (`MapLabPage.*`, `maplabModel.*`, `maplabEditor.*`, `MapLabEditorPage.*`) into 1 file per area.
5. COMBINE tiny boot files (1–3 tests each) into 1 file.
6. JUSTIFY and KEEP: OpenAPI/contract tests, migration tests, persistence tests, error-branch tests the UI depends on, integration against real seed data, critical user flows (encounter runner, player spellbook, maplab session).
7. Do NOT delete tests for files with uncommitted work without checking `git status` first. (Backend was clean at session start — cut there first. Both trees are dirty now; backend cuts are mostly DONE, frontend cuts stay on hold until the baseUI migration is committed.)
8. Every DELETE/COMBINE must still pass its targeted pytest/vitest run.

Safety rule added this session (see incident in Action log): no `git stash` commands during this audit; grep the whole file for callers before deleting a helper.

## Running totals

| Batch | Action | Files delta | Tests delta | New totals |
|-------|--------|-------------|-------------|------------|
| 0 | start | — | — | 183 files (excl. 4 stories) / ~2,096 tests (481 backend collected) |
| 1 | `test_spells_target_api.py`: 10 type-shape tests -> 1 `test_list_field_types` | 0 files | -9 backend tests | 183 files / ~2,087 tests (472 backend collected) |
| 2a | 7 copy-pasted DB-failure helpers -> 1 `db_failure_conn` in `conftest.py` (25 call sites) | 0 files | 0 tests | 183 files / ~2,087 tests |
| 2b | `test_spells_target_contract.py`: 10 nested-model tests -> 5; 4 quick-rules rejects -> 1 parametrized (4 cases) | 0 files | -5 backend tests | 183 files / ~2,082 tests (467 backend collected) |
| 2c | `test_api_errors` + `test_app_factory` + `test_main` + `test_openapi_contract` (8 tests) -> `test_app_boot.py` | -3 files | 0 tests | **180 files / ~2,078 tests** |
| 3 (post-log, unlogged) | ~26 backend files re-cut (−2,255 lines; helpers/parse/migrate/players/resources/spells/etc.); 4 commits deleted 10 coordinator-harness test files; frontend +1 file / +30 blocks (new migration tests, no cuts) | +1 file | -134 backend, +30 frontend | 181 files / ~1,978 tests (333 backend collected) |
| RE-AUDIT | exact re-measure; recount incl. the 4 story files (never counted in the table) | +4 | — | **185 total files / ~1,978 tests + storybook expansion** |

## Backend — file by file (current: 27 files, 268 defs + parametrization = 333 collected)

### Boot / contract — DONE (1 file, 8 tests)

* `backend/tests/test_app_boot.py` (8): Batch 2c merged file (CORS, DB override, StrictModel, structured errors, 404 shape, root endpoint, OpenAPI contract). KEEP as-is.

### Helpers — MOSTLY DONE (3 files, 17)

* `backend/tests/test_db_helpers.py` (7, was 12): parametrized. Regression pair for the players-spells 500 kept (`test_parse_spell_row_decodes_every_json_column`, `test_parse_spell_row_empty_collections_survive`). ~1 more trimmable (`2 parse_json_*` one-liners) — optional.
* `backend/tests/test_parse_helpers.py` (4, was 16): beat the ~6 target. **Removed the old pre-existing failure along the way.** DONE.
* `backend/tests/test_reference_text.py` (6, was 10): target was ~4; 2 more trimmable.

### Migrations — CONTENT DONE, FILE-COMBINE OPEN (4 files, 52)

* `backend/tests/test_migrate_spells.py` (18, was 36): per-field checks parametrized; ~10 achievable if appetite remains.
* `backend/tests/test_migrate_loom_v2.py` (15): unchanged count.
* `backend/tests/test_migrate_map_obstacle_state.py` (11, was 14).
* `backend/tests/test_migrate_monsters.py` (8, was 9).

Verdict: content is lean (JUSTIFY KEEP per rule 6). Only planned item left is the Batch-3 file-combine: 4 files → 1 `test_migrations.py` (−3 files, 0 tests).

### Core behavior (4 files, 42)

* `backend/tests/test_b1_persistence.py` (17, was 23): cut −6 despite the original "KEEP all 23" verdict; 17 persistence locks all green. Stop here — further cuts = data-loss risk.
* `backend/tests/test_integration_real_data.py` (17, was 19): only suite exercising frozen `data/seeds/*.json`. KEEP.
* `backend/tests/test_caching.py` (4): untouched; each test covers a distinct behavior (hit+invalidate, query-arg isolation, DB-path isolation, single-flight). KEEP.
* (`test_db_helpers.py` covered above.)

### Routers (16 files, 152 defs)

* `backend/tests/routers/test_loom.py` (20, was 26): **now the densest backend file.** Was never on the aggressive list — review next.
* `backend/tests/routers/test_spells_target_api.py` (18, was 35): Batch 1a landed, plus the list/detail/api level-filter combines planned in the log. Remaining: see 3-file consolidation below.
* `backend/tests/routers/test_spells_target_contract.py` (9, was 25): Batch 2b landed, plus more. Canonical locks (`test_from_sample`, round-trip, categories) kept.
* `backend/tests/routers/test_spells.py` (11, was 26): happy-path trims landed. All three spell files (18+9+11 = 38 defs) are lean — the original 3→2 file combine is now optional.
* `backend/tests/routers/test_crud_completeness.py` (17, was 23): lifecycle + error-branch lock kept. Helper dedupe landed via conftest `db_failure_conn()`; re-audit confirms the ONLY leftover copy is `test_monsters.py`'s own pattern (raising version + `_mock_conn(side_effect)`), which Batch 2a deliberately left self-contained. Verified intentional.
* `backend/tests/routers/test_players.py` (11, was 27): assignment lifecycle locks intact (UI depends on them); CRUD repeats removed.
* `backend/tests/routers/test_resources.py` (10, was 24): trimmed to smoke + distinctive coverage — no longer duplicates the completeness file.
* `backend/tests/routers/test_monsters.py` (12, was 21).
* `backend/tests/routers/test_weapons.py` (12, was 18).
* `backend/tests/routers/test_layouts.py` (8, was 12).
* `backend/tests/routers/test_session_state.py` (6, was 10).
* `backend/tests/routers/test_fog.py` (5, unchanged), `test_at_the_table.py` (4, was 5), `test_loot.py` (4, was 6).
* Tiny files: `test_items.py` (2, was 4) and `test_reference.py` (1, was 6) — fold both into 1 tiny-router file next pass (−1 file, 0 tests).

### Remaining backend plan (ranked)

1. Combine 4 migration files → 1 (−3 files, 0 tests).
2. Fold `test_items.py` + `test_reference.py` → 1 tiny-router file (−1 file).
3. `test_reference_text.py` 6 → ~4 (−2 tests).
4. `test_loom.py` (20) — substantive review: next big backend target.
5. `test_migrate_spells.py` 18 → ~10 (−8) only if parametrization appetite remains.

## Frontend (152 unit files, 1,640 blocks — cuts STILL DEFERRED, worktree dirty)

Same zero-delete stance as the original log (rule 7). Locked targets re-measured with fresh counts:

* `maplabModel` cluster (5 files = 108): **geometry 60** (was 63), presentation 18, markers 15, persistence 11, session 4 (was 11). COMBINE → 1 `maplabModel.test.ts` (~30). Saves ~78, −4 files.
* `MapLabPage` cluster (5 files = 122): rendering 32, navigation 27, inspector 24, layout-controls 20, session 19. COMBINE → 1 `MapLabPage.test.tsx` (~30). Saves ~92, −4 files.
* `MapLabEditorPage` cluster (8 files = 105): canvas 23, chrome 22, terrain-controls 20, props 11, shell 10, stairs-portals 8, ghost-floor 7, marker-layout 4. COMBINE → 1 file (~25). Saves ~80, −7 files.
* `maplabEditor` model cluster (6 files = 68): rooms 23, stairs-portals 19, passages 7, objects 8, history 5, counters 6. Fold into the maplabModel file or 1 editor file. Saves ~40, −5 files.
* Big pages to TRIM (not combine): `LoomPage` 42, `encounterRunner` 34, `PlayerMapRenderer` 32, `EncounterRunnerPage` 29, `LoomSwimlanes` 28, `BrowserLayout.vw0` 27. Trim each to ~10 behavior tests (delete viewport-matrix / render-variant bloat). Saves ~120.
* Hooks: maplab hooks (6 files = 46 blocks: useMapLabEditor 11, useMapLayerVisibility 10, useCanvasStroke 8, useActiveRoom 6, useMapLabSessionState 6, useMapLabNavigationSession 5) + player/map/encounter hooks (usePlayerMapData 15, useMapCanvasZoom 15, canvasGrid 15, useEncounterRunner 10, usePlayerSpellbook 5 = 60). COMBINE per area. Saves ~80, −8 files. (New target from re-audit.)
* Primitives are ALREADY leaner than the original ~80 estimate: Button 8, Card 5, Tooltip 3, Popover 5, SplitPane 9, SelectField 2, MultiSelectField 3, TextField 5, CheckboxField 5, IconButton 5, ProgressMeter 3, CalendarDate 2. Holdouts worth trimming: Dialog 16, FloatingWindow 12, GlossaryTerm 13, SearchList 13, DiceText 11 → 1 smoke each. Saves ~50 (not 80).
* New post-log maplab files to review for render-variant bloat: ViewerRoomRail 24, roomContent 24, StairPortalMarker 18, markerBadges 17, DoorMarker 17, RoomDetailsPanel 15, FixturePropertiesForm 14, InspectorPanel 14.
* KEEP-list (contract + API surface locks) unchanged: `SpellContract.audit.test.ts`, `queryInvalidation`, `noAdoption`, `healthClient`, `generatedSurface`, `client`.
* E2E (`app.spec.ts` 1 test, `weapons.spec.ts` 4 tests): KEEP all 5 — only true browser coverage.

Updated frontend aggregate: 152 files → ~95, 1,640 blocks → ~850 (−790 tests, −57 files once the migration settles and the combines land).

## E2E + Storybook

* `frontend/tests/e2e/app.spec.ts` + `weapons.spec.ts` (5 tests): KEEP all 5. Only Playwright coverage.
* 4 `*.stories.*` (`Header`, `Page`, `Button`, `AdvancedFormControls`): KEEP. Docs + visual tests.

## Action log (granular, direct)

* Batch 1a (KEPT): `backend/tests/routers/test_spells_target_api.py` — deleted 10 single-assert type tests (`test_list_level_is_integer`, `test_list_concentration_is_bool`, `test_list_ritual_is_bool`, `test_list_damage_is_list`, `test_list_components_is_list`, `test_list_casting_times_is_list`, `test_list_attacks_is_list`, `test_list_healing_is_object`, `test_list_higher_levels_is_object`, `test_list_area_of_effect_is_object`), replaced with 1 `test_list_field_types` covering level/concentration/ritual/damage/components/casting_times/attacks/healing/higher_levels/area_of_effect in a single GET. Verified: `test_spells_target_api.py` + `test_crud_completeness.py` = 49 passed; full collect = 472 (was 481). -9 tests, 0 behavior lost (same asserts, 1 request instead of 10).
* Batch 2a: 7 identical `_raise_db_failure`/`_mock_db_failure` factories (in `test_crud_completeness.py` x2, `test_players.py`, `test_resources.py`, `test_spells.py`, `test_loot.py`, `test_layouts.py`, `test_session_state.py`) replaced by 1 shared `db_failure_conn()` in `backend/tests/conftest.py`; 25 call sites swapped; 7 now-unused `MagicMock` imports removed. `test_monsters.py` left alone (different pattern: raising version + generic `_mock_conn(side_effect)` factory, already self-contained). Verified: 162 passed across the 9 touched files; `rg` confirms zero leftover references. 0 tests changed — pure duplication removal (~40 lines).
* Batch 2b: `test_spells_target_contract.py` — `TestNestedModelConstruction` 10 tests (defaults+populated pairs per model) -> 5 (one per model); 4 quick-rules rejection tests -> 1 parametrized test (`missing`/`blank`/`malformed`/`unknown-token`, still 4 collected cases). Verified: 20 passed. -5 collected. Canonical-seed lock (`test_from_sample`), round-trip, categories, spellbook-character, edge-case, and strictness tests untouched.
* Batch 2c: created `backend/tests/test_app_boot.py` (8 tests, moved verbatim) and deleted `test_api_errors.py`, `test_app_factory.py`, `test_main.py`, `test_openapi_contract.py`. Verified: 8 passed. -3 files, 0 tests lost.
* Full backend suite after Batch 2: coverage gate PASSES (97.19% >= 97%), 1 failure in `test_parse_helpers.py::test_select_monster_404` — proven PRE-EXISTING by running it on a clean HEAD worktree (fails there too; expects no raise from `_select_monster`, product raises `ApiError`). Not touched by this audit; flagged, not fixed (out of scope: product-vs-test mismatch, needs owner decision).
* Batch 1b (REVERTED — my mistake, direct): I deleted `_mock_db_failure` from `test_crud_completeness.py` thinking it was dead code. It is used at 4 call sites (lines 159, 242, 289, 368); only `_raise_db_failure` (lines 66–92) was the other copy. Deleting it broke 4 tests. Fix: restored the helper, file is byte-identical to HEAD. Lesson logged: grep the whole file for callers before deleting a helper, not just the first 80 lines. (The cross-file fix landed as Batch 2a.)
* Incident (my fault, repaired): a `git stash push` with wrong argument order failed, then `git stash pop` applied a stale stash entry and left conflict markers in `backend/app/main.py`, `.gitignore`, `docs/PLAN_TEMPLATE.md` plus 8 stale file restorations. This broke the entire backend suite (49 errors, `SyntaxError` on markers). Repair: `main.py`/`.gitignore`/`PLAN_TEMPLATE.md` restored to HEAD (verified HEAD matches pre-existing worktree state in each case), 8 stale restorations removed (verified HEAD does not contain those paths), index unmerged entries cleared with `git reset HEAD -- <paths>`. Verified after repair: 0 unmerged paths, 0 conflict markers, targeted 49 passed, full collect 472. No user work lost: all pre-existing worktree modifications (baseUI migration files, docs deletions, untracked files) plus Batch 1a and this audit doc are intact. Rule from here on: no `git stash` commands during this audit; verify helper callers across the whole file before any delete.
* RE-AUDIT (2026-09-24, this pass): re-measured everything from scratch — numbers at the top of this doc. Post-log changes (not attributable to a logged batch): backend −2,255 lines across ~26 files → 333 collected (467 → 333); **full suite 333 passed, 0 failures** in 52.5s; coverage gate PASSES at 97.23% (was 97.19%). The previously-flagged pre-existing failure (`test_select_monster_404`) was removed with the `test_parse_helpers.py` cut 16 → 4. 4 commits (3ad32e2..ec0d764) deleted 10 coordinator-harness backend test files — workflow harness, no product-coverage loss. Frontend: +6 test files, −1 (`importRule.test.ts`), 1,640 blocks (+30; ZERO cuts, per rule 7 while the baseUI migration is uncommitted). Verified no copy-pasted DB-failure helpers remain outside conftest except `test_monsters.py`'s intentional self-contained pattern (matches the Batch 2a note exactly). File counts re-baselined exactly: 181 counted files + 4 stories = 185. Remaining work ranked in the Backend/Frontend sections above; no files touched this pass.