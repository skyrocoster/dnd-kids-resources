# Full-dataset conversion instructions — DRAFT, NOT AUTHORISED TO RUN

**Historical pilot draft, not a current fork procedure.** The active
[forking discussion](../FORKING-DISCUSSION.md) explores a different damage
direction. Do not dispatch these instructions or use them to convert monsters.

These instructions describe the pilot's actual method and its then-open decision
boundaries. They were not approved for dataset-wide use. Do not treat approval of
the broad monster-building goal as approval of every candidate-v1 default.

## 0. Approval and execution gate

**Readiness as reviewed on 2026-09-28: not ready for whole-dataset execution.**
The historical [NEXT-STEPS.md](NEXT-STEPS.md) proposed full-input inventory,
evidence-led decisions, a targeted second trial, and validation hardening.
Inventory is not conversion. The eight-profile pilot and its passing tests do
not establish universal defaults or complete shape coverage. This draft
describes the original worker procedure, not a current implementation plan.

Before a whole-dataset run, obtain all of:

1. Approved `MODEL.md`, `DECISIONS.md`, and the three playable pilot JSON files.
2. A specific full input snapshot and a permitted output directory. The current
   pilot's boundary does not authorise another agent to edit live seeds or a DB.
3. A ruling on the four review hotspots in `DECISIONS.md`.
4. Agreement whether accepted pilot defaults are frozen or can be replaced using
   full-dataset evidence. **Default for the later worker: frozen.** Report changed
   evidence; do not silently rewrite accepted rules.

The frozen-default rule applies only after explicit approval. It must not freeze
currently proposed dragon-derived natural-weapon defaults before broader review.
Include the second trial's approved treatments and rejection tests in the final
worker contract; retain escalation for genuinely new cases.

The deliverable is new JSON plus external decision/coverage records, not production
integration. No generic overrides, inline legacy fallbacks, or provenance fields
in the playable tables. Preserve the input snapshot and unrelated work.

## 1. Read the contract, not just the examples

Read the parent `2026-09-27-monster-features-remodel.md`, then `MODEL.md`,
`DECISIONS.md`, `catalogue-decisions.json`, and the focused tests.

Important reasons behind the design:

- The output is a smaller monster-building vocabulary, not a reversible format.
- A normal weapon owns its damage; monsters select parts, not copies of weapons.
- A material reusable addition is retained, but an unusual number alone is not
  automatically an addition. Never infer Brute merely because damage is larger.
- A rare useful action is still worth retaining as a standalone catalogue part.
- The converter is deliberately bounded. Do not run it over arbitrary records and
  assume every resulting slug or copied description is a well-designed part.

## 2. Inventory the ENTIRE input before fixing new defaults

Do one complete inventory pass before emitting converted monsters. Batches may
collect facts in parallel, but cannot independently create competing catalogues.

For each monster, enumerate every feature category, list occurrence, and non-list
context field. Assign an external working key `(monster_id, category, index)`.
Do not select only structured attacks or exact weapon-name matches.

Record, outside the playable model:

- Complete occurrence counts and distinct field/value shapes.
- Candidate family names, original descriptions, structured attack modes, damage
  components, limits, conditions, and dependencies on other features.
- Source bonuses needed for the monster's compact combat profile.
- Unknown categories and fields. Unknown is not permission to omit.

If combining overlapping extracts, deduplicate by working key and require exact
agreement. A repeated whole record is not a new vote. Different actual monsters
with identical attacks are separate votes. Use original occurrences rather than
strict-variant group counts.

The pilot proves why this matters: 40 Javelin occurrences have 24 strict whole-JSON
variants, but neither 24 equal-weight votes nor 44 votes including overlap is the
correct frequency denominator.

## 3. Build behavioural families

Names are search aids, not identity. For each proposed family, write a short plain
English description of what it does before selecting numbers.

Distinguish these concepts:

1. **Use mode:** melee versus thrown, or another genuinely different way of using
   one entity. Do not turn a conditional extra die into a second ranged mode.
2. **Incidental numeric settings:** dice count, damage amount, reach/range, save DC,
   uses, etc., where changing the value leaves the basic behaviour the same.
3. **Reusable rule:** add a weapon die to melee hits, add fire on hit, conditional
   enlarged damage, knock a creature prone after a save.
4. **Distinct behaviour:** different activation trigger, targeting geometry,
   target eligibility, consequence, success/failure logic, or environmental rule.

Do not erase mechanically meaningful numbers while making this distinction. A
trigger at zero HP, half damage on a successful save, and three consecutive turns
of concentration are clauses of a rule, not automatically disposable damage
settings. If their treatment is not covered by an approved family, request a
decision rather than stripping every number with a regular expression.

Examples:

- Ordinary Javelin 1d6 versus 2d6: one normal weapon, absent evidence of a useful
  independent modifier.
- Javelin plus an additional fire component: Javelin plus fire modifier.
- Melee/ranged Javelin: modes, not unrelated weapons.
- Fire Breath versus Steam Breath: separate in this pilot because the latter
  negates underwater fire resistance. Dice/range alone would not require a split.
- Same printed name but grapple versus no grapple: preserve the grapple effect
  through a useful part; do not merge it away based on the name.
- Same printed name `Multiattack` but different attack recipes: compare its actual
  effect, attack counts, alternatives, and referenced modes. Reuse a part only when
  those behaviors match. The pilot's source-name crosswalk is keyed by occurrence
  and expected description/effect; the name is an alias, never a sufficient match.
- Same source action name and damage type but different additional-fire dice:
  compare the actual extra component and its attachment. In this pilot, 1d4, 2d6,
  and 8d8 fire are distinct reusable modifiers. Do not merge them by the generic
  phrase "Additional Fire Damage" or infer a complete monster from a Javelin-only
  occurrence.

Before creating a part, search the entire existing catalogue by behaviour. Different
wording, monster names, or labels do not justify duplicates. Keep useful labels at
the binding, not in mechanical identity.

## 4. Select normal values and freeze one shared catalogue

For existing approved parts, use their normal values. Report stronger or different
dataset-wide evidence externally, without making local exceptions.

For a new approved behavioural family:

1. Separate modes and extra damage components.
2. Identify explicitly supported modifiers before counting base profiles. When a
   trait states its effect is already included, do not count the adjusted total as
   an unmodified weapon and then add the trait again. Reverse only an unambiguous
   stated operation; otherwise ask for a decision.
3. Remove monster attack/flat-damage bonuses from the shared-profile comparison.
4. Count observed base numeric profiles within the family/mode. Keep related
   numeric fields together where they describe one coherent use. Do not construct
   an unobserved combination by independently choosing every field's mode.
5. For new families where the approved procedure permits frequency selection,
   choose the unique most frequent coherent profile. Report the denominator and
   runner-up. Discard minority numerical variations; no new per-monster fields.
6. On ties, missing critical values, contradictory profile evidence, or uncertainty
   over material behaviour, produce a decision question. Do not break semantic
   ties by input order, alphabetic name, larger dice, or whichever batch ran first.

The natural weapons and fire rider in this pilot are explicit primary-agent
decisions for ties, not algorithms the cheaper model should generalise. Morningstar
uses normal 1d8 because Brute already explains the observed 2d8, not because the
converter is entitled to prefer item seeds over monsters in every case.

Every selected default gets one external decision row:

```text
Family/mode; occurrences counted; competing profiles and counts;
removed/included modifier contributions; chosen default;
discarded differences; behavioural exceptions retained as parts;
reason; whether this follows an approved rule or requires approval.
```

No row is a playable source/review record. It is the handoff explanation.

## 5. Extract modifiers without recreating all variants

Prefer an existing part. Add a modifier only when its rule is intelligible and
useful independently of the original monster.

- Brute: add exactly one **base weapon die**, melee weapons only. A 1d8 weapon
  becomes 2d8, not 1d8+1d6 and not a copied Brute-Morningstar record.
- Additional elemental damage: separate component with its own normal dice/type;
  no monster flat bonus unless a later approved rule explicitly changes that.
- Enlarged Weapon: an attachment with an activation condition, not an override
  containing another complete attack. Keep the condition; do not grant Enlarge.
- On-hit effects: retain materially useful saves and consequences. A text-only
  modifier is acceptable when full machine execution is unnecessary.

Do not create weak/medium/strong variants merely to rescue discarded numbers.
Do not infer that every large monster deserves an extra-die trait. Do not replace
complex text with a vaguely similar existing effect to avoid a decision.

## 6. Convert non-weapon features with equal care

All categories remain in scope. Every source occurrence must map to one or more
bindings or have an explicitly justified omission outside the model.

- Generalise only references to the acting monster: use `this monster`, not a
  species name. Do not replace references to enemies, summoned creatures, or
  other participants with the actor accidentally.
- Retain the complete effect as shared text if further splitting offers no real
  assembly benefit. A prose rule is valid; claiming it is executable is not.
- Convert a useful cross-part dependency into an ID reference and validate it.
- Preserve the approved behavior of each known Multiattack recipe. In this pilot,
  use the five recorded recipes and their explicit selected modes; do not replace
  them with unrestricted choices or invent a new recipe from an illustrative
  example. Adult Red Dragon's recipe optionally uses its separately bound
  Frightful Presence before one Bite and two Claws. A new behavior shape or
  unclear attack choice requires review before conversion.
- Keep special movement, summoning, defence, saving-throw actions, reactions,
  legendary/mythic actions, and bonus actions. A null `attack` is not an empty
  feature.
- Omit empty headings only when they contain no independent rule. The pilot drops
  two empty plural Legendary Resistances headings, not the real 3/day traits.
- Split Unusual Nature into independently useful physiological traits, only granting
  those actually described. Do not infer no-air from no-food.
- Extract recognised usage suffixes. Do not blindly strip all parentheses: Psionics
  is meaningful. If a display suffix conflicts with a newly standardised limit,
  regenerate the display label from the normal rule rather than showing false text.
- Spellcasting packages retain component exceptions, abilities, spell sets, group
  limits, and meaningful resource/footer data. Nulls and false visibility flags
  can be omitted. Different spell repertoires are not mere spelling differences;
  do not automatically make one package per monster or erase unique capabilities.
  New repertoire grouping/default decisions require catalogue review.

## 7. Assemble monsters after the catalogue is frozen

For each full monster, derive its compact attack and damage bonuses using the
approved modal rule in `DECISIONS.md`. Use all its structured attacks, not the
Javelin-only pilot profile. Do not average per-monster numbers into weapon defaults.

Emit ordered bindings using only the fields in `MODEL.md`:

- Choose a part ID, category, position, and optional useful display name.
- Select only supported and evidenced attack modes. A referenced weapon does not
  automatically grant all its modes.
- Add modifier IDs locally where they apply to this particular attack.
- For additional fire, match both the source label and actual fire component, then
  use the appropriate approved reusable strength. Do not select a rider from its
  name alone, flatten distinct amounts, or copy source amounts into bindings.
- Add monster-wide modifier traits once, not copies on every attack.
- Carry useful monster-wide legendary/reaction context. Do not invent absent stats.

No arbitrary parameter bags, original attacks, alternative dice, per-monster save
DCs, fallback descriptions, or override fields. Those would undo the simplification.
Keep base monster fields outside this feature remodel unchanged if the approved
full-dataset input/output includes them.

## 8. Prove the conversion, not just valid JSON

Use finite commands and tool timeouts. Run focused checks, not broad application
builds or lint. Extend the pilot checks to the full converted dataset:

1. Every input occurrence is accounted for; explain every omission and split.
2. All IDs are unique; monster, part, modifier, mode, and dependency joins resolve.
3. Every category is covered. No text-only action or spellcasting package vanishes.
4. Instances contain no local rule overrides or hidden original-number copies.
5. Monster names have not leaked into reusable actor text; meaningful other-creature
   names and spell names have not been corrupted by replacement.
6. Default counts were calculated on the deduplicated full input, not each batch
   separately. Approved frozen defaults did not drift during conversion.
7. Shared weapons with different source damage converge on the same normal rule.
8. Extra components, conditional activations, and selected modes remain meaningful.
9. Each Multiattack composition references only the allowed source-backed actions
   and selected modes; occurrence-to-recipe aliases remain in external accounting.
10. Fire riders preserve their distinct expected components and attach to the
    matching source actions; matching by name alone fails the check.
11. Brute applies exactly once to eligible melee attacks and never to thrown attacks.
12. Swapping weapons preserves applicable modifiers; added fire stays a separate
     component; negative and zero bonuses survive.
13. Non-weapon transfer example: attach Fire Breath and Undead Fortitude to another
     monster using existing part IDs, without editing their rule text.
14. Missing prerequisites fail clearly rather than granting unlisted parts.
15. Regeneration is deterministic. Compare saved JSON with generated output.

The pilot's attack resolver is a proof of selected composition rules, not a promise
of automatic execution for every feature. Report that distinction explicitly.

## 9. Stop conditions and delivery

Stop the affected family, not necessarily the whole inventory, when encountering:

- A genuinely new field/category/attack shape without an approved treatment.
- A tie or contradiction that the accepted rules do not resolve.
- Uncertainty over whether a difference is incidental or a useful mechanic.
- A required reference whose correct target is unclear.
- Pressure to add a local override or create many cosmetic/numeric variants.

Return a concrete comparison and a proposed smallest shared rule for review. Do
not disguise an unresolved decision as a generated part ID or a `custom` blob.

Deliver the three populated JSON tables (plus any explicitly approved base-monster
data), a complete external decision record, coverage accounting, focused checks,
and representative Frankenstein examples. State remaining gaps and all intentional
gameplay changes. Do not claim completion while unmapped families remain.

## Approval record

**Pending user review.** Replace this line with the approved candidate/version and
any revised default decisions before authorising the full-dataset worker.
