# Data Model — D&D Kids Resources

Reference for seed files, tables, relationships, and JSON-encoded columns.

## Source of Truth

**Seeds are canonical; the database is built, not edited.** Never hand-edit `dnd_kids_resources.db` (it's gitignored). Instead:

1. Edit `data/seeds/*.json` — the source files.
2. Run `python scripts/init_database.py` — builds the schema.
3. Run `python scripts/seed_database.py` — loads the seed files into the database.

This ensures schema and data stay synced with the codebase and can be reliably rebuilt in any environment (CI, another machine, etc.).

## Domains and Tables

16 seed files populate 16 main tables (plus a few junction/lookup tables for many-to-many relationships).

| Seed file | Table(s) | Description | Routers |
|---|---|---|---|
| `seed_abilities.json` | `abilities` | Character ability scores (Strength, Dexterity, etc.) and modifiers | `/abilities` (ref.py) |
| `seed_conditions.json` | `conditions` | D&D 5e conditions (poisoned, stunned, etc.) | `/conditions` (ref.py) |
| `seed_damage_types.json` | `damage_types` | Damage types (fire, cold, necrotic, etc.) | `/damage_types` (ref.py) |
| `seed_weapon_properties.json` | `weapon_properties` | Weapon property tags (finesse, reach, heavy, etc.) | `/weapon_properties` (ref.py) |
| `seed_spells.json` | `spells` | D&D 5e spells (name, level, school, damage, components, classes, etc.) | `/spells`, `/players/{id}/spells` |
| `seed_monsters.json` | `monsters` | D&D 5e monsters/creatures (AC, HP, abilities, actions, CR) | `/monsters` |
| `seed_weapons.json` | `weapons` | D&D 5e weapons (name, rarity, base weapon, properties, attack data) | `/weapons`, `/players/{id}/weapons` |
| `seed_items.json` | `items` | Reusable treasure item catalog (name, gp value, category, description) | `/items` |
| `seed_loot_bundles.json` | `loot_bundle` | Hand-authored loot bundles (gold and JSON snapshotted item/weapon contents) | `/loot-bundles` |
| `seed_dungeons.json` | `dungeons` | Dungeon modules (room layout, encounter placement, NPC locations) | `/dungeons`, `/dungeons/{id}/layout` |
| `seed_encounters.json` | `encounters` | Combat encounters (creature roster, active creature index) | `/encounters` |
| `seed_npcs.json` | `npcs` | Non-player characters (name, race, stats, appearance, notes) | `/npcs` |
| `seed_players.json` | `players` | Player characters (name, class, level) | `/players` |
| `seed_player_spells.json` | `player_spells` (junction) | Many-to-many: which spells does each player have? | (routed via `/players/{id}/spells`) |
| `seed_player_weapons.json` | `player_weapons` (junction) | Many-to-many: which weapons does each player have? | (routed via `/players/{id}/weapons`) |
| `seed_quests.json` | `quests` | Quests/missions (title, objectives, reward, quest giver, location) | `/quests` |

## Relationships

Non-obvious foreign-key-like relationships (skip any self-evident from naming):

- **`players` → `player_spells` ↔ `spells`** — Many-to-many via junction table. A player can have multiple spells; a spell can be known by multiple players.
- **`players` → `player_weapons` ↔ `weapons`** — Many-to-many via junction table. A player can have multiple weapons; a weapon can be owned by multiple players.
- **`encounters`** — Contains `creatures` (JSON array of creature references, typically monsters). No explicit foreign key in the current schema; monsters are referenced by name or ID within the JSON.
- **`loot_bundle`** — Contains `contents`, a JSON array of item/weapon snapshots. Entries keep a soft `ref_id` to the catalog source, but retain their name, item category, per-unit `value_gp`, and quantity after source edits or deletion.
- **`dungeons`** — Contains `data` (complex JSON) storing room layout, encounters, NPC placements. No explicit foreign keys; references are embedded in the JSON blob.
- **`quests` → `quest_giver`** — Optional foreign key to `npcs.id`. A quest is given by an NPC (or none if quest_giver is NULL).
- **`quests` → `dungeon_id`** — Optional foreign key to `dungeons.id`. A quest can be tied to a specific dungeon.

## JSON-Encoded Columns

Some tables store complex structured data as JSON strings. The backend's Pydantic schemas deserialize these automatically; the database stores them as `TEXT` columns.

| Table | Column | Contents | Example |
|---|---|---|---|
| `spells` | `damage` | List of damage rolls (`[{"damage_type": "fire", "dice": "8d6"}]`) | `[{"damage_type": "fire", "dice": "8d6"}]` |
| `spells` | `heal` | Healing roll dict | `{"dice": "1d4+1"}` |
| `spells` | `heal_at_higher_levels` | Healing by spell slot (`{"1": "1d4+1", "5": "2d4+1"}`) | `{"1": "1d4+1"}` |
| `spells` | `components` | List of spell components (`["V", "S", "M"]`) | `["V", "S"]` |
| `spells` | `attack_type` | List of attack roll definitions | `[{"type": "melee", "hit_bonus": 4}]` |
| `spells` | `area_of_effect` | Area of effect dict (`{"type": "cone", "size": 15}`) | `{"type": "sphere", "size": 20}` |
| `spells` | `classes` | List of classes that can learn this spell | `["Cleric", "Wizard"]` |
| `spells` | `subclasses` | List of subclasses that can learn this spell | `["Lore Master"]` |
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
| `encounters` | `creatures` | List of creature roster entries (name, HP, initiative, etc.) | `[{"name": "Goblin", "hp": 7}, ...]` |
| `dungeons` | `data` | Complex dungeon structure (rooms, exits, encounters, NPCs, props) | (large JSON blob per dungeon) |
| `player_spells` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/spells`) | |
| `player_weapons` | (implicit in junction) | (Many-to-many, no direct column; routes expose via `/players/{id}/weapons`) | |
| `weapons` | `attack` | List of attack definitions (similar to spells) | `[{"type": "melee", "damage": "1d8"}]` |
| `weapons` | `entries` | List of flavor text or special descriptions | `["A well-crafted longsword"]` |
| `loot_bundle` | `contents` | Item/weapon snapshots with quantity and soft source ID | `[{"kind":"item","ref_id":1,"name":"Ruby","value_gp":50,"category":"gem","quantity":1}]` |

When querying or updating any of these columns, use `json.loads()` to deserialize on read and `json.dumps()` to serialize on write. The Pydantic schemas in `backend/app/schemas.py` handle this automatically for API requests/responses.

## Rebuilding the Database

After editing seed files or updating the schema:

```bash
# From the repo root:
python scripts/init_database.py    # Creates/resets schema
python scripts/seed_database.py    # Loads all seed files
```

This destroys and rebuilds `dnd_kids_resources.db` (gitignored, so no commit impact). Use this workflow in development and in CI before running tests.

To export the current database state back to seed files (one-off data updates):

```bash
python scripts/export_db_seeds.py
```

This overwrites `data/seeds/*.json` with the current DB contents — useful after adding data via the UI, but generally prefer editing seed files directly.
