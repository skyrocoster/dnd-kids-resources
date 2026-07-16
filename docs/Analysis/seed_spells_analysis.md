# seed_spells.json Deep-Dive Analysis

> **Status:** Historical analysis, complete. The accepted decision and canonical references supersede it as a
> current-status source.
> **Scope:** Historical structural analysis only.

---

## 1. Executive Summary

`seed_spells.json` contains **525 spells** across **25 top-level fields**. It is riddled with structural problems that make it fundamentally inconsistent with both the Pydantic schema in `schemas.py` and the gold-standard conventions established by `seed_monsters.json`'s M1→M5 migration.

**Critical issues:**
- Three fields store **string-encoded JSON** instead of proper objects (`components`, `heal`, `area_of_effect`)
- `concentration` and `ritual` use **integers** (0/1) instead of booleans
- `level` is a **string** (`"8"`) instead of an integer
- `attack_type` is internally inconsistent (string vs list save field, empty string vs missing type, uppercase vs lowercase save values)
- `damage_at_higher_levels` is a **string-encoded JSON dict** (level→dice map) instead of a structured type
- `spell_name` is used instead of the conventional `name`
- 3 of 25 fields are effectively dead (`heal_at_spell_slots`, `action`, `subclasses`)
- `school` has one capitalization outlier (`"Conjuration"` vs lowercase everywhere else)
- `damage[]` has a **spelling typo** in Flashdaggers: `"peircing"` instead of `"piercing"`
- `damage[].type` is an array of strings in all spells but the Pydantic schema doesn't represent this
- 77% of `area_of_effect` entries have `null` for the size value (shape is set but size is not)

---

## 2. Field-by-Field Density Audit

| Field | Populated | Null | Empty | Pop % | Notes |
|---|---:|---:|---:|---:|---|
| `id` | 525 | 0 | 0 | 100.0 | Unique integers; no gaps analysis done |
| `spell_name` | 525 | 0 | 0 | 100.0 | Should be `name` per convention |
| `icon` | 525 | 0 | 0 | 100.0 | 524 = `✨`, 1 = `-` |
| `level` | 525 | 0 | 0 | 100.0 | **String, not int** |
| `school` | 525 | 0 | 0 | 100.0 | 1 capitalization outlier |
| `spell_text` | 525 | 0 | 0 | 100.0 | Full description |
| `spell_alt_text` | 40 | 485 | 0 | 7.6 | Multi-section text; 92.4% null |
| `damage` | 97 | 428 | 0 | 18.5 | Array of dicts; 2 missing type field |
| `heal` | 29 | 496 | 0 | 5.5 | **String-encoded JSON dict** |
| `heal_at_spell_slots` | 0 | 525 | 0 | 0.0 | **Dead field — always null** |
| `range` | 525 | 0 | 0 | 100.0 | String, e.g. "60 feet" |
| `higher_levels` | 178 | 347 | 0 | 33.9 | Free text description |
| `damage_at_higher_levels` | 74 | 451 | 0 | 14.1 | **String-encoded JSON dict** |
| `casting_time` | 525 | 0 | 0 | 100.0 | 1 list anomaly in Plant Growth |
| `duration` | 525 | 0 | 0 | 100.0 | String |
| `concentration` | 525 | 0 | 0 | 100.0 | **Integer 0/1, not bool** |
| `ritual` | 525 | 0 | 0 | 100.0 | **Integer 0/1, not bool** |
| `components` | 525 | 0 | 0 | 100.0 | **String-encoded JSON array** |
| `materials` | 184 | 341 | 0 | 35.0 | Free text |
| `attack_type` | 249 | 276 | 0 | 47.4 | Array of dicts; inconsistent internal structure |
| `action` | 1 | 524 | 0 | 0.2 | **Dead field — 1 non-null value is itself a JSON string** |
| `area_of_effect` | 524 | 1 | 0 | 99.8 | **String-encoded JSON dict**; 77% have null size |
| `classes` | 1 | 524 | 0 | 0.2 | **Dead field — 1 non-null value is "Wizard"** |
| `subclasses` | 0 | 525 | 0 | 0.0 | **Dead field — always null** |

---

## 3. Type Mismatches: Seed vs Pydantic Schema

The Pydantic `Spell` model in `schemas.py:35` declares proper types that the seed data violates:

| Field | Schema type | Actual seed type | Violation |
|---|---|---|---|
| `level` | `Optional[str]` | `str` | Schema allows string but D&D convention is int. Schema should be changed. |
| `concentration` | `Optional[bool]` | `int` (0/1) | **Schema expects bool, gets int.** Pydantic may coerce but semantically wrong. |
| `ritual` | `Optional[bool]` | `int` (0/1) | Same as above. |
| `components` | `Optional[List[str]]` | `str` (JSON-encoded) | **String is not a list.** Schema and seed are incompatible. |
| `heal` | `Optional[Dict[str, Any]]` | `str` (JSON-encoded) | **String is not a dict.** |
| `area_of_effect` | `Optional[Dict[str, Any]]` | `str` (JSON-encoded) | **String is not a dict.** |
| `damage_at_higher_levels` | `Optional[str]` | `str` (JSON-encoded) | Technically passes but content is JSON, not prose. Schema should be rethought. |
| `attack_type` | `Optional[List[Dict[str, Any]]]` | `List[Dict]` | Passes but internal dict structure is inconsistent (see §6). |
| `action` | `Optional[str]` | `str` or `None` | Dead field; 1 entry is itself a JSON string `'{"action": "Action"}'`. |

---

## 4. String-Encoded JSON Fields

These fields store what should be objects/arrays as stringified JSON:

### 4.1 `components` — string-encoded array

```json
// Actual seed value (all 525 entries are strings):
"[\"V\", \"S\", \"M\"]"
"[\"S\"]"
"[\"V\", \"S\"]"
"[\"V\", \"S\", \"M\"]"

// Pydantic expects:
["V", "S", "M"]
```

### 4.2 `heal` — string-encoded dict

```json
// Actual seed value:
"{\"amount\": \"5\", \"temp_hp\": false, \"max_hp\": true}"
"{\"amount\": \"1d8 + a\", \"temp_hp\": false, \"max_hp\": false}"

// Pydantic expects:
{"amount": "5", "temp_hp": false, "max_hp": true}
```

The `amount` field uses string expressions like `"1d8 + a"` (where `a` = ability modifier), `"maximum"`, `"all"`, `"full"`, `"1/2 x damage"`, `"2 x damage"`, `"up to 700"`, `"0"`. This is not machine-parseable and requires human interpretation.

### 4.3 `area_of_effect` — string-encoded dict with null sizes

```json
// Actual seed value:
"{\"cone\": 30}"
"{\"cube\": null}"
"{\"sphere\": null}"
"{\"single target\": null}"

// Pydantic expects:
{"cone": 30}
{"cube": null}
```

**77% of AoE entries have `null` for the size.** Only 16 out of 488 non-null AoEs have a numeric size. Shapes seen: `cone`, `cube`, `cylinder`, `hemisphere`, `line`, `multiple targets`, `single target`, `sphere`, `square`, `wall`, `circle`.

### 4.4 `damage_at_higher_levels` — string-encoded level→dice map

```json
// Actual seed value:
"{\"1\": \"1d6\", \"2\": \"2d6\", \"3\": \"3d6\", ...}"
"{\"2\": \"3d8\", \"3\": \"4d8\", ...}"
```

This is a map from spell slot level to damage dice. Only 74 of 525 spells have it. The remaining 104 spells that have `higher_levels` text (free-text description of scaling) do not have this field set. This field and `higher_levels` appear to represent overlapping information in different formats.

---

## 5. Null/Default Conventions vs Monster Standard

The monster schema (`monster_schema_decision.md`) established clear conventions:

- **Collections:** Always `[]`, never `null`
- **Absent scalars:** Always `null`, never empty strings
- **Nested objects:** Always present with null-padded members, not absent

Spells violate all three:

| Convention | Monsters | Spells |
|---|---|---|
| Empty collection | `[]` | `null` (e.g. `classes`, `subclasses`) |
| Absent scalar | `null` | `null` (consistent) but also `0`/`""` for some fields |
| Nested object presence | Always present, null-padded | Absent (null) entirely |

Spells use `null` for "not applicable" on collections where monsters use `[]`. The one non-null `classes` entry is the string `"Wizard"` (not an array), and `subclasses` is universally null.

---

## 6. `attack_type` Structure Issues

The `attack_type` field is an array of dicts with `name`, `type`, and `save` keys, but the structure is inconsistent:

### 6.1 Type field is mostly empty string

| `type` value | Count |
|---|---:|
| `""` (empty string) | 213 |
| `"ranged"` | 20 |
| `"melee"` | 15 |
| `"MISSING"` (key absent) | 1 |

For **85% of entries**, the `type` is an empty string rather than `null`. Monster convention would use `null` for absent.

### 6.2 Save field is inconsistently typed

| `save` type | Count |
|---|---:|
| `list` (lowercase values) | 248 |
| `str` (`"DEX"` — uppercase, bare string) | 1 |

The one exception is **Flashdaggers**, which has `"save": "DEX"` (string, uppercase) instead of `"save": ["dex"]` (list, lowercase).

### 6.3 26 entries have empty save

26 `attack_type` entries have an empty `save` array (`[]`) or no `save` key, meaning they are attack-roll spells with no associated save. This is correct semantically but the inconsistent presence of the key is a structural issue.

### 6.4 Name is always "initial" (with one exception)

All `attack_type[].name` values are `"initial"` except Flashdaggers which also uses `"initial"` (but that spell is already anomalous in other ways). The `name` field appears to distinguish multiple attack/save events per spell, but no spell uses more than one entry, making this field currently redundant.

---

## 7. `damage[]` Structure Issues

### 7.1 Field `type` is an array of strings

```json
{"name": "primary", "damage": "3d8", "type": ["fire"]}
{"name": "primary", "damage": "2d6", "type": ["bludgeoning", "lightning"]}
```

The `type` field is always an array (when present), even for single damage types. This is good for Storm Sphere which deals two types. However, the Pydantic schema `damage: Optional[List[Dict[str, Any]]]` does not describe the inner dict shape, so this is technically allowed but undocumented.

### 7.2 Two entries missing the `type` field entirely

| Spell | damage entry |
|---|---|
| Absorb Elements | `{"name": "primary", "damage": "1d6"}` |
| Flashdaggers | `{"name": "initial", "damage": "5d4", "damage_type": "peircing"}` |

- **Absorb Elements** has no `type` or `damage_type` key — field is simply absent
- **Flashdaggers** uses `damage_type` (wrong key name) and the value `"peircing"` is a **spelling typo** (should be `"piercing"`)

### 7.3 Multi-entry damage spells (6 total)

These spells have both `primary` and `secondary` damage entries:
- Booming Blade (thunder/thunder)
- Enervation (necrotic primary, necrotic secondary at lower dice)
- Lightning Arrow (lightning primary, lightning secondary at lower dice)
- Melf's Acid Arrow (acid primary, acid secondary at lower dice)
- Storm Sphere (bludgeoning+lightning primary, same types secondary)
- Toll the Dead (necrotic primary 1d8, necrotic secondary 1d12)

---

## 8. Dead/Unused Fields

| Field | Non-null count | Evidence |
|---|---:|---|
| `heal_at_spell_slots` | 0 | Always `null` on all 525 rows |
| `action` | 1 | One entry: `'{"action": "Action"}'` — itself a string-encoded JSON string |
| `subclasses` | 0 | Always `null` on all 525 rows |
| `classes` | 1 | One entry: `"Wizard"` — a bare string, not an array |

All three should be removed from the schema unless there is a known future use case.

---

## 9. Naming and Casing Issues

### 9.1 `spell_name` vs `name`

Monsters use `name`. Spells use `spell_name`. The monster migration kept `name` as the canonical field. Spells should follow suit.

### 9.2 `school` capitalization outlier

524 spells have lowercase school names (`evocation`, `transmutation`, etc.). One spell — **Flashdaggers** — has `"Conjuration"` (capital C).

| School | Count |
|---|---:|
| evocation | 108 |
| transmutation | 102 |
| conjuration | 96 |
| abjuration | 55 |
| enchantment | 51 |
| necromancy | 43 |
| divination | 36 |
| illusion | 33 |
| Conjuration (capital) | 1 |

### 9.3 `icon` values

524 spells use `✨` (Unicode sparkles, `\u2728`). One spell uses `"-"`. The dash appears to be a fallback/null indicator that should be `null` per convention.

---

## 10. Other Data Quality Issues

### 10.1 `casting_time` is almost always a string — one exception

Plant Growth has `"casting_time": "['1 action', '8 hour']"` — a stringified Python list literal, not a proper JSON value.

### 10.2 `damage_at_higher_levels` vs `higher_levels` overlap

- **178** spells have `higher_levels` text (free-text description of scaling)
- **74** spells have `damage_at_higher_levels` (structured level→dice map)
- **104** spells have `higher_levels` text but **no** `damage_at_higher_levels`
- **0** spells have `damage_at_higher_levels` without `higher_levels`

These two fields represent the same concept in different formats. The `higher_levels` text is the canonical 5etools description; `damage_at_higher_levels` is a structured extraction for combat-focused spells. A decision is needed on whether to keep both or consolidate.

### 10.3 `materials` field

184 spells have material components as free text. The remaining 341 are null. These are descriptive strings like `"a red dragon's scale"` — they are not structured.

### 10.4 Level distribution

| Level | Count |
|---|---:|
| 0 (Cantrip) | 45 |
| 1 | 80 |
| 2 | 88 |
| 3 | 75 |
| 4 | 53 |
| 5 | 62 |
| 6 | 48 |
| 7 | 28 |
| 8 | 24 |
| 9 | 22 |

---

## 11. Monster vs Spell Convention Comparison

| Aspect | Monster convention | Spell seed (current) |
|---|---|---|
| Primary name field | `name` | `spell_name` |
| ID type | `int` | `int` (consistent) |
| Collections default | `[]` | `null` |
| Absent scalars | `null` | `null` (mostly) |
| Booleans | `true`/`false` | `0`/`1` (int) |
| Level/slot | `int` | `str` |
| Nested objects | Always present, null-padded | String-encoded JSON |
| Array fields | Native JSON arrays | String-encoded JSON arrays |
| Tagged prose | Stripped via M2 pipeline | Not addressed |
| Display name casing | Lowercase enforced | Inconsistent (1 outlier) |

---

## 12. Recommended Questions for Second-Pass AI

1. **Naming:** Rename `spell_name` → `name` to match monster convention?
2. **Level:** Convert `level` from `"8"` to `8` (int)? Cantrips stay 0.
3. **Booleans:** Convert `concentration`/`ritual` from `0`/`1` to `true`/`false`?
4. **Components:** Deserialize `components` from `"[\"V\"]"` to `["V"]`?
5. **Heal:** Deserialize `heal` from string to dict? How to handle the `amount` field — keep as string expressions or parse into structured `{base: int, scaling: "per_slot", ...}`?
6. **AoE:** Deserialize `area_of_effect` from string to dict? Should null sizes become a default like `"Self"` or stay `null`?
7. **Damage scaling:** Keep both `higher_levels` (text) and `damage_at_higher_levels` (structured)? Merge into one field?
8. **Attack type:** Normalize `type` from `""` to `null`? Normalize `save` from `["dex"]` to keep lowercase? Drop the `name` field (always `"initial"`)? Or keep it for future extensibility?
9. **Damage type key:** Fix Flashdaggers `damage_type` → `type` and `"peircing"` → `"piercing"`?
10. **Dead fields:** Drop `heal_at_spell_slots`, `action`, `subclasses`, `classes` from the seed? Or populate them properly?
11. **Icon:** Replace `"-"` with `null`?
12. **School:** Lowercase `"Conjuration"` → `"conjuration"`?
13. **Casting time:** Fix Plant Growth from `"['1 action', '8 hour']"` to a proper value?
14. **Range/duration format:** Keep as free text (`"60 feet"`, `"1 minute"`) or parse into structured `{value: int, unit: "feet"}`?
15. **Attack type name:** Drop `name` from attack_type (always `"initial"`)? Or keep for future multi-attack spells?
