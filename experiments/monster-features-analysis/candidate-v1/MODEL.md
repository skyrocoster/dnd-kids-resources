# Candidate database and ownership

**Historical fixed-number pilot model.** The current
[forking discussion](../FORKING-DISCUSSION.md) explores level-scaled basic
attacks; this model remains intact as a comparison, not its approved design.

**Readiness note (2026-09-28):** retain this structure for a broader trial, but do
not treat this document as proof that the validator enforces every rule below or
that all source shapes are covered. [NEXT-STEPS.md](NEXT-STEPS.md) records concrete
gaps and the next work. No schema changes were made as part of that review.

## Three tables, one catalogue

There is one `parts` catalogue, not a separate table for every kind of feature.
Its `kind` distinguishes weapons, actions, traits, modifiers, and spellcasting.
Related fields such as attack modes are small nested JSON values.

Every monster feature references a part, **even when only one monster currently
uses it**. A one-off action is still an available Frankenstein part. This pilot
therefore needs no inline-definition alternative and no shared/inline promotion
threshold. Reuse means behaviour can be attached elsewhere; it need not already
have two users.

```text
monsters.id <--- monster_features.monster_id
parts.id    <--- monster_features.part_id
parts.id    <--- monster_features.modifier_ids[]
parts.id    <--- parts.requires_parts[] / effect.choices[].part_id
```

These joins have a gameplay purpose. No source-item foreign key is necessary:
the current weapon seed supplies evidence, not inherited rules.

## `parts`

Required fields: `id` (unique string), `kind` (enum), `name` (normal display name).
At least one of `modes`, `effect`, `rules_text`, or `spellcasting` supplies behaviour.

| Optional field | Meaning |
| --- | --- |
| `modes` | Nonempty array of explicitly selectable attack uses; each mode ID is unique within its part. |
| `effect` | One of the small, defined composition operations below. Not an arbitrary rules AST. |
| `rules_text` | Canonical human-readable rules, including material restrictions and consequences not otherwise structured. |
| `usage` | Shared recharge, daily limit, rest reset, or legendary/mythic action-point cost. |
| `spellcasting` | Ability, spell groups, labels, and any meaningful footer/resource. |
| `requires_parts` | Part IDs that the same monster must possess for this part to work. |

Kind values:

- `weapon`: manufactured or natural weapon attack, including Bite, Claw, Tail,
  Talon, and Branch. This is a gameplay classification, not an inventory system.
- `action`: an ability, attack, or instruction the monster can actively use.
- `trait`: a passive or conditional rule described in text.
- `modifier`: a reusable change to an attack. May be attached locally or granted
  as a monster-wide trait.
- `spellcasting`: a reusable casting package. No separate spell database is
  invented in this pilot.

### Attack modes

Each mode has `id`, `attack_type` (`melee` or `ranged`), and `damage`.
Melee modes have `reach_ft`; ranged modes have `range_ft` and optionally
`long_range_ft`. No long-range field means this candidate grants no separate
long-range band; it is not an instruction to borrow a range from another part.

Damage has `dice` (`NdX`), `type`, and `add_monster_bonus` (boolean).
Every attack mode here rolls d20 plus the monster's attack bonus against one
target. All observed structured attacks are non-automatic and single-target;
these constants are not repeated in every record. The converter rejects newly
encountered automatic or multi-target structured attacks instead of erasing them.

Example: one Javelin owns `1d6` piercing in both modes, 5-foot melee reach, and
30/120-foot thrown range. A monster selects modes; it does not replace these values.

### Composition operations

| Operation | Defined behaviour |
| --- | --- |
| `add_base_damage_dice` | Add `count` dice of the base damage die size. Optional `part_kind` and `attack_type` restrict applicability. `activation` is `always` or a required combat state. |
| `add_damage` | Append a separate `dice`/`type` component, with zero monster flat bonus. |
| `repeat_attacks` | Make `count` attacks. `listed_attack_modes` permits repeated selection only from the part/mode choices on the recipe. `available_action_melee_attack_modes` permits selection only from this monster's action bindings' selected melee modes. It never includes unbound modes, thrown modes, breaths, Multiattack itself, or legendary/mythic actions. |
| `attack_sequence` | Use the listed ordered attack steps; each step is either a fixed part/mode repeated `count` times or one selection from its explicit choices repeated `count` times. An optional prelude references an action part that must also be separately bound to that monster. |
| `use_attack` | Use one listed `part_id`/`mode_id` choice through the monster's existing action binding, including its attached modifiers. Does not copy the attack. |

These recipe operations describe only bounded attack selections; they do not
execute turn timing or combat. A text-only modifier is an additional
on-hit rule; `knock-prone` is the example. Do not treat arbitrary prose traits as
automatically executed modifiers.

The five sampled Multiattacks use these rules: Aartuk repeats two selections from
Branch melee or Radiant Pellet ranged; Abjurer repeats Arcane Burst three times;
Adult Red Dragon uses one Bite and two Claws, with an optional Frightful Presence
prelude; Ancient Dragon Turtle uses one Bite-or-Tail selection and two Claws; and
Bugbear Chief repeats two available action melee modes. The dragon's Frightful
Presence is also retained as its separately listed action. These recipes do not
grant attack parts or modes that are absent from the monster's bindings.

Brute is a modifier placed in the monster's trait category and applies to all its
melee weapon modes, including natural weapons under this candidate's definition.
Enlarged Weapon is attached to the relevant attack binding and activates only in
the `enlarged` state. It grants neither that state nor an Enlarge action.

Modifier IDs apply at most once per attack, even if encountered through both a
trait and a local attachment. Different compatible modifiers stack. Added base
dice affect the base component only; they do not multiply additional fire dice.

### Usage

- `recharge_roll: [5, 6]`: after use, roll a d6 at the start of the monster's turn;
  recharge on a listed result. This is the candidate convention for these names.
- `uses_per_day: 3`: three uses per day. No extra dawn/reset interpretation is
  inferred from that phrase.
- `recharge_after: ["short_rest", "long_rest"]`: either rest restores use.
- `action_cost: 2`: spend two points from the legendary-action pool for a
  legendary/mythic use. Unqualified legendary/mythic actions cost one.

Timing is owned by the binding category. Mythic use also requires the monster's
mythic activation rule; the sample's Blessing of the Sea provides it. The prototype
does not enforce turn timing, rest calendars, or resource depletion.

## `monsters`

Required: `id` (original integer retained for joining to a future full monster
record), `name`, `attack_bonus`, and `damage_bonus` (signed integers).

Optional observed context: `legendary_actions_per_round`, `legendary_intro`,
`reaction_intro`. Only the non-null legendary count occurs in this sample.

One attack bonus and one damage bonus belong to the monster, rather than being
copied into each weapon. These are **not** original ability modifiers or an
attempt to infer proficiency. They are a compact combat profile chosen from
available attacks. Changing weapons keeps the monster's profile.

HP, AC, movement, saving throws, size, and other base-monster properties are out
of this feature pilot, not being removed from the eventual monster model.

## `monster_features`

| Field | Type / rule |
| --- | --- |
| `id` | Unique string; generated deterministically in this pilot. |
| `monster_id` | Foreign key to a monster. |
| `category` | `trait`, `action`, `bonus_action`, `reaction`, `legendary_action`, `mythic_action`, or `spellcasting`. |
| `position` | Zero-based ordering within that monster/category. Split features can share a position; break ties by ID. |
| `part_id` | Foreign key to the selected shared part. |
| `display_name` | Optional local label; does not define behaviour. Otherwise use `parts.name`. |
| `mode_ids` | Required nonempty selection for an attack part; forbidden on non-attack parts. |
| `modifier_ids` | Optional attack-local references to modifier parts. No numeric values allowed here. |

These are the only binding fields. There is no inline damage, range, custom rules,
generic parameter map, or override payload. Recharge suffixes can remain in a local
display name where they agree with the shared rule; they never drive execution.

## How to assemble an attack

1. Locate the monster's action binding and confirm the mode is selected.
2. Read the shared mode's base damage and reach/range.
3. Use the monster's attack bonus; add its damage bonus only if the mode says so.
4. Collect attack-local modifiers and monster-wide trait modifiers. Deduplicate
   IDs; check activation states and applicability filters.
5. Add base dice, then retain separate additional damage components and on-hit
   text. Never start with an already-Brute-adjusted source damage value.

Using Bugbear's ordinary profile (`+4` attack, `+2` damage):

- Morningstar + Brute: `2d8 + 2` piercing.
- Javelin melee + Brute: `2d6 + 2` piercing.
- Javelin thrown: `1d6 + 2` piercing; Brute does not apply.

The example resolver implements these steps. `use_attack` references are checked
for valid dependencies; a caller executes them by choosing an allowed attack and
using this same resolution path. Multiattack selection and turn execution are not
a second combat engine hidden in the converter.

## Equivalence and what gets a new part

Same underlying behaviour after chosen normalisation means one part, independent
of display name or original monster. Numeric and wording differences are not
automatically new mechanics. Existing default + existing modifier takes priority
over creating a copied variant.

Different triggers, consequences, target geometry, or independent activation rules
can justify separate parts. Fire Breath and Steam Breath remain distinct because
Steam Breath explicitly bypasses underwater fire resistance, not simply because
their source dice and cone sizes differ.

The closed converter applies the primary agent's selected attack defaults and
special mappings. External `source-name-mapping.json` records the pilot's original
labels, occurrence keys, expected source descriptions/effects, and candidate IDs.
It is test and expansion guidance, not a playable table or runtime join. A source
name alone is never enough to identify a recipe or modifier. For remaining text parts, exact equality of normalised kind,
rules, usage, spellcasting, and dependencies is its conservative deduplication
check. It rejects different bodies colliding on one ID. That is a safety check,
**not** the semantic grouping policy for the entire dataset.
