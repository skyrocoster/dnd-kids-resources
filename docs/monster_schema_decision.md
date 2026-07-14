# Monster Target-Schema Decision

> **Stage:** M1 - seed discovery and target schema
> **Status:** Binding proposal for human review. M2 must not start until this document is accepted.
> **Scope:** Discovery and schema decisions only; no production code or seed data is changed here.

## Decision Summary

M2 will migrate all 2,276 monsters to a typed, authorable model with these rules:

- Preserve every record and its source `id`; do not deduplicate or curate during the structural migration.
- Keep `name` as the only required author input. Collections use empty collections, not `null`; absent scalar
  or nested values use `null`, not empty strings or objects. The required aggregate `features` container is the
  exception: it is always an object whose members carry those defaults.
- Replace hostile source shapes with explicit objects: AC has a primary value plus alternatives, movement is a
  list of typed modes, saves and skills are sparse, and defenses are separated by meaning.
- Put ordinary traits and action-like entries under one `features` object using a shared `Feature` shape.
  Keep spellcasting typed because spell levels, slots, frequencies, and hidden entries cannot be represented
  faithfully as ordinary prose.
- Store clean display prose only. M2 strips known 5etools `{@tag ...}` markup with a tag-aware transform and
  fails on unknown or residual tags. Raw and derived prose will not coexist as competing sources of truth.
- Keep CR as its familiar string, add nullable numeric `cr_sort`, preserve lair/coven context in `cr_note`, and
  fold explicit XP overrides into `experience_points`.
- Drop `soundClip`: its 963 populated rows point at repository-relative MP3 files that are not present.

This contract deliberately preserves exceptional source data instead of deriving over it. In particular,
explicit HP averages and passive Perception values remain authoritative even when they disagree with standard
math.

## Audit Scope

The audit parsed the complete `data/seeds/seed_monsters.json` tree recursively, including nested rich blocks and
all strings.

- Rows: **2,276**
- Top-level fields: **30**, present on every row in the same order
- IDs: **2,276 unique integers**, range 1-2,734 with 458 gaps
- Names: **2,276 unique strings**, including case-insensitively
- Markup: **2,659 tags** in 2,156 strings across 1,416 monsters
- Exact source field order:

```text
id, name, alias, size, group, alignment, type, ac, hp, speed, stats,
save, skill, resist, vulnerable, senses, languages, action, reaction,
traits, spellcasting, bonus, legendary, legendaryHeader, mythic,
mythicHeader, reactionRules, soundClip, cr, cr_details
```

### Field Population and Shapes

"Populated" below means semantically populated. The source pads several maps with null values, so their object
being non-empty does not imply that they contain data.

| Source field | Source shape | Populated rows | Important findings |
|---|---|---:|---|
| `id` | integer | 2,276 | Unique; gaps are real and IDs must not be treated as row indexes. |
| `name` | string | 2,276 | Unique; 576 include parenthetical source/version qualifiers. |
| `alias` | string array | 10 | All populated arrays contain one alias; eight distinct aliases. |
| `size` | string array | 2,276 | 52 rows allow both Small and Medium; all others have one size. |
| `group` | string array | 140 | One item when populated; 15 families such as Chromatic Dragon and Dinosaurs. |
| `alignment` | mixed array | 2,178 | Codes, wildcard code sets, weighted choices, and free-text special values. |
| `type` | string or object | 2,276 | 1,444 strings and 832 objects; tags, swarms, sidekicks, and one category choice. |
| `ac` | numeric-key object | 2,276 | 91 have two AC states; 525 have one AC with no note. No row lacks an AC value. |
| `hp` | object | 2,276 | Every row has `average` and `formula`; 19 omit derived bounds. |
| `speed` | object | 2,276 | Conditions, hover, zero speeds, missing walk speeds, and two alternate-form maps. |
| `stats` | six-key object | 2,276 | 14 partial/template rows have one or more null scores. |
| `save` | null-padded map | 1,065 | 2,748 non-null bonuses; 1,211 rows are semantically empty. |
| `skill` | mostly null-padded map | 1,599 active skills | Passive Perception is populated on 2,243 rows and must be split out. |
| `resist` | typed object array | 1,364 | Combines resistance, damage immunity, and condition immunity in one field. |
| `vulnerable` | string/object array | 91 | 88 plain entries and six conditional entries across 94 total entries. |
| `senses` | object array | 1,655 | 1,861 entries; four sense types with optional notes. |
| `languages` | string array | 1,783 | Includes names, telepathy, comprehension rules, speech limits, and choices. |
| `action` | object array | 2,276 | 6,338 actions; 3,586 include a structured attack. |
| `reaction` | object array | 288 | 309 named blocks. |
| `traits` | object array | 1,934 | 4,735 blocks; 510 are name-only and are retained. |
| `spellcasting` | object array | 682 | 712 blocks; 30 monsters have two blocks. |
| `bonus` | object array | 321 | 380 bonus-action blocks. |
| `legendary` | array or wrapper object | 255 | 248 arrays and seven wrappers that explicitly set actions per round. |
| `legendaryHeader` | array or null | 3 | Custom prose for Beholder, Obzedat Ghost, and Orcus (MPMM). |
| `mythic` | object array | 17 | 35 mythic actions. |
| `mythicHeader` | null | 0 | Null on every row. |
| `reactionRules` | string array | 15 | Section-level rules for monsters with multiple reactions. |
| `soundClip` | `{path}` or `{}` | 963 | 672 distinct paths; no MP3 files exist in the repository. |
| `cr` | number/string/object | 2,276 | 1,790 numbers, 440 strings, 46 context/XP objects; one `Unknown`. |
| `cr_details` | object | 2 | Contains only explicit XP overrides for Sled Dog and Wild Dog. |

### Corrections to the Planning Assumptions

The broad concerns in `docs/monsters_plan.md` are valid, but the full audit corrects three details that affect the
contract:

- The 525 rows described as "AC-less" have an AC value and no annotation, for example `{"12": null}`. They
  migrate to `{"value": 12, "note": null, "alternatives": []}`. A future authored monster may use `ac: null`.
- CR is not uniformly a string. It is a number on 1,790 rows, a string on 440, and an object on 46. The target
  normalizes the base value to a string.
- The apparent 2,243-row skill population is mostly passive Perception. Active skill bonuses occur on 1,599
  rows; passive Perception becomes its own explicit field.

## Binding Source-Field Decisions

Every current field has one disposition. "Drop" means M2 removes it from the migrated seed, database, API, and
frontend types.

| # | Source field | Decision | Target and rationale |
|---:|---|---|---|
| 1 | `id` | **Keep** | `id: int`, response-only. M2 inserts seed IDs explicitly; new authored rows use SQLite autoincrement. |
| 2 | `name` | **Keep** | `name: str`, required and unique. Parenthetical qualifiers stay because no source field supports safe deduplication. |
| 3 | `alias` | **Reshape** | Rename to `aliases: list[str]`; retain useful alternate search names. |
| 4 | `size` | **Reshape** | Rename to `sizes: list[CreatureSize]`; retain the 52 valid two-size templates. |
| 5 | `group` | **Reshape** | Convert the one-item array to `family: str | None`; a family is not the same thing as a creature subtype. |
| 6 | `alignment` | **Reshape** | Convert source tokens/objects to one authorable `alignment: str | None` display value. |
| 7 | `type` | **Reshape** | Convert to `creature_type: CreatureType | None` with category, subtype tags, and optional swarm size. |
| 8 | `ac` | **Reshape** | Convert to `ArmorClass | None` with `value`, `note`, and ordered `alternatives`. |
| 9 | `hp` | **Reshape** | Convert to `HitPoints | None` with authoritative `average` and optional `formula`; drop derived min/max. |
| 10 | `speed` | **Reshape** | Convert base and alternate modes to `speed: list[MovementSpeed]`, preserving conditions and hover. |
| 11 | `stats` | **Reshape** | Rename to `abilities: AbilityScores | None`; individual scores remain nullable for 14 partial blocks. |
| 12 | `save` | **Reshape** | Rename to sparse `saving_throws`; remove every null entry. |
| 13 | `skill` | **Reshape** | Rename active bonuses to sparse, snake-case `skills`; move passive Perception to `passive_perception`. |
| 14 | `resist` | **Reshape** | Split by its nested `type` into damage resistances, damage immunities, and condition immunities. |
| 15 | `vulnerable` | **Reshape** | Rename to `damage_vulnerabilities` and normalize plain/conditional entries to one shape. |
| 16 | `senses` | **Reshape** | Keep as typed `Sense` entries with type, range, and optional note. |
| 17 | `languages` | **Reshape** | Keep as cleaned free-form strings; a stricter language enum would lose telepathy and comprehension rules. |
| 18 | `action` | **Reshape** | Move to `features.actions`; normalize prose and retain optional structured attacks. |
| 19 | `reaction` | **Reshape** | Move to `features.reactions` using the shared `Feature` shape. |
| 20 | `traits` | **Reshape** | Move to `features.traits`; retain name-only traits with `description: null`. |
| 21 | `spellcasting` | **Reshape** | Move to typed `features.spellcasting` blocks and labeled spell groups. |
| 22 | `bonus` | **Reshape** | Rename and move to `features.bonus_actions`. |
| 23 | `legendary` | **Reshape** | Move entries to `features.legendary_actions` and retain/infer actions per round. |
| 24 | `legendaryHeader` | **Reshape** | Join custom header paragraphs into `features.legendary_intro`. |
| 25 | `mythic` | **Reshape** | Move entries to `features.mythic_actions`. |
| 26 | `mythicHeader` | **Drop** | Null on all 2,276 rows; it carries no data to preserve. |
| 27 | `reactionRules` | **Reshape** | Join paragraphs into `features.reaction_intro`. |
| 28 | `soundClip` | **Drop** | Paths are unresolved and no corresponding audio assets ship with the repository. |
| 29 | `cr` | **Reshape** | Normalize to `cr`, computed `cr_sort`, optional `cr_note`, and explicit XP where present. |
| 30 | `cr_details` | **Reshape** | Fold its two `xp` values into `experience_points`, then remove the wrapper. |

## Transformation Rules

### Identity

`aliases` and `sizes` preserve source order, trim values, and remove exact duplicates. Size codes are already
lowercase full names and become the enum values `tiny`, `small`, `medium`, `large`, `huge`, and `gargantuan`.

`family` is the sole source `group` item or `null`. It remains separate from creature subtypes so queries can
distinguish `dragon` / `red`-style type data from a family such as `Chromatic Dragon`.

`creature_type` uses this normalization:

- A plain source string becomes `{"category": value, "tags": [], "swarm_size": null}`.
- Object `type` strings become `category`; string tags are retained.
- The 18 structured Drow tags normalize to `elf`; source-only prefix-display flags are dropped.
- `swarmSize` codes `T`, `S`, and `M` become full size names.
- The 15 sidekick records append `<sidekickType> sidekick` to `tags`; `sidekickHidden` is source UI metadata
  and is dropped.
- Planar Incarnate's `{choose: ["celestial", "fiend"]}` becomes category `celestial or fiend`.

`alignment` becomes display text, not another parser-oriented union. Standard two-axis codes become values such
as `lawful good`, `neutral evil`, or `chaotic neutral`; `U` becomes `unaligned`, `A` becomes `any alignment`, and
empty becomes `null`. The four distinct wildcard arrays normalize as follows:

| Source code set | Target display text |
|---|---|
| `L, NX, C, E` | `any evil alignment` |
| `L, NX, C, NY, E` | `any non-good alignment` |
| `NX, C, G, NY, E` | `any non-lawful alignment` |
| `C, G, NY, E` | `any chaotic alignment` |

Weighted choices become text such as `50% neutral good or 50% neutral evil`. A source `special` value is retained
as its cleaned text, including intentionally whimsical values such as `lawful grumpy`.

### Armor Class

All numeric-string keys become integer entries. The target keeps the simple `ac.value` / `ac.note` access path
required by existing consumers while retaining the 91 multi-state records:

```json
{
  "value": 14,
  "note": "natural armour",
  "alternatives": [
    {"value": 11, "note": "while prone"}
  ]
}
```

Primary selection is deterministic:

1. Prefer the sole entry whose note is `null` when one exists; this represents the unqualified base AC.
2. Otherwise prefer the first entry whose note contains `natural armor` or `natural armour`.
3. Otherwise preserve the first member in source-file order as primary.
4. Preserve remaining entries in source-file order as `alternatives`.

This makes Mage AC 12 with AC 15 under Mage Armour as an alternative, while Ankheg uses natural AC 14 with AC
11 while prone as an alternative. The 525 single-entry/no-note rows use `note: null`; none become `ac: null`.

### Hit Points and Abilities

`hp.average` is authoritative. All 2,276 rows have an average and formula, but 23 averages disagree with the
mathematical dice average; M2 must not silently recalculate them. Source `minimum` and `maximum` are dropped
because they are formula-derived and unused. A future authored monster may provide average only.

`abilities` retains all six keys when present. The 14 partial/template records retain `null` for unknown scores;
M2 must not invent defaults. Ability values are not used to derive or overwrite saves, skills, or passive
Perception.

### Movement

Each base or alternate movement mode becomes one `MovementSpeed` entry. Traverse base modes in `walk`, `burrow`,
`climb`, `fly`, `swim` order, then alternate modes in the same order while preserving each alternate list's source
order. Numeric values become `feet`; source `{number, condition}` values and alternate-form conditions become
`note`. `canHover` sets `hover: true` on fly entries. A zero speed is retained as a real value, and the nine
creatures with no walk speed do not receive one.

The only supported modes in this seed are `walk`, `burrow`, `climb`, `fly`, and `swim`. Euryale and Werevulture's
`alternate` maps become additional entries with their form condition in `note`.

### Saves, Skills, and Passive Perception

`saving_throws` keeps only non-null source values and uses the six lowercase ability keys. `skills` keeps only
non-null active skill bonuses and converts spaces to underscores, for example `animal handling` becomes
`animal_handling` and `sleight of hand` becomes `sleight_of_hand`.

`passive perception` moves to `passive_perception` even when no Perception proficiency is present. It is not
derived: 27 populated rows disagree with ordinary derivation and five contain a source value of zero. Zero stays
zero rather than becoming absent.

### Defenses, Senses, and Languages

The overloaded `resist` list contains 7,609 entries and is split by nested type:

- `resist` -> `damage_resistances: list[DamageModifier]`
- `damageImmune` -> `damage_immunities: list[DamageModifier]`
- `conditionImmune` -> `condition_immunities: list[str]`

Damage notes such as `from non-magical attacks` are retained. `DamageModifier.conditional` maps source
`condition: true` on resistances/immunities and source `cond: true` on vulnerabilities. This flag cannot be
inferred from note presence because 22 unflagged modifiers also have notes. The six conditional vulnerability
objects are exploded into the same shape as plain vulnerabilities. Entries with `damage_type: special` are
retained with their note rather than guessed into a normal damage type. Each target defense list preserves the
relative order of matching source entries; a multi-type vulnerability object emits values in its nested list order.

Senses retain type, integer range in feet, and note. Languages remain free-form because entries can describe
telepathy, comprehension, inability to speak, and open authoring choices rather than only language names.
The em-dash-only language values on Sled Dog and Wild Dog normalize to an empty list. Values are trimmed and exact
duplicates removed; meaningful Unicode is preserved.

### Features and Structured Attacks

Ordinary traits, actions, bonus actions, reactions, legendary actions, and mythic actions use the same shape:

```json
{
  "name": "Bite",
  "description": "If the target is a creature, ...",
  "attack": {
    "kind": "melee_weapon",
    "attack_bonus": 4,
    "automatic_hit": false,
    "range_ft": 5,
    "long_range_ft": null,
    "targets": 1,
    "damage": [
      {"formula": "2d4", "bonus": 2, "damage_types": ["piercing"]}
    ]
  }
}
```

Source `notes` and `entries` become one nullable `description`. Conversion uses this exact recursive algorithm:

1. Transform a string with the markup/text rules below.
2. Transform an ordinary array in source order and join non-empty results with two newline characters.
3. Transform a `{type: "list", items: [...]}` node by mapping items in source order and joining with one newline.
4. A string list item becomes `- <text>`.
5. An object list item uses `entry` or joins its `entries` with one space, then becomes
   `- <name>: <text>`. If the cleaned name already ends in `:`, do not append another colon. The source `type`
   and `style` presentation keys are dropped.

The corpus has 108 list nodes, all with string or named-object items supported by those rules. Name-only traits
remain present with a null description. Feature arrays preserve their source order.

Attack kinds use this exact mapping:

| Source `type` | Target `kind` |
|---|---|
| `melee` | `melee_weapon` |
| `ranged` | `ranged_weapon` |
| `melee spell` | `melee_spell` |
| `ranged spell` | `ranged_spell` |
| `melee spell or ranged spell` | `melee_or_ranged_spell` |

Numeric source `mod` becomes `attack_bonus`; the three `mod: "auto"` records become `automatic_hit: true` with
a null bonus. `range`, `max_range`, and `targets` map directly to `range_ft`, `long_range_ft`, and `targets`,
including null or unusual values.

Damage conversion is deterministic and source-ordered:

1. If `damage` exists, emit one primary `AttackDamage`; otherwise emit none.
2. If `secondary_damage` exists, append one secondary `AttackDamage`.
3. `damage_mod` applies only to primary damage. Missing primary `damage_mod` becomes bonus 0, and every secondary
   entry has bonus 0 because the source has no secondary-modifier field.
4. If a corresponding `*_damage_choice` exists, use that list as `damage_types` and discard the placeholder
   type `variable`.
5. Otherwise, a non-null damage type becomes a one-item list; missing/null becomes an empty list.
6. Compound source phrases such as `bludgeoning or slashing` remain one string and are not guessed apart.

The 3,586 structured attacks therefore produce exactly 4,362 `AttackDamage` entries: 3,567 primary and 795
secondary. The 19 attacks with no source damage use an empty target list.

M2 preserves unusual parsed attack values rather than silently correcting them. The audit found two null ranges,
three automatic-hit modifiers, five null secondary damage types, malformed formulas such as `d6`, and implausible
target counts such as 240 or 600. These are source-quality issues for later curation, not grounds for lossy schema
migration.

`legendary_actions_per_round` uses the explicit wrapper value on seven records. It defaults to 3 when legendary
actions exist in the ordinary array form and is null when there are no legendary actions. Custom header text is
retained in `legendary_intro`; reaction section rules are retained in `reaction_intro`.

### Spellcasting

Spellcasting remains typed but becomes authorable rather than preserving 5etools' maps. A block has a name,
optional casting ability, cleaned introductory/footer prose, optional resource, and ordered labeled groups. Each
spell entry retains its rare `hidden` flag, and each group retains section-level hidden state.

Source schedules map to labels as follows, where ordinal formatting uses `1st`, `2nd`, `3rd`, and `Nth`, and
`slot`/`charge` is singular only when its count is one:

| Source bucket | Target label example |
|---|---|
| `will` | `At will` |
| `daily.3` | `3/day` |
| `daily.1e` | `1/day each` |
| `spells.0` | `Cantrips (at will)` |
| `spells.3` with three slots | `3rd level (3 slots)` |
| `spells.5` with `lower: 1`, two slots | `1st-5th level (2 5th-level slots)` |
| `recharge.6` | `Recharge 6` |
| `rest.1` | `1/rest` |
| `ritual` | `Rituals` |
| `charges.2e` | `2 charges each` |

The complete label grammar is:

- `will` -> `At will`.
- `daily.<N>` -> `<N>/day`; a key ending in `e` -> `<N>/day each`.
- Spell level `0` -> `Cantrips (at will)`.
- Spell level `<N>` without `lower` -> `<ordinal N> level`, adding ` (<slots> slot[s])` when slots are present.
- Spell level `<N>` with `lower: <M>` -> `<ordinal M>-<ordinal N> level (<slots> <ordinal N>-level slot[s])`.
- `recharge.<N>` -> `Recharge <N>`; `rest.<N>` -> `<N>/rest`; `ritual` -> `Rituals`.
- `charges.<N>` -> `<N> charge[s]`; a key ending in `e` appends ` each`.

Group order is deterministic: traverse buckets in `will`, `daily`, `spells`, `recharge`, `rest`, `ritual`,
`charges` order. Preserve source key order within `daily`, `recharge`, `rest`, and `charges`; traverse numeric
spell levels ascending. A block-level `hidden` bucket name marks every group produced from that bucket hidden.
The nine `{entry, hidden: true}` spell values become hidden `SpellReference` entries; strings are not hidden.

The constant nested `type: "spellcasting"` and source-only map names are dropped after conversion. The sole
`chargesItem` value, `wand of orcus|dmg`, splits on the literal source separator and becomes block resource
`wand of orcus`; no other non-tag pipe is altered.

### Markup and Text Cleanup

M2 stores derived display text only. This is intentional: the target is user-authorable, deep-linking is deferred,
and retaining raw plus rendered prose would create two editable sources of truth. The reproducible migration
script and Git history retain provenance.

The complete tag inventory is:

| Tag | Count | Tag | Count | Tag | Count |
|---|---:|---|---:|---|---:|
| `recharge` | 607 | `skill` | 436 | `dice` | 360 |
| `hit` | 267 | `action` | 207 | `status` | 184 |
| `creature` | 183 | `quickref` | 127 | `item` | 63 |
| `h` | 55 | `atk` | 51 | `damage` | 48 |
| `sense` | 16 | `hom` | 15 | `chance` | 10 |
| `filter` | 7 | `skillCheck` | 6 | `book` | 5 |
| `disease` | 5 | `i` | 3 | `table` | 1 |
| `adventure` | 1 | `hazard` | 1 | `note` | 1 |

The canonical current-seed regex is:

```python
TAG_RE = re.compile(
    r"\{@(?P<tag>[A-Za-z][A-Za-z0-9]*)(?:\s+(?P<payload>[^{}]*))?\}"
)
```

There are no nested, malformed, or unclosed tags in the current seed. A replacement callback splits only the
captured payload on `|`; literal pipes elsewhere are not markup. Pipe meaning is tag-specific:

| Tag group | Display transform |
|---|---|
| `action`, `creature`, `disease`, `hazard`, `item`, `sense`, `skill`, `status`, `table` | Use the third segment when it is a non-empty display override; otherwise the first. |
| `adventure`, `book`, `filter` | Use the first segment. |
| `quickref` | Use the fifth segment when non-empty; otherwise the first. |
| `chance` | Use the second segment when present; otherwise `<first> percent`. |
| `dice`, `damage` | Use the first dice expression. |
| `hit` | Add `+` to a non-negative numeric payload; preserve a negative sign. |
| `recharge` | Empty means `(Recharge 6)`; `5` means `(Recharge 5-6)`, and similarly for other thresholds. |
| `atk` | Expand the payload using the exact table below. |
| `skillCheck` | Emit only the signed final modifier: `animal_handling 5` -> `+5`. All six occurrences immediately follow a separate `skill` tag that supplies the display name. |
| `h` | `Hit: `, including the trailing space because source text starts immediately after the tag. |
| `hom` | `Hit or Miss: `, including the trailing space. |
| `i`, `note` | Keep payload text without source styling. |

Exact attack-label replacements are:

| Payload | Replacement |
|---|---|
| `mw` | `Melee Weapon Attack:` |
| `rw` | `Ranged Weapon Attack:` |
| `ms` | `Melee Spell Attack:` |
| `rs` | `Ranged Spell Attack:` |
| `mw,rw` | `Melee or Ranged Weapon Attack:` |

Examples:

| Source | Stored display text |
|---|---|
| `{@creature giant spider|mm|giant spiders}` | `giant spiders` |
| `{@status concentration||concentrating}` | `concentrating` |
| `{@quickref Cover||3||half cover}` | `half cover` |
| `{@filter supernatural charm|rewards|type=charm}` | `supernatural charm` |
| `{@hit 8}` | `+8` |
| `{@recharge 5}` | `(Recharge 5-6)` |

M2 must recursively transform every retained string, not only action notes. AC and languages each contain one
tag occurrence. The replacement callback validates each known tag's payload arity against the forms in the
inventory: reference tags accept one to three segments, `quickref` three or five, `filter` three or four,
`chance` one or three, `book` and `adventure` four, `h`/`hom` zero, `recharge` zero or one, and all other tags
their observed single payload. Unknown tags, unexpected arity, any remaining `{@`, or malformed future input
fail migration with monster ID, name, and value path.

After tag replacement, M2 trims leading/trailing whitespace, converts non-breaking spaces to ordinary spaces,
collapses repeated ordinary spaces, and normalizes compact DC notation (`DC12`) to `DC 12`. It preserves
meaningful punctuation and Unicode. It does not capitalize fragments, repair punctuation heuristically, or
rewrite unusual dice formulas.

### Challenge Rating

The target keeps the familiar CR text and adds a sort key:

| Source | `cr` | `cr_sort` | `cr_note` | `experience_points` |
|---|---|---:|---|---:|
| `0` or `"0"` | `"0"` | 0.0 | null | null |
| `"1/8"` | `"1/8"` | 0.125 | null | null |
| `"1/4"` | `"1/4"` | 0.25 | null | null |
| `"1/2"` | `"1/2"` | 0.5 | null | null |
| `6` or `"6"` | `"6"` | 6.0 | null | null |
| `{"cr":"11","lair":"12"}` | `"11"` | 11.0 | `"12 in lair"` | null |
| `{"cr":"6","coven":"8"}` | `"6"` | 6.0 | `"8 in coven"` | null |
| `{"cr":"1","xp":100}` | `"1"` | 1.0 | null | 100 |
| `"Unknown"` | `"Unknown"` | null | null | null |
| missing author input | null | null | null | null |

One shared parser trims `cr`, parses integer strings and generic `numerator/denominator` fractions, and returns
null for `Unknown`, other non-numeric text, or a zero denominator. M2 uses it during migration; M3 must call the
same parser on every POST and PUT before persistence. `cr_sort` is computed and is rejected in create/update
payloads, so stored `cr` and `cr_sort` cannot drift. Any query ordered by CR uses
`ORDER BY cr_sort IS NULL, cr_sort, name`; the ordinary browser list may remain name-ordered.

`experience_points` is copied only from explicit `cr.xp` or `cr_details.xp`, including zero; ordinary CR XP is
not derived. If future migration input contains both source locations, they must agree or migration fails. During
seed migration, `cr_note` is formed only from `lair` or `coven` context and is null otherwise. CRUD accepts an
authored `cr_note` verbatim after trimming because the clean model intentionally exposes context as free text.

There is no stored kid-facing label. The UI can deterministically render `CR 1/4`, `CR 11 (12 in lair)`, or
`CR unknown`; storing another label would duplicate CR state.

## Curation and Audio Decisions

### Ship All 2,276 Rows

M2 ships all rows. The seed has unique names but substantial source/version duplication: 576 names end in a
parenthetical qualifier, including pairs such as `Alhoon (MPMM)` / `Alhoon (VGM)`. The data has no dedicated
source-book, license, age-rating, or review-status field, so no automatic subset criterion would be reliable or
defensible.

Kid-appropriate curation remains a separate product task requiring a reviewed allowlist and provenance metadata.
It must not be inferred from CR, creature type, name keywords, or prose during M2.

### Drop `soundClip`

The 963 populated objects contain repository-relative paths under `bestiary/audio/`, but no MP3 assets exist in
the repository. Keeping unresolved paths would create an API promise the application cannot fulfill. A future
audio feature should define asset ownership/licensing, stable URLs, missing-file behavior, preload policy, and an
accessible player as a new contract rather than carrying these dead paths forward.

## Final Pydantic Contract

The following is the exact M2 schema contract. Naming is snake_case in both Python and JSON. Models reject
unknown fields, and required semantic strings are stripped and must be non-empty. `MonsterCreate` accepts only
`name` as required; omitted collections and `features` receive their empty defaults. `MonsterUpdate` is a full
replacement, matching repository convention. Because `cr_sort` is absent from both input models, sending it is
rejected rather than ignored.

```python
from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


AbilityName: TypeAlias = Literal["str", "dex", "con", "int", "wis", "cha"]
CreatureSize: TypeAlias = Literal[
    "tiny", "small", "medium", "large", "huge", "gargantuan"
]
MovementMode: TypeAlias = Literal["walk", "burrow", "climb", "fly", "swim"]
AttackKind: TypeAlias = Literal[
    "melee_weapon",
    "ranged_weapon",
    "melee_spell",
    "ranged_spell",
    "melee_or_ranged_spell",
]
NonEmptyString: TypeAlias = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1)
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreatureType(StrictModel):
    category: NonEmptyString
    tags: list[str] = Field(default_factory=list)
    swarm_size: CreatureSize | None = None


class ArmorClassEntry(StrictModel):
    value: int
    note: str | None = None


class ArmorClass(ArmorClassEntry):
    alternatives: list[ArmorClassEntry] = Field(default_factory=list)


class HitPoints(StrictModel):
    average: int
    formula: str | None = None


class MovementSpeed(StrictModel):
    mode: MovementMode
    feet: int
    note: str | None = None
    hover: bool = False


class AbilityScores(StrictModel):
    str: int | None = None
    dex: int | None = None
    con: int | None = None
    int: int | None = None
    wis: int | None = None
    cha: int | None = None


class DamageModifier(StrictModel):
    damage_type: NonEmptyString
    note: str | None = None
    conditional: bool = False


class Sense(StrictModel):
    type: NonEmptyString
    range: int
    note: str | None = None


class AttackDamage(StrictModel):
    formula: NonEmptyString
    bonus: int = 0
    damage_types: list[str] = Field(default_factory=list)


class Attack(StrictModel):
    kind: AttackKind
    attack_bonus: int | None = None
    automatic_hit: bool = False
    range_ft: int | None = None
    long_range_ft: int | None = None
    targets: int | None = None
    damage: list[AttackDamage] = Field(default_factory=list)


class Feature(StrictModel):
    name: NonEmptyString
    description: str | None = None
    attack: Attack | None = None


class SpellReference(StrictModel):
    name: NonEmptyString
    hidden: bool = False


class SpellGroup(StrictModel):
    label: NonEmptyString
    spells: list[SpellReference] = Field(default_factory=list)
    hidden: bool = False


class SpellcastingBlock(StrictModel):
    name: NonEmptyString
    ability: AbilityName | None = None
    description: str | None = None
    resource: str | None = None
    groups: list[SpellGroup] = Field(default_factory=list)
    footer: str | None = None


class MonsterFeatures(StrictModel):
    traits: list[Feature] = Field(default_factory=list)
    spellcasting: list[SpellcastingBlock] = Field(default_factory=list)
    actions: list[Feature] = Field(default_factory=list)
    bonus_actions: list[Feature] = Field(default_factory=list)
    reactions: list[Feature] = Field(default_factory=list)
    reaction_intro: str | None = None
    legendary_actions: list[Feature] = Field(default_factory=list)
    legendary_intro: str | None = None
    legendary_actions_per_round: int | None = None
    mythic_actions: list[Feature] = Field(default_factory=list)


class MonsterFields(StrictModel):
    name: NonEmptyString
    aliases: list[str] = Field(default_factory=list)
    sizes: list[CreatureSize] = Field(default_factory=list)
    family: str | None = None
    alignment: str | None = None
    creature_type: CreatureType | None = None
    ac: ArmorClass | None = None
    hp: HitPoints | None = None
    speed: list[MovementSpeed] = Field(default_factory=list)
    abilities: AbilityScores | None = None
    saving_throws: dict[AbilityName, int] = Field(default_factory=dict)
    skills: dict[str, int] = Field(default_factory=dict)
    passive_perception: int | None = None
    damage_resistances: list[DamageModifier] = Field(default_factory=list)
    damage_immunities: list[DamageModifier] = Field(default_factory=list)
    damage_vulnerabilities: list[DamageModifier] = Field(default_factory=list)
    condition_immunities: list[str] = Field(default_factory=list)
    senses: list[Sense] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    features: MonsterFeatures = Field(default_factory=MonsterFeatures)
    cr: str | None = None
    cr_note: str | None = None
    experience_points: int | None = None


class MonsterCreate(MonsterFields):
    pass


class MonsterUpdate(MonsterCreate):
    pass


class Monster(MonsterFields):
    id: int
    cr_sort: float | None = None
```

## Final TypeScript Contract

The frontend mirrors response JSON exactly. Response collections are required and never null. `MonsterInput`
allows the backend-defaulted fields to be omitted and excludes response/computed fields.

```ts
export type AbilityName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type CreatureSize =
  | 'tiny'
  | 'small'
  | 'medium'
  | 'large'
  | 'huge'
  | 'gargantuan'
export type MovementMode = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim'
export type AttackKind =
  | 'melee_weapon'
  | 'ranged_weapon'
  | 'melee_spell'
  | 'ranged_spell'
  | 'melee_or_ranged_spell'

export interface CreatureType {
  category: string
  tags: string[]
  swarm_size: CreatureSize | null
}

export interface ArmorClassEntry {
  value: number
  note: string | null
}

export interface ArmorClass extends ArmorClassEntry {
  alternatives: ArmorClassEntry[]
}

export interface HitPoints {
  average: number
  formula: string | null
}

export interface MovementSpeed {
  mode: MovementMode
  feet: number
  note: string | null
  hover: boolean
}

export interface AbilityScores {
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

export interface DamageModifier {
  damage_type: string
  note: string | null
  conditional: boolean
}

export interface Sense {
  type: string
  range: number
  note: string | null
}

export interface AttackDamage {
  formula: string
  bonus: number
  damage_types: string[]
}

export interface Attack {
  kind: AttackKind
  attack_bonus: number | null
  automatic_hit: boolean
  range_ft: number | null
  long_range_ft: number | null
  targets: number | null
  damage: AttackDamage[]
}

export interface Feature {
  name: string
  description: string | null
  attack: Attack | null
}

export interface SpellReference {
  name: string
  hidden: boolean
}

export interface SpellGroup {
  label: string
  spells: SpellReference[]
  hidden: boolean
}

export interface SpellcastingBlock {
  name: string
  ability: AbilityName | null
  description: string | null
  resource: string | null
  groups: SpellGroup[]
  footer: string | null
}

export interface MonsterFeatures {
  traits: Feature[]
  spellcasting: SpellcastingBlock[]
  actions: Feature[]
  bonus_actions: Feature[]
  reactions: Feature[]
  reaction_intro: string | null
  legendary_actions: Feature[]
  legendary_intro: string | null
  legendary_actions_per_round: number | null
  mythic_actions: Feature[]
}

export interface Monster {
  id: number
  name: string
  aliases: string[]
  sizes: CreatureSize[]
  family: string | null
  alignment: string | null
  creature_type: CreatureType | null
  ac: ArmorClass | null
  hp: HitPoints | null
  speed: MovementSpeed[]
  abilities: AbilityScores | null
  saving_throws: Partial<Record<AbilityName, number>>
  skills: Record<string, number>
  passive_perception: number | null
  damage_resistances: DamageModifier[]
  damage_immunities: DamageModifier[]
  damage_vulnerabilities: DamageModifier[]
  condition_immunities: string[]
  senses: Sense[]
  languages: string[]
  features: MonsterFeatures
  cr: string | null
  cr_sort: number | null
  cr_note: string | null
  experience_points: number | null
}

export interface CreatureTypeInput {
  category: string
  tags?: string[]
  swarm_size?: CreatureSize | null
}

export interface ArmorClassEntryInput {
  value: number
  note?: string | null
}

export interface ArmorClassInput extends ArmorClassEntryInput {
  alternatives?: ArmorClassEntryInput[]
}

export interface HitPointsInput {
  average: number
  formula?: string | null
}

export interface MovementSpeedInput {
  mode: MovementMode
  feet: number
  note?: string | null
  hover?: boolean
}

export type AbilityScoresInput = Partial<AbilityScores>

export interface DamageModifierInput {
  damage_type: string
  note?: string | null
  conditional?: boolean
}

export interface SenseInput {
  type: string
  range: number
  note?: string | null
}

export interface AttackDamageInput {
  formula: string
  bonus?: number
  damage_types?: string[]
}

export interface AttackInput {
  kind: AttackKind
  attack_bonus?: number | null
  automatic_hit?: boolean
  range_ft?: number | null
  long_range_ft?: number | null
  targets?: number | null
  damage?: AttackDamageInput[]
}

export interface FeatureInput {
  name: string
  description?: string | null
  attack?: AttackInput | null
}

export interface SpellReferenceInput {
  name: string
  hidden?: boolean
}

export interface SpellGroupInput {
  label: string
  spells?: SpellReferenceInput[]
  hidden?: boolean
}

export interface SpellcastingBlockInput {
  name: string
  ability?: AbilityName | null
  description?: string | null
  resource?: string | null
  groups?: SpellGroupInput[]
  footer?: string | null
}

export interface MonsterFeaturesInput {
  traits?: FeatureInput[]
  spellcasting?: SpellcastingBlockInput[]
  actions?: FeatureInput[]
  bonus_actions?: FeatureInput[]
  reactions?: FeatureInput[]
  reaction_intro?: string | null
  legendary_actions?: FeatureInput[]
  legendary_intro?: string | null
  legendary_actions_per_round?: number | null
  mythic_actions?: FeatureInput[]
}

export interface MonsterInput {
  name: string
  aliases?: string[]
  sizes?: CreatureSize[]
  family?: string | null
  alignment?: string | null
  creature_type?: CreatureTypeInput | null
  ac?: ArmorClassInput | null
  hp?: HitPointsInput | null
  speed?: MovementSpeedInput[]
  abilities?: AbilityScoresInput | null
  saving_throws?: Partial<Record<AbilityName, number>>
  skills?: Record<string, number>
  passive_perception?: number | null
  damage_resistances?: DamageModifierInput[]
  damage_immunities?: DamageModifierInput[]
  damage_vulnerabilities?: DamageModifierInput[]
  condition_immunities?: string[]
  senses?: SenseInput[]
  languages?: string[]
  features?: MonsterFeaturesInput
  cr?: string | null
  cr_note?: string | null
  experience_points?: number | null
}
```

## Database Projection for M2

M2 should project the contract to these monster columns. JSON fields are stored as `TEXT` and parsed by the
router; nullable scalars stay native SQLite values.

| Column | SQLite type | JSON |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | No |
| `name` | `TEXT NOT NULL UNIQUE` | No |
| `aliases` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `sizes` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `family` | `TEXT` | No |
| `alignment` | `TEXT` | No |
| `creature_type` | `TEXT` | Yes |
| `ac` | `TEXT` | Yes |
| `hp` | `TEXT` | Yes |
| `speed` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `abilities` | `TEXT` | Yes |
| `saving_throws` | `TEXT NOT NULL DEFAULT '{}'` | Yes |
| `skills` | `TEXT NOT NULL DEFAULT '{}'` | Yes |
| `passive_perception` | `INTEGER` | No |
| `damage_resistances` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `damage_immunities` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `damage_vulnerabilities` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `condition_immunities` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `senses` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `languages` | `TEXT NOT NULL DEFAULT '[]'` | Yes |
| `features` | `TEXT NOT NULL DEFAULT '{}'` | Yes |
| `cr` | `TEXT` | No |
| `cr_sort` | `REAL` | No |
| `cr_note` | `TEXT` | No |
| `experience_points` | `INTEGER` | No |

Keep internal `created_at` and `updated_at` columns. Keep `idx_monsters_cr`, add `idx_monsters_cr_sort`, and insert
the seed's explicit IDs rather than allowing load order to replace them.

## Worked Transformations

The examples are intentionally abbreviated: fields not shown follow the same contract and response-default rules,
and a shown collection or prose value may contain only the members needed to demonstrate that transformation.
They are explanatory examples, not complete golden fixtures; M2 tests must build complete expected records.

### Wolf - Simple Beast

Source excerpt:

```json
{
  "id": 2600,
  "name": "Wolf",
  "size": ["medium"],
  "alignment": ["U"],
  "type": "beast",
  "ac": {"13": "natural armour"},
  "hp": {"average": 11, "formula": "2d8 + 2", "minimum": 4, "maximum": 18},
  "speed": {"walk": 40},
  "save": {"str": null, "dex": null, "con": null, "int": null, "wis": null, "cha": null},
  "skill": {"perception": 3, "stealth": 4, "passive perception": 13},
  "traits": [
    {"name": "Keen Senses"},
    {"name": "Keen Hearing and Smell", "notes": ["The wolf has advantage on Wisdom ({@skill Perception}) checks that rely on hearing or smell."]}
  ],
  "action": [{
    "name": "Bite",
    "notes": ["If the target is a creature, it must succeed on a DC11 Strength saving throw or be knocked prone."],
    "attack": {"type": "melee", "mod": 4, "range": 5, "targets": 1, "damage": "2d4", "damage_mod": 2, "damage_type": "piercing"}
  }],
  "cr": "1/4"
}
```

Target excerpt:

```json
{
  "id": 2600,
  "name": "Wolf",
  "aliases": [],
  "sizes": ["medium"],
  "family": null,
  "alignment": "unaligned",
  "creature_type": {"category": "beast", "tags": [], "swarm_size": null},
  "ac": {"value": 13, "note": "natural armour", "alternatives": []},
  "hp": {"average": 11, "formula": "2d8 + 2"},
  "speed": [{"mode": "walk", "feet": 40, "note": null, "hover": false}],
  "saving_throws": {},
  "skills": {"perception": 3, "stealth": 4},
  "passive_perception": 13,
  "features": {
    "traits": [
      {"name": "Keen Senses", "description": null, "attack": null},
      {"name": "Keen Hearing and Smell", "description": "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.", "attack": null}
    ],
    "spellcasting": [],
    "actions": [{
      "name": "Bite",
      "description": "If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
      "attack": {
        "kind": "melee_weapon",
        "attack_bonus": 4,
        "automatic_hit": false,
        "range_ft": 5,
        "long_range_ft": null,
        "targets": 1,
        "damage": [{"formula": "2d4", "bonus": 2, "damage_types": ["piercing"]}]
      }
    }],
    "bonus_actions": [],
    "reactions": [],
    "reaction_intro": null,
    "legendary_actions": [],
    "legendary_intro": null,
    "legendary_actions_per_round": null,
    "mythic_actions": []
  },
  "cr": "1/4",
  "cr_sort": 0.25,
  "cr_note": null,
  "experience_points": null
}
```

Wolf demonstrates sparse skill maps, explicit passive Perception, a name-only trait, tag cleanup, and fractional
CR sorting.

### Mage - Spellcaster and Alternate AC

Source excerpt:

```json
{
  "id": 1557,
  "name": "Mage",
  "type": {"type": "humanoid", "tags": ["any race"]},
  "ac": {"12": null, "15": "with Mage armour"},
  "save": {"str": null, "dex": null, "con": null, "int": 6, "wis": 4, "cha": null},
  "spellcasting": [{
    "name": "Spellcasting",
    "headerEntries": ["The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC14, {@hit 6} to hit with spell attacks)."],
    "spells": {
      "0": {"spells": ["Fire Bolt", "Light", "Mage Hand", "Prestidigitation"]},
      "1": {"slots": 4, "spells": ["Detect Magic", "Mage Armor", "Magic Missile", "Shield"]}
    },
    "ability": "int"
  }],
  "cr": 6
}
```

Target excerpt:

```json
{
  "id": 1557,
  "name": "Mage",
  "creature_type": {"category": "humanoid", "tags": ["any race"], "swarm_size": null},
  "ac": {
    "value": 12,
    "note": null,
    "alternatives": [{"value": 15, "note": "with Mage armour"}]
  },
  "saving_throws": {"int": 6, "wis": 4},
  "features": {
    "spellcasting": [{
      "name": "Spellcasting",
      "ability": "int",
      "description": "The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 14, +6 to hit with spell attacks).",
      "resource": null,
      "groups": [
        {
          "label": "Cantrips (at will)",
          "spells": [
            {"name": "Fire Bolt", "hidden": false},
            {"name": "Light", "hidden": false},
            {"name": "Mage Hand", "hidden": false},
            {"name": "Prestidigitation", "hidden": false}
          ],
          "hidden": false
        },
        {
          "label": "1st level (4 slots)",
          "spells": [
            {"name": "Detect Magic", "hidden": false},
            {"name": "Mage Armor", "hidden": false},
            {"name": "Magic Missile", "hidden": false},
            {"name": "Shield", "hidden": false}
          ],
          "hidden": false
        }
      ],
      "footer": null
    }]
  },
  "cr": "6",
  "cr_sort": 6.0
}
```

Mage demonstrates deterministic primary AC, alternative AC preservation, sparse saves, DC cleanup, hit-tag
expansion, and conversion of spell-level maps into authorable labeled groups.

### Adult Red Dragon - Legendary Boss

Source excerpt:

```json
{
  "id": 39,
  "name": "Adult Red Dragon",
  "group": ["Chromatic Dragon"],
  "alignment": ["C", "E"],
  "type": "dragon",
  "speed": {"walk": 40, "climb": 40, "fly": 80},
  "resist": [{"type": "damageImmune", "damage_type": "fire"}],
  "action": [{
    "name": "Fire Breath {@recharge 5}",
    "notes": ["The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC21 Dexterity saving throw, taking 18d6 fire damage on a failed save, or half as much damage on a successful one."]
  }],
  "legendary": [{"name": "Detect", "entries": ["The dragon makes a Wisdom ({@skill Perception}) check."]}],
  "cr": 17
}
```

Target excerpt:

```json
{
  "id": 39,
  "name": "Adult Red Dragon",
  "family": "Chromatic Dragon",
  "alignment": "chaotic evil",
  "creature_type": {"category": "dragon", "tags": [], "swarm_size": null},
  "speed": [
    {"mode": "walk", "feet": 40, "note": null, "hover": false},
    {"mode": "climb", "feet": 40, "note": null, "hover": false},
    {"mode": "fly", "feet": 80, "note": null, "hover": false}
  ],
  "damage_immunities": [{"damage_type": "fire", "note": null, "conditional": false}],
  "features": {
    "actions": [{
      "name": "Fire Breath (Recharge 5-6)",
      "description": "The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 18d6 fire damage on a failed save, or half as much damage on a successful one.",
      "attack": null
    }],
    "legendary_actions": [{
      "name": "Detect",
      "description": "The dragon makes a Wisdom (Perception) check.",
      "attack": null
    }],
    "legendary_intro": null,
    "legendary_actions_per_round": 3
  },
  "cr": "17",
  "cr_sort": 17.0
}
```

Adult Red Dragon demonstrates family preservation, alignment display conversion, typed movement, semantic defense
splitting, action-name markup, cleaned prose, and inferred standard legendary-action count.

## Known Source Risks Carried Forward

The migration is structural, not a manual rewrite of 2,276 stat blocks. M2 must preserve and document these known
source-quality risks:

- 23 HP averages differ from their formulas; explicit averages win.
- 14 records have partial ability scores; nulls remain.
- 27 populated passive Perception values differ from ordinary derivation; explicit values win.
- 510 traits are name-only. They remain because some are meaningful shorthand, although some may be parser
  artifacts.
- Structured attacks contain a small number of malformed formulas, null types/ranges, and implausible target
  counts. M2 does not guess corrections.
- Many action note strings are lowercase continuation fragments intended to follow structured attack output.
  M2 preserves them rather than applying unsafe capitalization or punctuation repair.
- Source/version duplicates remain because source provenance is encoded only in names.

## M2 Acceptance Checklist

M2 is conformant only if all of the following hold:

- The migrated seed still has 2,276 rows and 2,276 unique IDs/names.
- Every one of the 30 source fields is handled exactly as decided above; no legacy field survives accidentally.
- All 2,659 known tags are transformed and no `{@` remains in retained data.
- The 91 multi-AC monsters retain every AC state; the 525 no-note AC rows retain their values.
- Null-padded saves/skills are sparse and passive Perception is separate.
- Defense totals are 2,406 resistances, 1,583 damage immunities, 3,620 condition immunities, and 94
  vulnerabilities; exactly 1,398 damage modifiers are conditional.
- Structured attacks retain 3,586 attack objects and produce exactly 4,362 ordered damage entries.
- All feature categories, 712 spellcasting blocks, 19 hidden schedule declarations, nine hidden spell entries,
  and custom section intros retain their source content.
- CR values, context notes, all five explicit XP values (including zero), and numeric sorting match this contract;
  later CRUD recomputes `cr_sort` through the same parser.
- The database inserts source IDs, exposes the exact Pydantic/TypeScript fields, and indexes `cr_sort`.
- Migration tests include Wolf, Mage, Adult Red Dragon, a multi-form speed, a conditional defense, a CR context
  object, and an unknown CR.
