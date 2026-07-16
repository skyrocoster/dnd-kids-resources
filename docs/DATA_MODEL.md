# Data Model — D&D Kids Resources

Reference for seed files, tables, relationships, and JSON-encoded columns.

## Source of Truth

**Seeds are canonical rebuild inputs for seed-backed domains; dungeons are runtime-authored.** Normal API/UI operations read and write `dnd_kids_resources.db`; never hand-edit that gitignored database. To apply seed changes:

1. Edit `data/seeds/*.json` — the source files.
2. Run `python scripts/init_database.py` — builds the schema.
3. Run `python scripts/seed_database.py` — loads the seed files into the database.

This ensures schema and seed-backed data stay synced with the codebase. Dungeons and Map Lab layouts are created through the API, persist in the local database during normal use, and are intentionally cleared by a database rebuild.

## Domains and Tables

19 seed files populate 19 seed-backed tables (plus junction/lookup tables for many-to-many relationships). Dungeon records and their map layouts are created at runtime and are intentionally not seeded.

| Seed file | Table(s) | Description | Routers |
|---|---|---|---|
| `seed_abilities.json` | `abilities` | Character ability scores and modifiers | `/api/abilities` (`reference.py`) |
| `seed_conditions.json` | `conditions` | D&D 5e conditions | `/api/conditions` (`reference.py`) |
| `seed_damage_types.json` | `damage_types` | Damage types | `/api/damage_types` (`reference.py`) |
| `seed_weapon_properties.json` | `weapon_properties` | Weapon property tags | `/api/weapon_properties` (`reference.py`) |
| `seed_spells.json` | `spells` | D&D 5e spells in the canonical 18-field contract | `/api/spells`, `/api/players/{id}/spells` |
| `seed_monsters.json` | `monsters` | D&D 5e monsters/creatures | `/api/monsters` |
| `seed_weapons.json` | `weapons` | D&D 5e weapons | `/api/weapons`, `/api/players/{id}/weapons` |
| `seed_items.json` | `items` | Reusable treasure item catalog | `/api/items` |
| `seed_loot_bundles.json` | `loot_bundle` | Hand-authored loot bundles with snapshotted contents | `/api/loot-bundles` |
| (runtime-created) | `dungeons` | Dungeon title and room-reading content | `/api/dungeons` |
| (editor-generated) | `map_layout` | Map geometry; deleted with its dungeon | `/api/dungeons/{id}/layout` |
| `seed_encounters.json` | `encounter` | Combat encounters, roster, and active index | `/api/encounters` |
| `seed_npcs.json` | `npcs` | Non-player characters | `/api/npcs` |
| `seed_players.json` | `players` | Player characters | `/api/players` |
| `seed_player_spells.json` | `player_spells` (junction) | Player spell assignments | `/api/players/{id}/spells` |
| `seed_player_weapons.json` | `player_weapons` (junction) | Player weapon assignments | `/api/players/{id}/weapons` |
| `seed_quests.json` | `quests` | Quests/missions | `/api/quests` |
| `seed_loom_threads.json` | `loom_threads` | Tapestry story-thread lanes | `/api/loom/threads` |
| `seed_loom_nodes.json` | `loom_nodes` | Tapestry anchor and update nodes | `/api/loom/nodes` |
| `seed_loom_node_threads.json` | `loom_node_threads` (junction) | Node-to-thread membership | `/api/loom/tapestry` |
| `seed_loom_edges.json` | `loom_edges` | Directed narrative edges between nodes | `/api/loom/edges` |

## Relationships

Non-obvious foreign-key-like relationships (skip any self-evident from naming):

- **`players` → `player_spells` ↔ `spells`** — Many-to-many via junction table. A player can have multiple spells; a spell can be known by multiple players.
- **`players` → `player_weapons` ↔ `weapons`** — Many-to-many via junction table. A player can have multiple weapons; a weapon can be owned by multiple players.
- **`encounter`** — Stores `name`, JSON `units`, and `active_index`. The API aliases the first two as `title` and `creatures`; units may be monsters or `kind: "player"` session entries. No explicit foreign key is enforced.
- **`loot_bundle`** — Contains `contents`, a JSON array of item/weapon snapshots. Entries keep a soft `ref_id` to the catalog source, but retain their name, item category, per-unit `value_gp`, and quantity after source edits or deletion.
- **`dungeons`** — Contains `data` (room-reading content) while `map_layout.data` independently stores geometry. Both use the same room IDs; room titles/content belong to `dungeons.data`, while layout room titles are render caches. Missing layout data is treated as a transient empty layout; a missing dungeon is an error.
- **`quests` → `quest_giver`** — Optional foreign key to `npcs.id`. A quest is given by an NPC (or none if quest_giver is NULL).
- **`quests` → `dungeon_id`** — Optional foreign key to `dungeons.id`. A quest can be tied to a specific dungeon.
- **`loom_threads` → `loom_node_threads` ↔ `loom_nodes`** — Many-to-many via junction table. A thread contains many nodes; a node can belong to many threads. Deleting a thread cascades **only junction rows** — nodes survive, because retiring a thread must never destroy narrative history. Deleting a node cascades its edges and memberships (the wires go with the node).
- **`loom_edges`** — Directed edges between nodes. `source_id` → `target_id` represents forward-only narrative time. Acyclicity is enforced server-side; the `UNIQUE(source_id, target_id)` constraint prevents duplicate edges.

## JSON-Encoded Columns

Some tables store complex structured data as JSON strings. Router and database helpers explicitly decode and encode these values; Pydantic validates the resulting API shapes. The database stores them as `TEXT` columns.

| Table | Column | Contents | Example |
|---|---|---|---|
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
| `npcs` | `stats` | Ability scores dict (same as monsters) | `{"str": 14, "dex": 13, "con": 15, ...}` |
| `npcs` | `appearance` | Appearance dict (hair, eyes, height, distinctive features) | `{"hair": "black", "eyes": "blue", "height": "5'10\""}` |
| `npcs` | `saving_throws` | Saving throw bonuses dict (`{"str": 2, "cha": -1}`) | `{"str": 1, "dex": 0}` |
| `npcs` | `skills` | Skill bonuses dict (`{"acrobatics": 3, "animal_handling": 2}`) | `{"acrobatics": 2, "stealth": 1}` |
| `npcs` | `senses` | List of special senses (same as monsters) | `[{"type": "darkvision", "range": 60}]` |
| `quests` | `objectives` | List of quest objectives (strings) | `["Retrieve the amulet", "Return to the tavern"]` |
| `quests` | `details` | List of quest details/lore (strings) | `["The amulet was stolen by goblins"]` |
| `quests` | `reward` | List of rewards (strings or formatted descriptions) | `["500 gold", "Amulet of Protection"]` |
| `encounter` | `units` | List of monster or player session roster entries | `[{"name": "Goblin", "hp": 7}, ...]` |
| `dungeons` | `data` | DungeonData shape: general_info and rooms (with entries, NPCs); map geometry and navigation fixtures are not stored here | (large JSON blob per dungeon) |
| `map_layout` | `data` | MapLayout blob: rooms, doors, stairs, floors, props, portals, fixtures. Props may soft-reference a loot bundle by `bundle_id` with cached `bundle_name`; bundle contents resolve live. | (JSON blob per dungeon) |
| `player_spells` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/spells`) | |
| `player_weapons` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/weapons`) | |
| `weapons` | `attack` | List of attack definitions (similar to spells) | `[{"type": "melee", "damage": "1d8"}]` |
| `weapons` | `entries` | List of flavor text or special descriptions | `["A well-crafted longsword"]` |
| `loot_bundle` | `contents` | Item/weapon snapshots with quantity and soft source ID | `[{"kind":"item","ref_id":1,"name":"Ruby","value_gp":50,"category":"gem","quantity":1}]` |

When querying or updating any of these columns, use `json.loads()` to deserialize on read and `json.dumps()` to serialize on write. Schemas validate the parsed request and response values.

## Loom — Tapestry Schema Notes

The loom tables model a directed acyclic graph (DAG) of narrative story threads. Key design facts:

- **Anchor-status CHECK:** The compound `status` CHECK on `loom_nodes` deliberately includes `status IS NOT NULL`. SQLite CHECKs pass on NULL, so without it an anchor with NULL status would slip through. Updates always have `status = NULL`; anchors always have one of `planned`, `reached`, or `abandoned`.
- **Cascade semantics:** Deleting a node cascades its edges and memberships (the wires go with the node). Deleting a thread cascades **only** junction rows — nodes survive, because retiring a thread must never destroy narrative history.
- **Token-key colors:** `loom_threads.color` stores a token key (`thread-1`…`thread-6`), validated by Pydantic pattern `^thread-[1-6]$`. This is not a DB CHECK, so the palette can grow without a schema change. The actual colors are generated MD3 token sets in `frontend/src/theme.css`.
- **Seed loading is explicit, not part of "load all":** The four loom seed files (`seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_node_threads.json`, `seed_loom_edges.json`) define the frozen demo tapestry — a test/playtest fixture, not canonical campaign data. `python scripts/seed_database.py --loom [--force]` loads them; a plain `python scripts/seed_database.py` (no flags) does not, so the demo tapestry never overwrites a live campaign. `backend/tests/conftest.py::_seed_real_data` always loads them for the integration test DB.
- **Export before rebuild:** Loom data is runtime-authored through the API/UI, like dungeons and Map Lab layouts, but unlike them the loom **does** support `scripts/export_db_seeds.py` — freeze live campaign state to the four seed files above before running `scripts/init_database.py` (which drops and recreates the loom tables). This is a deliberate divergence from the dungeons/layouts domain.

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

Omit `--dry-run` only after review; this overwrites seed-backed `data/seeds/*.json` files, including the four loom seed files. Dungeons and Map Lab layouts are runtime-created and are never exported.

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

#### `loom_edges`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `source_id` | `INTEGER` | yes | `-` |
| `target_id` | `INTEGER` | yes | `-` |

Foreign keys: `target_id` -> `loom_nodes.id` (CASCADE), `source_id` -> `loom_nodes.id` (CASCADE).

Indexes: `idx_loom_edges_target`, `idx_loom_edges_source`, `sqlite_autoindex_loom_edges_1`.

#### `loom_node_threads`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `node_id` | `INTEGER` | yes | `-` |
| `thread_id` | `INTEGER` | yes | `-` |

Foreign keys: `thread_id` -> `loom_threads.id` (CASCADE), `node_id` -> `loom_nodes.id` (CASCADE).

Indexes: `idx_loom_node_threads_thread`, `sqlite_autoindex_loom_node_threads_1`.

#### `loom_nodes`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `kind` | `TEXT` | yes | `-` |
| `title` | `TEXT` | yes | `-` |
| `body` | `TEXT` | no | `-` |
| `status` | `TEXT` | no | `-` |
| `session_tag` | `TEXT` | no | `-` |
| `x` | `REAL` | yes | `0` |
| `y` | `REAL` | yes | `0` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `loom_threads`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `color` | `TEXT` | yes | `'thread-1'` |
| `description` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

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
| `size` | `TEXT` | no | `-` |
| `stats` | `JSON` | yes | `'{}'` |
| `armor_class` | `INTEGER` | no | `-` |
| `hit_points` | `INTEGER` | no | `-` |
| `speed` | `TEXT` | no | `-` |
| `saving_throws` | `JSON` | no | `'{}'` |
| `skills` | `JSON` | no | `'{}'` |
| `senses` | `JSON` | no | `'[{}]'` |
| `languages` | `TEXT` | no | `-` |
| `appearance` | `JSON` | no | `'{}'` |
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
| `at_will` | `BOOLEAN` | yes | `0` |
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
| `class` | `TEXT` | no | `-` |
| `level` | `INTEGER` | no | `-` |
| `total_spell_slots` | `TEXT` | no | `'{}'` |
| `current_spell_slots` | `TEXT` | no | `'{}'` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

#### `quests`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `summary` | `TEXT` | no | `-` |
| `reward` | `TEXT` | yes | `'[]'` |
| `objectives` | `TEXT` | yes | `'[]'` |
| `details` | `TEXT` | yes | `'[]'` |
| `quest_giver` | `INTEGER` | no | `-` |
| `dungeon_id` | `INTEGER` | no | `-` |
| `location` | `TEXT` | no | `-` |
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Foreign keys: `quest_giver` -> `npcs.id` (SET NULL).

Indexes: `sqlite_autoindex_quests_1`.

#### `spells`

| Column | Type | Required | Default |
|---|---|---|---|
| `id` | `INTEGER` | yes | `-` |
| `name` | `TEXT` | yes | `-` |
| `level` | `INTEGER` | yes | `-` |
| `school` | `TEXT` | no | `-` |
| `description` | `TEXT` | yes | `-` |
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
| `created_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | no | `CURRENT_TIMESTAMP` |

Indexes: `sqlite_autoindex_weapons_1`.
<!-- GENERATED:DATA_MODEL:END -->
