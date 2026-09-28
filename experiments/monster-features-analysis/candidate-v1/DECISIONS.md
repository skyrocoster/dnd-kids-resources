# What this pilot did, and why

Most concrete choices below remain proposals for review. The user specifically
approved the five sampled Multiattack behaviors and retaining the three evidenced
fire strengths (1d4, 2d6, and 8d8). This record stays outside the playable model.

## Review hotspots

1. **One combat profile per monster.** The pilot collapses attack-specific bonuses
   into one attack bonus and one damage bonus. Aartuk's Radiant Pellet consequently
   attacks at +6 rather than +4; its damage remains 4d4 without a flat bonus.
2. **Five source-backed Multiattack recipes.** Aartuk selects any two Branch or
   Radiant Pellet attacks; Abjurer makes three Arcane Bursts; Adult Red Dragon uses
   one Bite and two Claws with optional Frightful Presence first; Ancient Dragon
   Turtle uses Bite or Tail plus two Claws; Bugbear Chief makes two melee attacks.
   Frightful Presence also remains a separately available action. No literal
   Bite-Bite-Claw pilot recipe is introduced.
3. **Three reusable additional-fire strengths.** Dragon Army Soldier Javelin keeps
   1d4, Adult Red Dragon Bite keeps 2d6, and Zariel (MTF) Javelin keeps 8d8. Each
   is a separate reusable modifier, attached by the exact pilot occurrence and
   expected fire component. This preserves the evidence rather than choosing one
   normal fire amount or creating per-monster damage fields.
4. **Shared natural-weapon defaults.** Two very different dragons share Bite,
   Claw, and Tail. The red dragon supplies the proposed base set; turtle-specific
   base dice/reach differences are discarded, but lightning and knock-prone remain.

The structure does not depend on liking these exact values. If a choice is rejected,
change the shared default/part decision and regenerate. Do not repair it with a
monster-specific override. These examples deliberately make the simplification
visible rather than achieving apparent compatibility by hiding exceptions.

## Evidence and counting

Inputs: `../seed-sample.json` and `../javelin-name-review.json`. Read
`../weapon-action-reference-review.json` and `../weapon-base-review.md` as evidence
for normal Javelin/Morningstar behaviour, not as inheritance sources.

Count **occurrences**, not distinct JSON variants. Deduplicate the four overlapping
Javelins by `(monster_id, category, array_index)` and require exact source agreement.
The union is 90 source feature occurrences: 54 in eight complete feature profiles
and 36 additional Javelins. The local Javelin review covers all 40 exact-name
Javelins in the seed, but it is not an inventory of all weapon-like actions.

Do not treat additional damage components as competing base weapon damage.
Do not count a description's conditional alternative as a second monster vote.
Count by meaningful family and mode; relationships to modifiers are considered
before selecting the base. The raw counts below are descriptive, not proof that
every observed amount was an unmodified base.

## Shared attack defaults

| Part | Chosen normal rule | Evidence and deliberate loss |
| --- | --- | --- |
| Javelin | 1d6 piercing; melee reach 5; thrown 30/120 | Raw first-component formula: 34 occurrences of 1d6, six of 2d6. The normal weapon evidence also has 1d6. Melee 5 is evidenced by the zombie. The weapon row's mixed melee/range labelling is replaced by explicit modes. |
| Morningstar | 1d8 piercing; melee reach 5 | Weapon evidence gives 1d8. Both monster occurrences say 2d8 but explicitly have Brute. Starting at 2d8 and adding Brute would double-count it. |
| Talon | 1d4 slashing; reach 5 | Only observed example; use it as the pilot normal. |
| Branch | 2d6 bludgeoning; reach 10 | Only observed example; keep it as a distinct natural weapon, not an item-seed link. |
| Bite | 2d10 piercing; reach 10 | Two examples disagree (red 2d10/10, turtle 1d12/15). No majority. Choose the red dragon base as part of one consistent reference set, not as a statistical result. |
| Claw | 2d6 slashing; reach 5 | Same explicit reference-set decision; discard turtle 2d8/15. |
| Tail | 2d8 bludgeoning; reach 15 | Same reference-set decision; discard turtle 2d10 but retain its prone effect. |
| Radiant Pellet | 4d4 radiant; range 60; no flat bonus | Only example. Classified as a special action, not a manufactured weapon. |
| Arcane Burst | 3d10 force; range 120; add monster bonus | Only example. Classified as a special action. Do not turn the source's ranged_weapon label into a false item link. |

For ranged Javelins with an unspecified long range (Tasloi and Tasloi Sniper), use
the shared 120. No missing-range exception survives. Ordinary 2d6 Javelins (for
example Ogre, Half-Ogre, Pterafolk) become normal 1d6 without inferring a size trait.
Zariel also uses the normal physical Javelin base plus the separate 8d8 fire part.

### Selecting modes

- Recorded melee Javelin: select `melee` only.
- Recorded ranged Javelin: select `thrown` only.
- Bugbear and Bugbear Chief: select both, because the source explicitly mentions
  melee and range. Shared 5-foot reach supplies the melee default.
- Enlarged damage is a conditional modifier, not a new throwing/melee mode.
- Never infer that every Javelin user gets both modes merely because the catalogue
  offers them.

### Resolving the Bugbear contradiction

The source labels the structured Javelin ranged while assigning 2d6; its text
assigns 1d6 at range and refers to melee damage. Brute explicitly adds a die to
melee weapon hits. The candidate chooses the coherent rule: normal Javelin in
both modes, with Brute applied only in melee. No conflicting copies or review
fields are loaded into the model.

## Reusable modifications

| Part | Normal rule | Why separate / what is discarded |
| --- | --- | --- |
| Brute | Add one base weapon die to melee weapon attacks | A recurring, independently useful rule. It belongs to the monster as a trait, not to each modified weapon. |
| Enlarged Weapon | Add one base weapon die while enlarged | Seven Javelin occurrences use two equivalent phrasings of this condition. Attach the same part. Do not invent the rest of their Enlarge abilities from partial profiles. |
| Additional Fire Damage (1d4) | Add 1d4 fire | Dragon Army Soldier's Javelin. Retained as a reusable modifier at the observed strength. |
| Additional Fire Damage (2d6) | Add 2d6 fire | Adult Red Dragon's Bite. Retained as a reusable modifier at the observed strength. |
| Additional Fire Damage (8d8) | Add 8d8 fire | Zariel (MTF)'s Javelin. Retained as a reusable modifier at the observed strength; Zariel remains a Javelin-only partial profile. |
| Additional Poison Damage | Add 1d8 poison | One observed rider, Ssurran Poisoner. |
| Additional Lightning Damage | Add 2d12 lightning | One observed rider, turtle Bite. No cross-element balancing is inferred. |
| Knock Prone | On hit, creature target makes DC 24 Strength save or falls prone | Turtle Tail's consequence remains independently attachable. The DC is the one observed default, not a monster override. |

These modifiers own their numbers. Bindings select a reusable part ID; none stores
alternate fire dice, extra-die counts, or save DCs locally. The three fire strengths
are retained because the user specifically approved these observed pilot cases;
they do not authorize inventing additional tiers from unseen full-dataset evidence.

## Monster combat profiles

Choose the most frequent attack bonus among the monster's available structured
attacks; ties choose the greater bonus. Choose the most frequent first-component
damage bonus among bonus-using parts; ties choose the greater bonus. Exclude Radiant
Pellet from the damage-bonus vote because its part explicitly deals fixed dice.
Retain zero and negative values. Do not reverse-engineer ability scores.

This is a deliberate compact-stat design decision. For partial Javelin-only
profiles the only observed Javelin supplies the profile; the full-dataset pass must
recompute from all that monster's attacks. These partial profiles are not global
normal values for those monsters.

## Other features and reuse

- **Multiattack:** retain each of the five materially different sampled recipes as
  an explicit bounded part: Aartuk two Branch/Radiant Pellet selections; Abjurer
  three Arcane Bursts; Adult Red Dragon Bite plus two Claws with optional
  Frightful Presence first; Ancient Dragon Turtle Bite-or-Tail plus two Claws; and
  Bugbear Chief two available melee modes. The Chief may use the Javelin's melee
  mode but not its thrown mode. Recipes cannot select unbound actions/modes, breaths,
  themselves, or legendary-only actions. The red dragon keeps its separate
  Frightful Presence action binding as well as the optional prelude reference.
- **Legendary/mythic attack instructions:** reference existing Tail, Claw, and
  Bite bindings. Their attached extra effects are reused, not separately copied.
  Keep the target choices that distinguish these actions. Missing required attacks
  are validation errors, not silently added weapons.
- **Unusual Nature:** food/drink independence is shared. Zombie additionally
  receives independent no-air and no-sleep traits; turtle does not. Different
  physiological benefits are meaningful behaviour, not incidental numbers.
- **Legendary Resistance:** replace the actor with `this monster`, share the actual
  3/day rule, drop two empty plural headings. No useful rule is present in those
  headings to preserve.
- **Summon Air Elemental:** replace the species requirement with five creatures
  possessing the action, including the return-with-elemental permission. Retain
  the three-turn dance, concentration, range, duration, and rest restriction. This
  makes transplanting the action meaningful instead of leaving an Aarakocra-only
  requirement inside it.
- **Blessing of the Sea:** retain the 350-HP reset, Steam Breath refresh, mythic
  activation duration, and rest recharge. Remove fixed XP awards, which do not
  describe reusable combat behaviour. Require the Steam Breath part through a
  usable join. This is intentionally a specialised composite, not an attempt to
  split every clause into tiny effects.
- **Fire Breath / Steam Breath:** keep distinct complete actions. Steam's underwater
  resistance exception is useful behaviour; neither is just renamed fire damage.
- **Other text abilities:** retain the complete rule as a shared part and replace
  source-actor phrases with `this monster`. This avoids confusing the acting
  monster with a target described as `the creature`. Numbers in those rules are
  the current normal defaults; there is no per-monster configuration copy.
- **Spellcasting:** retain two distinct packages, their abilities, spell groups,
  usage labels, DCs, and the psionic no-components rule. Drop null footer/resource
  values and false visibility flags. No arbitrary spell-list override is created.

Every text-only action still exists without a weapon. The limited resolver does
not execute all that text: a retained rule is not a claim of engine support.

## Naming and omitted storage

Use a behavior-descriptive shared part name. The five source `Multiattack` labels
are aliases recorded by occurrence in `source-name-mapping.json`, not copied into
playable `display_name` fields. That external record also maps each fire rider by
source occurrence and its expected component. Extract recognised recharge/cost/daily-limit suffixes into shared `usage`. The
two split Unusual Nature profiles intentionally display the new component names
instead of three duplicate `Unusual Nature` headings.

No source blobs, original per-feature dice/bonuses, item timestamps, magic-item
records, strict-variant groups, or conflicting descriptions belong in the playable
tables. The source analysis pack remains untouched. `coverage.json` is external
accounting to verify that nothing vanished accidentally, not a required database
table or runtime join.

## Not settled by this small sample

The eight complete feature profiles cannot establish full-dataset frequencies for
Bite, breath weapons, spellcasting packages, or most traits. Nor does this pilot
settle combat balance, damage scaling by monster strength, all special attack
shapes, or every spellcasting repertoire. The later pass must inventory new cases
and follow the approval/escalation rules in the expansion instructions; it must
not extrapolate this pilot's tie decisions as a universal automatic policy.
