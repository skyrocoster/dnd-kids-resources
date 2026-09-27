# Weapon table as a possible action reference — analysis notes

This is a comparison aid, **not** a decision to link actions to weapons or to
change the database. It uses the local weapon and monster seeds; it does not
inspect a live database or verify game-rule correctness.

## What the current weapon data contains

The `weapons` table is declared in `backend/database/init_database.py`; the
seed loader in `backend/database/seed_database.py` inserts its nested values
(`resist`, `property`, `focus`, `spells`, `attack`, `recharge`, `light`,
`entries`, `modify_speed`, and `ability`) as JSON text. `seed_weapons.json` has
218 records, all 218 have `baseitems: 0`, and 131 have a non-null
`base_weapon` value spanning 27 labels. Thus `baseitems` does not separate the
records into a standard-weapon subset in this seed. The full field and nested
attack-entry counts are in `weapon-table-profile.json`.

Each weapon can have an `attack` **array**. Across the seed it contains 313
attack profiles; 95 weapon records have more than one. The entries currently
use `type`, `damage`, `damage_type`, `hands`, and sometimes `range`,
`attack_mod`, `damage_mod`, or `special`. In contrast, monster actions use an
`attack` object with `kind`, `attack_bonus`, ranges, target count, and a list
of damage components. These are related-looking inputs, but their field names
and shapes are not interchangeable.

## Which weapon fields may be useful to inspect

These are candidate source fields for analysis, not a recommendation about a
future table:

- **Potential identity/base candidates:** `id`, `name`, `base_weapon`,
  `weapon_category`, and `property`. The exact-name/base-name candidate lists
  help find examples but do not establish that two records represent the same
  reusable action.
- **Attack profile information:** each item in `attack`, including its `type`,
  damage formula/type, range, hands, and optional modifiers or `special`. Keep
  the complete entry available while deciding which of its parts matter.
- **Rules that may explain differences:** `entries` and `quick_rules`, plus
  attack-profile `special`. These can carry detail that is not expressed by
  the compact numeric fields.
- **Other item-specific context:** `rarity`, `req_attune`, `sentient`,
  `curse`, `resist`, `spells`, `recharge`, `light`, bonuses, and the remaining
  fields describe item properties. Whether any are relevant to a monster
  action needs case-by-case review; this pack does not discard them.

## Side-by-side cases from the sample

`weapon-action-reference-review.json` contains the complete seed weapon rows
for exact-name/base-name candidates in the curated sample, plus the unchanged
monster action occurrences that led to those candidates.

- **Javelin, weapon ID 82:** the weapon profile says `1d6` piercing, range
  30/120, and `type: "melee"`; there are no attack/damage modifiers in its
  attack entry. Aarakocra's action is `ranged_weapon`, 30/120, `1d6` + 2,
  attack bonus +4. The Icewind Kobold Zombie action is `melee_weapon` at 5 ft,
  `1d6` - 1, attack bonus +1. The Bugbear and Bugbear Chief actions are tagged
  `ranged_weapon` with `2d6` + 2/+3 structured damage, while their descriptions
  say 1d6 + 2/+3 at range and refer to melee damage too. The match in name
  identifies useful comparison cases but does not settle which values should
  come from the weapon versus the monster action.
- **Morningstar, weapon ID 111:** its profile is `1d8` piercing, one hand,
  melee, with no attack/damage modifiers. Bugbear and Bugbear Chief actions
  have `2d8` + 2/+3 and attack bonuses +4/+5. Their `Brute` trait says the
  extra damage die is already included in the attack, which is relevant
  context outside the weapon record.

## Broad exact-name evidence

Across the full monster seed, 51 action names exactly match a `weapons.name`
and account for 767 action occurrences; four of those occurrences have
`attack: null`. Twenty-seven action names also exactly match a non-null
`base_weapon` label, accounting for 664 occurrences. The exact-string groups
and strict full-action variant counts are in `weapon-table-profile.json`.
These are search counts only: a matching label does not confirm that the
monster uses that weapon record, and matching names can include descriptive
or otherwise non-weapon actions.

## Questions to keep open

1. Is an action candidate meant to reference the named weapon row, a row whose
   `base_weapon` has that label, or either pending review?
2. How should weapon `attack[].type` and nested range relate to monster
   `attack.kind` and `range_ft`/`long_range_ft`? Javelin already shows differing
   mode labels in the two sources.
3. Which values are stable weapon properties, and which are creature-specific
   attack values, including bonuses, overrides, added damage, or trait effects?
4. How should a source-description mismatch such as Bugbear's Javelin be
   retained and reviewed rather than silently resolved?
5. Which weapon-table rules and item properties are needed for actions, if
   any? This seed includes ordinary weapon records as well as named/magic-item
   records, so a matching `weapons` row is not automatically a plain base.

No answer to these questions is selected here.
