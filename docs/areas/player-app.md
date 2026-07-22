# Player App Area Guide

> **Active plan:** [Player App Skeleton](../plans/active/player-app-skeleton.md) (next up).

## Scope

Owns everything under `/play` — the kid-facing app: its shell, its navigation, its components, the
player-view transform that decides what a kid may see, and the storage of what the party has earned
(fog, and later per-object knowledge). It does not own the DM app, the Map Lab renderer, or any
domain's authored truth; it reads those through the shared API.

The player app is a separate app that happens to share a build and a database — not a filtered view
of the DM app. Features are added to it deliberately or not at all.

## Domain vocabulary

**Player App**:
The kid-facing app mounted at `/play`, with its own shell, navigation, and components. Shares the
API, the design tokens, and the pure model modules with the DM app; shares no components with it.
_Avoid_: player mode, kid mode, play mode — "mode" implies a flag inside the DM app, which this
deliberately is not. Note that **play** is already a surface *mode* in `UX_PATTERNS.md`; the two are
unrelated and must not be conflated.

**Curtain**:
The single player-view transform taking the full layout plus what the party has earned and returning
the player-visible layout. Every kid-facing component consumes only its output. The DM's preview of
what the players can see calls the same transform, so it is literally correct rather than
approximately.
_Avoid_: filter, sanitiser, redactor — and note this is explicitly *not* a sanitising API; the
concealment is client-side and deliberately so.

**Value**:
What is true of an object right now — locked, trapped, open. Toggles both ways. Already modelled as
`PassageFlags` plus `map_session_state`.
_Avoid_: state, which is too generic.

**Knowledge**:
What the party has learnt about an object — that it exists, that it is lockable, that it is trapped,
what it contains. **Ratchets forward only**; the party never un-learns. Stored separately from Value
and never confused with it.
_Avoid_: discovered flags, seen state.

**Fog**:
The revealed-cell set for a dungeon: one flat set of absolute cells, permanent, per dungeon. There is
exactly one fog layer, so "can they see cell [4,7]?" has exactly one answer. A room's revealed-ness is
a derived read over its cells — fully, partly, or not shown — never a stored boolean.
_Avoid_: fog of war (this is a knowledge ratchet, not atmosphere), visibility layer, explored rooms.

**At the table**:
The one dungeon currently being run, marked server-side from the DM's session view. The kid device
shows whatever is at the table and never chooses for itself.
_Avoid_: active dungeon, current dungeon, selected dungeon.

## Read first

`../UX_PATTERNS.md` (especially *Operators*), `../DESIGN_SYSTEM.md`, `../API_REFERENCE.md`,
`../DATA_MODEL.md`, `../ARCHITECTURE.md`, and `../TESTING.md`. For the settled design intent behind
the whole sequence, `scratch/dm-player-split-intent.md` — user-owned, read only when explicitly
named.

## Source map

- Frontend: `frontend/src/player/` (shell, navigation, kid components) and the player-view transform.
- Backend: the fog and at-the-table endpoints.
- Tests: colocated player frontend tests, and router tests for the fog store.

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Player shell | `/play` | play | kid |
| Kid map | `/play/map` | play | kid |

Both are read-only and offer no route out of `/play`. The kid map is the party-shared, identity-free
surface: it records information, which is shared by nature. Personal surfaces (spells, gear) arrive
in a later plan and are the ones that need to know who is holding the tablet.

## Invariants

- **Nothing under `/play` writes.** Every mutation of shared truth happens on the DM's device. This
  is not a limitation to be lifted; it is what keeps the distributed design cheap.
- **`player/` may import from `api/`, `theme.css`, and pure model modules only** — never components
  from `features/`. This is the whole discipline of separate builds at the price of a convention, and
  it is enforced mechanically.
- **All concealment flows through the curtain.** No kid-facing component reads raw dungeon data. The
  risk being managed is ordinary carelessness, not a kid with devtools, and tests cannot catch it
  because they assert what is shown rather than what is absent.
- **Knowledge ratchets; value oscillates. They are stored separately and never confused.**
- **There is exactly one fog layer.** Two layers would mean two answers to one question, a seam
  between inside and outside, and no way to express a partially revealed room.
- **No position tracking, ever.** The map records information, not where anyone is standing. Combat
  happens on the table; building a good enough digital position tracker is how the table quietly
  stops being where the game is played.
- **The app informs; it never adjudicates.** No rules enforcement, no slot or HP tracking, no dice.
  The binder holds state, the app holds reference, the DM holds the ruling.

## Work queue

- [Player App Skeleton](../plans/active/player-app-skeleton.md) is next up: the `/play` shell, the
  import rule, the promoted shared model, the empty fog and curtain seams, and a live map on the
  tablet.
- Then, in order: fog as a working ratchet; the per-object knowledge model; ambient identity and the
  personal surfaces.
- Gear and weapons are an open branch and have no plan. Whether there is a third kid destination at
  all is undecided, and the question of whether a kid surface should be shaped as a decision tree
  rather than a browsable list should be settled before the personal surfaces are designed.

## Cross-references

`dungeons.md` owns the Map Lab renderer and authored dungeon truth that this area reads.
`players.md` and `spells.md` own the records the personal surfaces will read.
`../UX_PATTERNS.md` owns the kid operator rules.
