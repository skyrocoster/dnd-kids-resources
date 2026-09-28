# Candidate-v1 readiness review (historical)

**Historical handoff, superseded for current work.** Preserve this review as
evidence of the fixed-number candidate-v1 pilot and its validation gaps. The
current [forking discussion](../FORKING-DISCUSSION.md) explores monster level
and scalable basic attacks instead. This review is not an instruction to build
a second fixed-default candidate or convert the dataset.

Recorded 2026-09-28 after a read-only review of candidate v1, its local evidence,
conversion code, tests, and draft expansion instructions. The user then requested
documentation changes to prepare a fresh context to take action.

## Verdict and authority

**The review then recommended** keeping the three-table direction and broadening
evidence before freezing the catalogue or converting the dataset. That was an
assessment of candidate-v1, not a decision on the later level-scaling fork.

This was an assessment and handoff, not approval of all proposed rules
or permission to migrate production. The governing agreement remains
[the parent decision document](../2026-09-27-monster-features-remodel.md).
The five sampled Multiattack behaviors and three sampled fire strengths retain
their recorded approval. Other proposed defaults have not gained approval merely
by being documented here. No code, candidate JSON, seed, or live database was
changed during the review or this documentation update.

## Pilot boundary

The converter was closed to the original sample. The three playable JSON files
remain a comparison baseline, not complete monster profiles or a full-seed
conversion. `DECISIONS.md` and `MODEL.md` describe that pilot; the expansion
draft was never an execution approval.

## What the review established

- The ownership split between parts, monster combat profiles, and bindings is
  coherent. Generic overrides are neither needed nor wanted.
- All **18 focused tests passed**, including saved JSON versus in-memory
  regeneration. This proves the recorded pilot behavior, not dataset-wide
  semantic correctness or balance.
- The pilot contains 50 parts, 44 profiles, and 90 bindings. Only eight profiles
  are complete feature profiles; the other 36 are Javelin-only.
- The local `../feature-shape-profile.json` records 2,276 monsters and 13,245
  feature occurrences: 6,338 actions, 4,735 traits, 712 spellcasting entries,
  736 legendary actions, 380 bonus actions, 309 reactions, and 35 mythic actions.
  Of the actions, 3,586 have structured attack objects. A scout confirmed these
  counts against `data/seeds/seed_monsters.json` during the review.

### Broader-source cases to bring into the next trial

These were reported by the scout against the seed, not added to local fixtures.
Re-extract their exact records and record the input snapshot before using them
as conversion evidence. IDs refer to monster records; inspect `features.actions`.

| Monster | Evidence | Question exposed |
| --- | --- | --- |
| Awakened Rat, 237 | Bite: formula `1`, piercing, bonus 0, reach 5 | Fixed damage is not accepted by the candidate's `NdX` attack format. A dragon-selected Bite default needs broader evidence. |
| Ettercap, 864 | Web (Recharge 5-6): ranged attack +4, 30/60 range, `damage: []` | An attack roll can have no damage component; current conversion reads component zero. |
| Archdruid (MPMM), 170 | Multiattack makes three Staff or Wildfire attacks and can replace one with Spellcasting | The five sampled recipes do not settle substitutions involving casting. |
| Xenk Yendar, 2622 | Two Longsword actions: one structured weapon attack; the other has `attack: null` and describes a thrown-blade saving-throw action | Identical names do not establish identical behavior. These are NOT two structured attack duplicates. |

The scout reported 634 structured Bite actions. Do not confuse that with 652
exact-name Bite occurrences across all categories, which also include 18 entries
with `attack: null`. A name count is not a mechanical-family count.

### Validation gaps confirmed in memory

The existing `validate()` accepted each of the following mutations:

- An undocumented nested field inside an attack mode.
- An unknown effect operation.
- Ancient Dragon Turtle's mythic actions after removing Blessing of the Sea.
- A duplicate action binding with a new binding ID but the same part and mode.
  The resolver subsequently rejected this as unavailable or ambiguous.

These probes did not alter saved files. They show incomplete validation, not
corruption of the pilot. A future model would need focused negative tests
before trusting a larger generated dataset.

## What happened to the old next-work proposal

The review proposed full-input inventory, decisions on fixed shared defaults,
a second candidate with stronger validation, then a separate readiness decision
before any whole-dataset conversion. The inventory was completed in
[evidence-inventory-v2](../evidence-inventory-v2/INVENTORY.md); it did not approve
new defaults. The second fixed-default candidate and full conversion were not
built. The user has since asked to explore level-scaled basic attacks instead;
resume at [FORKING-DISCUSSION.md](../FORKING-DISCUSSION.md), not this former
task list. The validation failures recorded above remain pilot limitations, not
evidence that the saved candidate JSON was corrupted.
