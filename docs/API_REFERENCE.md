# API Reference — D&D Kids Resources Backend

Hand-written endpoint inventory. For response/request shapes, refer to `backend/app/schemas.py` (the source of truth for all Pydantic models).

## Conventions

- **Base path:** `http://localhost:8000` (or production equivalent)
- **Request/response format:** JSON
- **Response on success:** `2xx` status, JSON body with resource(s) or null
- **Response on error:** `4xx` or `5xx` status, JSON error message
- **JSON-encoded columns:** Several tables store complex data as `TEXT` JSON — see `DATA_MODEL.md`. Router and database helpers explicitly deserialize on read and serialize on write.

## Adding an Endpoint

When adding a new endpoint:

1. **Add the route** in `backend/app/routers/<domain>.py` — `@router.get(...)`, `@router.post(...)`, etc.
2. **Add/extend Pydantic schemas** in `backend/app/schemas.py` if needed (request/response models).
3. **Add a smoke test** in `backend/tests/routers/test_<domain>.py` — at minimum, test the happy path and one error case.
4. **Update this table** — add a row with the method, path, one-line purpose, and schema names (not full field lists — point to schemas.py).

---

## Spells Router

`backend/app/routers/spells.py` — spell CRUD and reference.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/spells` | List all spells | `level`, `school`, `limit` (1-500; default 100), `offset` (default 0) | `List[Spell]` |
| GET | `/api/spells/{spell_id}` | Fetch spell by ID | (path param) | `Spell` |
| GET | `/api/spells/by-title/{spell_name}` | Fetch spell by exact title | (path param) | `Spell` |
| POST | `/api/spells` | Create spell | `SpellCreate` | `Spell` (201) |
| PUT | `/api/spells/{spell_id}` | Update spell | `SpellUpdate` | `Spell` |
| DELETE | `/api/spells/{spell_id}` | Delete spell | (path param) | (204 No Content) |

---

## Monsters Router

`backend/app/routers/monsters.py` — monster/creature CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/monsters` | List all monsters | `limit` (1-500; default 100), `offset` (default 0) | `List[Monster]` |
| GET | `/api/monsters/{monster_id}` | Fetch monster by ID | (path param) | `Monster` |
| GET | `/api/monsters/by-name/{name}` | Fetch monster by exact name | (path param) | `Monster` |
| POST | `/api/monsters` | Create monster | `MonsterCreate` | `Monster` (201) |
| PUT | `/api/monsters/{monster_id}` | Update monster | `MonsterUpdate` | `Monster` |
| DELETE | `/api/monsters/{monster_id}` | Delete monster | (path param) | (204 No Content) |

---

## Weapons Router

`backend/app/routers/weapons.py` — weapon CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/weapons` | List all weapons | `limit` (1-500; default 100), `offset` (default 0) | `List[Weapon]` |
| GET | `/api/weapons/{weapon_id}` | Fetch weapon by ID | (path param) | `Weapon` |
| GET | `/api/weapons/by-name/{name}` | Fetch weapon by exact name | (path param) | `Weapon` |
| POST | `/api/weapons` | Create weapon | `WeaponCreate` | `Weapon` (201) |
| PUT | `/api/weapons/{weapon_id}` | Update weapon | `WeaponUpdate` | `Weapon` |
| DELETE | `/api/weapons/{weapon_id}` | Delete weapon | (path param) | (204 No Content) |

---

## Items Router

`backend/app/routers/items.py` — treasure item catalog CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/items` | List catalog items | `limit` (1-500; default 100), `offset` (default 0) | `List[Item]` |
| GET | `/api/items/{item_id}` | Fetch item by ID | (path param) | `Item` |
| POST | `/api/items` | Create catalog item | `ItemCreate` | `Item` (201) |
| PUT | `/api/items/{item_id}` | Update catalog item | `ItemUpdate` | `Item` |
| DELETE | `/api/items/{item_id}` | Delete catalog item | (path param) | (204 No Content) |

---

## Loot Bundles Router

`backend/app/routers/loot.py` — loot bundle authoring CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/loot-bundles` | List loot bundles | `limit` (1-500; default 100), `offset` (default 0) | `List[LootBundle]` |
| GET | `/api/loot-bundles/{bundle_id}` | Fetch loot bundle by ID | (path param) | `LootBundle` |
| POST | `/api/loot-bundles` | Create loot bundle | `LootBundleCreate` | `LootBundle` (201) |
| PUT | `/api/loot-bundles/{bundle_id}` | Update loot bundle | `LootBundleUpdate` | `LootBundle` |
| DELETE | `/api/loot-bundles/{bundle_id}` | Delete loot bundle | (path param) | (204 No Content) |

---

## Players Router

`backend/app/routers/players.py` — player CRUD and spell/weapon roster management.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/players` | List all players | `limit` (1-500; default 100), `offset` (default 0) | `List[Player]` |
| GET | `/api/players/{player_id}` | Fetch player by ID | (path param) | `Player` |
| POST | `/api/players` | Create player | `PlayerCreate` | `Player` (201) |
| PUT | `/api/players/{player_id}` | Update player | `PlayerUpdate` | `Player` |
| DELETE | `/api/players/{player_id}` | Delete player | (path param) | (204 No Content) |
| GET | `/api/players/{player_id}/spells` | List player's spells | (path param) | `List[Spell]` |
| POST | `/api/players/{player_id}/spells/{spell_id}` | Add spell to player's roster | (path params) | (201 No Content) |
| DELETE | `/api/players/{player_id}/spells/{spell_id}` | Remove spell from player's roster | (path params) | (204 No Content) |
| GET | `/api/players/{player_id}/weapons` | List player's weapons | (path param) | `List[Weapon]` |
| POST | `/api/players/{player_id}/weapons/{weapon_id}` | Add weapon to player's roster | (path params) | (201 No Content) |
| DELETE | `/api/players/{player_id}/weapons/{weapon_id}` | Remove weapon from player's roster | (path params) | (204 No Content) |

---

## NPCs Router

`backend/app/routers/npcs.py` — NPC (non-player character) CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/npcs` | List all NPCs | `limit` (1-500; default 100), `offset` (default 0) | `List[NPC]` |
| GET | `/api/npcs/{npc_id}` | Fetch NPC by ID | (path param) | `NPC` |
| POST | `/api/npcs` | Create NPC | `NPCCreate` | `NPC` (201) |
| PUT | `/api/npcs/{npc_id}` | Update NPC | `NPCUpdate` | `NPC` |
| DELETE | `/api/npcs/{npc_id}` | Delete NPC | (path param) | (204 No Content) |

---

## Quests Router

`backend/app/routers/quests.py` — quest/mission CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/quests` | List all quests | `limit` (1-500; default 100), `offset` (default 0) | `List[Quest]` |
| GET | `/api/quests/{quest_id}` | Fetch quest by ID | (path param) | `Quest` |
| POST | `/api/quests` | Create quest | `QuestCreate` | `Quest` (201) |
| PUT | `/api/quests/{quest_id}` | Update quest | `QuestUpdate` | `Quest` |
| DELETE | `/api/quests/{quest_id}` | Delete quest | (path param) | (204 No Content) |

---

## Encounters Router

`backend/app/routers/encounters.py` — encounter (combat) CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/encounters` | List all encounters | `limit` (1-500; default 100), `offset` (default 0) | `List[Encounter]` |
| GET | `/api/encounters/{encounter_id}` | Fetch encounter by ID | (path param) | `Encounter` |
| POST | `/api/encounters` | Create encounter | `EncounterCreate` | `Encounter` (201) |
| PUT | `/api/encounters/{encounter_id}` | Update encounter | `EncounterUpdate` | `Encounter` |
| DELETE | `/api/encounters/{encounter_id}` | Delete encounter | (path param) | (204 No Content) |

---

## Dungeons Router

`backend/app/routers/dungeons.py` — dungeon module CRUD (room layout, encounters, NPC placements).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/dungeons` | List all dungeons | `limit` (1-500; default 100), `offset` (default 0) | `List[Dungeon]` |
| GET | `/api/dungeons/{dungeon_id}` | Fetch dungeon by ID | (path param) | `Dungeon` |
| POST | `/api/dungeons` | Create dungeon | `DungeonCreate` | `Dungeon` (201) |
| PUT | `/api/dungeons/{dungeon_id}` | Update dungeon | `DungeonUpdate` | `Dungeon` |
| DELETE | `/api/dungeons/{dungeon_id}` | Delete dungeon | (path param) | (204 No Content) |

---

## Layouts Router

`backend/app/routers/layouts.py` — dungeon map layout save/load (Map Lab).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/dungeons/{dungeon_id}/layout` | Fetch dungeon map layout | (path param) | `MapLayoutBlob` |
| PUT | `/api/dungeons/{dungeon_id}/layout` | Save/update dungeon map layout | `MapLayoutBlob` | `MapLayoutBlob` |

Layout data (`map_layout`) and dungeon content data (`dungeons.data`) are saved independently via separate endpoints and debounced separately in the editor.

---

## Reference Router

`backend/app/routers/reference.py` — read-only reference data (abilities, conditions, damage types, etc.).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/api/abilities` | List all abilities | (query params: none) | `List[Ability]` |
| GET | `/api/conditions` | List all conditions | (query params: none) | `List[Condition]` |
| GET | `/api/damage_types` | List all damage types | (query params: none) | `List[DamageType]` |
| GET | `/api/weapon_properties` | List all weapon properties | (query params: none) | `List[WeaponProperty]` |
| GET | `/api/skills` | List all skills | (query params: none) | `List[Skill]` |
| GET | `/api/spell-components` | List all spell components | (query params: none) | `List[SpellComponent]` |

---

## Request/Response Shapes

All request and response body shapes are defined in `backend/app/schemas.py` as Pydantic models. Refer there for field names, types, and optionality. Examples:

- **Spell:** id, name, level, school, description, alternate_description, damage (JSON list), healing (JSON object), range, higher_levels (JSON object), casting_times (JSON list), duration, concentration, ritual, components (JSON list), materials, attacks (JSON list), area_of_effect (JSON object)
- **Monster:** id, name, aliases (JSON), sizes (JSON), family, alignment, creature_type (JSON), ac (JSON), hp (JSON), speed (JSON), abilities (JSON), saving_throws (JSON), skills (JSON), passive_perception, damage_resistances (JSON), damage_immunities (JSON), damage_vulnerabilities (JSON), condition_immunities (JSON), senses (JSON), languages (JSON), audio_path, features (JSON), cr, cr_sort, cr_note, experience_points
- **Weapon:** id, name, base_weapon, rarity, weapon_category, weight, req_attune, property (JSON), focus (JSON), attack (JSON), entries (JSON)
- **Item:** id, name, value_gp, category, description
- **LootBundle:** id, name, gold, contents (JSON loot-entry array)
- **Player:** id, name, class_, level
- **NPC:** id, name, race, gender, background, size, stats (JSON), armor_class, hit_points, speed, saving_throws (JSON), skills (JSON), senses (JSON), languages, appearance (JSON), notes
- **Quest:** id, title, summary, objectives (JSON), details (JSON), reward (JSON), quest_giver (foreign key to NPC), dungeon_id (foreign key to Dungeon), location
- **Encounter:** id, title, creatures (JSON)
- **Dungeon:** id, title, data (JSON)
- **MapLayoutBlob:** data (JSON)

All optional fields are `Optional[...]` in the schema; required fields have no `Optional` wrapper. For full detail, read the schema definitions directly in the source file.

<!-- GENERATED:API:START -->
### Generated API Inventory

| Method | Path | Parameters | Request | Responses |
|---|---|---|---|---|
| GET | `/api/abilities` | - | - | 200: List[Ability] |
| GET | `/api/conditions` | - | - | 200: List[Condition] |
| GET | `/api/damage_types` | - | - | 200: List[DamageType] |
| GET | `/api/dungeons` | `limit` (query), `offset` (query) | - | 200: List[Dungeon], 422: HTTPValidationError |
| POST | `/api/dungeons` | - | DungeonCreate | 201: Dungeon, 422: HTTPValidationError |
| DELETE | `/api/dungeons/{dungeon_id}` | `dungeon_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/dungeons/{dungeon_id}` | `dungeon_id` (path, required) | - | 200: Dungeon, 422: HTTPValidationError |
| PUT | `/api/dungeons/{dungeon_id}` | `dungeon_id` (path, required) | DungeonUpdate | 200: Dungeon, 422: HTTPValidationError |
| GET | `/api/dungeons/{dungeon_id}/layout` | `dungeon_id` (path, required) | - | 200: MapLayoutBlob, 422: HTTPValidationError |
| PUT | `/api/dungeons/{dungeon_id}/layout` | `dungeon_id` (path, required) | MapLayoutBlob | 200: MapLayoutBlob, 422: HTTPValidationError |
| GET | `/api/encounters` | `limit` (query), `offset` (query) | - | 200: List[Encounter], 422: HTTPValidationError |
| POST | `/api/encounters` | - | EncounterCreate | 201: Encounter, 422: HTTPValidationError |
| DELETE | `/api/encounters/{encounter_id}` | `encounter_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/encounters/{encounter_id}` | `encounter_id` (path, required) | - | 200: Encounter, 422: HTTPValidationError |
| PUT | `/api/encounters/{encounter_id}` | `encounter_id` (path, required) | EncounterUpdate | 200: Encounter, 422: HTTPValidationError |
| GET | `/api/items` | `limit` (query), `offset` (query) | - | 200: List[Item], 422: HTTPValidationError |
| POST | `/api/items` | - | ItemCreate | 201: Item, 422: HTTPValidationError |
| DELETE | `/api/items/{item_id}` | `item_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/items/{item_id}` | `item_id` (path, required) | - | 200: Item, 422: HTTPValidationError |
| PUT | `/api/items/{item_id}` | `item_id` (path, required) | ItemUpdate | 200: Item, 422: HTTPValidationError |
| GET | `/api/loot-bundles` | `limit` (query), `offset` (query) | - | 200: List[LootBundle], 422: HTTPValidationError |
| POST | `/api/loot-bundles` | - | LootBundleCreate | 201: LootBundle, 422: HTTPValidationError |
| DELETE | `/api/loot-bundles/{bundle_id}` | `bundle_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/loot-bundles/{bundle_id}` | `bundle_id` (path, required) | - | 200: LootBundle, 422: HTTPValidationError |
| PUT | `/api/loot-bundles/{bundle_id}` | `bundle_id` (path, required) | LootBundleUpdate | 200: LootBundle, 422: HTTPValidationError |
| GET | `/api/monsters` | `limit` (query), `offset` (query) | - | 200: List[Monster], 422: HTTPValidationError |
| POST | `/api/monsters` | - | MonsterCreate | 201: Monster, 422: HTTPValidationError |
| GET | `/api/monsters/by-name/{name}` | `name` (path, required) | - | 200: Monster, 422: HTTPValidationError |
| DELETE | `/api/monsters/{monster_id}` | `monster_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/monsters/{monster_id}` | `monster_id` (path, required) | - | 200: Monster, 422: HTTPValidationError |
| PUT | `/api/monsters/{monster_id}` | `monster_id` (path, required) | MonsterUpdate | 200: Monster, 422: HTTPValidationError |
| GET | `/api/npcs` | `limit` (query), `offset` (query) | - | 200: List[NPC], 422: HTTPValidationError |
| POST | `/api/npcs` | - | NPCCreate | 201: NPC, 422: HTTPValidationError |
| DELETE | `/api/npcs/{npc_id}` | `npc_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/npcs/{npc_id}` | `npc_id` (path, required) | - | 200: NPC, 422: HTTPValidationError |
| PUT | `/api/npcs/{npc_id}` | `npc_id` (path, required) | NPCUpdate | 200: NPC, 422: HTTPValidationError |
| GET | `/api/players` | `limit` (query), `offset` (query) | - | 200: List[Player], 422: HTTPValidationError |
| POST | `/api/players` | - | PlayerCreate | 201: Player, 422: HTTPValidationError |
| DELETE | `/api/players/{player_id}` | `player_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/players/{player_id}` | `player_id` (path, required) | - | 200: Player, 422: HTTPValidationError |
| PUT | `/api/players/{player_id}` | `player_id` (path, required) | PlayerUpdate | 200: Player, 422: HTTPValidationError |
| GET | `/api/players/{player_id}/spells` | `player_id` (path, required) | - | 200: List[Spell], 422: HTTPValidationError |
| DELETE | `/api/players/{player_id}/spells/{spell_id}` | `player_id` (path, required), `spell_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| POST | `/api/players/{player_id}/spells/{spell_id}` | `player_id` (path, required), `spell_id` (path, required) | - | 201: -, 422: HTTPValidationError |
| GET | `/api/players/{player_id}/weapons` | `player_id` (path, required) | - | 200: List[Weapon], 422: HTTPValidationError |
| DELETE | `/api/players/{player_id}/weapons/{weapon_id}` | `player_id` (path, required), `weapon_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| POST | `/api/players/{player_id}/weapons/{weapon_id}` | `player_id` (path, required), `weapon_id` (path, required) | - | 201: -, 422: HTTPValidationError |
| GET | `/api/quests` | `limit` (query), `offset` (query) | - | 200: List[Quest], 422: HTTPValidationError |
| POST | `/api/quests` | - | QuestCreate | 201: Quest, 422: HTTPValidationError |
| DELETE | `/api/quests/{quest_id}` | `quest_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/quests/{quest_id}` | `quest_id` (path, required) | - | 200: Quest, 422: HTTPValidationError |
| PUT | `/api/quests/{quest_id}` | `quest_id` (path, required) | QuestUpdate | 200: Quest, 422: HTTPValidationError |
| GET | `/api/skills` | - | - | 200: List[Skill] |
| GET | `/api/spell-components` | - | - | 200: List[SpellComponent] |
| GET | `/api/spells` | `level` (query), `school` (query), `limit` (query), `offset` (query) | - | 200: List[Spell], 422: HTTPValidationError |
| POST | `/api/spells` | - | SpellCreate | 201: Spell, 422: HTTPValidationError |
| GET | `/api/spells/by-title/{spell_name}` | `spell_name` (path, required) | - | 200: Spell, 422: HTTPValidationError |
| DELETE | `/api/spells/{spell_id}` | `spell_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/spells/{spell_id}` | `spell_id` (path, required) | - | 200: Spell, 422: HTTPValidationError |
| PUT | `/api/spells/{spell_id}` | `spell_id` (path, required) | SpellUpdate | 200: Spell, 422: HTTPValidationError |
| GET | `/api/weapon_properties` | - | - | 200: List[WeaponProperty] |
| GET | `/api/weapons` | `limit` (query), `offset` (query) | - | 200: List[Weapon], 422: HTTPValidationError |
| POST | `/api/weapons` | - | WeaponCreate | 201: Weapon, 422: HTTPValidationError |
| GET | `/api/weapons/by-name/{name}` | `name` (path, required) | - | 200: Weapon, 422: HTTPValidationError |
| DELETE | `/api/weapons/{weapon_id}` | `weapon_id` (path, required) | - | 204: -, 422: HTTPValidationError |
| GET | `/api/weapons/{weapon_id}` | `weapon_id` (path, required) | - | 200: Weapon, 422: HTTPValidationError |
| PUT | `/api/weapons/{weapon_id}` | `weapon_id` (path, required) | WeaponUpdate | 200: Weapon, 422: HTTPValidationError |
<!-- GENERATED:API:END -->
