# Monster features analysis pack

This folder prepares examples and alternate *views* of the local monster seed
for analysis. It does **not** propose or implement a database model. No feature
variants are declared equivalent, no weapon links are inferred, and no seed,
schema, or database data is changed.

## Source and regeneration

- Source: `data/seeds/seed_monsters.json` in this checkout.
- Evidence is seed-backed; this pack does not inspect a live database.
- Run `python experiments/monster-features-analysis/build_analysis_pack.py` from
  the repository root to regenerate the files below.
- The curated sample contains Aarakocra (1), Aartuk Elder (4), Abjurer Wizard
  (12), Adult Red Dragon (39), Ancient Dragon Turtle (106), Bugbear (402),
  Bugbear Chief (403), and Icewind Kobold Zombie (1372). Together these show
  multiple feature categories, structured and descriptive actions, a bonus
  action, a reaction, legendary and mythic actions, multiple damage components,
  and javelin examples with differing attack modes/text.

## Files

- `seed-sample.json` — selected monsters' IDs, names, and complete `features`
  values copied from the seed. JSON formatting/key order is normalized; values
  and arrays are retained.
- `feature-occurrences.json` — an occurrence-oriented view of every list item
  inside the sample's `features` object. Each row has the original category,
  zero-based index, and unchanged feature object. The non-list values from each
  monster's feature container are carried separately as context. Empty lists
  and all original values remain visible in `seed-sample.json`.
- `sample-action-facets.json` — sample action occurrences with name/description
  fields, the attack object's non-damage fields, damage value, and the full
  original action. The projections are comparison conveniences, not a proposed
  target schema.
- `javelin-name-review.json` — all seed occurrences whose action name is
  exactly `Javelin`, grouped additionally by strict whole-action JSON equality.
  Object-key order is ignored; all values, descriptions, numbers, missing/null
  fields, and array order remain significant. These variants are not merge
  recommendations.
- `javelin-occurrences.csv` — one row per exact-name Javelin occurrence, with
  selected attack/damage fields exposed for scanning and a JSON-encoded full
  action column for source detail. Projected `null` cells may represent a
  missing or explicit-null source field; consult the full action JSON to tell
  them apart.
- `feature-shape-profile.json` — seed-wide counts of top-level feature-field
  shapes and action/attack field presence, value types, attack kinds, and damage
  component counts. It describes observed JSON shape, not semantic categories.
- `weapon-base-review.md` — side-by-side observations and open questions about
  using the current weapon data as a possible action reference.
- `weapon-action-reference-review.json` — complete weapon rows that exactly
  match action names/base-weapon labels in the curated sample, with the
  unchanged action occurrences that produced those candidate names. Name
  matches are not confirmed links.
- `weapon-table-profile.json` — seed-wide weapon fields, nested attack-profile
  shapes, and exact-name action candidate counts.
- `build_weapon_base_review.py` — regenerate the three weapon review files
  from the local weapon seed, monster seed, and curated sample.

The occurrence and comparison files are alternative analytical views of the
same source values. They are intentionally not normalized into reusable
entities, relations, or database-ready records.
