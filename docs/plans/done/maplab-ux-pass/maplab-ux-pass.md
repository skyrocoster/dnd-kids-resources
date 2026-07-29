# Map Lab UX Pass — a calm, touch-first editor and viewer

> **Status:** Complete. All eight stages shipped; no further work remains in this Plan.

- **Area guide:** [Dungeons](../../../areas/dungeons.md)
- **Read trigger:** Map Lab editor/viewer chrome, gestures, brushes, undo, or tablet-layout history


## What we're building & why

The Map Lab editor has every function it needs but presents them all at once: a five-tray toolbar of
~21 always-visible controls, two permanent side rails, and canvas interactions built on hover events
that fail on touch. On the tablet it is cluttered and hard to operate; on desktop it wastes space.
This pass reshapes the chrome (tool palette + popovers, tablet drawer + bottom sheet), replaces the
broken drag interactions with one consistent brush model, fixes a cross-floor door rendering bug,
and adds the forgiveness layer (undo/redo, consistent deletes, non-shifting errors) that a brush
editor needs. Desktop and tablet are both first-class. The session view gets the same patterns in a
final stage.

This plan **explicitly owns** Map Lab zoom/pan, gesture routing, fullscreen chrome, and the editor
interaction model (see the Dungeons area invariant that reserves those for a focused plan). It also
owns the editor-scoped keyboard shortcuts it introduces (UX_PATTERNS §Keyboard requires a plan to
own any new shortcuts).

## Settled decisions (do not re-litigate; orders inherit these)

- **Tool palette, sticky tools, five slots.** One compact palette replaces the toolbar:
  **Select** (default) · **Room** · **Passages** (Door/Stair/Portal) · **Prop** · **Terrain**
  (River/Trees). A tool stays armed until another is chosen or Esc. Grouped slots (Passages,
  Terrain) remember their last-used sub-tool: tap re-arms it, chevron or long-press opens the
  flyout. An **Erase** toggle appears only while a brush tool (Room/River/Trees) is armed.
- **Prop kind chips at placement.** While the Prop tool is armed, a row of kind chips (Chest, Table,
  Mirror, Barrel, Statue, Window, Encounter, NPC, Other) occupies the same options slot the Erase
  toggle uses for brushes; the chosen kind is stamped directly. Encounters stay a prop kind in both
  data and UI — no separate encounter tool; the chip replaces the place-a-chest-then-fix-the-kind
  dance.
- **NPC is a new prop kind.** Mirroring the existing `encounter` kind exactly: prop kind `npc`
  carries an `npc_id` chosen via an NPC picker field (the analog of `encounterPicker` in
  `fixtureTypes.ts`), renders with its own icon, and inherits placement, marker grouping, passage
  flags (hidden NPCs are legitimate), layer visibility, and seed export for free. No new
  first-class marker type.
- **NPC markers are a derived union with room NPC lists.** Room views (details panel, viewer room
  rail) display the explicit room-NPC list plus any NPC markers standing in the room — read-only
  derivation, no write-back in either direction. Map edits never mutate room content data. The kid
  `/play` surfaces are out of scope here (Player App area owns the curtain transform).
- **Popovers.** A **View** popover holds the four layer toggles (Outside/Props/Passages/Labels),
  Ghost lower floor, and Detailed/Auto/Simple density. A **Map** popover holds the four padding
  inputs and Reset unsaved changes (behind a ConfirmDialog). Save status moves to the shell header.
- **One brush model.** Rooms, rivers, and trees all paint identically: one finger/pointer drags to
  paint cells, Erase removes them, two fingers always pan/zoom. Built on pointer capture plus
  coordinate hit-testing — never `pointerenter` during drag. The first-cell add/remove "locking"
  mechanic and the two-corner/rectangle room flow are removed entirely.
- **First stroke creates.** Room tool + no room selected + painting empty ground creates a room from
  the stroke and selects it; with a room selected the brush extends/erases it. The toolbar
  "Add room" button is removed; a "New room" affordance in the rooms drawer deselects so the next
  stroke starts fresh. Invalid cells (owned by another room) simply don't paint.
- **Doors:** keep tap-the-wall, with wide touch bands (~40px deep per side) and a visible highlight
  on placeable walls while the Door tool is armed.
- **Gesture routing replaces the blocklist.** The `NON_PAN_TARGET_SELECTOR` mechanism in
  `useMapCanvasZoom.ts` is deleted, not extended: which gesture a pointer starts is decided by the
  armed tool (brush armed → one pointer paints; Select → one pointer pans on empty ground or taps
  to select). The existing two-pointer pinch implementation is kept as-is — it is already correct.
- **No toasts** (UX_PATTERNS, IN FORCE). Placement refusals, save failures, and delete/undo feedback
  use a **canvas status chip**: a single `role="status"` chip anchored inside the map viewport
  (bottom-center), persisting until the next action — never on a timer, never shifting layout.
- **Undo/redo** is session-scoped over layout mutations (paint strokes, placements, fixture edits,
  deletes), surfaced as an on-screen Undo/Redo control on the canvas and Ctrl+Z / Ctrl+Shift+Z on
  desktop. Fixture deletes (door/prop/stair/portal/feature) become instant with the reverse action
  ("Deleted door. Undo" in the status chip) instead of a confirm. Room deletion keeps
  `ConfirmDialog` (`Delete "<name>"? This cannot be undone.`) because room content is dual-saved
  beyond the layout blob.
- **Left rail → tablet drawer.** Desktop keeps a slim docked rail (Floors, Rooms, Connections). On
  coarse-pointer/narrow viewports it collapses behind one edge button and overlays the map
  (UX_PATTERNS §Viewport-contained workspace scrolling, Loom precedent). Floor chips stay visible
  at all times outside the drawer.
- **Inspector → tablet bottom sheet.** Desktop keeps the docked right rail but hides it entirely
  when nothing is selected. On tablet, selection opens a bottom sheet: peek height (name +
  close/delete) drags up to full for the room content editor.
- **Empty-ground tap menu removed** (`cellActionMenu` in `MapLabEditorPage.tsx`) — the sticky
  palette covers everything it did.
- **Touch floor 48px** (`--control-height`) for all chrome on coarse pointers; canvas glyphs remain
  the documented DESIGN_SYSTEM exception.
- **Zoom buttons** anchor on the viewport center (reuse the wheel handler's anchor math);
  wheel/pinch behavior otherwise unchanged.
- **Visual scope:** new surfaces (palette, popovers, drawer, sheet, chip) are designed properly
  against the MD3 tokens as built; no restyling sweep of existing map rendering or forms.
- **Hotkeys (desktop, editor-scoped, ignored while a text input has focus):** V Select, R Room,
  D Door, P Prop, S Stair, O Portal, W River, T Trees, E Erase toggle, Esc disarms to Select or
  closes the topmost layer, Ctrl+Z / Ctrl+Shift+Z undo/redo. Sub-tool hotkeys (D/S/O, W/T) arm the
  sub-tool directly and update the group slot's last-used memory.

## UX decisions — Map Lab editor

```
Surface:      Map Lab editor (/dungeons/:dungeonId/edit) — areas/dungeons.md Surfaces row exists, unchanged
Mode:         prep (touch-capable: tablet and desktop both first-class)
Operator:     DM
Focal:        the map canvas — it wins by space; all chrome is collapsible, overlaid, or on demand
Route shape:  bespoke canvas editor (existing; not record-shaped)
Edit style:   direct controls on the canvas; inline panel for the selected thing
              (docked right rail on desktop, bottom sheet on tablet) — never a modal over the canvas
Save:         autosave with debounce (existing reducer), status chip in the shell header
              idle → saving → saved → error
Empty:        keep the existing line: "No saved layout yet. Your first edit will save this blank map."
Filtered empty: n/a — the editor has no filtered lists (rooms drawer is unfiltered)
No selection: desktop right rail and tablet sheet are absent entirely; rooms drawer empty state
              keeps "No rooms on this floor yet."
Load failure: MapLabRouteState (StatePanel-equivalent) error fills the editor body (existing)
Action failure: canvas status chip, bottom-center inside the map viewport, role="status",
              persists until the next action (placement refusals, save failure detail)
Destructive:  room delete → ConfirmDialog "Delete "<name>"? This cannot be undone."
              fixture deletes → instant + reverse action: chip "Deleted <thing>. Undo"
              Reset unsaved changes → ConfirmDialog "Discard unsaved changes and restore the last
              saved layout?"
Keyboard:     tab order is DOM order; palette/popovers are native buttons; hotkeys per Settled
              decisions; Esc closes topmost layer (popover, drawer, sheet) before disarming to Select
Touch:        48px floor for all chrome; exceptions stay limited to the documented canvas glyphs;
              door placement uses ~40px-deep wall touch bands
```

## UX decisions — Map Lab session view (final stage)

```
Surface:      Map Lab session view (/dungeons/:dungeonId) — areas/dungeons.md Surfaces row exists, unchanged
Mode:         play — glanceable, interruptible, large targets, never loses session state
Operator:     DM
Focal:        the map canvas; room rail and controls yield to it
Route shape:  bespoke canvas viewer (existing)
Edit style:   direct controls on the thing itself (passage toggles), per UX_PATTERNS §Inline versus modal
Save:         session toggle state persists on the backend (existing map_session_state) — unchanged
Empty:        existing viewer empty/loading states unchanged
Filtered empty: n/a — no filtered lists
No selection: keep the existing room-rail/no-room behavior; copy unchanged
Load failure: MapLabRouteState error fills the body (existing)
Action failure: same canvas status chip pattern as the editor
Destructive:  "Reset dungeon" keeps its existing ConfirmDialog
Keyboard:     no viewer-specific hotkeys added; Esc closes topmost layer
Touch:        48px floor; layer/density controls move into the same View popover; the room rail
              becomes a drawer on tablet with floor chips always visible; session passage toggles
              stay in persistent chrome (UX_PATTERNS §Persistent play actions)
```

## Stages

1. **Fix the cross-floor door leak.** Active-floor room walls and door-placement edges are computed
   against every door in the layout, so a door on the ghosted floor below cuts a hole in the wall
   above it. Use the floor-filtered door list that both pages already compute
   (`doorsOnActiveFloor` at `MapLabEditorPage.tsx:1086` and `:358`; `doorsOnFloor` at
   `MapLabPage.tsx:731`). Pure bug fix with regression tests; ships independently of everything
   below. `PlayerMapRenderer.tsx` already does this correctly and is the reference.
2. **Gesture core.** Replace `NON_PAN_TARGET_SELECTOR` in `useMapCanvasZoom.ts` with tool-aware
   gesture routing; add the pointer-capture + coordinate hit-testing pipeline that maps a dragged
   pointer to grid cells; keep the existing pinch implementation; center-anchor the +/− zoom
   buttons; ensure `touch-action: none` on the canvas viewport. No visible tool changes yet — the
   existing interactions ride on the new routing.
3. **Tool palette and popovers.** Replace the five-tray toolbar with the five-slot sticky palette
   (Select default; Passages and Terrain group slots with last-used memory and flyouts; Erase
   toggle for brushes; prop kind chips while Prop is armed), the View popover, the Map popover
   (padding + Reset behind ConfirmDialog), save status in the shell header, and remove the
   empty-ground tap menu. One-shot placement behavior becomes sticky for Prop/Stair/Portal here.
4. **Brush model.** Rooms, rivers, and trees paint via the stage-2 pipeline with paint/erase;
   remove the two-corner footprint flow, the drag-rectangle flow, and the feature-draw locking
   mechanic; first stroke on empty ground with Room armed creates a room; "New room" affordance in
   the rooms rail; invalid cells don't paint. Fat door edge targets (~40px bands with visible
   highlight) land here too.
5. **Forgiveness layer.** Session-scoped undo/redo over layout mutations with on-canvas
   Undo/Redo controls; canvas status chip replaces the layout-shifting placement-error line;
   fixture deletes become instant with "Deleted <thing>. Undo" in the chip; room delete keeps
   ConfirmDialog; desktop hotkeys per Settled decisions.
6. **Responsive shell.** Left rail becomes a tablet overlay drawer with always-visible floor chips;
   inspector becomes a tablet bottom sheet (peek → full) and the desktop rail hides when nothing is
   selected; 48px touch-target sweep across all editor chrome.
7. **NPCs on the map.** Add the `npc` prop kind mirroring the `encounter` precedent: NPC picker
   field in `fixtureTypes.ts`, marker icon, prop kind chip. Room views (room details panel, viewer
   room rail) display the derived union of the explicit room-NPC list and NPC markers standing in
   the room, read-only, no write-back.
8. **Session view pass.** Apply the same patterns to the viewer: View popover for layer/density
   controls, room rail as tablet drawer, status chip, touch-target sweep — while keeping session
   toggles in persistent chrome and all existing session-state behavior.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Editor and viewer room walls (and editor door-placement edges) now use the floor-filtered door list, so a door on a ghosted lower floor no longer cuts a hole in the wall above it. Regression tests cover stacked single-cell rooms in both pages. |
| 2 | Created `canvasGrid.ts` with `cellFromClientPoint` and Bresenham `cellsBetween` for gap-free stroke cell resolution. |
| 2 | Replaced `NON_PAN_TARGET_SELECTOR` blocklist with tool-aware `PointerMode = 'pan' | 'tool'` gesture routing; updated editor and viewer to supply the mode, with tests verifying pan-from-anywhere (unarmed) and no-pan-during-selection (armed). |
| 2 | Built `useCanvasStroke` hook — pointer-capture stroke pipeline with stale-closure fix (ref-read pattern), emitting de-duplicated gap-filled cell sequences for brush consumption. |
| 2 | Center-anchored `zoomIn`/`zoomOut` buttons using viewport-centre math (same as `handleWheel`), with the viewport-size param plumbed from both pages. |
| 3 | Save status chip now portals into `DungeonShell`'s header via a new `DungeonShellStatusSlotContext`, out of the editor toolbar. |
| 3 | Replaced five separate placement-mode booleans with one `armedTool` state driving a five-slot sticky palette (Select/Room/Passages/Prop/Terrain) with group-slot last-used memory and flyouts; Prop/Stair/Portal placement no longer auto-disarms after one placement; the empty-ground tap menu (`cellActionMenu`) is removed. |
| 3 | Added an Erase toggle for brush tools and a Prop-kind chip row (from newly-exported `PROP_KIND_OPTIONS`) in the palette's options slot; `addProp` now threads an optional `kind` through the reducer. |
| 3 | Replaced the "View" toolbar tray with a View popover (layer toggles, Ghost lower floor, density) using a click-outside/Escape popover pattern. |
| 3 | Folded the "Session" and "Map" toolbar trays into one Map popover (padding inputs + Reset), with Reset now gated behind `ConfirmDialog` instead of firing instantly. |
| 4 | Wired `useCanvasStroke` through `MapCanvas` and replaced the room footprint flow with the sticky Room brush: first stroke can create a room, selected rooms can be painted or erased, and the rooms drawer now has a New room affordance. |
| 4 | River and trees drawing now use the same pointer-capture stroke model with Erase support, removing the pointer-enter locking overlay. |
| 4 | Door placement keeps tap-to-place behavior but now exposes wide wall hit bands with visible hover/focus highlighting, while placement tools remain sticky for repeated authoring. |
| 5 | Added session-scoped layout history to the editor reducer and hook, with autosaving Undo/Redo actions, redo invalidation after a new edit, and history clearing at load/reset seams. Room deletion remains outside reversible history. |
| 5 | Added on-canvas Undo/Redo controls and a bottom-center persistent status chip, moving placement refusal feedback into the map viewport without displacing layout. |
| 5 | Fixture and feature deletes now complete immediately with `Deleted <thing>. Undo`; room deletion keeps a named `ConfirmDialog` because it spans layout and dungeon data. |
| 5 | Added editor-scoped desktop tool, erase, undo/redo, and layered Escape hotkeys while preserving DOM tab order and ignoring text-entry focus. |
| 5 | Repaired Stage 5 test fixtures so the full production TypeScript build accepts the domain-typed door sides and layout history fixtures. |
| 6 | At tablet widths the editor's Floors/Rooms/Connections rail is an overlay drawer while floor chips remain visible; selections use a peek-to-full bottom sheet, and desktop no longer reserves an empty inspector rail. All editor chrome now meets the 48px touch floor, with layered Escape and existing edit/delete behavior preserved. |
| 7 | `npc` is now a prop kind alongside `encounter`, carrying an `npc_id` soft reference, its own `UserIcon`/`--md-npc` marker identity, and a palette kind chip — no new first-class marker type, and it round-trips through the layout blob for free. |
| 7 | The prop inspector gained an NPC picker field (`npcPicker`) listing live NPCs by name, mirroring the encounter picker. |
| 7 | Added `npcIdsFromMarkersInRoom` and `getNpcUnion` to the model layer; the room details panel now shows the explicit room-NPC list unioned with NPC markers standing in the room, de-duplicated and read-only, and renders even when the room has no content data. |
| 7 | The viewer room rail shows a `1 NPC` / `<n> NPCs` count hint from the same union, and its hint row is relabelled `Room hints` now that it carries more than threats. |
| 7 | Restored the `src/model/` import rule (ARCHITECTURE.md §Frontend layout) that the union helper had breached, and replaced an NPC test fixture whose invented statblock fields passed vitest but broke `tsc -b`. |
| 8 | Replaced the viewer's View tray with an accessible View popover for layer and density controls while keeping live Session actions directly visible. |
| 8 | At tablet widths the viewer room rail now overlays the map as a dismissible drawer, closes on selection/backdrop/Escape, leaves floor chips visible, and keeps viewer chrome at the 48px touch floor. |
| 8 | Session save, reset, and at-table failures now share one persistent bottom-center canvas status chip that clears on the next viewer action; optimistic session-state persistence and Reset confirmation remain unchanged. |

## Known test failures

The Stage 7 reconcile full frontend run (`npm run test`, 2026-07-25) passed 1,311 tests and still failed on the same 11 pre-existing or out-of-stage tests as Stage 6 — verified name-for-name, so the stage introduced no regressions. `npm run build` and the backend `pytest` suite (97.25% coverage) both pass. Carry these verbatim into the next Map Lab work orders until they are retired by their owning plan or a focused fix:

- `DungeonBrowserPage.test.tsx` > `Back to dungeons clears the selected detail`
- `EncounterBrowserPage.test.tsx` > `Back to encounters clears the selected detail`
- `LootBundleBrowserPage.test.tsx` > `Back to loot bundles clears the selected detail`
- `ItemBrowserPage.test.tsx` > `Back to items clears the selected detail`
- `MonsterBrowserPage.test.tsx` > `Back to monsters clears the selected detail`
- `NPCBrowserPage.test.tsx` > `Back to NPCs clears the selected detail`
- `PlayerBrowserPage.test.tsx` > `shows filtered-empty state and returns from the detail view`
- `PlayerBrowserPage.test.tsx` > `discards staged spell changes on Cancel without calling the API`
- `MapLabPage.test.tsx` > `renders the door as a leaf + swing arc, never a straight line matching a wall segment`
- `MapLabPage.test.tsx` > `toggles door open/closed via session state controls`
- `MapLabPage.test.tsx` > `resets all session overrides via a reset button`
