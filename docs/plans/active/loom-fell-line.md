# The Loom: Fell Line — rebuild the tapestry as a session grid

> **Status:** Stage 2 complete — the tapestry renders as a session-column grid with pinned thread labels, real/quiet/outside-life cells, and the stitch overlay is deleted. Stage 3 (cloth, fell line, warp) next.

- **Area guide:** [The Loom](../../areas/loom.md).

## What we're building & why

The tapestry works but can't be managed. Every lane packs its cards independently, so the x-axis
means nothing: the same session sits at a different horizontal spot in each thread, cross-lane links
are drawn as long crossing diagonals, the weft line under the cards encodes nothing, and "which node
is active" is answered by two competing badges derived from two near-duplicate stubs. Six shipped
plans have restyled this without fixing it, because the demo fixture is too small to crowd.

We're making the horizontal axis mean **campaign time**. A column is one played session, banded
across every thread; a thread holds at most one card per session, and an empty cell honestly means
that thread was quiet that night. The boundary between played sessions and planned beats becomes the
**fell line** — the weaving term for where finished cloth ends and open warp begins. Left of it is
cloth: cards abutting on a woven ground, fixed. Right of it is warp: beats floating on an open
tensioned line, unresolved and unscheduled, with the first slot read downward giving every thread's
next beat at a glance. Sessions become real ordered records, a card belongs to exactly one thread,
and cross-thread sharing retires along with the stitch overlay it existed to draw.

The new demo fixture in `data/seeds/` is the verification artifact: six threads over eight sessions,
built so every stage has something in it that must not break — a thread woven off mid-grid, a thread
cold for three consecutive picks, a second-order spawn, a thread opened in the newest column, beats
carried up to three times, fulfil provenance where the played wording differs from the planned one,
and three banked beats with three different provenance shapes.

## Stages

1. **Sessions become real; a card belongs to one thread.** Add ordered session records, move thread
   membership and column placement onto the node itself, and retire the node↔thread join table along
   with shared sessions and the move endpoint's also-add mode. Update the seed loader and exporter so
   the new fixture loads cleanly and round-trips. *Fixture proves:* all 45 nodes load, both spawn
   origins resolve, banked beats survive with `thread_id` unset, and one card per thread per session
   is enforced by the database rather than by convention.

2. **The grid.** Re-render the tapestry as session columns with pinned thread labels down the left:
   real cells, quiet cells, and cells outside a thread's life rendered as three distinct things.
   Delete the stitch overlay and its geometry, and drop the card elements the grid now carries by
   position. *Fixture proves:* Lost Puppy shows `# # # - #E . . .`; Hat Thief shows five leading
   blanks before its Start; Hunters is quiet in the newest column.

3. **Cloth, fell line, warp.** Commit the material break — woven ground and abutting cards on the
   left, brass fell edge, open tensioned line and floating beats on the right — plus terse card
   content, selvage caps, spawn markers, carry chips and notes dots, all on existing tokens.
   *Fixture proves:* all six thread colors are live; carry counts of 1×, 2× and 3× are legible;
   Lost Puppy's End reads as bound cloth rather than a queue item; verified at 80–150% zoom.

4. **A rail that suits terse cards.** Drop the Threads list now duplicated by the lane labels, and
   make the inspector the place a card's full detail and full action set live. *Fixture proves:*
   every node with notes is reachable and readable; the restored beat's provenance is intelligible
   despite pointing at a thread it no longer belongs to.

5. **Logging a session.** One guided pass that opens the new column and walks each thread: what
   happened, and what becomes of that thread's pending beat — done, not reached, or banked — with
   not-reached bumping the carry count and quiet threads recorded explicitly rather than by omission.
   *Fixture proves:* logging session 9 over this state produces a correct ninth column, including
   leaving Lost Puppy alone because it is already woven off.

6. **Editing the plan side.** Reorder beats within a queue, move them across threads, bank and
   restore them, and reach the common actions from the card without a trip to the rail. This stage's
   stop condition includes a real-browser check, not just unit tests: the last rebuild of these drop
   targets passed its unit tests while being unusable in Chrome.

**Deliberately not now:** compressing older columns as cloth winds onto the beam. It is the right
idea and the same metaphor, but it is a second bold element and the plan already has one.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 — Sessions as records | Added `loom_sessions` table and rebuilt `loom_nodes` with `thread_id`/`session_id`/`position`/`carried_count`, deleted the `loom_node_threads` junction table, and retired shared sessions. Seed loader, exporter, Pydantic models, router endpoints, and 63 backend tests ported to the new contract; 6 threads / 8 sessions / 45 nodes load and round-trip cleanly. |
| 2 — The grid | Rewrote frontend types to the session-grid contract (`LoomNode` with `thread_id`/`session_id`/`position`/`carried_count`, new `LoomSession` type), deleted the stitch overlay (`LoomStitchLayer`, `stitchGeometry`, `useCardRects`, `swimlaneTypes`, `ThreadChips`, `loomThreadsContext`), and replaced swimlane rendering with a session-column grid (pinned thread labels, real/quiet/outside-life cells, warp beats after last column). All consumer files updated, 992 frontend tests passing.
