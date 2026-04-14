# Spells JSON → Database Mapping

## Overview

This document maps the current `spells-merged-clean-range-text.json` shape to the existing SQLite `spells` table schema and the current seed process. It also identifies the parsing work needed to ingest the new JSON into the database cleanly.

The current seed flow is:
- `python _dev/init_database.py` creates the SQLite schema
- `python _dev/parse_spells_to_db.py` loads spell data from `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json`
- `server_flask.py` exposes `/api/spells` from the `spells` table

The legacy 5eAPI parser and `data/5eAPI` payloads are archived under `data/archive/5eAPI` and `_dev/archive/parse_spells_api.py`.

---

## Current spells table schema

Defined in `_dev/init_database.py`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `spell_name TEXT NOT NULL UNIQUE`
- `icon TEXT NOT NULL`
- `level TEXT NOT NULL`
- `school TEXT`
- `spell_text TEXT`
- `spell_alt_text TEXT`
- `damage TEXT`
- `heal TEXT`
- `heal_at_higher_levels TEXT`
- `range TEXT`
- `higher_levels TEXT`
- `damage_at_higher_levels TEXT`
- `casting_time TEXT`
- `duration TEXT`
- `concentration BOOLEAN DEFAULT 0`
- `ritual BOOLEAN DEFAULT 0`
- `components TEXT`
- `materials TEXT`
- `attack_type TEXT`
- `area_of_effect TEXT`
- `classes TEXT`
- `subclasses TEXT`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

Notes:
- Many fields are stored as JSON-encoded strings (`spell_text`, `components`, `classes`, `subclasses`, etc.)
- The schema currently has no columns for `damage_secondary`, `damage_at_level`, `damage_at_spell_slot`, `damageType`, `savingThrow`, `conditionInflict`, or `spellAttack`.

---

## Current DB output behavior

The existing Flask API and DB conventions already use JSON lists/dicts for rich fields:
- `spell_text` is stored as JSON text and parsed back to an array by `parse_json_field()` in `server_flask.py`
- `damage` is stored as a JSON-encoded list of roll/damage objects, e.g.:
  - `[{"name": "initial", "type": "acid", "amount": "4d4", "save_success": ""}]`
- `attack_type` is stored as a JSON list of objects and is passed through `enrich_roll_object()`
- `classes` / `subclasses` are stored as JSON arrays
- `damage_at_higher_levels` is stored as a JSON list, not a dict
- `area_of_effect` is currently stored as a string like `[sphere:10]` and parsed by `parse_area_of_effect()`

This means the current schema already supports rich JSON payloads in several fields, and we can extend that approach for primary/secondary effects without needing separate scalar columns.

---

## Current seed parsing logic

The active spell seeding function is `_dev/parse_spells_to_db.py::main()`.
It currently:

- loads `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json`
- normalizes 5eTools fields into DB columns
- serializes lists/objects as JSON strings for storage
- maps:
  - `name` -> `spell_name`
  - `desc` -> `spell_text`
  - `higher_level` -> `higher_levels`
  - `range` -> `range`
  - `duration` -> `duration`
  - `concentration` -> `concentration`
  - `ritual` -> `ritual`
  - `components` -> `components`
  - `material` -> `materials`
  - `school.index` -> `school`
  - `classes`/`subclasses` -> `classes`/`subclasses`
  - `heal_at_slot_level` -> `heal`, `heal_at_higher_levels`
  - `damage.damage_at_slot_level` or `damage.damage_at_character_level` -> `damage`, `damage_at_higher_levels`
  - `attack_type`/`dc.dc_type.index` -> `attack_type`
  - `area_of_effect` -> `area_of_effect` string like `[type:size]`

This means the new JSON cannot be imported without adapting the parser.

---

## New JSON top-level structure

The new JSON file contains these top-level fields:

- `name`
- `level`
- `school`
- `range`
- `components`
- `duration`
- `entries`
- `at_higher_levels`
- `area_of_effect`
- `concentration`
- `conditionInflict`
- `damage`
- `damageType`
- `damage_secondary`
- `damage_at_spell_slot`
- `damage_at_level`
- `damage_at_level_secondary`
- `damage_at_higher_levels_secondary`
- `savingThrow`
- `materials`
- `ritual`
- `spellAttack`
- `entries_extra`

All spells also now contain normalized default values for missing fields.

---

## Field mapping: new JSON → current DB

| New JSON field | Current DB target | Notes / issues |
|---|---|---|
| `name` | `spell_name` | direct
| `level` | `level` | direct; current DB stores level as TEXT
| `school` | `school` | direct
| `range` | `range` | direct
| `components` | `components` | encode as JSON text
| `materials` | `materials` | direct
| `duration` | `duration` | direct
| `concentration` | `concentration` | direct boolean
| `ritual` | `ritual` | direct boolean
| `entries` | `spell_text` | store as JSON list; preserves structured blocks
| `entries_extra` | new column needed, or alternate JSON field | current DB has no place for nested extra entries
| `at_higher_levels` | `higher_levels` | store as JSON list
| `area_of_effect` | `area_of_effect` | current DB expects plain string; new JSON is object, so convert or create JSON field
| `damage` | `damage` | current DB stores JSON string; new JSON is raw string
| `damageType` | `damage` | include in damage JSON object(s) or new field | DB currently stores only one damage array entry; may need richer structure
| `damage_secondary` | new column or `damage` payload | not currently supported by schema
| `damage_at_spell_slot` | `damage_at_higher_levels` or new column | semantics differ; new JSON name is clearer
| `damage_at_level` | new column or JSON payload | not currently supported by schema
| `damage_at_level_secondary` | new column | not currently supported
| `damage_at_higher_levels_secondary` | new column | not currently supported
| `savingThrow` | new column | not currently supported
| `conditionInflict` | new column | not currently supported
| `spellAttack` | new column | not currently supported

### Existing DB fields with partial overlap

- `damage_at_higher_levels` currently exists but the new JSON uses `damage_at_spell_slot`.
- `area_of_effect` exists, but current seed logic encodes it as `[type:size]`, while new JSON stores an object.
- `spell_text` can hold `entries`; this is the main place to preserve text structure.

---

## Parsing considerations for the new JSON

### 1. `entries` storage

The legacy 5eAPI pipeline stored `spell_text` as `json.dumps(desc)`.
For the new JSON, the safest mapping is:

- `spell_text = json.dumps(entries)`

This preserves the new structured `entries` list.

If the UI wants plain text later, it can flatten the stored JSON list when serving the API.

### 2. `entries_extra`

New nested blocks are now captured under `entries_extra`.
Options:

- Add a new DB column like `spell_text_extra` or `extra_entries` and store `json.dumps(entries_extra)`
- Store it in one generic `metadata`/`extra` JSON column if added
- Leave it out of the main `spells` table and process it separately if only top-level text is needed

This is important because `entries_extra` is intentionally meant to be skipped during normal rendering but available for later processing.

### 3. Damage normalization

The new JSON splits damage into multiple related fields:
- `damage`
- `damage_secondary`
- `damageType`
- `damage_at_spell_slot`
- `damage_at_level`
- `damage_at_level_secondary`
- `damage_at_higher_levels_secondary`

The current DB already uses a JSON list for `damage`, which is a good fit for collapsing primary/secondary effects.
The server can render lists of damage objects and paired rolls, so we do not need separate scalar columns for every effect.

#### Recommended parsing strategy

1. Treat `damage` as a JSON list of damage entries, not just a single string.
2. For each damage effect, store an object like:
   - `name` (e.g. `initial`, `secondary`)
   - `type` from `damageType`
   - `amount` from `damage` or `damage_secondary`
   - `save_success` as needed
   - `scaling` as a nested dict/list for `damage_at_spell_slot` and/or `damage_at_level`
3. Example representation:

```json
[
  {
    "name": "initial",
    "type": "acid",
    "amount": "4d4",
    "scaling": {
      "slot": {"3": "4d4", "4": "5d4"},
      "level": {}
    }
  },
  {
    "name": "secondary",
    "type": "acid",
    "amount": "2d8",
    "scaling": {
      "slot": {"3": "2d8", "4": "3d8"},
      "level": {}
    }
  }
]
```

4. Store the full array as JSON in the existing `damage` column, or add a new dedicated JSON column such as `damage_details`.

If the app needs separate damage categories for rendering, it is better to keep them as items in a list than as separate columns like `damage_secondary`.

### 3.1 Collapse primary/secondary into singular fields

Because the server already recognizes `damage` as a list and renders each entry separately, the new JSON can be collapsed as follows:
- `damage` + `damageType` → first damage object
- `damage_secondary` → additional damage object in the same list
- `damage_at_spell_slot` → stored under `scaling.slot` or as a top-level `damage_at_spell_slot` list/dict inside the damage object
- `damage_at_level` / `damage_at_level_secondary` → stored under `scaling.level` for the corresponding damage object
- `damage_at_higher_levels_secondary` → stored in the secondary damage object's scaling or a shared scaling structure

This preserves fidelity while keeping the DB shape compact and consistent with the existing `damage` JSON pattern.

If you later want to preserve the old `damage_at_higher_levels` column, you can also keep it as a fallback summary field.

### 4. Area-of-effect storage

Current DB uses a string form for `area_of_effect`.
The new JSON stores objects like:

```json
{"sphere": 10}
```

For compatibility, parse this object into either:
- a string `"[sphere:10]"` as the current seed code does, or
- add a JSON-capable column and store the object directly.

### 5. Missing columns / metadata fields

The new JSON includes several fields the current DB schema does not support:
- `conditionInflict`
- `savingThrow`
- `spellAttack`
- `damage_secondary`
- `damage_at_level`
- `damage_at_level_secondary`
- `damage_at_spell_slot`
- `damage_at_higher_levels_secondary`
- `entries_extra`

To ingest these cleanly, the database needs either new columns or a generic JSON metadata column.

### 6. New parser path

The current active parser is `_dev/parse_spells_to_db.py`.
`_dev/parse_spells_api.py` is now archived as a legacy 5eAPI parser under `_dev/archive/parse_spells_api.py`.

To make the new JSON importable, we need:

- Adapt `_dev/seed_database.py` to read `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json`
- Build a new parser script that converts the new schema into the existing `spells` table format
- Update `_dev/init_database.py` to add any new required columns before seeding

---

## Recommended next steps

### Short-term

1. Add a `spell_text_extra` (or `entries_extra`) TEXT column to `spells`.
2. Add JSON-capable columns for new damage variants, or add a single `damage_details` JSON field.
3. Update `_dev/seed_database.py` to accept the new JSON source and map its fields explicitly.
4. Preserve `entries` as `spell_text` JSON, and store `entries_extra` separately.

### Longer-term

- Decide whether `area_of_effect` should stay a string or become JSON.
- Decide whether `spells` should store all spell metadata in a single JSON blob for flexibility.
- If `entries` objects are to be used in the UI, update `server_flask.py` to render nested blocks from `spell_text` and `entries_extra`.

---

## Proposed mapping summary

### Minimal compatible import (with current schema)

| New JSON | Output | Notes |
|---|---|---|
| `name` | `spell_name` | direct |
| `level` | `level` | direct |
| `school` | `school` | direct |
| `entries` | `spell_text` | `json.dumps(entries)` |
| `at_higher_levels` | `higher_levels` | `json.dumps(at_higher_levels)` |
| `range` | `range` | direct |
| `duration` | `duration` | direct |
| `concentration` | `concentration` | direct |
| `ritual` | `ritual` | direct |
| `components` | `components` | `json.dumps(components)` |
| `materials` | `materials` | direct |
| `damageType` + `damage` | `damage` | build JSON payload |
| `damage_at_spell_slot` | `damage_at_higher_levels` | if desired, or add new column |
| `area_of_effect` | `area_of_effect` | stringify or add JSON column |
| other new fields | new DB columns | required for full fidelity |

### Full fidelity import

- Add columns: `damage_secondary`, `damage_at_level`, `damage_at_level_secondary`, `damage_at_spell_slot`, `damage_at_higher_levels_secondary`, `savingThrow`, `conditionInflict`, `spellAttack`, `entries_extra`
- Store structured fields as JSON text
- Keep `spell_text` as the canonical `entries` payload

---

## Conclusion

The current DB and seed process are not directly compatible with the new JSON, but they are already built around JSON payload patterns. The existing DB output uses:

- `spell_text` as JSON list
- `damage` as a JSON list of damage objects
- `attack_type` as a JSON list
- `classes` / `subclasses` as JSON arrays

So we can avoid an exact field-for-field match and instead collapse source primary/secondary effects into richer JSON structures.

The most important changes are:

- preserve structured `entries` into `spell_text`
- store new nested `entries_extra`
- collapse multiple damage effects into a single JSON list field
- normalize `area_of_effect` and add missing metadata columns if needed

If you want, I can now also update `_dev/seed_database.py` to consume `spells-merged-clean-range-text.json` and generate a compatible seed path.