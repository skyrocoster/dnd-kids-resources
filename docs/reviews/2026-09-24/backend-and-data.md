# Backend and data

**Review date:** 2026-09-24  
**Scope:** Python API routes/schemas, SQLite persistence, seed authoring/export/import, reset behavior, provenance limits, and the frontend calls needed to examine cross-layer contracts. This is source and filename evidence, not live-database or runtime verification.

Evidence labels and snapshot limits follow the [review overview](README.md#how-to-read-the-findings). The [frontend map](frontend-data-flow.md) covers broader client behavior and generated API-contract ownership.

## Summary

The FastAPI application is assembled in `backend/app/main.py:create_app()`. Feature routers execute SQL directly through the shared SQLite helpers in `backend/app/db.py`; domain schemas define request and response shapes; selected JSON columns are converted by shared or router-local helpers before FastAPI response-model validation. There is no separate persistence/service layer between the routers and SQLite in the reviewed application modules.

The runtime source of truth is the SQLite file, not the checked-in JSON seed inputs. The root README says the Docker-volume database must already exist and that `dev.ps1 start` neither creates nor seeds it (`README.md:7-19`). The database initializer drops and recreates tables and the seeder's `--force` path clears data; the README explicitly warns against using initialization on an existing campaign.

The findings fall into two groups:

- **Reset/import safety:** table lists are incomplete, force-seeding can clear more than the selected import group, and invalid inputs can become empty lists after clearing. These are verified source behaviors with potential data-loss consequences, not observations from a live reset.
- **API contracts:** spell/monster list calls omit pagination arguments, and two nested player-spell projections omit optional fields. The source mismatches are verified; their user-visible effects remain unverified.

The [findings and next actions](findings-and-next-actions.md#ranked-follow-up) put data safety first. This document retains the supporting API and data-tooling evidence, including why export/import is not a guaranteed lossless round trip.

## Request and response lifecycle

1. `frontend/src/api/client.ts:apiClient`, `listSpells()`, and `listMonsters()` configure a shared generated client and unwrap its `{ data }` result. Browser pages call those wrappers directly (`frontend/src/features/spells/SpellBrowserPage.tsx:SpellBrowserPage.load`; `frontend/src/features/monsters/MonsterBrowserPage.tsx:MonsterBrowserPage`); this is the only frontend behavior included here.
2. `backend/app/main.py:create_app()` installs the `bind_db_path` dependency, CORS settings, and 16 `/api` routers. An unmatched `/api/*` path receives the structured `api_not_found` response; when a frontend build exists, non-API paths can use the SPA fallback (`main.py:33-49,51-63,65-107`). The checked-in OpenAPI contract test asserts 97 API operations with stable operation IDs (`backend/tests/test_app_boot.py:test_openapi_declares_stable_ids_for_api_operations_without_spa_catch_all`, lines 185-200). This is test-source evidence; separate execution results belong to the [test baseline](test-baseline.md).
3. `backend/app/db.py:_get_db_path()` selects `DND_DATABASE_PATH` or `/workspace/data/database/dnd_kids_resources.db`; `get_db_path()` supports an app-specific path and `bind_db_path()` binds it to the request context (`db.py:10-40`). `get_conn()` opens SQLite with a `sqlite3.Row` row factory and `PRAGMA foreign_keys = ON`; `get_db()` closes the connection (`db.py:43-59`). Handlers issue SQL and generally call `commit()` or `rollback()` themselves.
4. `backend/app/caching.py:cached_get()` and `cached_read()` cache eligible GET results by database path, namespace, and handler arguments. The cache has a 60-second TTL and max size of 1,024 entries; values are copied on return, and identical concurrent reads share a loader (`caching.py:17-23,42-95,114-135`). `create_app()` invalidates cache entries for the request's database after a successful POST, PUT, PATCH, or DELETE (`main.py:43-49`). External database writers do not pass through this middleware; the TTL bounds but does not eliminate that staleness possibility.
5. Router response models in `backend/app/schemas/` validate/shape results. `ApiRouter` uses `StructuredErrorRoute` to return a raised `ApiError` body at the JSON root; `error_responses()` documents feature errors and retains FastAPI validation error details for 422 responses (`backend/app/api_errors.py:23-68`). The response path for uncaught database exceptions varies by router; see risks below.

`backend/app/routers/health.py:get_health()` itself returns `{"status": "ok"}` without opening a database connection. The app-level database-path dependency still applies to the route, but the handler has no database query (`health.py:6-9`, `main.py:35-40`).

## Schema, persistence, and seed lineage

### Runtime database

`backend/database/init_database.py:init_database()` is the schema DDL source. It creates SQLite tables for reference/catalog data, player relationships, dungeons and map state, and Loom (`init_database.py:77-455`). The runtime app reads the configured database path; the inspected API modules do not load `data/5eTools` files directly.

### Seed inputs

`backend/database/seed_database.py:SEEDS_DIR` points to repository `data/seeds/` (`seed_database.py:38`). Population functions read JSON, serialize structured values into SQLite columns, and validate spell/weapon quick-rule references (`seed_database.py:41-53,137-193,742-809`). Most skip already populated tables unless forced. The module names `src/tools/export_db_seeds.py` as the re-export route; its policy is described [below](#schema-manifest-and-database-export).

`populate_spells()` refers in a comment to a “5eTools staging workflow,” but loads `seed_spells.json`, not the extraction tree (`seed_database.py:196-242`). Available [authoring transformations](#seed-producers-and-transformations) do not establish complete seed provenance.

`populate_dungeons()` imports `dungeons`, `map_layout`, and `map_session_state` from three seed files (`seed_database.py:1211-1260`). The reviewed seeder has no population function or dispatch branch for the `revealed_cells` or `at_the_table` tables (`seed_database.py:1263-1429`). Loom's demo data is a separate opt-in `--loom` load; normal `load_all` excludes it (`seed_database.py:1342-1373,1423-1429`). The test fixture's `_seed_real_data()` explicitly populates the Loom tables (`backend/tests/conftest.py:_seed_real_data`, lines 74-104), so that fixture setup is not identical to the normal no-flag seed flow.

There is a source-comment mismatch to preserve: `init_database.py` calls dungeon content runtime-created and says no dungeon seeds are loaded on rebuild (`:301-302`), while `seed_database.py:populate_dungeons()` says dungeons are seed-backed and loads them. This does not change the README's statement that service startup does not seed the database.

The seeder's completion footer also says “14 tables” and lists 14 files (`seed_database.py:1443-1457`), while the export policy and local seed filename inventory cover 22 table/seed names. Use the population functions and dispatch code, not completion text, to determine behavior.

### Seed filename inventory

Filename inspection found 22 `seed_*.json` files under `data/seeds/`:

| Group | Filenames |
| --- | --- |
| Reference/catalog | `seed_abilities.json`, `seed_conditions.json`, `seed_damage_types.json`, `seed_weapon_properties.json` |
| Spells, creatures, and equipment | `seed_spells.json`, `seed_monsters.json`, `seed_weapons.json`, `seed_npcs.json` |
| Player and campaign records | `seed_players.json`, `seed_player_spells.json`, `seed_player_weapons.json`, `seed_encounters.json`, `seed_items.json`, `seed_loot_bundles.json` |
| Dungeon and map state | `seed_dungeons.json`, `seed_map_layouts.json`, `seed_map_session_state.json`, `seed_revealed_cells.json`, `seed_at_the_table.json` |
| Loom demo records | `seed_loom_nodes.json`, `seed_loom_sessions.json`, `seed_loom_threads.json` |

The directory also contained `_generate_corrections.py` and `weapon_quick_rules_review.json`. This records filenames only, not Git tracking, content freshness, provenance, or approval.

### Destructive and incomplete reset paths

- `init_database.py:init_database()` drops the tables listed at lines 36-59, then issues non-`IF NOT EXISTS` table-creation statements. Its drop list does not include `revealed_cells` or `at_the_table`, although DDL creates both at lines 330-347. A repeat initialization against a database where either table already exists is therefore a static collision risk. The initializer's completion message says “18 tables” at lines 473-485, while the DDL contains 22 `CREATE TABLE` statements.
- `seed_database.py:clear_all_tables()` disables foreign keys and deletes its explicit table list (`:1263-1312`). That list omits `revealed_cells` and `at_the_table`, which both reference dungeons (`init_database.py:330-347`). Since the force path invokes this clear before repopulation (`seed_database.py:1384-1394`), stale rows can survive the clear; if seed IDs are reused, they may become associated with newly inserted dungeons. This is an inference from the SQL/foreign-key settings, not a live-database observation.
- `main()` calls `clear_all_tables()` for any `--force` invocation before checking which individual populate functions to run (`seed_database.py:1351-1373,1384-1429`). Therefore a table-specific command such as `--spells --force` or `--loom --force` clears the full listed database but repopulates only the selected table group. This is a source-level data-loss risk; no seeding command was run.
- `load_json_file()` reports a missing file or JSON parse error and returns `[]` (`seed_database.py:41-53`). Population functions can treat an empty result as “nothing to load”; `populate_spells()` explicitly returns after the empty result at lines 218-223, and its force branch deletes current spells before loading at lines 214-216. Combined with `clear_all_tables()` running first in global force mode, an input failure can leave seed-backed tables empty or partial while control continues. No seeding command was run.

## Data tooling pipeline

Schema metadata controls export columns; database rows supply seed records. The manifest is not itself a producer of data:

```text
Schema metadata:
  backend/database/init_database.py (CREATE TABLE statements)
    -> src.tools.generate_export_schema
    -> data/generated/export_schema.json
    -> exporter column definitions + hand-maintained export policy

Data movement:
  configured SQLite database
    -> src.tools.export_db_seeds
    -> data/seeds/*.json
    -> backend.database.seed_database (selected import groups)
    -> target SQLite database
```

These are available operations, not automatic synchronization. The exporter includes `revealed_cells` and `at_the_table`, but the importer has no dispatch for them; Loom import is opt-in. Export therefore does not imply complete restoration through the current seeder. The live database is not guaranteed to match any seed revision.

### Schema manifest and database export

`src/tools/generate_export_schema.py:build_manifest()` parses the initializer's `CREATE TABLE` statements (`:80-106`). `--write` writes `data/generated/export_schema.json`; `--check` compares it with freshly derived output; `--check-db` compares expected tables/columns with the configured database (`:113-190`). Do not hand-edit the generated manifest. These checks establish schema shape/freshness, not content accuracy or restorability.

`src/tools/export_db_seeds.py:EXPORT_POLICY` maps tables to filenames and stable ordering (`:34-65`). The exporter uses manifest columns, parses configured JSON columns, and writes JSON (`:102-163,194-213`). `validate_policy()` rejects unclassified schema tables and policy entries absent from the schema (`:102-129`); `EXPORT_EXCLUSIONS` is empty (`:63-65`).

The policy includes players, assignments, dungeons, encounters, map state, and Loom as well as catalog data. It is a database export, not an authoring-only filter. Important limits:

- `DB_PATH` selects the database and files are written directly under `data/seeds/` (`export_db_seeds.py:27-35,231-258`). `--dry-run` avoids JSON writes but still creates the seed directory before opening the database (`:223-255`); it is not a general no-side-effect guarantee.
- Empty tables do not overwrite populated seed files by default. `--allow-empty` permits that destructive overwrite (`:166-213,225-228`).
- Export can copy private or mutable campaign records into seed files. The policy includes players/assignments (`:55-58`), and the schema includes `child_name` (`backend/database/init_database.py:350-386`). Confirm the target, review planned writes, and check output suitability before saving or sharing it.

### Seed producers and transformations

- **Quick rules:** `src/tools/generate_spell_quick_rules.py` reads `seed_spells.json`; `generate_weapon_quick_rules.py` reads `seed_weapons.json`. Both write review output and require `--write-seeds` to apply drafts to the input (`generate_spell_quick_rules.py:13-15,184-203`; `generate_weapon_quick_rules.py:17-18,172-191`). Omitting that option does not make the whole command read-only.
- **Legacy spells:** `src/tools/migrate_spells.py:migrate()` transforms a strict legacy row shape. Its default source is `data/seeds/seed_spells.json`; the CLI requires a distinct output and offers `--check` or `--write` (`:13-14,63-88,402-459`). Current seed contents were not inspected, so applicability is unknown.
- **Legacy monsters:** `src/tools/migrate_monsters.py` describes a 5eTools-to-M1 conversion (`:1-2,54-58`). Its `__main__` directly overwrites `data/seeds/seed_monsters.json`, with no separate output/check/dry-run option in that entrypoint (`:783-788`). Do not use it on the only seed copy.

The quick-rule filenames/options suggest review steps but do not establish actual human approval. These tools are manual maintenance, not app-runtime imports. The tools README documents their module invocation (`src/tools/README.md:6-14`); persistence tests import exporter/migration/quick-rule code (`backend/tests/test_b1_persistence.py:23-29`), and dedicated migration tests appear in the [test inventory](test-baseline.md#test-entrypoints).

### Operational safeguards

Do not initialize an existing campaign database or treat a partial `--force` selection as a partial clear. Completion messages are not proof that every input loaded. Any later reset/restore verification must use a disposable database, check inputs before clearing, and assert selected table contents/counts. Protect seed copies before conversion, review export targets and private data, and allow empty overwrites only when explicitly intended and backed up. No such operation was performed for this review.

## API pathway map

The route modules below own the SQL and most row-to-response transformations. List routes with `limit`/`offset` generally default to 100 and cap `limit` at 500.

| API area | Route/data path | Main transformations and contracts |
|---|---|---|
| Reference | `GET /api/abilities`, `/conditions`, `/damage_types`, `/weapon_properties` — `backend/app/routers/reference.py:get_abilities`, `get_conditions`, `get_damage_types`, `get_weapon_properties` → corresponding SQLite tables. `GET /api/skills` and `/spell-components` use `get_skills` and `get_spell_components` module constants. | Ability query filters to six ability codes; condition `title` is exposed as `name`. The code-defined lists are not sourced through the seed loader (`reference.py:12-140`). |
| Spells | `/api/spells` list/create; `/api/spells/{spell_id}` get/update/delete; `/api/spells/by-title/{spell_name}`; `/api/spells/{spell_id}/players` get/replace → `spells`, `player_spells`, `players`. See `backend/app/routers/spells.py:list_spells`, `get_spell`, `create_spell`, `update_spell`, `delete_spell`, and assignment handlers. | `_spell_values()` JSON-encodes structured request fields; shared `db.parse_spell_row()` decodes the JSON list/object fields and boolean flags. `SpellCreate` validates quick-rule tokens and category values (`spells.py:16-45`; `backend/app/schemas/spells.py:54-135`; `db.py:91-119`). |
| Monsters and NPCs | `/api/monsters` CRUD plus `/by-name/{name}` → `monsters`; `/api/npcs` CRUD → `npcs`. `backend/app/routers/monsters.py:list_monsters`, `_serialize_monster()`, `_parse_monster_row()` and `npcs.py:list_npcs`, `_serialize_npc()`, `_parse_npc_row()` own the paths. | Structured statblock fields are stored in JSON text columns and parsed back; monster `cr_sort` is derived by `_cr_sort()` (`monsters.py:16-102`; `npcs.py:14-90`). Schemas reside in `backend/app/schemas/creatures.py`. |
| Weapons | `/api/weapons` CRUD, `/api/weapons/by-name/{name}`, `/api/weapons/{weapon_id}/players` → `weapons` and `player_weapons`. See `backend/app/routers/weapons.py:list_weapons`, `_parse_weapon_row()`, and `get_weapon_players()`. | `property`, `focus`, `attack`, and `entries` are JSON-encoded in writes and parsed for responses (`weapons.py:14-48`). |
| Players and assignments | `/api/players` CRUD; `/api/players/spellbook`; `/api/players/{player_id}/spells` and `/weapons` get/replace; `/api/players/{player_id}/detail`; per-item spell/weapon assignment routes → `players`, `player_spells`, `player_weapons`, `spells`, and `weapons`. Reverse spell assignments also appear at `/api/spells/{spell_id}/players`. See `backend/app/routers/players.py:list_players`, `_select_player()`, `get_player_spellbook()`, and assignment handlers. | Player statblock fields use JSON text columns. Assignment replacement validates IDs and uses delete/insert transactions; `get_player_spellbook()` combines players with assigned spells and uses the canonical spell parser (`players.py:25-107,137-171,295-429,473-599`). |
| Items, loot, and encounters | `/api/items` CRUD → `items`; `/api/loot-bundles` CRUD → `loot_bundle`; `/api/encounters` CRUD → `encounter`. See `backend/app/routers/items.py`, `loot.py`, and `encounters.py`. | Loot `contents` and encounter `units` are JSON text. The encounter projection aliases `name AS title` and `units AS creatures`; `_parse_encounter_row()` decodes the JSON (`encounters.py:14-26`). |
| Dungeons and map session | `/api/dungeons` CRUD → `dungeons`; `/api/dungeons/{dungeon_id}/layout` and `/incoming-gateways` → `map_layout`; `/session-state` → `map_session_state`; `/revealed-cells` → `revealed_cells`; `/api/at-the-table` → `at_the_table`. See `backend/app/routers/dungeons.py`, `layouts.py`, `session_state.py`, `fog.py`, and `at_the_table.py`. | Dungeon/layout/session blobs use generic `Dict[str, Any]` contracts (`backend/app/schemas/campaign.py:Dungeon,MapLayoutBlob,MapSessionStateBlob`, lines 157-186). Layout saving upserts the blob and prunes only invalidated sparse runtime overrides (`layouts.py:_prune_session_state,save_dungeon_layout`, lines 120-154,225-279). Session-state writes normalize allowed leaves and delete empty state (`session_state.py:_normalize_session_state,save_dungeon_session_state`, lines 37-122). Fog writes are additive (`fog.py:reveal_cells`, lines 28-62); the at-the-table route stores one shared dungeon pointer (`at_the_table.py:get_at_the_table,set_at_the_table`, lines 10-56). |
| Loom | `/api/loom/tapestry`; `/api/loom/sessions`, `/threads`, `/nodes` CRUD and actions; `/api/loom/threads/{thread_id}/items...` ordered membership routes → `loom_sessions`, `loom_threads`, and `loom_nodes`. See `backend/app/routers/loom.py:get_tapestry`, session/thread/node handlers and ordered thread-item handlers. | `get_tapestry()` returns an ordered multi-table bootstrap. Session logging, fulfilment/banking, placing, reordering, and moving nodes update campaign state; `_thread_ordered()`, `_clamped_index()`, and `_renumber_thread()` implement ordered membership (`loom.py:43-123,253-330,338-885`). Contracts are in `schemas/campaign.py:Loom*` and errors in `schemas/errors.py:LoomError`. |

## Contracts, transformations, and error behavior

`backend/app/schemas/__init__.py` re-exports the domain contracts in `common.py`, `spells.py`, `creatures.py`, `characters.py`, `equipment.py`, and `campaign.py`. `StrictModel` forbids extra fields and coercion where used (`schemas/common.py:75-76`); campaign models inherit `BaseModel` directly in several cases, so strictness is not uniform. Spell and creature contracts are nested structured models rather than untyped JSON (`schemas/spells.py:13-89`; `schemas/creatures.py:22-212`).

`db.parse_json_value()` attempts JSON decoding but returns the original value for malformed JSON; `parse_json_list()` raises if the decoded value is not a list (`db.py:62-81`). Entity routers maintain different JSON-column sets and parse helpers, for example `_parse_monster_row()`, `_parse_npc_row()`, and `_parse_weapon_row()`. The spell parser is intentionally centralized; `test_db_helpers.py` records the earlier duplicate spell-parser regression in its module comment and exercises the canonical helper (lines 1-5,51-82). Malformed persisted JSON may therefore reach response-model validation as the original string; the exact failure mode depends on the route schema and was not exercised here.

Most domain routers use `ApiRouter` and raise typed `ApiError`s for expected missing/invalid-resource conditions. `items.py` is a notable exception in write handling: its create/update/delete functions commit without local exception-to-`ApiError` mapping, while the item error schema only declares `item_not_found` (`items.py:50-105`; `schemas/errors.py:39-41`). The client-visible outcome for a database failure was not verified. Other routers differ too: several convert caught database exceptions into 400 responses and include exception text in their error message.

## Findings and verification boundaries

### Cross-layer pagination risk — static observation, not a confirmed defect

`spells.py:list_spells()` and `monsters.py:list_monsters()` default to 100 records (`spells.py:48-55`; `monsters.py:105-110`). The central client wrappers call `sdk.listSpells(options)` and `sdk.listMonsters(options)` without query values (`frontend/src/api/client.ts:93-118`); the browser consumers sort and store the returned array rather than requesting another page (`SpellBrowserPage.tsx:167-187`; `MonsterBrowserPage.tsx:29-48`). Existing backend integration-test source asserts 525 spells and 2,276 monsters and uses explicit `limit=500` requests to walk the collections (`backend/tests/test_integration_real_data.py:372-416`). This establishes the static mismatch and the presence of more than 100 records in the test fixture. It does not establish the deployed database contents, all consumer expectations, or a user-visible failure.

### Player spell projections — verify before asserting response behavior

`players.py:get_player_spells()` and `get_player_detail()` select spell fields without `quick_rules` and `alternate_description` (`players.py:312-325,575-599`), although both are fields in the canonical `Spell` response model (`schemas/spells.py:67-89`). The detail query also repeats `higher_levels`, `casting_times`, and `duration` (`players.py:575-580`). These are verified SQL projection facts. The outcome after FastAPI/Pydantic response serialization, including whether omitted optional fields are filled with defaults, was not behaviorally tested; do not infer a user-visible loss from this review alone. By contrast, `get_player_spellbook()` selects both fields (`players.py:137-171`).

Existing `/players/{id}/spells` tests assert `quick_rules` presence/equality against a catalog response (`backend/tests/routers/test_players.py:68-85`), but this source review did not establish whether the fixture value is non-null. The detail test checks IDs, categories, and list presence, not the full spell contract (`:149-160`). Verify both nested endpoints with non-null optional fields before changing query shape. Any separate duplication cleanup should remove only repeated expressions, not assume the similar projections can be shared wholesale.

### Other risks and unknowns

- **Migration side effects:** `migrate_map_obstacle_state.py:migrate_database()` rewrites every stored map layout to reset obstacle values and deletes all `map_session_state` rows (`migrate_map_obstacle_state.py:91-136`). Its seed-file function also rewrites layout seeds and clears session-state seeds (`:142-190`). It is a destructive one-time migration, not part of app startup; no migration was run. `migrate_loom_v2.py` and its tests describe conversion from a legacy graph/membership schema (`migrate_loom_v2.py:_write_new_schema`, lines 597-693; `test_migrate_loom_v2.py:_OLD_SCHEMA`, lines 27-68), whereas current DDL stores `thread_id` and `session_id` directly on `loom_nodes` (`init_database.py:440-455`). Verify the target database generation before treating that script as applicable.
- **Authorization:** no authentication or authorization middleware/checks were found in the reviewed app/router paths. The CORS allowlist in `main.py:51-63` restricts browser origins; it is not endpoint authorization. The [service overview](README.md#service-lifecycle-and-operational-entrypoints) records local Compose's loopback binding, but deployment-specific exposure and access policy remain unknown.
- **Opaque payload validation:** encounter creatures, dungeon data, layouts, and map session blobs permit generic dictionaries (`schemas/campaign.py:140-186`). Some invariants are enforced in router logic, but the reviewed backend does not express a complete typed fixture/layout contract. Invalid or legacy blob structures remain a data-quality risk; actual persisted records were not inspected.
- **External writes and cache freshness:** successful API writes trigger invalidation, but writers that bypass the API do not. Cached reads may remain until their TTL expires (`main.py:43-49`; `caching.py:17-18,98-111`).
- **Duplication:** CRUD and JSON serialization patterns recur across entity routers, but the schemas/columns vary; this review does not recommend a broad extraction. The duplicate player-detail select projection is a concrete redundant query fragment. The canonical spell parser is already shared rather than duplicated (`db.py:97-119`).
- **Runtime unknowns:** the persistent database's schema/data state, uncaught item-failure payloads, and values returned by the nested player-spell endpoints were not observed. Tool availability does not establish seed provenance or live-database parity.

## External and unresolved data boundaries

Filename inspection observed `data/5eTools/extracted/` (spell, bestiary, root, and generated-data areas), `data/5eTools/full_extract/`, and a dated map-seed archive under `data/archive/`. Names included `spells-merged-clean-range-text.json` and spell archive files. Directory names alone do not establish current tool inputs, provenance, version, license, or redistribution rights.

The following remain unknown:

- original sources for each catalog/campaign seed, including external versus hand-authored material;
- acquisition/extraction process and version relationships for the 5eTools-named trees;
- manual corrections and approvals after migration or generation;
- live-database parity with seed revisions and the backup/restore process for mutable campaign data;
- the process, owner, and last refresh of the [OpenAPI snapshot](frontend-data-flow.md#api-boundary-and-contract-ownership);
- existence and packaging of monster audio assets. The monster converter retains a filename from validated `soundClip.path` (`src/tools/migrate_monsters.py:450-466`), but the assets were not inspected.

These are evidence limits, not proof that assets or workflows are absent.

## Scope limits

No live SQLite file, seed/corpus contents, credentials, or generated builds were inspected; data-file tracking was not determined. No tests, browser/API scenarios, generators, exports, imports, migrations, or manifest/database checks were run for this source review. The [test baseline](test-baseline.md) records separate suite passes, not proof of the safety or contract behavior questioned here.

## Evidence index

- App assembly, router registration, CORS, write invalidation, and SPA/API fallback: `backend/app/main.py:create_app()`.
- Database path, request binding, SQLite connection lifecycle, and JSON decoding: `backend/app/db.py:_get_db_path`, `get_db_path`, `bind_db_path`, `get_conn`, `get_db`, `parse_json_value`, `parse_json_list`, `parse_spell_row`.
- Read cache and error adaptation: `backend/app/caching.py:cached_read`, `cached_get`, `invalidate_cache`; `backend/app/api_errors.py:ApiError`, `StructuredErrorRoute`, `ApiRouter`, `error_responses`.
- Schema construction and import/reset flow: `backend/database/init_database.py:init_database`; `backend/database/seed_database.py:load_json_file`, `populate_spells`, `populate_dungeons`, `clear_all_tables`, `main`.
- Manifest/export and authoring: `src/tools/generate_export_schema.py:build_manifest`; `export_db_seeds.py:EXPORT_POLICY,validate_policy`; `generate_spell_quick_rules.py`, `generate_weapon_quick_rules.py`, `migrate_spells.py`, and `migrate_monsters.py`.
- Persistent-volume and destructive-operation warning: `README.md:7-19`.
- Cross-layer contract sources: `frontend/src/api/client.ts:listSpells,listMonsters`; `backend/app/routers/spells.py:list_spells`; `backend/app/routers/monsters.py:list_monsters`; `backend/tests/test_integration_real_data.py`.
