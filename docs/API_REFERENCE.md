# API Reference — D&D Kids Resources Backend

Hand-written endpoint inventory. For response/request shapes, refer to `backend/app/schemas.py` (the source of truth for all Pydantic models).

## Conventions

- **Base path:** `http://localhost:8000` (or production equivalent)
- **Request/response format:** JSON
- **Response on success:** `2xx` status, JSON body with resource(s) or null
- **Response on error:** `4xx` or `5xx` status, JSON error message
- **JSON-encoded columns:** Several tables store complex data (damage, spells.classes, monsters.features, etc.) as `TEXT` JSON — see `docs/DATA_MODEL.md` for the full list. These are automatically deserialized by Pydantic on read and serialized on write.

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
| GET | `/spells` | List all spells | (query params: none) | `List[Spell]` |
| GET | `/spells/{spell_id}` | Fetch spell by ID | (path param) | `Spell` |
| GET | `/spells/by-title/{spell_name}` | Fetch spell by exact title | (path param) | `Spell` |
| POST | `/spells` | Create spell | `SpellCreate` | `Spell` (201) |
| PUT | `/spells/{spell_id}` | Update spell | `SpellUpdate` | `Spell` |
| DELETE | `/spells/{spell_id}` | Delete spell | (path param) | (204 No Content) |

---

## Monsters Router

`backend/app/routers/monsters.py` — monster/creature CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/monsters` | List all monsters | (query params: none) | `List[Monster]` |
| GET | `/monsters/{monster_id}` | Fetch monster by ID | (path param) | `Monster` |
| GET | `/monsters/by-name/{name}` | Fetch monster by exact name | (path param) | `Monster` |
| POST | `/monsters` | Create monster | `MonsterCreate` | `Monster` (201) |
| PUT | `/monsters/{monster_id}` | Update monster | `MonsterUpdate` | `Monster` |
| DELETE | `/monsters/{monster_id}` | Delete monster | (path param) | (204 No Content) |

---

## Weapons Router

`backend/app/routers/weapons.py` — weapon CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/weapons` | List all weapons | (query params: none) | `List[Weapon]` |
| GET | `/weapons/{weapon_id}` | Fetch weapon by ID | (path param) | `Weapon` |
| GET | `/weapons/by-name/{name}` | Fetch weapon by exact name | (path param) | `Weapon` |
| POST | `/weapons` | Create weapon | `WeaponCreate` | `Weapon` (201) |
| PUT | `/weapons/{weapon_id}` | Update weapon | `WeaponUpdate` | `Weapon` |
| DELETE | `/weapons/{weapon_id}` | Delete weapon | (path param) | (204 No Content) |

---

## Items Router

`backend/app/routers/items.py` — treasure item catalog CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/items` | List catalog items | (query params: `limit`, `offset`) | `List[Item]` |
| GET | `/items/{item_id}` | Fetch item by ID | (path param) | `Item` |
| POST | `/items` | Create catalog item | `ItemCreate` | `Item` (201) |
| PUT | `/items/{item_id}` | Update catalog item | `ItemUpdate` | `Item` |
| DELETE | `/items/{item_id}` | Delete catalog item | (path param) | (204 No Content) |

---

## Loot Bundles Router

`backend/app/routers/loot.py` — loot bundle authoring CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/loot-bundles` | List loot bundles | (query params: `limit`, `offset`) | `List[LootBundle]` |
| GET | `/loot-bundles/{bundle_id}` | Fetch loot bundle by ID | (path param) | `LootBundle` |
| POST | `/loot-bundles` | Create loot bundle | `LootBundleCreate` | `LootBundle` (201) |
| PUT | `/loot-bundles/{bundle_id}` | Update loot bundle | `LootBundleUpdate` | `LootBundle` |
| DELETE | `/loot-bundles/{bundle_id}` | Delete loot bundle | (path param) | (204 No Content) |

---

## Players Router

`backend/app/routers/players.py` — player CRUD and spell/weapon roster management.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/players` | List all players | (query params: none) | `List[Player]` |
| GET | `/players/{player_id}` | Fetch player by ID | (path param) | `Player` |
| POST | `/players` | Create player | `PlayerCreate` | `Player` (201) |
| PUT | `/players/{player_id}` | Update player | `PlayerUpdate` | `Player` |
| DELETE | `/players/{player_id}` | Delete player | (path param) | (204 No Content) |
| GET | `/players/{player_id}/spells` | List player's spells | (path param) | `List[Spell]` |
| POST | `/players/{player_id}/spells/{spell_id}` | Add spell to player's roster | (path params) | (201 No Content) |
| DELETE | `/players/{player_id}/spells/{spell_id}` | Remove spell from player's roster | (path params) | (204 No Content) |
| GET | `/players/{player_id}/weapons` | List player's weapons | (path param) | `List[Weapon]` |
| POST | `/players/{player_id}/weapons/{weapon_id}` | Add weapon to player's roster | (path params) | (201 No Content) |
| DELETE | `/players/{player_id}/weapons/{weapon_id}` | Remove weapon from player's roster | (path params) | (204 No Content) |

---

## NPCs Router

`backend/app/routers/npcs.py` — NPC (non-player character) CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/npcs` | List all NPCs | (query params: none) | `List[NPC]` |
| GET | `/npcs/{npc_id}` | Fetch NPC by ID | (path param) | `NPC` |
| POST | `/npcs` | Create NPC | `NPCCreate` | `NPC` (201) |
| PUT | `/npcs/{npc_id}` | Update NPC | `NPCUpdate` | `NPC` |
| DELETE | `/npcs/{npc_id}` | Delete NPC | (path param) | (204 No Content) |

---

## Quests Router

`backend/app/routers/quests.py` — quest/mission CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/quests` | List all quests | (query params: none) | `List[Quest]` |
| GET | `/quests/{quest_id}` | Fetch quest by ID | (path param) | `Quest` |
| POST | `/quests` | Create quest | `QuestCreate` | `Quest` (201) |
| PUT | `/quests/{quest_id}` | Update quest | `QuestUpdate` | `Quest` |
| DELETE | `/quests/{quest_id}` | Delete quest | (path param) | (204 No Content) |

---

## Encounters Router

`backend/app/routers/encounters.py` — encounter (combat) CRUD.

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/encounters` | List all encounters | (query params: none) | `List[Encounter]` |
| GET | `/encounters/{encounter_id}` | Fetch encounter by ID | (path param) | `Encounter` |
| POST | `/encounters` | Create encounter | `EncounterCreate` | `Encounter` (201) |
| PUT | `/encounters/{encounter_id}` | Update encounter | `EncounterUpdate` | `Encounter` |
| DELETE | `/encounters/{encounter_id}` | Delete encounter | (path param) | (204 No Content) |

---

## Dungeons Router

`backend/app/routers/dungeons.py` — dungeon module CRUD (room layout, encounters, NPC placements).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/dungeons` | List all dungeons | (query params: none) | `List[Dungeon]` |
| GET | `/dungeons/{dungeon_id}` | Fetch dungeon by ID | (path param) | `Dungeon` |
| POST | `/dungeons` | Create dungeon | `DungeonCreate` | `Dungeon` (201) |
| PUT | `/dungeons/{dungeon_id}` | Update dungeon | `DungeonUpdate` | `Dungeon` |
| DELETE | `/dungeons/{dungeon_id}` | Delete dungeon | (path param) | (204 No Content) |

---

## Layouts Router

`backend/app/routers/layouts.py` — dungeon map layout save/load (Map Lab).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/dungeons/{dungeon_id}/layout` | Fetch dungeon map layout | (path param) | `MapLayoutBlob` |
| PUT | `/dungeons/{dungeon_id}/layout` | Save/update dungeon map layout | `MapLayoutBlob` | `MapLayoutBlob` |

Layout data (`map_layout`) and dungeon content data (`dungeons.data`) are saved independently via separate endpoints and debounced separately in the editor.

---

## Reference Router

`backend/app/routers/reference.py` — read-only reference data (abilities, conditions, damage types, etc.).

| Method | Path | Purpose | Request schema | Response schema |
|---|---|---|---|---|
| GET | `/abilities` | List all abilities | (query params: none) | `List[Ability]` |
| GET | `/conditions` | List all conditions | (query params: none) | `List[Condition]` |
| GET | `/damage_types` | List all damage types | (query params: none) | `List[DamageType]` |
| GET | `/weapon_properties` | List all weapon properties | (query params: none) | `List[WeaponProperty]` |
| GET | `/skills` | List all skills | (query params: none) | `List[Skill]` |
| GET | `/spell-components` | List all spell components (V, S, M, etc.) | (query params: none) | `List[SpellComponent]` |

---

## Request/Response Shapes

All request and response body shapes are defined in `backend/app/schemas.py` as Pydantic models. Refer there for field names, types, and optionality. Examples:

- **Spell:** id, spell_name, level, school, damage (JSON), components (JSON), classes (JSON), casting_time, duration, concentration, ritual, materials, higher_levels, spell_text, spell_alt_text, range, action, attack_type (JSON), area_of_effect (JSON), heal (JSON), heal_at_spell_slots (JSON), subclasses (JSON)
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
