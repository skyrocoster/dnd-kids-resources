# Spell Target-Schema Decision

> **Status:** Historical decision, accepted and implemented. Current contracts live in `API_REFERENCE.md`,
> `DATA_MODEL.md`, and `backend/app/schemas.py`.
> **Scope:** Historical schema rationale; it does not define current behavior.

## Decision Summary

The spell catalog will use one 18-field, descriptive record. It preserves source facts but does not attempt to
be a combat rules engine.

- Preserve all 525 records and their integer IDs. IDs remain stable because player-spell junction rows refer to
  them.
- Rename ingestion-oriented fields to domain names and replace string-encoded JSON and integer booleans with
  native JSON values.
- Use `[]` for absent collections, `null` for absent scalars, and always-present null-padded objects for
  `healing`, `area_of_effect`, and `higher_levels`.
- Keep damage formulas, healing amounts, range, duration, materials, and higher-level rules as source text.
  They are expressions or prose, not safe arithmetic inputs.
- Preserve multiple damage and attack-resolution entries in source order. The current corpus has up to two
  damage entries and one attack entry, but the contract does not encode those observed maxima.
- Retain both higher-level prose and the extracted slot-to-damage map inside one `higher_levels` object. Neither
  is derived from the other.
- Drop fields that are empty, isolated parser debris, or unsupported availability data. In particular, the one
  `classes` value is not enough to claim class availability for the other 524 spells.
- Apply only enumerated repairs. Unexpected types, keys, enum values, or embedded JSON fail migration with spell
  ID, spell name, and field path rather than being guessed into the target.

The canonical record is:

```text
Spell {
  id: int
  name: str
  level: int
  school: str | null
  description: str
  alternate_description: str | null
  damage: list[Damage]
  healing: Healing
  range: str
  higher_levels: HigherLevels
  casting_times: list[str]
  duration: str
  concentration: bool
  ritual: bool
  components: list[str]
  materials: str | null
  attacks: list[Attack]
  area_of_effect: AreaOfEffect
}
```

## Audit Scope

The decision was checked against the complete `data/seeds/seed_spells.json` corpus, including every embedded
JSON value and every nested damage, healing, attack, and area member.

- Rows: **525**
- Top-level fields: **24**, present in a consistent source shape
- IDs: **525 unique integers**
- Names: **525 unique strings**
- Levels: strings representing every integer from 0 through 9
- Damage: 97 populated rows; 91 have one entry and six have two
- Healing: 29 populated rows using one consistent three-key object after deserialization
- Attack metadata: 249 populated rows, all with one entry
- Area metadata: one null value, 182 encoded empty objects, and 342 encoded one-key objects
- Sized areas: only 16 of the 342 shape-bearing objects have an integer size; 326 have a null size
- Higher-level prose: 178 populated rows
- Higher-level damage maps: 74 populated rows, all also having higher-level prose

The exact source field order is:

```text
id, spell_name, icon, level, school, spell_text, spell_alt_text, damage,
heal, heal_at_spell_slots, range, higher_levels, damage_at_higher_levels,
casting_time, duration, concentration, ritual, components, materials,
attack_type, action, area_of_effect, classes, subclasses
```

This corrects the earlier analysis count of 25 top-level fields. The file contains 24. It also sharpens the AoE
finding: 95.3% of shape-bearing entries have no numeric size, so `size` must remain nullable and must not be
derived from prose.

### Observed Nested Shapes

`damage` contains 103 entries. Names are `primary` (96), `secondary` (6), and `initial` (1). Two entries do not
use the normal `type` key: Absorb Elements omits it and Flashdaggers uses singular `damage_type` with a misspelled
value. Six spells demonstrate that a list, rather than a single damage object, is required.

Every populated `heal` value decodes to exactly `amount`, `temp_hp`, and `max_hp`. Amounts include dice and
ability expressions as well as semantic values such as `all`, `full`, `maximum`, `1/2 x damage`, `2 x damage`,
and `up to 700`. A numeric schema would corrupt these meanings.

All 249 attack entries use the source name `initial`, so that member carries no information and is dropped.
Kinds are `melee`, `ranged`, empty string, or absent. Saving throws are normally lowercase string arrays;
Flashdaggers alone uses the bare uppercase string `DEX`.

The observed area labels are `circle`, `cone`, `cube`, `cylinder`, `hemisphere`, `line`, `multiple targets`,
`single target`, `sphere`, `square`, and `wall`. Because two labels describe targeting rather than geometry,
`shape` is intentionally an open lowercase string rather than an enum.

## Binding Source-Field Decisions

Every legacy field has exactly one disposition. A dropped field does not appear in the canonical seed, database,
API, or frontend mirror after their respective cutovers.

| # | Source field | Decision | Target | Rationale |
|---:|---|---|---|---|
| 1 | `id` | **Keep** | `id: int` | Preserve stable identities used by player-spell relationships. |
| 2 | `spell_name` | **Reshape** | `name: str` | Use the repository's conventional entity name. |
| 3 | `icon` | **Drop** | - | It is presentation metadata: 524 rows contain the same glyph and the remaining row contains `"-"`. |
| 4 | `level` | **Reshape** | `level: int` | Convert decimal strings; cantrips are level 0. |
| 5 | `school` | **Reshape** | `school: str \| null` | Lowercase values and allow absence for future authored records. |
| 6 | `spell_text` | **Reshape** | `description: str` | Replace ingestion naming; preserve prose verbatim. |
| 7 | `spell_alt_text` | **Reshape** | `alternate_description: str \| null` | Replace ingestion naming; preserve populated source text verbatim. |
| 8 | `damage` | **Reshape** | `damage: list[Damage]` | Give the nested members explicit names and use an empty list when absent. |
| 9 | `heal` | **Reshape** | `healing: Healing` | Decode embedded JSON into an always-present typed object. |
| 10 | `heal_at_spell_slots` | **Drop** | - | Null on all 525 rows and therefore carries no source fact. |
| 11 | `range` | **Keep** | `range: str` | Values such as Self, Touch, Sight, and distances are author-facing prose. |
| 12 | `higher_levels` | **Reshape** | `higher_levels.text` | Retain authoritative scaling prose in the shared nested object. |
| 13 | `damage_at_higher_levels` | **Reshape** | `higher_levels.damage_by_slot` | Decode the extracted map without treating it as a replacement for prose. |
| 14 | `casting_time` | **Reshape** | `casting_times: list[str]` | Preserve Plant Growth's two legitimate alternatives without a scalar union. |
| 15 | `duration` | **Keep** | `duration: str` | Descriptive values are not safely reducible to a number and unit. |
| 16 | `concentration` | **Reshape** | `concentration: bool` | Convert only source integers 0 and 1 to native booleans. |
| 17 | `ritual` | **Reshape** | `ritual: bool` | Convert only source integers 0 and 1 to native booleans. |
| 18 | `components` | **Reshape** | `components: list[str]` | Decode the embedded array and repair Flashdaggers' comma-separated value. |
| 19 | `materials` | **Keep** | `materials: str \| null` | Material requirements are meaningful free text. |
| 20 | `attack_type` | **Reshape** | `attacks: list[Attack]` | Normalize attack kind and saving throws; preserve ordered entries. |
| 21 | `action` | **Drop** | - | Null on 524 rows; the sole value is an isolated parser JSON string, not catalog data. |
| 22 | `area_of_effect` | **Reshape** | `area_of_effect: AreaOfEffect` | Decode the one-key map into stable named members; absence uses null members. |
| 23 | `classes` | **Drop** | - | One bare `Wizard` value cannot represent availability for the catalog. |
| 24 | `subclasses` | **Drop** | - | Null on all 525 rows. |

## Target Types and Defaults

The nested contracts are exact:

```text
Damage {
  name: str
  formula: str
  damage_types: list[str]
}

Healing {
  amount: str | null
  temp_hp: bool
  max_hp: bool
}

HigherLevels {
  text: str | null
  damage_by_slot: dict[str, str]
}

Attack {
  kind: "melee" | "ranged" | null
  saving_throws: list[str]
}

AreaOfEffect {
  shape: str | null
  size: int | null
}
```

The canonical JSON always contains all 18 top-level keys. `damage`, `casting_times`, `components`, and `attacks`
are arrays and never null. `healing`, `higher_levels`, and `area_of_effect` are objects and never null. Their
empty values are:

```json
{
  "damage": [],
  "healing": {"amount": null, "temp_hp": false, "max_hp": false},
  "higher_levels": {"text": null, "damage_by_slot": {}},
  "casting_times": [],
  "components": [],
  "attacks": [],
  "area_of_effect": {"shape": null, "size": null}
}
```

Migrated source records always have at least one casting time and at least one component. Empty arrays remain
valid input defaults for future authoring and stable response serialization.

Validation at the eventual API boundary is strict:

- `id` is a positive integer on responses and absent from create inputs.
- `name` and `description` are non-empty strings. `range` and `duration` remain required strings.
- `level` is an integer from 0 through 9. Boolean values do not pass as integers.
- `school`, when present, is a trimmed lowercase string. It is open rather than enumerated so homebrew schools
  do not require a schema release.
- Components are trimmed uppercase strings. The migrated corpus uses only `V`, `S`, and `M`; the storage shape
  remains `list[str]` rather than embedding a rules-edition enum.
- Damage formulas and healing amounts are non-empty strings when present but receive no dice validation.
- Damage types and saving throws are trimmed lowercase strings. The migration validates observed saving throws
  against `str`, `dex`, `con`, `int`, `wis`, and `cha` but the JSON shape remains `list[str]`.
- `Attack.kind` accepts only `melee`, `ranged`, or null.
- AoE size is an integer or null. Zero and negative values are rejected by authored API input; the source has
  only positive sizes. No size is inferred from description text.
- Higher-level map keys stay strings because JSON object keys are strings and the source is an extracted display
  map. Migration accepts only decimal slot keys 0 through 9 and non-empty string values.

## Transformation Rules

### Record and Scalar Handling

Process records in source order and emit target keys in the order shown in the canonical record. Preserve IDs,
names, descriptions, alternate descriptions, range, duration, and materials without prose cleanup. S2 is a
structural migration, not copyediting.

Convert `level` only when it is a base-10 string representing 0 through 9. Lowercase and trim `school`. Discard
`icon` without inspecting its value. Convert `concentration` and `ritual` only from integer 0/1 to false/true;
do not rely on general truthiness.

Required source keys, wrong types, empty required strings, invalid integer strings, and values outside the
enumerated source shapes are migration errors. Each error includes the spell ID, source name, and failing path.

### Components

For a value beginning with `[`, decode it with `json.loads` and require a list of strings. Flashdaggers' exact
legacy value `V, S` is the only allowed comma-separated exception; split it on commas. Trim and uppercase each
member, preserve source order, and reject empty or duplicate members rather than silently deleting them.

### Healing

For non-null `heal`, decode JSON and require exactly `amount`, `temp_hp`, and `max_hp`. Preserve `amount` as a
string and require native booleans for the two flags. A null source becomes:

```json
{"amount": null, "temp_hp": false, "max_hp": false}
```

Do not interpret `a`, `maximum`, `all`, `full`, multipliers, fractions, or dice expressions.

### Damage

A null source becomes `[]`. For each entry, preserve `name`, rename `damage` to `formula`, and rename `type` to
`damage_types`. Require the ordinary source type to be a list of strings and normalize values to trimmed
lowercase strings while preserving order.

There are exactly two key-shape exceptions:

1. Absorb Elements has no type key and becomes `damage_types: []` because its damage inherits the triggering
   type.
2. Flashdaggers uses `damage_type: "peircing"`; map that exact value to `["piercing"]`.

No other absent, singular, or unknown damage-type shape is accepted implicitly.

### Attack Metadata

A null source becomes `[]`. For each entry, discard the invariant source `name == "initial"`, rename `type` to
`kind`, and rename `save` to `saving_throws`. Empty or absent type becomes null. Non-empty kind must be `melee` or
`ranged`.

Ordinary saves must be a list of strings and become lowercase. Flashdaggers' exact bare `DEX` value becomes
`["dex"]`. Missing saves become `[]`. Preserve multiple saves and entry order. Do not infer whether saves are
alternatives, sequential saves, or attached to a particular prose clause.

### Casting Times

Ordinary strings become one-item arrays. Plant Growth's exact Python-list literal is decoded safely with
`ast.literal_eval`, validated as a string list, and its `8 hour` typo becomes `8 hours`. No other Python literal
shape is accepted. Casting-time prose is otherwise retained; values such as `1 bonus` are not silently rewritten
to rules terminology.

### Higher Levels

Create the object on every row. Copy nullable `higher_levels` prose to `text`. Decode non-null
`damage_at_higher_levels` as an insertion-ordered JSON object of string keys and string formulas; null becomes
an empty object. Do not generate a map from prose or regenerate prose from a map.

### Area of Effect

Null and encoded `{}` both become `{"shape": null, "size": null}`. A non-empty decoded object must contain
exactly one member. Lowercase and trim its key into `shape`; retain its integer or null value as `size`.

Labels such as `single target` and `multiple targets` are preserved even though they are not geometry. The field
records source classification, not a promise that the application can calculate affected squares.

## Edge-Case Decisions

### Plant Growth (ID 348)

Plant Growth has two legitimate casting modes encoded as a Python list literal and an empty area object. It
migrates to:

```json
{
  "casting_times": ["1 action", "8 hours"],
  "area_of_effect": {"shape": null, "size": null}
}
```

Both times are preserved. Selecting a preferred or shortest time would lose rules text.

### Absorb Elements (ID 2)

Its damage type is intentionally determined by the triggering damage, so missing source type is not repaired to
a guessed element:

```json
{"name": "primary", "formula": "1d6", "damage_types": []}
```

An empty list means unspecified or variable, not typeless damage.

### Flashdaggers (ID 525)

Flashdaggers is the only row carrying six independent source anomalies. The accepted repairs are exact and do
not establish broad fuzzy-cleanup rules:

```json
{
  "name": "Flashdaggers",
  "school": "conjuration",
  "components": ["V", "S"],
  "damage": [
    {"name": "initial", "formula": "5d4", "damage_types": ["piercing"]}
  ],
  "attacks": [
    {"kind": null, "saving_throws": ["dex"]}
  ]
}
```

Its absent healing still produces the standard always-present empty object.

### Null-Size Areas

Of 342 records with a shape label, 326 have no numeric size. The migration preserves those nulls. It does not
extract numbers from spell descriptions because areas may have radii, lengths, widths, changing sizes, multiple
dimensions, or context-dependent targets that cannot fit one integer accurately.

### Alternate Description Payloads

Some populated `spell_alt_text` values contain serialized rich-text fragments. They remain opaque prose in
`alternate_description`; decoding and rendering those fragments would introduce a second content migration not
supported by the current analysis. S2 must not partially parse them.

## Rejected Alternatives

### Keep the Legacy Shape and Coerce at Read Time

Rejected because it leaves the canonical authoring source invalid, duplicates parsing across SQLite/API clients,
and preserves two competing contracts. The seed itself must contain native JSON after S3.

### Parse Rules Text into Executable Mechanics

Rejected because the source contains semantic healing terms, variable damage types, prose-only scaling, and
complex ranges/areas. A partial parser would look authoritative while discarding exceptions. This migration is
descriptive.

### Replace Higher-Level Prose with the Damage Map

Rejected because 104 spells have prose without a map, and maps represent only extracted damage scaling. Even
where both exist, prose can contain constraints or effects not represented by dice values. Nesting both under
`higher_levels` states their relationship without claiming equivalence.

### Keep Higher-Level Fields as Separate Top-Level Values

Rejected because they describe one author-facing concept and would force consumers to discover that relationship.
The nested object provides one stable access path while retaining both facts.

### Use a Numeric Healing or Damage Model

Rejected because formulas are expressions and healing includes non-numeric meanings. Parsing `a`, fractions,
multipliers, maxima, and variable dice would require rules semantics outside this feature.

### Make Area Shape an Enum or Infer Missing Sizes

Rejected because the observed labels mix geometry and target scope, and 95.3% of shape-bearing rows lack a size.
An enum would encode accidental source limits; prose extraction would create unreliable geometry.

### Retain Classes and Subclasses

Rejected because 524 class values and all subclass values are absent. Keeping mostly empty fields would imply
catalog completeness that does not exist. Availability requires a reliable source and a separate ingestion plan.

### Retain Per-Spell Icons

Rejected because 524 rows repeat the same glyph and the sole exception is a missing-value marker. This is a
global presentation choice, not spell content. A future design can render a universal spell glyph without
duplicating it in every record; genuinely distinct authored artwork would need its own asset contract.

### Collapse Damage or Attack Metadata to One Object

Rejected because six spells already contain two damage events and the source model permits ordered attack
entries. Collections avoid a future breaking change and preserve source distinctions without interpretation.

### Preserve `action` for Future Use

Rejected because its sole populated value is isolated parser output with no catalog-wide semantics. Future action
economy should be designed from reliable casting-time and rules sources, not this artifact.

## S2 Acceptance Contract

S2's deterministic migration is conformant only if all of the following hold:

- Output contains exactly 525 rows with 525 unique IDs and names in source order.
- Every output row has exactly the 18 target keys and no dropped or renamed legacy key, including `icon`.
- All levels are real integers from 0 through 9; concentration and ritual are real booleans.
- Collections and always-present objects use the defaults defined here and never null.
- All embedded source JSON has become native JSON; no components, healing, higher-level map, or area object remains
  string-encoded.
- Damage produces 103 ordered entries across 97 spells; six spells retain two entries.
- Attacks produce 249 ordered entries; kinds are only melee, ranged, or null and saves are lowercase lists.
- Higher-level maps occur on 74 records and never exist without their accompanying source prose.
- Plant Growth, Absorb Elements, and Flashdaggers match the worked decisions exactly.
- The migration reports contextual errors for malformed JSON and any unrecognized source shape instead of
  coercing it.
- Repeated migration of identical input produces byte-stable JSON output.

Database columns, Pydantic models, TypeScript interfaces, and UI behavior are deliberately deferred to Phases B
and F. Those phases must mirror this contract exactly and must not introduce legacy aliases.
