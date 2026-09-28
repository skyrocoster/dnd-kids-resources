# Full-seed feature evidence inventory (read-only trial, 2026-09-28)

This is an inventory, **not** a converted monster dataset or a chosen catalogue.
The agreement in [the parent document](../2026-09-27-monster-features-remodel.md)
and the readiness gate in [NEXT-STEPS](../candidate-v1/NEXT-STEPS.md) still govern.
Candidate v1's 50 parts, 44 profiles and 90 bindings remain the untouched comparison
baseline. In particular, the dragon-derived Bite/Claw/Tail numbers and modal
monster-bonus policy are **not approved** as dataset-wide defaults. The five
sampled Multiattacks and three sampled fire strengths retain their specific
pilot approvals; this inventory does not extend them.

## Boundary and method

- A read-only scout inspected `data/seeds/seed_monsters.json`: **10,263,048 bytes**,
  SHA-256 **`325263bbb6531afd67ff141473a2931d37305e0a5b7d26d6c25f5cadaf2b0753`**.
  This is the input snapshot for these findings, not a source field in playable
  tables. All references below are `(monster_id, feature category, zero-based index)`.
- `scan_seed.py` under this sibling folder is a **read-only inventory scanner**.
  Scouts ran its `summary`, `families`, `spellcasting`, `cases`, and `modifiers`
  sections against the seed, with finite timeouts. It enumerates every monster's
  feature lists and reports aggregate shapes, exact-name search aids, coherent
  first-component numeric profiles and selected source records. It writes no
  JSON tables and makes no default selections. Source inspection outside this
  analysis directory was performed by scouts, not by the primary agent.
- The counts below are occurrence counts, not unique JSON variants or part counts.
  A first-component profile groups the *observed tuple* `(attack kind, range/reach,
  long range, first formula, first damage type list)`, without independently
  combining popular fields. It deliberately excludes attack/flat monster bonuses,
  second components and prose. Therefore a name/profile bucket is a **candidate
  for investigation**, not a confirmed behavioral family or unmodified base.
  Description keyword hits are only search hints, not semantic counts.

## Full input coverage and shapes

There are **2,276** monsters and **13,245** list occurrences. Every monster has
the same seven list categories and three non-list feature-context fields; scouts
found no additional feature categories or fields in this snapshot.

| Category | Occurrences | Useful name searches (exact names, not shared rules) |
| --- | ---: | --- |
| actions | 6,338 | Multiattack 1,432; Bite 637; Claw 280; Claws 147 |
| traits | 4,735 | Magic Resistance 420; Legendary Resistances 270; Legendary Resistance (3/Day) 203; Unusual Nature 151 |
| spellcasting | 712 | Spellcasting 386; Innate Spellcasting 171; Spellcasting (Psionics) 68 |
| legendary_actions | 736 | Attack 47; Wing Attack (Costs 2 Actions) 34; Tail Attack 29 |
| bonus_actions | 380 | Change Shape 38; Psychic Step 15; Nimble Escape 9 |
| reactions | 309 | Parry 32; Uncanny Dodge 13; Unyielding 5 |
| mythic_actions | 35 | Bite 11; Chromatic Flare (Costs 2 Actions) 5 |

`legendary_actions_per_round` is non-null for 255 monsters; `legendary_intro`
for 3 and `reaction_intro` for 15. These are context, not list occurrences.
Actions have 3,586 structured `attack` objects and 2,752 `attack: null` entries;
one legendary action also has a structured attack (Dispater 664,
`legendary_actions[1]`, Flesh to Iron). All other categories' non-spellcasting
entries have `attack: null`. Non-spellcasting entries have `name`, `description`,
`attack`; spellcasting entries have `name`, `ability`, `description`, `resource`,
`groups`, `footer`. The script found 3,587 structured attacks in all categories:
2,872 melee-weapon, 699 ranged-weapon, 10 ranged-spell, 3 melee-spell, and
3 melee-or-ranged-spell. Their damage lists have 0 components in **19** cases,
1 in **2,773**, and 2 in **795**, for **4,363** components total.

Of those components, **50** have integer-only formulas, **17** have an embedded
` + N` in the formula, **one** is bare `d6`, and 4,295 have other dice formulas.
Damage type arrays are empty for **18** components and contain two types in **2**;
the remainder contain one type. Three attacks are automatic hits with null attack
bonuses (Kolyarut 1469 and Marut 1578/1579), and some attacks have multiple targets
or unusual/absent range values. These are source shapes, not permission to coerce
them into the pilot's `NdX`, single-target, damage-required modes.

The proposed compact combat profile needs particular review: **30** monsters have
no structured attack; **33** have no usable non-null structured attack bonus
(including the three with automatic attacks); **207** have two or three distinct
non-null attack bonuses; **257** have two or three distinct non-null first-component
damage bonuses. The latter count is per monster, not per action. Aartuk Elder (4)
has structured attacks with +4 and +6; the pilot's single bonus changes one
attack. Lack of usable evidence must not silently become +0. Other mixtures
include spell and weapon attacks, not just repeated names.

## Start detailed family review: Bite, Claw, Tail

Exact-name scope is essential: across *all* categories, Bite occurs **652**
times (**634** structured actions, 18 text-only), Claw **307** (279 structured,
28 text-only), and Tail **129** (115 structured, 14 text-only). The text-only
entries include legendary/mythic instructions to use an action. `Claws`,
`Tail Attack`, and names containing `Bite` are additional searches, not members
automatically added to these denominators.

| Exact name, structured actions | Observed coherent first-component profiles, before effects/modifier reconciliation | Extra components |
| --- | --- | ---: |
| Bite: 634 occurrences, 94 profiles | melee 5 ft, 1d6 piercing **74**; 5 ft, 1d4 **67**; 5 ft, 1d8 **60**; 10 ft, 2d10 **42**; 15 ft, 2d10 **35**; 5 ft, fixed `1` **27** | 212 |
| Claw: 279 occurrences, 60 profiles | melee 5 ft, 2d6 slashing **50**; 5 ft, 1d6 **39**; 5 ft, 1d8 **26**; 10 ft, 2d8 **22**; 10 ft, 2d6 **21** | 38 |
| Tail: 115 occurrences, 50 profiles | melee 20 ft, 2d8 bludgeoning **15**; 15 ft, 2d8 **11**; 5 ft, 1d6 **7**; 10 ft, 2d6 **6**; 20 ft, 2d10 **6** | 10 |

These profiles count the first component only; the second component is not a
competing base vote. They still mix genuinely different consequences and
potentially included modifiers. Neither the largest Bite tuple (74/634) nor
the current red-dragon reference set is a dataset-wide statistical normal.
For comparison, Javelin has 40 structured occurrences and four such profiles:
31 ranged 30/120, 1d6 piercing; six ranged 30/120, 2d6; two ranged 30 with
unspecified long range, 1d6; and one melee 5 ft, 1d6. These are structured
fields, not all available modes (Bugbear's prose also specifies melee).

Mechanically relevant contrasts with **exact source references**:

- `(237, actions, 0)` Awakened Rat Bite deals fixed `1` piercing, attack +0,
  5-ft reach. `(39, actions, 1)` Adult Red Dragon Bite has 2d10+8 piercing
  **and** 2d6 fire; `(106, actions, 1)` Ancient Dragon Turtle Bite has
  1d12+9 piercing **and** 2d12 lightning. Numeric scale, added element, and
  first-component formula must be compared separately.
- `(39, actions, 2/3)` red dragon Claw 2d6+8 at 5 ft and Tail 2d8+8 at 15 ft;
  `(106, actions, 2/3)` turtle Claw 2d8+9 at 15 ft and Tail 2d10+9 at 15 ft.
  Turtle Tail also imposes a DC 24 Strength save or prone. These two dragons
  cannot establish the shared natural-weapon defaults for hundreds of users.
- `(52, actions, 1)` Aerosaur Bite grapples Huge-or-smaller targets and cannot
  Bite another target while holding one. `(92, actions, 1)` Amphisbaena Bite
  has a DC 11 Constitution poison consequence; `(83, actions, 2)` Amethyst
  Greatwyrm Claw grapples/restrains. `(30, actions, 3)` Adult Deep Dragon Tail
  can knock prone after a DC 17 Strength save. These are more than dice changes.
- `(106, mythic_actions, 0)` text-only Bite references its existing Bite;
  `(106, traits, 3)` Blessing of the Sea activates mythic actions for one hour,
  resets HP and recharges Steam Breath. An action reference and activation
  dependency cannot be inferred from the name alone. Scouts found explicit
  activation traits on **all 17** monsters with mythic actions, though the
  dependency is carried by prose rather than a source foreign key.

## Other behavioral candidates and missing pilot shapes

- **Names and modes.** Exact-name structured Longsword has **75** occurrences
  and 10 coherent first-component profiles; there is also one text-only action
  with that name. `(2622, actions, 2)` Xenk Yendar makes a structured Longsword
  attack with a radiant component and a two-handed alternative in prose; its
  `(2622, actions, 5)` Longsword instead launches its blade at a visible target
  for a DC 16 Dexterity save, piercing damage, and prone. Do **not** count these
  as two structured Longsword votes or collapse their behavior. Likewise the
  1,432 exact-name Multiattacks are all text-only recipes, not 1,432 identical
  actions. `(170, actions, 0)` Archdruid (MPMM) makes three Staff or Wildfire
  attacks and can replace one with Spellcasting; referenced actions and casting
  must remain available. Other attack-null actions include breaths, teleport,
  swallow, defenses and transformations; none should vanish for lacking an
  attack object.
- **Nondamaging/automatic/choice attacks.** `(864, actions, 3)` Ettercap Web
  is a ranged +4 attack at 30/60 with `damage: []`; it restrains on a hit and
  includes escape/web-destruction rules. `(1578, actions, 1)` Marut Unerring
  Slam is an automatic hit dealing fixed `60` force and pushing a target.
  `(684, actions, 1)` Dracohydra Bite has an empty structured damage-type list,
  while prose chooses acid/cold/fire/lightning/poison. `(1974, actions, 1)`
  Riffler Spectral Card has a second component with two damage types determined
  by roll parity. Single-type `NdX` damage does not faithfully describe them.
- **Explicit included contributions.** A disjoint literal-phrase scan finds
  **19** singular `included in the attack` descriptions (traits) and **16**
  plural `included in the attacks` (9 actions, 4 bonus actions, 3 traits).
  These are search hits, not 35 proven applications to particular modes.
  Exact-name Brute appears in **five** traits; `(402, traits, 0)` says one
  extra die on melee weapon hits is already included. Bugbear Morningstar
  `(402, actions, 0)` is 2d8+2; its Javelin `(402, actions, 1)` has a structured
  *ranged* 2d6+2 despite text distinguishing 2d6+2 melee from 1d6+2 range.
  `(765, actions, 0)` Duergar Enlarge says its extra dice are included, while
  War Pick/Javelin structured formulas are base 1d8+2/1d6+2 and the enlarged
  alternatives are in prose (`actions[1/2]`). Further included-contribution
  searches include Angelic Weapons, Heated Weapons, Hellish Weapons and
  Gruumsh's Fury. Do not reverse dice blindly or double-apply a modifier.
- **Non-weapon categories.** Common names are not enough to group rules:
  Parry (32 reactions) changes AC by different amounts and can add sight/weapon
  prerequisites; Change Shape (38 bonus actions) has different eligible forms;
  legendary Teleport/Attack instructions can reference different owned actions.
  Scouts found legendary instructions that trigger or replenish another action,
  as well as mythic activation and Multiattack dependencies. Preserve context
  (`reaction_intro`, `legendary_actions_per_round`) and check cross-feature joins
  before choosing reusable parts. Prose retains conditional targeting,
  consequences, recharge, and environmental restrictions when structure would
  otherwise erase them.
- **Spellcasting.** There are 712 entries, **1,859** groups and **5,368** spell
  references; abilities: Cha 320, Int 241, Wis 146, Con 1, null 4. The scanner
  finds **661 distinct `(ability, full groups)` repertoires**, including **375**
  among exact-name `Spellcasting` entries alone (not 661 proven mechanical
  families). Examples: `(11, spellcasting, 0)` Abjurer is Int with cantrips and
  leveled slots; `(296, spellcasting, 0)` Bel (CoA) is Cha with at-will/day uses
  and no material components; `(170, spellcasting, 0)` Archdruid is Wis with
  at-will/day groups and Multiattack substitution. The only non-null resource is
  Orcus's wand, and 16 entries have non-null footers. Labels, repertoires,
  components and footer restrictions need comparison before grouping packages.

## What this inventory does *not* decide

No gameplay values, new part IDs, cross-name equivalence, strength-tier policy,
monster combat-bonus fallback, spell repertoire grouping, or conversion output
have been selected. The scanner covers **every feature occurrence and field
shape**, but does not semantically classify every one of the 13,245 descriptions;
candidate families are a worklist for focused review, not a completeness claim
about rule interpretation. Source fields occasionally contradict their own
prose or contain sentence fragments (Bugbear Javelin is a concrete example).
Keep such contradictions outside playable tables and resolve them only after
the relevant rule decision. See [the decision queue](DECISION-QUEUE.md) before
starting any second trial.
