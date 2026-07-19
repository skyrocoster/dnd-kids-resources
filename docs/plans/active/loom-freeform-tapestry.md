# Freeform Tapestry — rearrange the loom by hand, on a canvas that survives zoom

> **Status:** Stages 1-3 shipped. Stage 4 (unified right rail) is next.

- **Area guide:** [The Loom](../../areas/loom.md)

## What we're building & why

Today the tapestry renders as a horizontal card-rail: only beats reorder, and only within their own
lane; sessions can't be moved at all; the canvas overlaps itself past 100% browser zoom; and the right
panel is a static inspector plus a glyph "keys" legend and a separate bottom beat tray. It works but it
doesn't read as *a loom*, and it can't be arranged by hand.

We're making the whole tapestry hand-arrangeable and committing the visuals to the weaving metaphor.
Any body node can be dragged to any position in any lane; Start and End stay fixed as the **selvage**
(the bound edges of the cloth). Each lane becomes a continuous **weft line** that nodes are threaded
onto — the one signature element — so a lane stays legible at any zoom instead of collapsing into
overlapping cards. Cross-lane connections become glanceable **interlacements** that light up on
selection. The right side collapses into one rail — inspector, selectable threads, and a draggable beat
bank — and selecting a swimlane selects its whole thread. Colors and type stay on the existing MD3 loom
tokens; the work is structure, interlacement, and interaction, not new decoration.

## Stages

1. **Move contract (backend).** Add an atomic endpoint that moves a placed beat or session to another
   thread at a target position in one transaction. A beat (thread-exclusive) always moves. A session
   that belongs to only that one thread moves; a session shared across several threads takes an explicit
   mode (move vs. also-add) and never silently loses its other memberships. Start/End stay immovable.
   Update `API_REFERENCE.md` and router tests.
2. **A loom that survives zoom.** Restructure the lane so nodes sit on a continuous weft line bounded by
   fixed selvage caps that never overlap the body, size cards and lanes in relative units, and size the
   stitch SVG to the full scroll-content extent so it tracks under scroll and browser zoom. Verified
   legible at 80–150% zoom.
3. **Free drag placement.** Make both beats and sessions draggable to any gap in any lane. Reorder within
   a lane; cross-lane placement calls the Stage 1 move (beat = move; sole-membership session = move;
   shared session = prompt move-vs-add). Keep an accessible keyboard path. Start/End never accept a drop.
4. **Unified right rail.** Replace the weaver panel, the bottom beat tray, and the glyph legend with one
   rail holding an Inspector, a selectable Threads list, and a Beat Bank of draggable beats — drag a beat
   out onto a lane to place it and drag a placed beat back to bank it. Redesign the inspector and empty
   state to the weaving language.
5. **Thread selection.** Selecting a swimlane (its header or background) selects the whole thread and the
   rail shows a thread inspector with thread-level actions; the selected thread and its interlacements
   highlight while the rest dims. Node selection and thread selection are mutually exclusive.
6. **Glanceable interlacements + final pass.** Redesign cross-lane stitches and spawn links to be
   thread-colored, weightier, labeled where a session is shared, and emphasized on hover/selection;
   finish the woven-cloth visual pass (selvage caps, weft line, tokens only) with reduced-motion and
   focus states verified.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added `POST /api/loom/threads/{thread_id}/items/{node_id}/move` — atomically relocates a placed beat or session to another thread at a position in one transaction. Beats and sole-membership sessions move unconditionally; a shared session requires `mode: "move"` or `"also_add"`; Start/End are immovable. |
| 2 | Lanes now render a continuous weft line under body nodes with solid selvage caps that fully occlude it, the stitch SVG overlay sizes to the scroll container's full content extent (not just the viewport) so stitches track under scroll/zoom, and lane/card/gap sizing was converted from fixed `px` to `rem` to scale as one system with browser zoom. |
| 3 | Sessions (not just beats) are draggable across lanes; a cross-lane drop calls the Stage 1 move endpoint directly for beats/sole-membership sessions, or prompts Move-vs-Also-add for a shared session. Whole card-groups (not just the narrow gap sliver) are now the drop target, fixing a real-browser bug where dropping on a card did nothing. |
