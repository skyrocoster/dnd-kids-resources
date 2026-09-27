# Monster features remodel — live grilling record

Started: 2026-09-27. **Status: in progress; no schema, migration, extraction, or implementation is approved by this document.** Update this record as decisions are made.

## Goal and starting position

- Start with **one concrete monster example**, then decide how to remodel the data currently kept in `monsters.features`.
- The existing D&D-based data is a starting point, not a rulebook to preserve exactly. This is effectively a fork; some information loss is acceptable if it serves a simpler, useful model.
- Do not automatically merge superficially similar actions/weapons: decide what differences matter (for example, `1d4 + 2` versus `1d4 + 3`, or two entries named Claw). Some individual cases may need the user's judgment after an initial high-coverage extraction.
- Define explicit categories and the boundary of the first pass. One possibility is extracting actions first and leaving other feature kinds in place temporarily; **not yet decided**.
- Where a feature describes an existing shared entity (for example, a Javelin), consider referencing that entity rather than duplicating its definition in every monster. Melee/ranged uses of one weapon need an explicit representation decision; **not yet decided**.
- Internet reference material may inform the analysis, but comparisons must be made against the actual local data. An initial majority/automatable pass followed by a case-by-case decision stage is a proposed approach, **not yet authorized as a migration**.

## Bounded repository facts (not design decisions)

- `backend/app/schemas/creatures.py` defines `MonsterFeatures` with traits, actions, bonus actions, reactions, legendary actions, mythic actions, and spellcasting, plus reaction/legendary metadata. `Feature` has a name, optional description, and optional structured attack.
- `backend/database/init_database.py` currently stores `monsters.features` as JSON in a TEXT column; `backend/database/seed_database.py` serializes the seed features into it.
- `backend/database/init_database.py` has a `weapons` table; `data/seeds/seed_weapons.json` has a Javelin entry (id 82) with attack data. This establishes a potential reference target, **not** that every monster Javelin feature matches its rules or that the existing weapon record is the right canonical form.
- `data/seeds/seed_monsters.json` has **Aarakocra** (id 1). Its actions are Talon (melee attack, 1d4+2 slashing; no obvious equipment item), Javelin (ranged attack, 30/120 ft, 1d6+2 piercing), and Summon Air Elemental (descriptive action, no attack); its trait is Dive Attack. Other feature-category arrays in that record are empty. A structured `melee_weapon` attack tag on Talon does **not** by itself establish a link to equipment.
- Javelin in `data/seeds/seed_weapons.json` (id 82) specifies base 1d6 piercing and 30/120 ft, but its sole attack entry is tagged `type: "melee"`; Aarakocra's Javelin action is tagged `ranged_weapon`, with +4 to hit and +2 damage. The weapon's bonus fields are null and its quick rules use bonus placeholders. Thus this example is **not** an identical row-for-row match, even though the weapon identity, base damage, and range appear to align.
- Local inventory source: `data/seeds/seed_monsters.json` is available (2,276 monsters); `backend/app/db.py` defaults to `/workspace/data/database/dnd_kids_resources.db` or `DND_DATABASE_PATH`, and this checkout has no local `.db` file / configured database path. An inventory produced here will describe the **seed data**, not claim to inspect an unavailable live database.

## Decision log

- **First worked example: Aarakocra (id 1).** The user chose this example and flagged that it immediately raises the treatment of non-weapon actions. Do not assume every action is a weapon, or treat a missing equipment link as a reason to drop Talon or Summon Air Elemental.
- **First extraction boundary: equipment-linked actions only (option B).** The user chose this so the initial parsing can match actions against the existing weapons table. Talon and Summon Air Elemental stay outside this first extraction; their eventual category and representation remain open. A match should be checked rather than inferred from a `melee_weapon`/`ranged_weapon` tag alone. Whether per-monster attack values or use modes remain alongside a weapon reference is still undecided.
- **Proposed change in direction (not yet resolved):** The user now suggests extracting **all** monster actions into a distinct-variant inventory first, where *any* difference makes another entry. The purpose is to measure how meaningful real differences are before deciding what to merge or how to reference weapons. This would supersede the equipment-only first extraction as the discovery step, but does not yet settle whether “extraction” means a read-only analysis or a database rewrite. Retain the earlier B decision as historical context, not an instruction to discard non-weapon actions from this proposed inventory.
- **Approved discovery artifact (2026-09-27):** The user requested a **Luna case-worker immediately** to write a persistent script under `experiments/` that emits staged JSON files **FULL → deduped**, then a statistics document. This is analysis of all `features.actions` with any difference retained as a distinct action, not authorization to alter the DB, schema, canonical seeds, or other feature categories. Preserve monster provenance and variant counts; do not silently conflate actions with the same name. The locally available source is the monster seed; if the user later supplies a live DB, provenance and differences must be revisited.

## Discovery inventory completed (2026-09-27)

- Luna added a rerunnable script and focused tests at `experiments/monster-actions-inventory/extract.py` and `test_extract.py`. It produces `full.json` (all actions with owning monster ID/name and action index), then `deduped.json` (strict complete-action variants with counts and provenance), then `stats.md` (method, counts, review groups and examples). The seed and DB were not modified. This is **seed-backed, not live-DB-backed** evidence.
- Scoped tests and extraction passed with finite timeouts. Equality considers every action field including descriptions and numeric attack details, while object-key order is irrelevant and array order remains significant. Exact-name groups do **not** merge different variants.
- Results from `experiments/monster-actions-inventory/stats.md`: **2,276** monsters, **6,338** action occurrences, **5,239** strict variants, **1,099** repeated occurrences beyond first appearances, and **399** exact-name groups with multiple variants. Examples: Javelin **24 variants / 40 occurrences**, Talon **10 / 11**, Claw **181 / 280**, Multiattack **1,269 / 1,432**.
- These counts measure exact data differences, **not** the number of meaningful gameplay differences or the number of records the eventual model should contain. The sample same-name Javelins include different damage formulas and descriptions; no decision has been made to merge them or to link them to weapons.
- **First comparison family chosen: Javelin.** The user selected Javelin for side-by-side review of its 24 distinct variants / 40 occurrences before deciding which differences matter. This is a review selection, not approval to merge variants or assign weapon references.

## Javelin review facts (seed-backed, no merge decision)

- In `experiments/monster-actions-inventory/deduped.json`, the exact name `Javelin` occurs 40 times across 24 strict variants: 23 structured ranged attacks and one structured melee attack (Icewind Kobold Zombie). Most use base `1d6` piercing and 30/120 ft, but to-hit and flat damage bonuses vary; some instead have `2d6`, missing long range, or additional fire/poison damage. No Javelin action in this set lacks an attack.
- Concrete near matches: Aarakocra has ranged +4 to hit / 1d6+2 piercing; Duodrone has ranged +3 / 1d6+1 with the same range and description; a `1d6+3` ranged version also occurs. Tasloi/Tasloi Sniper differ only in numerical hit and damage bonuses. Two pairs of Duergar variants have the same structured attack and differ only in their wording about enlarged damage.
- Bugbear and Bugbear Chief have structured **ranged** Javelin damage of `2d6` but descriptions say `2d6` in melee **or** `1d6` at range. This is a source inconsistency/embedded alternate use to inspect, not proof that the ranged damage is truly `2d6`; blindly mapping the attack fields to one weapon use could lose or misstate the text. The weapon seed's Javelin (id 82) is `1d6` piercing with 30/120 range but labels its only attack entry `melee`.
- The full per-variant source monsters, descriptions and damage components remain in `deduped.json`; the statistics document provides selected side-by-side examples. No external rulebook comparison has been used here.

## Candidate three-table Javelin sketch (discussion only)

- The user proposed considering a **monster–weapon cross-reference** table for the differing to-hit bonuses, extra damage and other monster-specific uses. This is a candidate design, **not an approved schema change or a decision to merge Javelin variants**.
- `weapons`: one existing Javelin identity (seed id 82), with its base `1d6` piercing and 30/120 thrown range; its current attack entry says `melee`, so explicit melee/ranged modes would require a separate decision or interpretation.
- `monsters`: existing individual monster identities and other fields remain their own records; the first-pass inventory has not changed `features`.
- Proposed `monster_weapon_uses` bridge: own primary key, `monster_id` FK, `weapon_id` FK, source action location, chosen use mode, monster-specific hit and damage bonuses, optional damage-formula override, optional additional damage, optional special-case text and review state. One row represents **one action/use occurrence**; do not make `(monster_id, weapon_id)` unique because the same monster may have more than one use of one weapon.
- Illustrative bridges: Aarakocra → Javelin, ranged +4 / `1d6+2`; Duodrone → Javelin, ranged +3 / `1d6+1`; Dragon Army Soldier → Javelin, ranged +4 / `1d6+2` plus `1d4` fire; Icewind Kobold Zombie → Javelin, melee +1 / `1d6-1`. Bugbear's structured ranged `2d6+2` contradicts its melee/ranged text; keep it marked **needs review** rather than silently treating either as the canonical ranged use. These are examples of where data could live, not permission to erase the original actions.
- **Documentation requested:** The user asked to write this three-table Javelin sketch into `experiments/` with an explanation. This records a comparison candidate; it does not authorize DB changes or settle the model.

## Alternative proposed next: stats-first actions with monster labels

- The user proposes deduplicating on mechanics/statistics rather than weapon/action names, with a separate naming layer: a stick and a talon that each do `1d4` could point to the same reusable underlying action even though their displayed names differ.
- This competes with weapon-identity-first reuse and may also apply to non-equipment actions. The exact meaning of “same stats” is **unsettled**: damage type, hit bonus, reach/range, targets, extra effects, description and other conditions may or may not count toward mechanical identity. Do not treat `1d4` alone as a decided complete equivalence rule, and do not overwrite the strict inventory.

## Open decision frontier

1. Compare the documented weapon-identity-first bridge with the proposed stats-first shared action + monster-specific naming layer, without treating either as selected for implementation.
2. For the stats-first alternative, decide which fields define truly equivalent mechanics (for example, whether equal damage dice with different damage types, ranges, or extra effects count as one action).
3. Decide how to handle genuinely different modes, damage formulas/riders and descriptions (notably Bugbear's melee/ranged contradiction) without silently losing relevant information.
4. Agree on later extraction boundaries for traits, reactions, and other feature categories and how to review ambiguous cases. No data edits until the intended scope and treatment of loss are agreed.
