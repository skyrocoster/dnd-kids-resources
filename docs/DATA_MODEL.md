# Data Model — D&D Kids Resources

Reference for seed files, tables, relationships, and JSON-encoded columns.

## Source of Truth

**Seeds are canonical rebuild inputs for seed-backed domains, including authored dungeons and Map Lab layouts.** Normal API/UI operations read and write `dnd_kids_resources.db`; never hand-edit that gitignored database. To apply seed changes:

1. Edit `data/seeds/*.json` — the source files.
2. Run `python scripts/init_database.py` — builds the schema.
3. Run `python scripts/seed_database.py` — loads the seed files into the database.

This ensures schema and seed-backed data stay synced with the codebase. Dungeons and Map Lab layouts are created through the API/UI during authoring, then frozen with `export_db_seeds.py` before a rebuild.

## Domains and Tables

19 seed files populate 19 seed-backed tables (plus junction/lookup tables for many-to-many relationships). Authored dungeon records and their map layouts are exported to dedicated seed files so they survive rebuilds.

| Seed file | Table(s) | Description | Routers |
|---|---|---|---|
| `seed_abilities.json` | `abilities` | Character ability scores and modifiers | `/api/abilities` (`reference.py`) |
| `seed_conditions.json` | `conditions` | D&D 5e conditions | `/api/conditions` (`reference.py`) |
| `seed_damage_types.json` | `damage_types` | Damage types | `/api/damage_types` (`reference.py`) |
| `seed_weapon_properties.json` | `weapon_properties` | Weapon property tags | `/api/weapon_properties` (`reference.py`) |
| `seed_spells.json` | `spells` | D&D 5e spells in the canonical 19-field contract | `/api/spells`, `/api/players/{id}/spells` |
| `seed_monsters.json` | `monsters` | D&D 5e monsters/creatures | `/api/monsters` |
| `seed_weapons.json` | `weapons` | D&D 5e weapons | `/api/weapons`, `/api/players/{id}/weapons` |
| `seed_items.json` | `items` | Reusable treasure item catalog | `/api/items` |
| `seed_loot_bundles.json` | `loot_bundle` | Hand-authored loot bundles with snapshotted contents | `/api/loot-bundles` |
| `seed_dungeons.json` | `dungeons` | Authored dungeon title and room-reading content | `/api/dungeons` |
| `seed_map_layouts.json` | `map_layout` | Authored Map Lab geometry; deleted with its dungeon | `/api/dungeons/{id}/layout` |
| `seed_map_session_state.json` | `map_session_state` | Authored session-state overrides; deleted with its dungeon | `/api/dungeons/{id}/session-state` |
| (runtime-created) | `revealed_cells` | Fog-of-war: which cells the party has revealed per dungeon, union-write ratchet | `/api/dungeons/{id}/revealed-cells` (`fog.py`) |
| (runtime-created) | `at_the_table` | Single-row pointer: which dungeon is currently "at the table" for the player app | `/api/at-the-table` (`at_the_table.py`) |
| `seed_encounters.json` | `encounter` | Combat encounters, roster, and active index | `/api/encounters` |
| `seed_npcs.json` | `npcs` | Non-player characters | `/api/npcs` |
| `seed_players.json` | `players` | Player characters | `/api/players` |
| `seed_player_spells.json` | `player_spells` (junction) | Player spell assignments | `/api/players/{id}/spells` |
| `seed_player_weapons.json` | `player_weapons` (junction) | Player weapon assignments | `/api/players/{id}/weapons` |
| `seed_loom_threads.json` | `loom_threads` | Ordered story Threads (name/color/description/origin) | `/api/loom/threads` |
| `seed_loom_nodes.json` | `loom_nodes` | Start/End/Beat/Session nodes with direct `thread_id`, `session_id`, `position`, `carried_count` | `/api/loom/nodes` |
| `seed_loom_sessions.json` | `loom_sessions` | Ordered played sessions (ordinal, name, date, notes) | `/api/loom/sessions` |

## Relationships

Non-obvious foreign-key-like relationships (skip any self-evident from naming):

- **`players` → `player_spells` ↔ `spells`** — Many-to-many via junction table. A player can have multiple spells; a spell can be known by multiple players.
- **`players` → `player_weapons` ↔ `weapons`** — Many-to-many via junction table. A player can have multiple weapons; a weapon can be owned by multiple players.
- **`encounter`** — Stores `name`, JSON `units`, and `active_index`. The API aliases the first two as `title` and `creatures`; source-backed units use the soft typed reference `creature_id` plus `source_kind` (`"monster"` or `"npc"`), while manually added player rows may use `kind: "player"` with a null creature ID. No explicit foreign key is enforced.
- **`loot_bundle`** — Contains `contents`, a JSON array of item/weapon snapshots. Entries keep a soft `ref_id` to the catalog source, but retain their name, item category, per-unit `value_gp`, and quantity after source edits or deletion.
- **`dungeons`** — Contains `data` (room-reading content) while `map_layout.data` independently stores geometry. Both use the same room IDs; room titles/content belong to `dungeons.data`, while layout room titles are render caches. Missing layout data is treated as a transient empty layout; a missing dungeon is an error.
- **`map_session_state`** — One row per dungeon holding live door/stair/portal toggle overrides, kept separate from `map_layout` so opening a door never dirties the authored map document. Missing session-state data is treated as empty (every fixture at its authored default); "Reset dungeon" deletes the row rather than writing empty maps back.
- **`revealed_cells`** — Many rows per dungeon (one per (x, y) cell the party has seen). Written via `INSERT OR IGNORE` — cells can only be added, never removed. `dungeon_id` FK to `dungeons.id` with `ON DELETE CASCADE`.
- **`at_the_table`** — Singleton row enforced by `CHECK (lock = 1)`. `dungeon_id` FK to `dungeons.id` with `ON DELETE SET NULL`. Set by the DM to point the player app at the active dungeon.
- **`loom_threads` → `loom_nodes`** — A thread contains many nodes via `loom_nodes.thread_id` FK (its ordered story: Start, beats, sessions, End). A node belongs to at most one thread at a time; a NULL `thread_id` means the beat is banked (unplaced). A `session`-kind node may have `session_id` set to the session column it belongs to. Deleting a thread deletes its nodes via `ON DELETE CASCADE` on `loom_nodes.thread_id`. The `loom_node_threads` junction table is retired; an earlier migration script (`scripts/migrate_loom_v2.py`) records the transition.
- **`loom_threads.origin_node_id` → `loom_nodes`** — Nullable back-reference: the `session` node a spawned Thread grew from. `ON DELETE SET NULL` — deleting that session un-links the spawned thread without deleting it.
- **`loom_nodes.banked_from_thread_id` → `loom_threads`** — Nullable: which thread a banked (unplaced) `beat` was removed from, `ON DELETE SET NULL`.

## JSON-Encoded Columns

Some tables store complex structured data as JSON strings. Router and database helpers explicitly decode and encode these values; Pydantic validates the resulting API shapes. The database stores them as `TEXT` columns.

| Table | Column | Contents | Example |
|---|---|---|---|
| `spells` | `quick_rules` | Validated reference text for concise authored spell rules; committed spell seeds are nonblank, while the runtime column remains nullable for legacy/local rows | `Action: make a spell attack using {spell_attack_bonus}.` |
| `spells` | `damage` | List of named damage expressions | `[{"name":"primary","formula":"8d6","damage_types":["fire"]}]` |
| `spells` | `healing` | Healing expression and flags | `{"amount":"1d4+1","temp_hp":false,"max_hp":false}` |
| `spells` | `higher_levels` | Higher-level prose and damage-by-slot expressions | `{"text":null,"damage_by_slot":{"3":"8d6"}}` |
| `spells` | `casting_times` | One or more casting-time descriptions | `["1 action"]` |
| `spells` | `components` | List of spell components (`["V", "S", "M"]`) | `["V", "S"]` |
| `spells` | `attacks` | Attack kinds and saving throws | `[{"kind":"melee","saving_throws":["str"]}]` |
| `spells` | `area_of_effect` | Area shape and optional size | `{"shape":"sphere","size":20}` |
| `monsters` | `aliases` | Alternate search/display names | `["fiendish hawk"]` |
| `monsters` | `sizes` | Creature sizes | `["medium"]` |
| `monsters` | `creature_type` | Category, subtype tags, and optional swarm size | `{"category":"dragon","tags":[],"swarm_size":null}` |
| `monsters` | `ac` | Primary armor class plus ordered alternatives | `{"value":13,"note":"natural armour","alternatives":[]}` |
| `monsters` | `hp` | Hit points average and optional formula | `{"average":59,"formula":"7d10 + 21"}` |
| `monsters` | `speed` | Typed movement speeds | `[{"mode":"walk","feet":40,"note":null,"hover":false}]` |
| `monsters` | `abilities` | Six ability scores with nullable individual values | `{"str":20,"dex":12,"con":17,"int":3,"wis":12,"cha":7}` |
| `monsters` | `saving_throws` | Sparse saving throw bonuses | `{"int":6,"wis":4}` |
| `monsters` | `skills` | Sparse active skill bonuses | `{"perception":3}` |
| `monsters` | `damage_resistances` | Damage resistance entries | `[{"damage_type":"fire","note":null,"conditional":false}]` |
| `monsters` | `damage_immunities` | Damage immunity entries | `[{"damage_type":"poison","note":null,"conditional":false}]` |
| `monsters` | `damage_vulnerabilities` | Damage vulnerability entries | `[{"damage_type":"radiant","note":"while cursed","conditional":true}]` |
| `monsters` | `condition_immunities` | Condition immunity names | `["poisoned"]` |
| `monsters` | `senses` | List of special senses | `[{"type":"darkvision","range":60,"note":null}]` |
| `monsters` | `languages` | List of languages spoken | `["Common", "Draconic"]` |
| `monsters` | `features` | Traits, actions, spellcasting, reactions, legendary/mythic blocks | `{"traits":[],"actions":[{"name":"Bite","description":null,"attack":{...}}]}` |
| `npcs` | `appearance` | Appearance dict (hair, eyes, height, distinctive features) | `{"hair": "black", "eyes": "blue", "height": "5'10\""}` |
| `npcs` | `sizes`, `ac`, `hp`, `speed`, `abilities`, `saving_throws`, `skills`, `damage_resistances`, `damage_immunities`, `damage_vulnerabilities`, `senses`, `languages`, `features` | Same monster statblock projection as the `monsters` columns above — an NPC's combat half is copied field-for-field from a monster, never translated | (see matching `monsters` rows) |
| `encounter` | `units` | List of source-backed creature or manual player roster entries | `[{"creature_id":1,"source_kind":"monster","name":"Goblin","hp_current":7}, ...]` |
| `dungeons` | `data` | DungeonData shape: general_info and rooms (with entries, NPCs); map geometry and navigation fixtures are not stored here | (large JSON blob per dungeon) |
| `map_layout` | `data` | MapLayout blob: rooms, doors, stairs, floors, props, portals, fixtures. Props may soft-reference a loot bundle by `bundle_id` with cached `bundle_name`; bundle contents resolve live. A portal's `to` is optional (`{"z", "cell"}` for an in-dungeon pair, or `{"dungeon_id"}` for a cross-dungeon gateway) and is a one-way reference — no foreign key, no cascade, no reverse index; `GET /api/dungeons/{id}/incoming-gateways` scans other dungeons' blobs to surface the other side. | (JSON blob per dungeon) |
| `map_session_state` | `data` | Session overrides for doors/stairs/portals: `{"doors": {...}, "stairs": {...}, "portals": {...}}`, each a map from fixture id to `{"isOpen", "isLocked", "trapDisarmed"}`. Opaque to the backend — same treatment as `map_layout.data`. | (JSON blob per dungeon) |
| `player_spells` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/spells`) | |
| `player_weapons` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/weapons`) | |
| `weapons` | `attack` | List of attack definitions (similar to spells) | `[{"type": "melee", "damage": "1d8"}]` |
| `weapons` | `entries` | List of flavor text or special descriptions | `["A well-crafted longsword"]` |
| `loot_bundle` | `contents` | Item/weapon snapshots with quantity and soft source ID | `[{"kind":"item","ref_id":1,"name":"Ruby","value_gp":50,"category":"gem","quantity":1}]` |

When querying or updating any of these columns, use `json.loads()` to deserialize on read and `json.dumps()` to serialize on write. Schemas validate the parsed request and response values.

## Loom — Ordered Thread Schema Notes

The loom tables model each Thread as one linear, explicitly-ordered path (Start → beats/sessions → End); there is
no edge table, no junction table, and no acyclicity concern. Key design facts:

- **Kind CHECK:** `loom_nodes.kind IN ('start', 'end', 'beat', 'session')`. `start`/`end` are thread-exclusive and
  created/removed only by the thread lifecycle (`POST`/`DELETE /loom/threads`). A `beat` is thread-exclusive by
  API-level check (at most one `thread_id`); a `session` belongs to exactly one thread at a time via its
  `thread_id`.
- **Ordering:** `loom_nodes.position` (integer) is the sole source of narrative order per thread, sorted
  ascending; `x`/`y` canvas coordinates are retired (grid position is derived from `thread_id` + `session_id`).
- **Provenance columns (all nullable):** `fulfilled_planned_title`/`fulfilled_at` on `loom_nodes` record a
  beat-turned-session's original planned wording and when it was fulfilled; `banked_from_thread_id` records which
  thread a banked beat was removed from.
- **Cascade semantics:** Deleting a node is direct. Deleting a thread cascades to its nodes via
  `ON DELETE CASCADE` on `loom_nodes.thread_id`. `origin_node_id` back-references to a deleted node are set
  NULL by the FK.
- **Token-key colors:** `loom_threads.color` stores a token key (`thread-1`…`thread-6`), validated by Pydantic pattern `^thread-[1-6]$`. This is not a DB CHECK, so the palette can grow without a schema change. The actual colors are generated MD3 token sets in `frontend/src/theme.css`.
- **Seed loading is explicit, not part of "load all":** The three loom seed files (`seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_sessions.json`) define the frozen demo tapestry (6 threads, 45 nodes, 8 sessions, 3 banked beats with NULL `thread_id`) — a test/playtest fixture, not canonical campaign data. `python scripts/seed_database.py --loom [--force]` loads them; a plain `python scripts/seed_database.py` (no flags) does not, so the demo tapestry never overwrites a live campaign. `backend/tests/conftest.py::_seed_real_data` always loads them for the integration test DB.
- **Export before rebuild:** Loom data is runtime-authored through the API/UI and supports `scripts/export_db_seeds.py` — freeze live campaign state to the three seed files above before running `scripts/init_database.py` (which drops and recreates the loom tables). Dungeons and Map Lab layouts now behave the same way; the loom is no longer a divergence.

## Rebuilding the Database

After editing seed files or updating the schema:

```bash
# From the repo root:
python scripts/init_database.py    # Creates/resets schema
python scripts/seed_database.py    # Loads all seed files
```

This destroys and rebuilds `dnd_kids_resources.db` (gitignored, so no commit impact). Use this workflow in development and in CI before running tests.

To export the current database state back to seed files (one-off data updates), inspect a dry run first:

```bash
python scripts/export_db_seeds.py --dry-run
```

Omit `--dry-run` only after review; this overwrites `data/seeds/*.json`. **All 20 tables are exported**, including `dungeons`, `map_layout`, and `map_session_state` — `init_database.py` drops those three, so authored dungeon content is lost on the next rebuild unless it has been exported first.

Two safeguards protect a routine export from destroying authored work:

- A table that is **empty in the database** will not overwrite a **populated** seed file. The export prints `[SKIP]` and moves on. This is what stops a plain export from wiping the loom fixture, which loads only behind `--loom`. Override with `--allow-empty` when the deletion is intended.
- A column mismatch is **fatal**. The exporter used to catch `sqlite3.OperationalError` and print a warning, so a renamed column silently dropped a whole table from the seeds; it now aborts and points at `scripts/generate_export_schema.py --check-db`.

Column lists are not maintained by hand. `scripts/generate_export_schema.py` derives them from the `CREATE TABLE` statements in `init_database.py` into `data/generated/export_schema.json`; CI runs `--check` to fail when that file goes stale. Every table in the schema must appear in the exporter's `EXPORT_POLICY` or `EXPORT_EXCLUSIONS`, so a newly added table cannot silently escape backup.

<!-- GENERATED:DATA_MODEL:START -->
### Generated Schema Inventory

#### `abilities`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `code` | `TEXT` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `emoji` | `TEXT` | yes | `-` |
| `color` | `TEXT` | yes | `-` |
| `type` | `TEXT` | yes | `'stat'` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_abilities_2`, `sqlite_autoindex_abilities_1`.

#### `at_the_table`

| Column | Type | Required | Default |
|---|---|---|---|
| `lock` | `INTEGER` | yes | `1` |
| `dungeon_id` | `INTEGER` | no | `-` |

Foreign keys: `dungeon_id` -> `dungeons.id` (SET NULL).

#### `conditions`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `title` | `TEXT` | yes | `-` |
| `icon` | `TEXT` | yes | `'⚠️'` |
| `explanation` | `TEXT` | no | `-` |
| `details` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_conditions_1`.

#### `damage_types`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `code` | `TEXT` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `emoji` | `TEXT` | yes | `-` |
| `color` | `TEXT` | yes | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_damage_types_1`.

#### `dungeons`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `title` | `TEXT` | yes | `-` |
| `data` | `TEXT` | yes | `-` |
| `created_at` | `TIMESTAMP` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP` | no | `CURRENT_TIMESTAMP` |

#### `encounter`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `units` | `TEXT` | yes | `'[]'` |
| `active_index` | `INTEGER` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `items`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `value_gp` | `REAL` | yes | `0` |
| `category` | `TEXT` | no | `-` |
| `description` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `loom_nodes`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `thread_id` | `INTEGER` | no | `-` |
| `kind` | `TEXT` | yes | `-` |
| `title` | `TEXT` | yes | `-` |
| `body` | `TEXT` | no | `-` |
| `session_id` | `INTEGER` | no | `-` |
| `position` | `INTEGER` | yes | `0` |
| `carried_count` | `INTEGER` | yes | `0` |
| `fulfilled_planned_title` | `TEXT` | no | `-` |
| `fulfilled_at` | `DATETIME` | no | `-` |
| `banked_from_thread_id` | `INTEGER` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Foreign keys: `banked_from_thread_id` -> `loom_threads.id` (SET NULL), `session_id` -> `loom_sessions.id` (SET NULL), `thread_id` -> `loom_threads.id` (CASCADE).

Indexes: `idx_loom_nodes_unique_thread_session`, `idx_loom_nodes_session`, `idx_loom_nodes_thread_position`.

#### `loom_sessions`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `ordinal` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `played_on` | `DATE` | no | `-` |
| `notes` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_loom_sessions_1`.

#### `loom_threads`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `color` | `TEXT` | yes | `'thread-1'` |
| `description` | `TEXT` | no | `-` |
| `origin_node_id` | `INTEGER` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Foreign keys: `origin_node_id` -> `loom_nodes.id` (SET NULL).

Indexes: `sqlite_autoindex_loom_threads_1`.

#### `loot_bundle`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `gold` | `REAL` | yes | `0` |
| `contents` | `TEXT` | yes | `'[]'` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `map_layout`

| Column | Type | Required | Default |
|---|---|---|---|
| `dungeon_id` | `INTEGER` | yes | `-` |
| `data` | `TEXT` | yes | `-` |

Foreign keys: `dungeon_id` -> `dungeons.id` (CASCADE).

#### `map_session_state`

| Column | Type | Required | Default |
|---|---|---|---|
| `dungeon_id` | `INTEGER` | yes | `-` |
| `data` | `TEXT` | yes | `-` |

Foreign keys: `dungeon_id` -> `dungeons.id` (CASCADE).

#### `monsters`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `aliases` | `TEXT` | yes | `'[]'` |
| `sizes` | `TEXT` | yes | `'[]'` |
| `family` | `TEXT` | no | `-` |
| `alignment` | `TEXT` | no | `-` |
| `creature_type` | `TEXT` | no | `-` |
| `ac` | `TEXT` | no | `-` |
| `hp` | `TEXT` | no | `-` |
| `speed` | `TEXT` | yes | `'[]'` |
| `abilities` | `TEXT` | no | `-` |
| `saving_throws` | `TEXT` | yes | `'{}'` |
| `skills` | `TEXT` | yes | `'{}'` |
| `passive_perception` | `INTEGER` | no | `-` |
| `damage_resistances` | `TEXT` | yes | `'[]'` |
| `damage_immunities` | `TEXT` | yes | `'[]'` |
| `damage_vulnerabilities` | `TEXT` | yes | `'[]'` |
| `condition_immunities` | `TEXT` | yes | `'[]'` |
| `senses` | `TEXT` | yes | `'[]'` |
| `languages` | `TEXT` | yes | `'[]'` |
| `audio_path` | `TEXT` | no | `-` |
| `features` | `TEXT` | yes | `'{}'` |
| `cr` | `TEXT` | no | `-` |
| `cr_sort` | `REAL` | no | `-` |
| `cr_note` | `TEXT` | no | `-` |
| `experience_points` | `INTEGER` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `idx_monsters_cr_sort`, `idx_monsters_cr`, `sqlite_autoindex_monsters_1`.

#### `npcs`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `race` | `TEXT` | no | `-` |
| `gender` | `TEXT` | no | `-` |
| `background` | `TEXT` | no | `-` |
| `sizes` | `TEXT` | yes | `'[]'` |
| `alignment` | `TEXT` | no | `-` |
| `creature_type` | `TEXT` | no | `-` |
| `ac` | `TEXT` | no | `-` |
| `hp` | `TEXT` | no | `-` |
| `speed` | `TEXT` | yes | `'[]'` |
| `abilities` | `TEXT` | no | `-` |
| `saving_throws` | `TEXT` | yes | `'{}'` |
| `skills` | `TEXT` | yes | `'{}'` |
| `passive_perception` | `INTEGER` | no | `-` |
| `damage_resistances` | `TEXT` | yes | `'[]'` |
| `damage_immunities` | `TEXT` | yes | `'[]'` |
| `damage_vulnerabilities` | `TEXT` | yes | `'[]'` |
| `condition_immunities` | `TEXT` | yes | `'[]'` |
| `senses` | `TEXT` | yes | `'[]'` |
| `languages` | `TEXT` | yes | `'[]'` |
| `features` | `TEXT` | yes | `'{}'` |
| `cr` | `TEXT` | no | `-` |
| `cr_note` | `TEXT` | no | `-` |
| `experience_points` | `INTEGER` | no | `-` |
| `appearance` | `TEXT` | no | `-` |
| `notes` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_npcs_1`.

#### `player_spells`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `player_id` | `INTEGER` | yes | `-` |
| `spell_id` | `INTEGER` | yes | `-` |
| `added_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Foreign keys: `spell_id` -> `spells.id` (CASCADE), `player_id` -> `players.id` (CASCADE).

Indexes: `sqlite_autoindex_player_spells_1`.

#### `player_weapons`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `player_id` | `INTEGER` | yes | `-` |
| `weapon_id` | `INTEGER` | yes | `-` |
| `added_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Foreign keys: `weapon_id` -> `weapons.id` (CASCADE), `player_id` -> `players.id` (CASCADE).

Indexes: `sqlite_autoindex_player_weapons_1`.

#### `players`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `'Unnamed Player'` |
| `child_name` | `TEXT` | no | `-` |
| `class` | `TEXT` | no | `-` |
| `subclass` | `TEXT` | no | `-` |
| `level` | `INTEGER` | no | `-` |
| `ancestry` | `TEXT` | no | `-` |
| `background` | `TEXT` | no | `-` |
| `sizes` | `TEXT` | yes | `'[]'` |
| `alignment` | `TEXT` | no | `-` |
| `creature_type` | `TEXT` | no | `-` |
| `ac` | `TEXT` | no | `-` |
| `hp` | `TEXT` | no | `-` |
| `speed` | `TEXT` | yes | `'[]'` |
| `abilities` | `TEXT` | no | `-` |
| `saving_throws` | `TEXT` | yes | `'{}'` |
| `skills` | `TEXT` | yes | `'{}'` |
| `passive_perception` | `INTEGER` | no | `-` |
| `damage_resistances` | `TEXT` | yes | `'[]'` |
| `damage_immunities` | `TEXT` | yes | `'[]'` |
| `damage_vulnerabilities` | `TEXT` | yes | `'[]'` |
| `condition_immunities` | `TEXT` | yes | `'[]'` |
| `senses` | `TEXT` | yes | `'[]'` |
| `languages` | `TEXT` | yes | `'[]'` |
| `features` | `TEXT` | yes | `'{}'` |
| `initiative` | `INTEGER` | no | `-` |
| `proficiency_bonus` | `INTEGER` | no | `-` |
| `spell_attack_bonus` | `INTEGER` | no | `-` |
| `spell_save_dc` | `INTEGER` | no | `-` |
| `max_spell_slots` | `TEXT` | no | `'{}'` |
| `notes` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `revealed_cells`

| Column | Type | Required | Default |
|---|---|---|---|
| `dungeon_id` | `INTEGER` | yes | `-` |
| `x` | `INTEGER` | yes | `-` |
| `y` | `INTEGER` | yes | `-` |

Foreign keys: `dungeon_id` -> `dungeons.id` (CASCADE).

Indexes: `sqlite_autoindex_revealed_cells_1`.

#### `spells`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `level` | `INTEGER` | yes | `-` |
| `school` | `TEXT` | no | `-` |
| `description` | `TEXT` | yes | `-` |
| `quick_rules` | `TEXT` | no | `-` |
| `alternate_description` | `TEXT` | no | `-` |
| `damage` | `TEXT` | yes | `'[]'` |
| `healing` | `TEXT` | yes | `'{"amount": null, "temp_hp": false, "max_hp": false}'` |
| `range` | `TEXT` | yes | `-` |
| `higher_levels` | `TEXT` | yes | `'{"text": null, "damage_by_slot": {}}'` |
| `casting_times` | `TEXT` | yes | `'[]'` |
| `duration` | `TEXT` | yes | `-` |
| `concentration` | `BOOLEAN` | yes | `0` |
| `ritual` | `BOOLEAN` | yes | `0` |
| `components` | `TEXT` | yes | `'[]'` |
| `materials` | `TEXT` | no | `-` |
| `attacks` | `TEXT` | yes | `'[]'` |
| `area_of_effect` | `TEXT` | yes | `'{"shape": null, "size": null}'` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `idx_spells_school`, `idx_spells_level`, `idx_spells_name`, `sqlite_autoindex_spells_1`.

#### `weapon_properties`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `code` | `TEXT` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `description` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_weapon_properties_1`.

#### `weapons`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `base_weapon` | `TEXT` | no | `-` |
| `baseitems` | `BOOLEAN` | yes | `0` |
| `rarity` | `TEXT` | no | `-` |
| `weapon_category` | `TEXT` | no | `-` |
| `weight` | `REAL` | no | `-` |
| `req_attune` | `TEXT` | no | `-` |
| `sentient` | `BOOLEAN` | yes | `0` |
| `curse` | `BOOLEAN` | yes | `0` |
| `resist` | `TEXT` | yes | `'[]'` |
| `property` | `TEXT` | yes | `'[]'` |
| `focus` | `TEXT` | yes | `'[]'` |
| `spells` | `TEXT` | yes | `'[]'` |
| `attack` | `TEXT` | yes | `'[]'` |
| `recharge` | `TEXT` | yes | `'{}'` |
| `light` | `TEXT` | yes | `'[]'` |
| `entries` | `TEXT` | yes | `'[]'` |
| `tier` | `TEXT` | no | `-` |
| `grants_language` | `BOOLEAN` | yes | `0` |
| `bonus_spell_attack` | `INTEGER` | no | `-` |
| `bonus_spell_save_dc` | `INTEGER` | no | `-` |
| `bonus_ac` | `INTEGER` | no | `-` |
| `bonus_saving_throw` | `INTEGER` | no | `-` |
| `crit_threshold` | `INTEGER` | no | `-` |
| `ammo_type` | `TEXT` | no | `-` |
| `grants_proficiency` | `BOOLEAN` | yes | `0` |
| `modify_speed` | `TEXT` | yes | `'{}'` |
| `ability` | `TEXT` | yes | `'{}'` |
| `quick_rules` | `TEXT` | no | `-` |
| `weapon_attack_bonus` | `INTEGER` | no | `-` |
| `weapon_damage_bonus` | `INTEGER` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_weapons_1`.
<!-- GENERATED:DATA_MODEL:END -->

