# Players — Domain Vocabulary

Companion to [players.md](players.md).

## Player

A persisted playable character record. It may include the character's name, the child's/player's
name, recovery details, and assigned spell and weapon rosters.
_Avoid_: pc, hero

## Recovery Profile

The authored facts needed to reconstruct a paper character sheet. It is reference data, not an
interactive sheet or rules engine.
_Avoid_: live sheet, character engine

## Spell Roster

The set of shared Spell records assigned to one Player.
_Avoid_: spellbook, when referring to the stored relationship contract

## Weapon Roster

The set of shared Weapon records assigned to one Player.
_Avoid_: inventory, which would also imply non-weapon Items

## Player App

The kid-facing app mounted at `/play`, with its own shell, navigation, and components. Shares the
API, the design tokens, and the pure model modules with the DM app; shares no components with it.
_Avoid_: player mode, kid mode, play mode — "mode" implies a flag inside the DM app, which this
deliberately is not. Note that **play** is already a surface *mode* in `UX_PATTERNS.md`; the two
are unrelated and must not be conflated.

## Curtain

The single player-view transform taking the full layout plus what the party has earned and returning
the player-visible layout. Every kid-facing component consumes only its output. The DM's preview of
what the players can see calls the same transform, so it is literally correct rather than
approximately.
_Avoid_: filter, sanitiser, redactor — and note this is explicitly *not* a sanitising API; the
concealment is client-side and deliberately so.

## Value

What is true of an object right now — locked, trapped, open. Toggles both ways. Already modelled as
`PassageFlags` plus `map_session_state`.
_Avoid_: state, which is too generic.

## Knowledge

What the party has learnt about an object — that it exists, that it is lockable, that it is trapped,
what it contains. Normally advances during play, but the DM can reverse any fact to correct an
accidental disclosure. Stored separately from Value and never confused with it.
_Avoid_: discovered flags, seen state.

## Fog

The revealed-cell set for a dungeon: one flat set of absolute cells, reversible by the DM, per dungeon. There
is exactly one fog layer, so "can they see cell [4,7]?" has exactly one answer. A room's
revealed-ness is a derived read over its cells — fully, partly, or not shown — never a stored
boolean.
_Avoid_: fog of war (this is spatial disclosure, not atmosphere), visibility layer, explored rooms.

## At the table

The one dungeon currently being run, marked server-side from the DM's session view. The kid device
shows whatever is at the table and never chooses for itself.
_Avoid_: active dungeon, current dungeon, selected dungeon.
