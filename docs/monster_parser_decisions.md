# Monster Parser Decision List

This document lists the decisions needed to build a parser from `data/5eAPI/monsters.json` into the repository's creature data model.

## 1. Parser goal

- Input: `data/5eAPI/monsters.json` (array of 334 monster objects)
- Output: a reviewable parser object or a new normalized monster seed format
- Primary goal: preserve the useful monster fields while defining a fresh parser target schema
- Secondary goal: decide which fields to normalize, which to store as JSON, and which to omit

## 2. Source field coverage

All monster objects include these fields:

- `index` (string)
- `name` (string)
- `size` (string)
- `type` (string)
- `alignment` (string)
- `armor_class` (list)
- `hit_points` (integer)
- `hit_dice` (string)
- `hit_points_roll` (string)
- `speed` (object)
- `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma` (integers)
- `proficiencies` (list)
- `damage_vulnerabilities`, `damage_resistances`, `damage_immunities`, `condition_immunities` (lists)
- `senses` (object)
- `languages` (string)
- `challenge_rating` (integer)
- `proficiency_bonus` (integer)
- `xp` (integer)
- `special_abilities`, `actions`, `legendary_actions`, `reactions` (lists)
- `image`, `url`, `updated_at`, `forms` (metadata)
- Optional fields: `subtype`, `desc`

## 3. Target model decisions

This rebuild ignores the previous `creatures` table.

Decision: design a new parser target schema from the 5eAPI data, with an intermediate normalized JSON format as the first output. Preserve raw nested fields where needed and only commit to a final database schema after the parser shape is stable.

## 4. Mapping source -> target

### 4.1 Basic metadata

- `index` -> `monster_name` (string)
- `size` = `size`
- `icon` = use a default or leave blank, unless an icon source exists for monster `type`
- `type` / `subtype` should be mapped into a chosen monster category or creature type code
  - e.g. `dragon`, `undead`, `humanoid`, `aberration`
  - if there is no exact category, choose a fallback like `humanoid`

### 4.2 Combat stats

- `hp` = `hit_points`
- `ac` = first numeric entry from `armor_class`
  - if `armor_class` is list of objects, use `value`
  - decision: ignore `type` for the main `ac` field or store it in a note field
- `stats` = JSON object with ability scores:
  - `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`

### 4.3 Explanation / description

- `explanation` should be built from available flavor fields:
  - prefer `desc` if present
  - if no `desc`, build from `special_abilities` and/or `actions` summaries
  - decision needed: should `explanation` contain the raw `alignment`, `languages`, `senses`, and immunities, or only the narrative description?

### 4.4 Attack and damage parsing

The existing schema expects structured JSON for `attack_to_hit` and `damage`.

Decision: parse monster `actions` into:

- `attack_to_hit`: list of attack objects derived from actions with attack rolls
- `damage`: list of damage objects derived from action damage arrays

Fields to extract:

- `name`: action name, slugged or raw
- `roll`: parsed dice expression from action `attack_bonus` or action `damage` values
- `mod`: numeric attack bonus when available
- `numerics`: ability codes inferred from action text or from the monster's ability scores
- `save`: `true` if the action uses a saving throw (`dc` exists and `attack_bonus` is absent)
- `actor`: `"attacker"` for attack rolls, `"creature"` for saves

For damage objects:

- `name`: same as attack name
- `roll`: `damage_dice` from each damage entry
- `mod`: parse modifiers from `damage_dice` if any exist
- `types`: damage type codes from `damage_type.index`
- `save`: whether the action has a save `dc`

Decision: if an action has multiple damage entries, create multiple damage rows with the same `name`.

### 4.5 Special content

- `special` can store a combined summary of:
  - `special_abilities`
  - `reactions`
  - `legendary_actions`
  - non-attack `actions` such as `Multiattack` or spells
- Decision: preserve this either as:
  - plain text concatenation, or
  - JSON array for later rendering

### 4.6 Optional and metadata fields

Decide how to handle these fields:

- `forms`: likely ignore or store as JSON if alternate forms matter
- `image`: ignore or use as asset url if the UI supports it
- `url`: ignore, since local storage is the source of truth
- `updated_at`: ignore or keep as import metadata
- `languages`, `senses`, `challenge_rating`, `proficiency_bonus`, `xp`: these are useful for review but may be omitted from current schema unless stored in `special`
- `damage_vulnerabilities`, `damage_resistances`, `damage_immunities`, `condition_immunities`: store as JSON in `special` or add a new field later

## 5. Normalization decisions

### 5.1 armor_class

- `armor_class` is usually a list of one object.
- Decision: use the first `value` as `ac`
- Optionally preserve `type` as part of the full `special` text

### 5.2 speed

- `speed` is a dict of modes (`walk`, `fly`, `swim`, `burrow`, `climb`)
- Decision: normalize into a string like `walk 30 ft., fly 60 ft.` or keep as JSON in the review output

### 5.3 proficiencies

- Each item contains `value` and `proficiency.index`
- Decision: parse skill saves and ability saves separately if needed
- For initial parser, preserve raw proficiency data as JSON for review

### 5.4 saves and actions

- If an action has `attack_bonus`, treat it as an attack roll
- If an action has a `dc` but no `attack_bonus`, treat it as a save-based ability
- Decision: represent save attacks in `attack_to_hit` as `save: true` and actor `creature`

## 6. Parser output format decision

Option A: map directly to a new target schema

- Good when the goal is to seed a newly defined database table or import structure
- Will require a schema decision for fields not already modeled

Option B: output an intermediate normalized JSON object

- Preserve more fields from the 5eAPI source
- Easier to review and later choose what to seed into the DB

Recommended structure for intermediate output:

- `index`, `name`, `size`, `type`, `subtype`, `alignment`
- `ac`, `hp`, `hit_dice`, `speed`
- `stats`
- `languages`, `senses`
- `proficiencies`
- `immunities` / `resistances` / `vulnerabilities`
- `actions`
- `special_abilities`
- `legendary_actions`
- `reactions`
- `forms`
- `image`, `url`, `updated_at`

## 7. Review and acceptance criteria

A successful parser should:

- correctly load every monster object from `data/5eAPI/monsters.json`
- extract `name`, `size`, `type`, `hp`, `ac`, and ability scores
- normalize `actions` into structured attack/damage objects
- preserve `special_abilities`, `legendary_actions`, and `reactions` for review
- produce a consistent `creature_type` mapping from API `type`

## 8. Next decision points for implementation

- Choose whether to preserve `languages`, `senses`, and `challenge_rating` in the DB or only in review output
- Choose whether `special` should be plain text or JSON
- Decide how to map `subtype` into `creature_type_id`
- Decide whether to generate a separate `monster_imports` table instead of using the current `creatures` table
- Decide whether `attack_to_hit` and `damage` should be paired strictly by `name`

## 9. Suggested first parser prototype

1. Read `data/5eAPI/monsters.json`
2. Build an intermediate object with normalized fields
3. Print or save the first 10 monster summaries
4. Store raw nested fields as JSON for review
5. Only later map to `creatures` table when the shape is stable
