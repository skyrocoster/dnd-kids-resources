# API Reference — D&D Kids Resources Backend

**The endpoint tables and the schema inventory on this page are generated** from the running app's OpenAPI contract by `scripts/check_docs.py`, and `--check` fails when they go stale. Each router's `Purpose` column is its route's docstring, so a route is documented where it is written. The prose around each table is hand-written and carries what the code does not state.

Refresh with `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`. `backend/app/schemas.py` remains the source of truth for every Pydantic model.

## Conventions

- **Base path:** `http://localhost:8000` (or production equivalent)
- **Request/response format:** JSON
- **Response on success:** `2xx` status, JSON body with resource(s) or null
- **Response on error:** `4xx` or `5xx` status, JSON error message
- **JSON-encoded columns:** Several tables store complex data as `TEXT` JSON — see `DATA_MODEL.md`. Router and database helpers explicitly deserialize on read and serialize on write.

## Adding an Endpoint

When adding a new endpoint:

1. **Add the route** in `backend/app/routers/<domain>.py` — `@router.get(...)`, `@router.post(...)`, etc. **Give it a one-line docstring**: that sentence becomes its `Purpose` here, and a route without one fails the documentation checker.
2. **Add/extend Pydantic schemas** in `backend/app/schemas.py` if needed (request/response models).
3. **Add a smoke test** in `backend/tests/routers/test_<domain>.py` — at minimum, test the happy path and one error case.
4. **Run `--write-generated`** — do not hand-edit the tables. A brand-new router also needs a `## <Name> Router` section with its `<!-- GENERATED:API:<tag>:START/END -->` markers; the checker tells you when one is missing.

---

## Spells Router

`backend/app/routers/spells.py` — spell CRUD and reference. `SpellCreate` and `SpellUpdate` require nonblank `quick_rules` validated as registered reference text; committed spell seeds include nonblank quick rules, while `Spell` responses keep nullable `quick_rules` so legacy/local rows remain readable.

<!-- GENERATED:API:spells:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/spells` | List all spells with optional filtering. | `level`, `school`, `limit`, `offset` | `List[Spell]` |
| POST | `/api/spells` | Create a new spell. | `SpellCreate` | `Spell` (201) |
| GET | `/api/spells/by-title/{spell_name}` | Get a specific spell by name. | `spell_name` | `Spell` |
| GET | `/api/spells/{spell_id}` | Get a specific spell by ID. | `spell_id` | `Spell` |
| PUT | `/api/spells/{spell_id}` | Update an existing spell. | `SpellUpdate` | `Spell` |
| DELETE | `/api/spells/{spell_id}` | Delete a spell. | `spell_id` | (204 No Content) |
| GET | `/api/spells/{spell_id}/players` | Get all players assigned to a spell. | `spell_id` | `List[Player]` |
| PUT | `/api/spells/{spell_id}/players` | Replace all player assignments for a spell. | `SpellPlayerAssignments` | `List[Player]` |
<!-- GENERATED:API:spells:END -->

---

## Monsters Router

`backend/app/routers/monsters.py` — monster/creature CRUD.

<!-- GENERATED:API:monsters:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/monsters` | List all monsters. | `limit`, `offset` | `List[Monster]` |
| POST | `/api/monsters` | Create a new monster. | `MonsterCreate` | `Monster` (201) |
| GET | `/api/monsters/by-name/{name}` | Get a specific monster by name. | `name` | `Monster` |
| GET | `/api/monsters/{monster_id}` | Get a specific monster by ID. | `monster_id` | `Monster` |
| PUT | `/api/monsters/{monster_id}` | Update an existing monster. | `MonsterUpdate` | `Monster` |
| DELETE | `/api/monsters/{monster_id}` | Delete a monster. | `monster_id` | (204 No Content) |
<!-- GENERATED:API:monsters:END -->

---

## Weapons Router

`backend/app/routers/weapons.py` — weapon CRUD.

<!-- GENERATED:API:weapons:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/weapons` | List all weapons. | `limit`, `offset` | `List[Weapon]` |
| POST | `/api/weapons` | Create a new weapon. | `WeaponCreate` | `Weapon` (201) |
| GET | `/api/weapons/by-name/{name}` | Get a specific weapon by name. | `name` | `Weapon` |
| GET | `/api/weapons/{weapon_id}` | Get a specific weapon by ID. | `weapon_id` | `Weapon` |
| PUT | `/api/weapons/{weapon_id}` | Update an existing weapon. | `WeaponUpdate` | `Weapon` |
| DELETE | `/api/weapons/{weapon_id}` | Delete a weapon. | `weapon_id` | (204 No Content) |
| GET | `/api/weapons/{weapon_id}/players` | List the players a weapon is assigned to. | `weapon_id` | `List[Player]` |
<!-- GENERATED:API:weapons:END -->

Deleting a weapon relies on the existing `player_weapons.weapon_id` foreign key with `ON DELETE CASCADE` (see `scripts/init_database.py`) to remove assignment rows; no application code performs the cascade.

---

## Items Router

`backend/app/routers/items.py` — treasure item catalog CRUD.

<!-- GENERATED:API:items:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/items` | List catalog items. | `limit`, `offset` | `List[Item]` |
| POST | `/api/items` | Create a catalog item. | `ItemCreate` | `Item` (201) |
| GET | `/api/items/{item_id}` | Get a catalog item by ID. | `item_id` | `Item` |
| PUT | `/api/items/{item_id}` | Update a catalog item. | `ItemUpdate` | `Item` |
| DELETE | `/api/items/{item_id}` | Delete a catalog item. | `item_id` | (204 No Content) |
<!-- GENERATED:API:items:END -->

---

## Loot Bundles Router

`backend/app/routers/loot.py` — loot bundle authoring CRUD.

<!-- GENERATED:API:loot:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/loot-bundles` | List loot bundles. | `limit`, `offset` | `List[LootBundle]` |
| POST | `/api/loot-bundles` | Create a loot bundle. | `LootBundleCreate` | `LootBundle` (201) |
| GET | `/api/loot-bundles/{bundle_id}` | Get a loot bundle by ID. | `bundle_id` | `LootBundle` |
| PUT | `/api/loot-bundles/{bundle_id}` | Update a loot bundle. | `LootBundleUpdate` | `LootBundle` |
| DELETE | `/api/loot-bundles/{bundle_id}` | Delete a loot bundle. | `bundle_id` | (204 No Content) |
<!-- GENERATED:API:loot:END -->

---

## Players Router

`backend/app/routers/players.py` — player CRUD and spell/weapon roster management.

<!-- GENERATED:API:players:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/players` | List all players. | `limit`, `offset` | `List[Player]` |
| POST | `/api/players` | Create a new player. | `PlayerCreate` | `Player` (201) |
| GET | `/api/players/{player_id}` | Get a specific player by ID. | `player_id` | `Player` |
| PUT | `/api/players/{player_id}` | Update an existing player. | `PlayerUpdate` | `Player` |
| DELETE | `/api/players/{player_id}` | Delete a player. | `player_id` | (204 No Content) |
| GET | `/api/players/{player_id}/detail` | Fetch complete player detail with spells and weapons. | `player_id` | `PlayerDetail` |
| GET | `/api/players/{player_id}/spells` | Get all spells assigned to a player. | `player_id` | `List[Spell]` |
| PUT | `/api/players/{player_id}/spells` | Replace all spell assignments for a player. | `PlayerSpellAssignments` | `List[Spell]` |
| POST | `/api/players/{player_id}/spells/{spell_id}` | Assign a spell to a player. | `player_id`, `spell_id` | (201) |
| DELETE | `/api/players/{player_id}/spells/{spell_id}` | Remove a spell from a player. | `player_id`, `spell_id` | (204 No Content) |
| GET | `/api/players/{player_id}/weapons` | Get all weapons assigned to a player. | `player_id` | `List[Weapon]` |
| PUT | `/api/players/{player_id}/weapons` | Replace all weapon assignments for a player. | `PlayerWeaponAssignments` | `List[Weapon]` |
| POST | `/api/players/{player_id}/weapons/{weapon_id}` | Assign a weapon to a player. | `player_id`, `weapon_id` | (201) |
| DELETE | `/api/players/{player_id}/weapons/{weapon_id}` | Remove a weapon from a player. | `player_id`, `weapon_id` | (204 No Content) |
<!-- GENERATED:API:players:END -->

---

## NPCs Router

`backend/app/routers/npcs.py` — NPC (non-player character) CRUD.

<!-- GENERATED:API:npcs:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/npcs` | List all NPCs. | `limit`, `offset` | `List[NPC]` |
| POST | `/api/npcs` | Create a new NPC. | `NPCCreate` | `NPC` (201) |
| GET | `/api/npcs/{npc_id}` | Get a specific NPC by ID. | `npc_id` | `NPC` |
| PUT | `/api/npcs/{npc_id}` | Update an existing NPC. | `NPCUpdate` | `NPC` |
| DELETE | `/api/npcs/{npc_id}` | Delete an NPC. | `npc_id` | (204 No Content) |
<!-- GENERATED:API:npcs:END -->

---

## Encounters Router

`backend/app/routers/encounters.py` — encounter (combat) CRUD.

Each entry in an encounter's `creatures` JSON array may carry a soft typed source reference:
`creature_id` is the source record ID and `source_kind` is `"monster"` or `"npc"`. Manually added
player rows may use a null `creature_id`; the existing `kind: "player"` field describes combatant
behavior and is separate from `source_kind`. No database foreign key is enforced for this JSON field.

<!-- GENERATED:API:encounters:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/encounters` | List all encounters. | `limit`, `offset` | `List[Encounter]` |
| POST | `/api/encounters` | Create a new encounter. | `EncounterCreate` | `Encounter` (201) |
| GET | `/api/encounters/{encounter_id}` | Get a specific encounter by ID. | `encounter_id` | `Encounter` |
| PUT | `/api/encounters/{encounter_id}` | Update an existing encounter. | `EncounterUpdate` | `Encounter` |
| DELETE | `/api/encounters/{encounter_id}` | Delete an encounter. | `encounter_id` | (204 No Content) |
<!-- GENERATED:API:encounters:END -->

---

## Dungeons Router

`backend/app/routers/dungeons.py` — dungeon module CRUD (room layout, encounters, NPC placements).

<!-- GENERATED:API:dungeons:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/dungeons` | List all dungeons. | `limit`, `offset` | `List[Dungeon]` |
| POST | `/api/dungeons` | Create a new dungeon. | `DungeonCreate` | `Dungeon` (201) |
| GET | `/api/dungeons/{dungeon_id}` | Get a specific dungeon by ID. | `dungeon_id` | `Dungeon` |
| PUT | `/api/dungeons/{dungeon_id}` | Update an existing dungeon. | `DungeonUpdate` | `Dungeon` |
| DELETE | `/api/dungeons/{dungeon_id}` | Delete a dungeon. | `dungeon_id` | (204 No Content) |
<!-- GENERATED:API:dungeons:END -->

---

## Layouts Router

`backend/app/routers/layouts.py` — dungeon map layout save/load (Map Lab).

<!-- GENERATED:API:layouts:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/dungeons/{dungeon_id}/incoming-gateways` | List every portal in every other dungeon's layout that links into this dungeon | `dungeon_id` | `List[IncomingGateway]` |
| GET | `/api/dungeons/{dungeon_id}/layout` | Get the layout for a dungeon (Map Lab editor stage) | `dungeon_id` | `MapLayoutBlob` |
| PUT | `/api/dungeons/{dungeon_id}/layout` | Save/upsert the layout for a dungeon (Map Lab editor stage) | `MapLayoutBlob` | `MapLayoutBlob` |
<!-- GENERATED:API:layouts:END -->

Layout data (`map_layout`) and dungeon content data (`dungeons.data`) are saved independently via separate endpoints and debounced separately in the editor. `incoming-gateways` scans every other dungeon's layout blob on each request (no reverse index) — acceptable at this dungeon count, and the only way to surface a one-way, unpaired cross-dungeon link (see Dungeon Connections' "Links are one-way in the data" decision).

---

## Session State Router

`backend/app/routers/session_state.py` — permanent door/stair/portal toggle state (Map Lab session view), mirroring the layout router's save/load shape.

<!-- GENERATED:API:session_state:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/dungeons/{dungeon_id}/session-state` | Get the permanent door/stair/portal toggle state for a dungeon | `dungeon_id` | `MapSessionStateBlob` |
| PUT | `/api/dungeons/{dungeon_id}/session-state` | Save/upsert normalized runtime toggle state, or clear the row when nothing remains | `MapSessionStateBlob` | `MapSessionStateBlob` |
| DELETE | `/api/dungeons/{dungeon_id}/session-state` | Reset a dungeon's toggle state to its authored defaults (removes the saved row, if any) | `dungeon_id` | (204 No Content) |
<!-- GENERATED:API:session_state:END -->

Session state is written through immediately on every toggle (no debounce) — unlike layout/content saves, a toggle is not a form. It writes to a separate table (`map_session_state`) from `map_layout` so opening a door never dirties the authored map document.

---

## Fog Router

`backend/app/routers/fog.py` — revealed-cell store for the player-app fog of war (union-write only, so cells can only be revealed, never hidden).

<!-- GENERATED:API:fog:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/dungeons/{dungeon_id}/revealed-cells` | Get all revealed fog cells for a dungeon | `dungeon_id` | `RevealedCellsBlob` |
| PUT | `/api/dungeons/{dungeon_id}/revealed-cells` | Reveal fog cells (union write — cells can only be added, never removed) | `RevealedCellsBlob` | `RevealedCellsBlob` |
<!-- GENERATED:API:fog:END -->

---

## Knowledge Router

`backend/app/routers/knowledge.py` — the sparse per-dungeon map knowledge document: which authored facts the party has learned. One row per dungeon, upserted whole, and independently reversible from fog — knowledge and spatial visibility are stored separately and never confused.

<!-- GENERATED:API:knowledge:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/dungeons/{dungeon_id}/knowledge` | Get the sparse knowledge document for a dungeon | `dungeon_id` | `MapKnowledgeBlob` |
| PUT | `/api/dungeons/{dungeon_id}/knowledge` | Save/upsert the knowledge document for a dungeon | `MapKnowledgeBlob` | `MapKnowledgeBlob` |
| DELETE | `/api/dungeons/{dungeon_id}/knowledge` | Clear a dungeon's knowledge document (removes the saved row, if any) | `dungeon_id` | (204 No Content) |
<!-- GENERATED:API:knowledge:END -->

---

## At-The-Table Router

`backend/app/routers/at_the_table.py` — single-row pointer from the DM app to the player app: which dungeon is currently "at the table".

<!-- GENERATED:API:at_the_table:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/at-the-table` | Get the dungeon currently set as 'at the table' | (none) | `AtTheTableResponse` |
| PUT | `/api/at-the-table` | Set which dungeon is at the table | `AtTheTableSet` | `AtTheTableResponse` |
<!-- GENERATED:API:at_the_table:END -->

---

## Reference Router

`backend/app/routers/reference.py` — read-only reference data (abilities, conditions, damage types, etc.).

<!-- GENERATED:API:reference:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/abilities` | Get the six ability scores (Strength, Dexterity, etc.). | (none) | `List[Ability]` |
| GET | `/api/conditions` | Get all conditions (Poisoned, Charmed, etc.). | (none) | `List[Condition]` |
| GET | `/api/damage_types` | Get all damage types (Fire, Cold, Poison, etc.). | (none) | `List[DamageType]` |
| GET | `/api/skills` | Get all skills mapped to abilities. | (none) | `List[Skill]` |
| GET | `/api/spell-components` | Get all spell component types (V, S, M). | (none) | `List[SpellComponent]` |
| GET | `/api/weapon_properties` | Get all weapon properties (Finesse, Versatile, etc.). | (none) | `List[WeaponProperty]` |
<!-- GENERATED:API:reference:END -->

---

## Loom Router

`backend/app/routers/loom.py` — ordered-Thread story tracker: Thread CRUD (auto Start/End), node (beat/session)
CRUD, ordered membership (insert/reorder/remove), and the tapestry read. No edges; a per-thread total order
(`position` on `loom_nodes`, sorted ascending within a thread) replaces the old flat DAG.

<!-- GENERATED:API:loom:START -->
| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/loom/nodes` | Create an unplaced `beat` or `session` node. | `LoomNodeCreate` | `LoomNode` (201) |
| PUT | `/api/loom/nodes/{node_id}` | Update a node's title or body; kind is immutable except a fulfil undo. | `LoomNodeUpdate` | `LoomNode` |
| DELETE | `/api/loom/nodes/{node_id}` | Delete a `beat` or `session` node; 422 on `start`/`end`. | `node_id` | (204 No Content) |
| POST | `/api/loom/nodes/{node_id}/bank` | Unplace a beat, keeping it in the Beat Bank for later reuse. | `node_id` | `LoomNode` |
| POST | `/api/loom/nodes/{node_id}/fulfil` | Convert a placed beat into a session in place. | `-` | `LoomNode` |
| GET | `/api/loom/sessions` | List logged sessions in campaign order. | `limit`, `offset` | `List[LoomSession]` |
| POST | `/api/loom/sessions` | Create a session column on the tapestry. | `LoomSessionCreate` | `LoomSession` (201) |
| POST | `/api/loom/sessions/log` | Log a new session with per-thread outcomes in one transaction. | `LoomSessionLogRequest` | `LoomSession` (201) |
| PUT | `/api/loom/sessions/{session_id}` | Update a session's title or date. | `LoomSessionUpdate` | `LoomSession` |
| DELETE | `/api/loom/sessions/{session_id}` | Delete a session; 422 while any node still belongs to it. | `session_id` | (204 No Content) |
| GET | `/api/loom/tapestry` | One-shot read: ordered sessions, threads, and thread-exclusive nodes. | (none) | `LoomTapestry` |
| GET | `/api/loom/threads` | List threads. | `limit`, `offset` | `List[LoomThread]` |
| POST | `/api/loom/threads` | Create a thread, plus its `start` (position 0) and `end` (position 10) nodes. | `LoomThreadCreate` | `LoomThread` (201) |
| PUT | `/api/loom/threads/{thread_id}` | Update a thread's name, colour, or description. | `LoomThreadUpdate` | `LoomThread` |
| DELETE | `/api/loom/threads/{thread_id}` | Delete a thread and its exclusive start/end/beat nodes; shared session nodes survive. | `thread_id` | (204 No Content) |
| POST | `/api/loom/threads/{thread_id}/items` | Place an existing beat or session node on a thread; also restores a banked beat. | `LoomThreadItemCreate` | `LoomTapestryThread` (201) |
| PATCH | `/api/loom/threads/{thread_id}/items/{node_id}` | Move a placed node to a new position within its own thread. | `LoomThreadItemPositionUpdate` | `LoomTapestryThread` |
| DELETE | `/api/loom/threads/{thread_id}/items/{node_id}` | Unplace a node from a thread without deleting it; 422 on `start`/`end`. | `thread_id`, `node_id` | (204 No Content) |
| POST | `/api/loom/threads/{thread_id}/items/{node_id}/move` | Atomically move a placed node to another thread at a position. | `LoomNodeMove` | `LoomThreadMoveResult` |
<!-- GENERATED:API:loom:END -->

`position` on `loom_nodes` is an integer, sorted ascending within a thread, and is the sole source of narrative
order. `start`/`end` nodes can never be placed, reordered, or deleted directly — only whole-thread
deletion removes them.

**Move:** `target_thread_id` must differ from the path's `thread_id` (422 otherwise), and `start`/`end` nodes
can never move (422). Moves are unconditional single-thread relocations — a node belongs to exactly one thread
at a time. The response returns both threads' post-move ordered state (`source`, `target`) in one transaction.

**Beat lifecycle:** Fulfil requires the node to be `kind='beat'` and currently placed on a thread (422 otherwise);
`LoomNodeFulfil.title` is optional — when omitted the title is unchanged and only `fulfilled_planned_title`
records the prior (planned) wording. Bank requires `kind='beat'` and `thread_id` not null (422 otherwise); it
clears `thread_id` and records `banked_from_thread_id`. Restoring a banked beat is the same
`POST /loom/threads/{thread_id}/items` insert used for any placement. **Undo of a fulfil** is a client-issued
`PUT /api/loom/nodes/{node_id}` with `kind='beat'` — normally kind is immutable, but this one transition (a
`session` reverting to `beat`) is allowed when the node still carries a `fulfilled_planned_title`, and it clears
that provenance and `fulfilled_at`. **Spawn** is `POST /api/loom/threads` with `origin_node_id` set to an existing
node id; the origin node must be `kind='session'` (422 otherwise).

**Session logging:** `POST /api/loom/sessions/log` is the guided session-recording path. It creates the
`loom_sessions` row first, then applies every supplied thread outcome in one transaction: happened/fulfilled
turns the thread's next beat into a session in the new column and stamps fulfil provenance, carried/not-reached
increments the next beat's `carried_count`, banked unplaces the next beat and records `banked_from_thread_id`,
and quiet leaves the thread unchanged. Any invalid thread/outcome rolls the whole log back.

---

## Request/Response Shapes

Every request and response body is a Pydantic model in `backend/app/schemas.py`, which stays the source of truth for types and validation. The inventory below is generated from those models.

<!-- GENERATED:API:SCHEMAS:START -->
| Model | Fields |
|---|---|
| `Ability` | `id`, `code`, `name`, `description`* |
| `AbilityScores` | `str`*, `dex`*, `con`*, `int`*, `wis`*, `cha`* |
| `ArmorClass` | `value`, `note`*, `alternatives`* |
| `ArmorClassEntry` | `value`, `note`* |
| `AtTheTableResponse` | `dungeon_id`* |
| `AtTheTableSet` | `dungeon_id` |
| `Attack` | `kind`, `attack_bonus`*, `automatic_hit`*, `range_ft`*, `long_range_ft`*, `targets`*, `damage`* |
| `AttackDamage` | `formula`, `bonus`*, `damage_types`* |
| `Condition` | `id`, `name`, `description`* |
| `CreatureType` | `category`, `tags`*, `swarm_size`* |
| `DamageModifier` | `damage_type`, `note`*, `conditional`* |
| `DamageType` | `id`, `code`, `name`, `description`* |
| `Dungeon` | `id`, `title`, `data` |
| `DungeonCreate` | `title`, `data` |
| `DungeonUpdate` | `title`, `data` |
| `Encounter` | `id`, `title`, `creatures`*, `active_index`* |
| `EncounterCreate` | `title`, `creatures`*, `active_index`* |
| `EncounterUpdate` | `title`, `creatures`*, `active_index`* |
| `Feature-Input` | `name`, `description`*, `attack`* |
| `Feature-Output` | `name`, `description`*, `attack`* |
| `HitPoints` | `average`, `formula`* |
| `IncomingGateway` | `dungeon_id`, `dungeon_title`, `portal_id`, `title`*, `z`, `cell` |
| `Item` | `id`, `name`, `value_gp`*, `category`*, `description`* |
| `ItemCreate` | `name`, `value_gp`*, `category`*, `description`* |
| `ItemUpdate` | `name`, `value_gp`*, `category`*, `description`* |
| `LoomNode` | `id`, `thread_id`*, `kind`, `title`, `body`*, `session_id`*, `position`, `carried_count`, `fulfilled_planned_title`*, `fulfilled_at`*, `banked_from_thread_id`* |
| `LoomNodeCreate` | `thread_id`*, `kind`, `title`, `body`*, `session_id`*, `position`*, `carried_count`* |
| `LoomNodeFulfil` | `title`* |
| `LoomNodeMove` | `target_thread_id`, `position` |
| `LoomNodeUpdate` | `thread_id`*, `kind`, `title`, `body`*, `session_id`*, `position`*, `carried_count`* |
| `LoomSession` | `id`, `ordinal`, `name`, `played_on`*, `notes`* |
| `LoomSessionCreate` | `ordinal`, `name`, `played_on`*, `notes`* |
| `LoomSessionLogRequest` | `ordinal`, `name`, `played_on`*, `notes`*, `outcomes` |
| `LoomSessionUpdate` | `ordinal`, `name`, `played_on`*, `notes`* |
| `LoomTapestry` | `sessions`, `threads`, `nodes` |
| `LoomTapestryThread` | `id`, `name`, `color`, `description`*, `origin_node_id`* |
| `LoomThread` | `id`, `name`, `color`, `description`*, `origin_node_id`* |
| `LoomThreadCreate` | `name`, `color`*, `description`*, `origin_node_id`*, `start_title`*, `end_title`* |
| `LoomThreadItemCreate` | `node_id`, `position` |
| `LoomThreadItemPositionUpdate` | `position` |
| `LoomThreadMoveResult` | `source`, `target` |
| `LoomThreadOutcome` | `outcome`, `title`* |
| `LoomThreadUpdate` | `name`, `color`*, `description`* |
| `LootBundle` | `id`, `name`, `gold`*, `contents`* |
| `LootBundleCreate` | `name`, `gold`*, `contents`* |
| `LootBundleUpdate` | `name`, `gold`*, `contents`* |
| `MapKnowledgeBlob` | `data` |
| `MapLayoutBlob` | `data` |
| `MapSessionStateBlob` | `data` |
| `Monster` | `name`, `aliases`*, `sizes`*, `family`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `audio_path`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `created_at`*, `updated_at`*, `id`, `cr_sort`* |
| `MonsterCreate` | `name`, `aliases`*, `sizes`*, `family`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `audio_path`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `created_at`*, `updated_at`* |
| `MonsterFeatures-Input` | `traits`*, `spellcasting`*, `actions`*, `bonus_actions`*, `reactions`*, `reaction_intro`*, `legendary_actions`*, `legendary_intro`*, `legendary_actions_per_round`*, `mythic_actions`* |
| `MonsterFeatures-Output` | `traits`*, `spellcasting`*, `actions`*, `bonus_actions`*, `reactions`*, `reaction_intro`*, `legendary_actions`*, `legendary_intro`*, `legendary_actions_per_round`*, `mythic_actions`* |
| `MonsterUpdate` | `name`, `aliases`*, `sizes`*, `family`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `audio_path`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `created_at`*, `updated_at`* |
| `MovementSpeed` | `mode`, `feet`, `note`*, `hover`* |
| `NPC` | `name`, `race`*, `gender`*, `background`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `appearance`*, `notes`*, `id` |
| `NPCCreate` | `name`, `race`*, `gender`*, `background`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `appearance`*, `notes`* |
| `NPCUpdate` | `name`, `race`*, `gender`*, `background`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `cr`*, `cr_note`*, `experience_points`*, `appearance`*, `notes`* |
| `Player` | `name`, `child_name`*, `class`*, `subclass`*, `ancestry`*, `background`*, `level`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `initiative`*, `proficiency_bonus`*, `spell_attack_bonus`*, `spell_save_dc`*, `max_spell_slots`*, `notes`*, `id`, `created_at`*, `updated_at`* |
| `PlayerCreate` | `name`, `child_name`*, `class`*, `subclass`*, `ancestry`*, `background`*, `level`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `initiative`*, `proficiency_bonus`*, `spell_attack_bonus`*, `spell_save_dc`*, `max_spell_slots`*, `notes`* |
| `PlayerDetail` | `name`, `child_name`*, `class`*, `subclass`*, `ancestry`*, `background`*, `level`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `initiative`*, `proficiency_bonus`*, `spell_attack_bonus`*, `spell_save_dc`*, `max_spell_slots`*, `notes`*, `id`, `created_at`*, `updated_at`*, `spells`*, `weapons`* |
| `PlayerSpellAssignments` | `spell_ids`* |
| `PlayerUpdate` | `name`, `child_name`*, `class`*, `subclass`*, `ancestry`*, `background`*, `level`*, `sizes`*, `alignment`*, `creature_type`*, `ac`*, `hp`*, `speed`*, `abilities`*, `saving_throws`*, `skills`*, `passive_perception`*, `damage_resistances`*, `damage_immunities`*, `damage_vulnerabilities`*, `condition_immunities`*, `senses`*, `languages`*, `features`*, `initiative`*, `proficiency_bonus`*, `spell_attack_bonus`*, `spell_save_dc`*, `max_spell_slots`*, `notes`* |
| `PlayerWeaponAssignments` | `weapon_ids`* |
| `RevealedCell` | `x`, `y` |
| `RevealedCellsBlob` | `cells` |
| `Sense` | `type`, `range`, `note`* |
| `Skill` | `name`, `ability`, `description`* |
| `Spell` | `id`, `name`, `level`, `school`*, `description`, `quick_rules`*, `alternate_description`*, `damage`*, `healing`*, `range`, `higher_levels`*, `casting_times`*, `duration`, `concentration`, `ritual`, `components`*, `materials`*, `attacks`*, `area_of_effect`* |
| `SpellAreaOfEffect` | `shape`*, `size`* |
| `SpellAttack` | `kind`*, `saving_throws`* |
| `SpellComponent` | `code`, `name`, `description`* |
| `SpellCreate` | `name`, `level`, `school`*, `description`, `quick_rules`, `alternate_description`*, `damage`*, `healing`*, `range`, `higher_levels`*, `casting_times`*, `duration`, `concentration`, `ritual`, `components`*, `materials`*, `attacks`*, `area_of_effect`* |
| `SpellDamage` | `name`, `formula`, `damage_types`* |
| `SpellGroup` | `label`, `spells`*, `hidden`* |
| `SpellHealing` | `amount`*, `temp_hp`*, `max_hp`* |
| `SpellHigherLevels` | `text`*, `damage_by_slot`* |
| `SpellPlayerAssignments` | `player_ids`* |
| `SpellReference` | `name`, `hidden`* |
| `SpellUpdate` | `name`, `level`, `school`*, `description`, `quick_rules`, `alternate_description`*, `damage`*, `healing`*, `range`, `higher_levels`*, `casting_times`*, `duration`, `concentration`, `ritual`, `components`*, `materials`*, `attacks`*, `area_of_effect`* |
| `SpellcastingBlock-Input` | `name`, `ability`*, `description`*, `resource`*, `groups`*, `footer`* |
| `SpellcastingBlock-Output` | `name`, `ability`*, `description`*, `resource`*, `groups`*, `footer`* |
| `Weapon` | `id`, `name`, `base_weapon`*, `rarity`*, `weapon_category`*, `weight`*, `req_attune`*, `property`*, `focus`*, `attack`*, `entries`*, `quick_rules`*, `weapon_attack_bonus`*, `weapon_damage_bonus`* |
| `WeaponCreate` | `name`, `base_weapon`*, `rarity`*, `weapon_category`*, `weight`*, `req_attune`*, `property`*, `focus`*, `attack`*, `entries`*, `quick_rules`, `weapon_attack_bonus`*, `weapon_damage_bonus`* |
| `WeaponProperty` | `id`, `code`, `name`, `description`* |
| `WeaponUpdate` | `name`, `base_weapon`*, `rarity`*, `weapon_category`*, `weight`*, `req_attune`*, `property`*, `focus`*, `attack`*, `entries`*, `quick_rules`, `weapon_attack_bonus`*, `weapon_damage_bonus`* |

Fields marked `*` are optional.
<!-- GENERATED:API:SCHEMAS:END -->
