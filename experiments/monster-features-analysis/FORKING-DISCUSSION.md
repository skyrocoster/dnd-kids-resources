# Forking direction: monster level and scalable parts

Discussion record, 2026-09-28. This records the direction and evidence from the
conversation after [the evidence inventory](evidence-inventory-v2/DECISION-QUEUE.md).
It is **not** an approved level formula, a revised playable model, or permission
to change candidate-v1, the seed, or the application.

## Direction stated by the user

- The long-term goal is to assemble any monster from reusable parts. A goblin
  need not always be easy and a dragon need not always be hard.
- Explore repurposing D&D's CR into a *monster level*. When a basic attack is
  attached to a different monster, its damage should follow the receiving
  monster's level rather than be locked to the original monster's damage.
- Broad level-aware combat power (including things like added damage and save
  difficulty) is the intended direction, **but prove the idea with basic
  weapons/attacks first**. Scaling other features has not been designed.
- Do not assume a linear progression or immediately decide how CR 0, 1/8,
  1/4, and 1/2 become integer levels. Examine existing D&D damage first.

This changes the question raised by the inventory. We did **not** decide
whether Bite/Claw/Tail need one fixed default, a few fixed strengths, or many
source variants. A level-scaled weapon may supersede that numerical question,
but still needs to keep meaningful reach, modes, additional damage, and on-hit
effects. The older [remodel direction](2026-09-27-monster-features-remodel.md)
and [candidate-v1](candidate-v1/README.md) remain comparison baselines; do not
silently treat their fixed attack numbers as the fork's approved design. The
pilot's five sampled Multiattacks and three sampled fire strengths retain only
their specific approvals. Candidate-v1's converter and JSON remain intact as
historical pilot artifacts, not current conversion instructions.

## Evidence worth carrying forward

The existing `data/seeds/seed_monsters.json` snapshot has SHA-256
`325263bbb6531afd67ff141473a2931d37305e0a5b7d26d6c25f5cadaf2b0753`;
`data/seeds/seed_weapons.json` has SHA-256
`e701773f0e01c3d8bad83079f69ab26bf84948fa848604a47d779be12742a348`.
Monster attacks do not have a verified foreign key to weapon records: matching
by name is only a filter for an exploratory sample.

A cleaned-up single-hit comparison matched actions to 41 ordinary simple or
martial weapon names in the weapon seed (no rarity, no `base_weapon`, and a
damaging weapon attack). It excluded natural attacks, automatic hits, missing
damage, multiple targets, and Net. The two monster Net actions put a fixed `5`
in structured damage, but their prose and the weapon row say this is damage
needed to *destroy* a net, not damage dealt by the hit. The sample had **742
actions on 572 monsters**; its 40 exact-name Javelins were a sparse control.
Each monster got one vote: average its qualifying actions' **first damage
component**, including the listed bonus, then average those monster values by
CR. This is damage *on a hit*, not damage per turn, chance-adjusted damage,
or a full hit with extra fire/poison. Already-included dice were not added again.

The **409 qualifying monsters at CR 1–12** had mean first-component damage
of 5.65 at CR 1, 8.11 at CR 5, 10.14 at CR 10, and 13.47 at CR 12;
individual CR groups varied substantially. Comparing two-parameter linear,
square-root, and quadratic trends while holding out one whole CR group at a
time gave per-monster prediction errors of **4.13, 4.15, and 4.15** damage.
These are effectively tied; the sample does **not** justify choosing a curve
or extrapolating to high levels. CR 0 and fractions were inspected separately,
not mapped to levels.

For illustration only, forcing a `1d6` Javelin to follow the *average of all
these weapons* via an integer flat bonus yielded `1d6+2` at comparison level 1
and `1d6+9` at level 12. At CR 6, the three actual Javelin users averaged
**7.17** base damage, versus **9.5** for that illustration. Mixed weapon dice,
monster bonuses, and included effects make the all-weapon average a questionable
target for one basic weapon. **Neither this formula nor CR-to-level identity
has been approved.**

## Where to resume

1. Decide whether the mixed-weapon average is a **damage target** for a basic
   level-scaled Javelin or merely a **reference check** for a separately chosen
   progression. The latter was recommended, not yet approved by the user.
2. Choose an integer level range and treatment of source CR 0 and fractions.
   An original monster's CR can be evidence for its initial level; the fork's
   level must not permanently tie a species to a difficulty.
3. Test **one** basic Javelin across selected levels and on two contrasting
   hosts before designing other attacks. Keep weapon behavior separate from
   level-driven damage. Then review extra components, hit bonuses, save
   difficulty, and number of attacks separately; none was settled by this
   single-hit sample.

The temporary comparison script and its tests were discarded after recording
the method and results here; they were exploratory, not a converter or a game
rule. That comparison did not change candidate-v1, the source seed, application,
or live database.
