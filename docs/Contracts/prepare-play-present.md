# Prepare as much as you want, play present

> **Status:** Agreed product contract; implementation has not started.

## Mission

**Mission:** Move as much useful complexity as possible into preparation so the people at the
table can spend their attention on the fun.

The game is played at the table. The app is a preparation and reference instrument. It helps the
Dungeon Master author, organize, validate, and retrieve material without becoming the game itself.

The governing test is simple:

> If the DM would have written it down, prepared it, looked it up in a book, or found it in a
> binder, it belongs in the app. If the DM would have invented it in the moment, the app has gone
> too far.

## The table

**Mission:** Protect the human table as the place where play, meaning, judgment, and story happen.

- The app must amplify the fun parts of tabletop roleplaying.
- The app must minimize rules brokerage, searching, preparation gaps, state confusion, and other
  preventable interruptions.
- The app must not remove uncertainty, difficult choices, conversation, improvisation, or shared
  story-making merely because they are difficult.
- The DM and the kids are present with one another; the device is secondary.

## The Dungeon Master

**Mission:** Give the DM more preparation power and less administrative bullshit while keeping the
DM at the table.

- The DM is the final authority on the fiction, rulings, pacing, safety, and table experience.
- The DM-side surface may be larger than the kid-facing surface because it pre-empts problems and
  prepares the shared experience.
- The DM may use a live dashboard, but most live information should be glanceable.
- Maps are a legitimate exception: spatial complexity can require sustained review and operation.
- The app should move complexity into preparation, not demand that the DM operate a computer while
  everyone else plays.
- The app must never make the DM feel like an exception handler for an app-owned rules engine.

## The kids

**Mission:** Give kids enough prepared information to participate independently without treating
them like dickheads or making them responsible for the system.

Kids are capable people. The product must assume a modern child who may already understand video
game interfaces before playing a TTRPG. “Easy enough for a four-year-old” means the operation is
obvious and low-friction; it does not mean the language is childish, cute, patronizing, or
intellectually stripped down.

- Use plain, direct, respectful language.
- Use familiar interaction patterns, strong visual affordance, and contextual information.
- Do not use baby talk, condescending explanations, manipulative rewards, streaks, grinding, or
  attention traps.
- Give kids meaningful information and real agency at the table, while leaving rulings and story
  authority with the DM.
- The product has no reason to author, request, or retain personal details about children.
- Fictional character names and fictional game state are sufficient.

## The kid-facing device

**Mission:** Let a kid glance at what they need, understand it, and return attention to the table.

- The TTRPG is not played on the tablet.
- The kid-facing app is read-only.
- Kids may navigate currently available information, but they do not author, change state, resolve
  actions, advance the story, or reveal new content through the app.
- The kid surface shows the current revealed context and persistent information the party has
  already earned.
- It does not expose unrevealed rooms, future content, or the DM’s working notes.
- The app must not require kids to browse unnecessary detail in order to keep participating.
- The device interaction should be: **glance, understand, act at the table, return attention**.

## Information and revelation

**Mission:** Make prepared information available at the right moment without stealing discovery
from the table.

- The DM explicitly prepares and releases player-facing information.
- The app never automatically reveals story information merely because it exists in the prepared
  world.
- The app may provide concise, actionable context first and deeper prepared detail when needed.
- The app may flag information that is missing or structurally inconsistent, but it may not decide
  what the DM intended to reveal.
- Future document and puzzle surfaces must remain DM-controlled, read-only for kids, and persistent
  after release.

## Rules and authority

**Mission:** Support play without pretending that the app knows more than the DM does.

- The current implementation may use D&D rules, the Monster Manual, spells, and related content.
- The product contract is generic TTRPG rather than a D&D rules engine.
- User-facing language should avoid explicit mechanical claims where a system-agnostic action concept
  is sufficient. “Dash” may be a useful action label; “Dash doubles movement” is an implementation
  of a particular ruleset and does not belong in the generic product contract.
- The DM’s table-specific ruling always wins.
- The app may present prepared reference information, but it must not adjudicate a novel situation,
  invent an outcome, or overrule the DM.

## Language and identity

**Mission:** Move the product away from D&D branding without throwing away useful existing content.

- Use normal, warm, generic TTRPG language in the product surface.
- Use **Dungeon Master** or **DM**; do not replace the role with “Guide,” “Facilitator,” or another
  euphemism.
- Prefer generic interface categories such as “Creatures,” “Abilities,” “Effects,” and “Map.”
- Retained content may keep familiar names such as goblin or fireball.
- D&D content remains a current source and implementation context, not the product’s permanent
  identity.
- Immediate system portability is not required, but new visible contracts should avoid unnecessary
  D&D-specific assumptions.

## Preparation and integrity

**Mission:** Catch preventable preparation failures before they interrupt a session, without judging
the DM’s creativity.

The app may identify structural and operational problems such as:

- rooms without doors;
- portals without exits;
- unreachable spaces;
- contradictory or incomplete state;
- missing player-facing information that the prepared experience depends on.

Warnings must be clear, explain why the issue matters, and be non-blocking. The DM must be able to
resolve or consciously dismiss a warning. The app may not evaluate whether a story is fun, dramatic,
balanced, or creatively correct.

## What the app is allowed to replace

**Mission:** Replace clerical work and retrieval, never the live act of play.

The app may replace:

- writing and organizing complex prepared ideas;
- maintaining maps and connected spaces;
- indexing creatures, spells, abilities, and other references;
- searching a book or binder during play;
- tracking prepared/revealed information;
- detecting structural authoring gaps before play.

The app may not replace:

- a DM’s improvised ruling;
- a DM’s narration or interpretation;
- a kid’s choice or conversation with the table;
- the group’s shared authorship of the story;
- the social and physical presence of playing together.

## Success

**Mission:** Make the fun bit bigger and the bullshit bit smaller.

The product succeeds when:

- the DM can prepare as much complexity as they want before play;
- the DM can retrieve prepared information with a glance when needed;
- preventable structural problems are found before the session;
- kids can review what they need without becoming dependent on the device;
- the table spends more time in imagination, choice, discovery, and conversation;
- the device disappears from attention whenever it is not doing useful work.

## Explicitly out of contract

**Mission:** Keep the product from drifting into a different kind of product.

The following are out of contract unless this agreement is deliberately revisited:

- making the tablet the game surface;
- turning the kid app into an interactive player-control system;
- automatic story revelation;
- an app-owned universal rules engine;
- invented rulings or AI narration during play;
- requiring child profiles or personal child details;
- gamification designed to increase screen time;
- judging story quality, creativity, or fun;
- forcing the DM to fix every warning before play;
- making immediate system portability a prerequisite;
- fully planning document-reveal and puzzle features now.

## Implementation boundary

**Mission:** Turn this contract into staged product work without smuggling in decisions that belong at
the table.

This contract changes the product direction but authorizes no implementation by itself. The next
step is a Plan that translates these principles into staged work across the existing DM, map,
reference, and kid-facing surfaces.

The contract document itself is the only path changed by this readiness stage:

- `docs/Contracts/prepare-play-present.md`

Verification for future implementation must include focused automated checks, the applicable real
table test, and the repository documentation checker. Manual table observation remains necessary
for judging whether the app actually keeps attention on the people and the story.
