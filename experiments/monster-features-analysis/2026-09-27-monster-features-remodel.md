# Monster features remodel — agreed direction

Updated after the 2026-09-27 discussion. This replaces the original emphasis on
preserving source variations with deliberate standardisation. The principles
below are agreed; concrete defaults and the candidate structure still need review.

## Goal

Build a small, understandable library of reusable monster parts. Existing monsters
become assemblies of those parts so that, long term, we can "frankenstein"
monsters: swap weapons, attach another creature's ability, and combine useful
traits without copying and repairing whole stat blocks.

This is not a lossless D&D conversion. We expect to fork D&D longer term. Existing
data is material from which to choose useful normal behaviour, not a requirement
to retain every numerical, wording, or source-specific variation.

## Ownership and simplification

1. Shared weapons, actions, traits, and other useful parts own normal behaviour.
   Monsters primarily own their stats and the selection of parts they use.
2. Choose one normal version for incidental variations. If, hypothetically, 18 of
   20 Javelins deal 2d8, that can become the shared default and the other damage
   variations can be dropped. This is an example of the rule, not an observed
   Javelin count or a selected damage default.
3. Use occurrence frequency as evidence for a normal version, after separating
   genuinely different uses and reusable effects. Do not combine melee/thrown
   modes or count an added damage effect as disagreement about base damage.
4. Do not preserve discarded variation through additional definitions, hidden
   exceptions, or monster-local configuration. Simpler shared defaults are the
   point, not merely a more elaborate representation of the same variations.
5. A recurring, useful rule such as "add one weapon damage die" can be a reusable
   modifier/variant part. It should work with other appropriate weapons rather
   than require a separate definition of every modified weapon.
6. Keep materially useful differences in behaviour as actions, modes, effects,
   traits, or modifiers. Split only where doing so helps assembly or use; do not
   decompose every sentence into a general-purpose rules programming language.
7. Generic overrides are OUT OF SCOPE. Do not implement an override system or
   placeholder override fields. A future override mechanism is a later project.

## Required properties of the candidate

1. Explicit categories cover traits, actions, bonus actions, reactions,
   legendary actions, mythic actions, spellcasting, and any other evidenced kinds.
2. Define when a feature uses a shared reference versus an inline definition.
   Sharing should be the normal direction; unique abilities must still have a
   useful home. Non-weapon actions must never be dropped for lacking a weapon.
3. Define how a shared entity's use modes are represented and how a monster
   selects available modes without accidentally gaining unlisted abilities.
4. Define the small set of monster-specific values retained beside references.
   They must have a clear use, not recreate discarded source variants.
5. Distinguish display naming from underlying behaviour. A different label does
   not force a new mechanical definition; a matching name does not prove that
   behaviours should merge. Preserve useful display differences.
6. Define a practical equivalence/merge rule: incidental numeric and wording
   differences can collapse; meaningful targeting, triggers, consequences, modes,
   and reusable additions need explicit decisions.
7. Preserve useful damage components and additional effects as parts where
   appropriate. Do not silently lose an extra fire/poison effect while choosing
   the normal physical weapon damage.
8. Reusable rules must refer to the creature using them, not hard-code the
   original monster's identity. Avoid double-counting already-included effects
   such as Brute when assembling effective damage.
9. Do not add source/review metadata to the playable model unless it explicitly
   enables a useful join. Resolve source contradictions into a coherent candidate
   rule instead of storing competing truths in the model. Explain significant
   decisions outside the model.

## Current scope and deliverables

- Work inside `experiments/monster-features-analysis/`. Scouts may inspect outside;
  normal agent/instruction setup files may be read as requested by the user.
- Create a nested folder containing a potential new database structure and
  populated JSON. Do not change the live application, seeds, or database.
- This is a closed pilot using the local evidence: eight complete monster-feature
  samples and all 40 exact-name Javelin occurrences, with overlaps deduplicated.
  Additional Javelin-only monsters must not be presented as complete stat blocks.
- The primary agent owns the modelling, normalisation choices, and reasoning.
  Script writing may be delegated; deciding the model may not.
- Document selected defaults, retained parts, discarded variations, and why.
  Concrete choices are proposals for review, not additional user-approved rules.

## Full-dataset follow-through

After the pilot is finished and agreed, produce exact instructions that allow a
cheaper model to apply the agreed method to the ENTIRE dataset. The instructions
must describe what was done and why, not just show the final JSON.

Develop the candidate's decision record and repeatable procedure during this
pilot. Finalise the expansion instructions against the approved candidate; do
not claim an unreviewed draft is already authorised for dataset-wide execution.
They must cover input scope, grouping/counting, selection of defaults, reusable
part extraction, modes, naming, monster bindings, contradiction handling,
non-weapon features, checks, and when a new case requires a decision rather than
an invented exception. Full-dataset conversion is not part of this pilot.
