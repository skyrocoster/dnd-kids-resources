# Map Lab Editor Usability — the map fills the screen, and every tool is reachable

> **Status:** Stages 0–7 shipped. Feature complete.

- **Area guide:** [Dungeons](../../../areas/dungeons.md)

## What we're building & why

Two CSS regressions had collapsed the Map Lab toolbar to a 6px sliver on both surfaces, hiding every
drawing tool in the editor and the **At the table** action in the viewer — the latter a direct breach
of *Persistent play actions*. Fixing that (Stage 0) exposed a cluster of faults underneath it: the
passage flyout renders zero visible pixels, so Portal placement is unreachable; Prop expands inline
and shoves the whole page down 112px; 51% of the editor's height is chrome before any map appears;
the room list is clipped and unreachable rather than scrolled; and "Fit map to viewport" fits the
padded grid instead of the drawn rooms and then pans away from them — which is why the editor opens
on an empty black corner.

This plan makes the editor honest: everything on one page, every tool reachable, and the map where
you left it. It also stops the editor manufacturing rooms that have no squares — measured at 12 such
ghosts in "Untitled Dungeon" today — while refusing to silently discard rooms that carry authored
prose.

## UX decisions — Map Lab editor & session view

Two surfaces, already registered in the Dungeons area guide's `## Surfaces` table. They share a
toolbar, a canvas and a room rail, so every decision below is stated once and applies to both unless
split.

```text
Surface:      Map Lab editor (/dungeons/:dungeonId/edit) and Map Lab session view
              (/dungeons/:dungeonId) — Dungeons area guide owns both Surfaces rows.
Mode:         both — the session view is play, the editor is prep. Where they share a
              control (floor selector, room rail, fit/zoom), the play surface's rules bind:
              48px targets, no state lost on interruption.
Operator:     DM.
Focal:        The map canvas. It wins by area — this plan takes editor chrome from 436px
              to 164px so the canvas goes 363px -> 635px on an 863px window. Rooms are the
              focal element within it (area invariant); passages, props and terrain are
              reinforcement and must not out-shout them.
Route shape:  bespoke. Map Lab is a canvas workspace, explicitly exempted from the
              Browser/Viewer/Editor triad by UX_PATTERNS §Route shape.
Scroll owners: named per §Viewport-contained workspace scrolling — the document does not
              scroll on either surface; the canvas owns pan/zoom via gesture, never native
              scroll; the room list owns its own vertical overflow and nothing else;
              flyouts overlay and never introduce a scroll region. No region scrolls an
              axis another region already owns.
Edit style:   direct controls on the canvas; inline panel for selected-fixture properties
              (per §Inline versus modal — properties of something selected on a canvas are
              never edited in a modal).
Save:         autosave, debounced, with the existing save-status pill (idle → saving →
              saved → error). Already true; this plan does not change it. Session-scoped
              Undo/Redo stays the safety net.
Empty:        Editor, floor with no rooms drawn: "No rooms on this floor yet. Drag on empty
              ground to start one." (the second sentence already exists as brush help copy,
              so the empty state teaches the same gesture).
              Viewer, dungeon with no layout: StatePanel `empty` filling the canvas region —
              "No map drawn yet. Open Edit map to start one."
              Room list with no rooms: "No rooms found."
Filtered empty: Flyout filter matching nothing: "No tools match that." — shown in the
              flyout body, replacing the list, never an empty box. Distinct from Empty by
              rule; a flyout is never legitimately empty, so it has no Empty state.
No selection: Viewer inspector, unchanged: "Hover or focus a room, door, stair, or prop for
              details."
Load failure: StatePanel `error` fills the canvas region — the region that lost its data.
              Existing copy stands: "Failed to load dungeon layout."
Action failure: The existing in-canvas `maplab-placement-error` chip (`role="status"`),
              which is the placement UX_PATTERNS §Errors already blesses for canvas
              workspaces. Both new messages go there, not into new furniture:
              - placement rejected — existing setPlacementError copy, unchanged;
              - fit hitting the minimum-zoom clamp — "This floor is too large to fit on
                screen. Zoom out further isn't possible; pan to see the rest." The clamp
                must never be reached silently: honours the invariant that no authored map
                content is ever silently clipped by the map's extent.
Destructive:  Three cases, deliberately different, following §Destructive actions:
              - Erasing the last square of an EMPTY room (no title, no entries, no NPCs):
                reversible, so no dialog. The room goes and the canvas chip reads
                "Removed empty room. Undo" — the same reverse-action pattern Map Lab
                already uses for fixture and feature deletes.
              - Erasing the last square of a room that CARRIES CONTENT: not destructive at
                all. The room stays in the list flagged off-map and nothing is lost.
              - Deleting a flagged off-map room from the list: ConfirmDialog, because room
                deletion spans both the layout and the dungeon-data document —
                `Delete "<name>"? This cannot be undone.` This is the existing Map Lab room
                rule and this plan does not weaken it.
              The 12 existing ghosts need no migration script: they carry no title, entries
              or NPCs, so the same empty-room rule collects them the first time their
              layout is normalised.
Off-map flag: Never hue-alone. The flagged row carries the literal text "not on the map"
              plus an icon, not a tint. Clicking the row arms the Room tool to re-place it.
Keyboard:     Focus order is DOM order; no tabIndex above 0.
              - The flyout filter is a real <input>, which the editor's existing hotkey
                guard already excludes (it returns early on input/textarea/select/
                contenteditable). So the settled "must swallow keystrokes" requirement is
                satisfied by the guard that exists — typing "chest" cannot fire S, and
                "table" cannot fire T. Do not add a second suppression mechanism.
              - Enter takes the top filtered match and arms it. Escape closes the flyout.
              - Escape precedence is unchanged and correct per §Keyboard (topmost
                dismissible layer first): flyout → popover → drawer → sheet → disarm to
                Select. The defect is that nothing tells the user, so the armed-tool button
                gains a title/aria hint naming Escape as the way out, and clicking an armed
                tool a second time disarms it — a mouse route that needs no hint at all.
Touch:        48px floor holds; this plan adds no new exception to the DESIGN_SYSTEM list.
              - The 12px rail seam handle is a desktop affordance only: it renders at
                >768px, where it gets a 12px visual with a 48px hit area via pointer
                padding. At ≤768px it does not exist — the existing drawer toggle and
                backdrop remain, and picking a room still closes that drawer.
              - Floor dropdown and flyout filter both keep 48px rows and are usable on a
                tablet at the table; the filter field is optional in every case — the list
                below it is always fully tappable, so no selection requires typing.
Labels:       RESOLVED, and NOT OWNED HERE. Room labels hold a constant on-screen size
              instead of scaling with the map, fade out below a legibility threshold, and
              anchor at a point inside the room's own squares rather than at the cells'
              centroid (which lands outside an L- or U-shaped room). Fitting a real floor
              (36×27 cells) into 1560×635 gives scale 0.367 — a 5ft square at 23px — which
              is why the fitted editor map currently reads as near-black rectangles with
              unreadable names. Constant-size labels are what makes "rooms are the focal
              element" survive a fitted view.
              The same defect is worse on the kid map, so
              [Kid Map Legibility](../kid-map-legibility/kid-map-legibility.md) Stage 2 owns
              the shared label anchor and the constant-size rule for BOTH apps, including
              this plan's four call sites. This plan consumes that work; it does not do it.
```

## Stages

1. **Every tool reachable.** Move all three tool submenus onto one anchored flyout pattern that
   escapes the toolbar's clipping ancestor, so Passages and Terrain stop rendering zero pixels and
   Portal placement becomes possible at all. Prop stops expanding inline. Clicking an armed tool a
   second time disarms it, and the armed button says how else to get out.
2. **Quick-select.** Each flyout opens focused on a filter row: type to narrow, Enter takes the top
   match, nothing typed is required. Confirm the existing hotkey guard already keeps the field from
   firing tool shortcuts, rather than building a second suppression path.
3. **One page.** Reclaim the editor's vertical budget so nothing is clipped and the canvas gets the
   space: floor selection moves into the toolbar row, the page header collapses to one line, and the
   room list scrolls inside its own container instead of overflowing its parent unreachably.
4. **Fullscreen actually edits.** Fullscreen carries the toolbar and room list, and re-fits the map
   on entry instead of keeping a stale pan.
5. **Fit means fit.** Fit targets the drawn rooms rather than the padded grid, centres them, and
   reports the minimum-zoom clamp instead of overflowing silently — which also fixes the editor
   opening on blank canvas. (Room labels are no longer part of this stage: Kid Map Legibility Stage 2
   owns constant-size labels and the shared anchor for both apps.) Canvas
   chrome is tidied in the same pass: the pan hint stops claiming Escape exits fullscreen when it
   doesn't and stops sitting permanently on the map's corner, fullscreen and fit stop sharing one
   icon, and the zoom/undo rail docks to the canvas edge — that last item needed no work: commit
   `b8e5665`, before this plan, had already replaced the flow row below the canvas with the
   absolutely-positioned corner cluster (`.maplab-map-controls`) that "docked" describes.
6. **Viewer rail.** Replace the leaked mobile drawer toggle with the desktop seam handle, keep the
   rail open when a room is picked on desktop, and bring the viewer's floor selection into line with
   the editor's. Correct the CSS comment that claims single-class overrides always beat the shared
   pill base rule, since that belief is what let the toggle leak.
7. **No ghost rooms.** A room whose last square is erased is dropped when it carries nothing and kept
   flagged off-map when it carries authored content, with the reverse action and the confirm rule
   above. Existing empty ghosts are collected by the same rule.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 0 | Toolbar stopped being crushed to 6px: as a shrinkable flex sibling of the canvas layout it lost every pixel to proportional shrink, hiding the whole tool palette and the viewer's **At the table** action. Collapsing a tray stopped destroying the screen: `max-width: 0` on a wrapping row grew it to 0×768px and pushed the tabs, canvas and room list out through `overflow: hidden` with no way back. |
| 1 | Passage, Terrain, and Prop choices now share anchored portaled flyouts that escape toolbar clipping without introducing a scroll region or changing the main tool buttons' accessible names. Armed Room, Passage, Prop, and Terrain buttons now expose the Escape/second-click exit hint and a second click returns to Select. |
| 2 | Passage, Prop, and Terrain flyouts now open on a focused filter row that narrows the visible tools, keeps the exact filtered-empty copy `No tools match that.`, and lets Enter arm the top visible match. Typing in the filter uses the existing input hotkey guard, so tool shortcuts do not fire while filtering. |
| 3 | The editor shell header now collapses to a compact edit-mode row, and the dungeon floor tabs live in the toolbar instead of a separate strip. The editor navigation rail is bounded to the workspace while the room list remains the named internal scroll owner, so the rail no longer stretches the page. |
| 4 | Fullscreen now wraps the toolbar, navigation rail, and canvas together instead of covering only the canvas, keeping Escape exit and body-overflow lock. Entering fullscreen immediately re-fits the map to the viewport so authored content is never hidden behind a stale pan. |
| 5 | Fit now targets the union of drawn rooms rather than the padded grid and centres them in the viewport — `fitToBounds` takes the rendered (padded) bounds as a separate `origin` argument, because pan is measured from the padded content's corner — so the editor no longer opens on blank canvas, and hitting the minimum-zoom clamp reports it through the existing canvas chip instead of overflowing silently. Fit gained its own `Scan` icon instead of sharing `Maximize2` with the fullscreen toggle, and the pan hint now appears only in fullscreen, where its Escape claim is actually true. |
| 6 | The desktop viewer room rail now has its own labelled seam control and stays open when a room is selected, while the tablet drawer retains its toggle, backdrop, and close-after-selection behavior. Viewer floor tabs now sit inside the toolbar, matching the editor and returning the separate row to the canvas. |
| 7 | Erasing a room's last square now drops the room with an `Undo` canvas chip when it carries no title, entries or NPCs, and keeps it in the room list flagged `not on the map` when it carries authored content; off-map rooms render nothing on the canvas instead of an invisible focusable group. Rooms that were already empty and content-free are swept from both the layout and dungeon-data blobs once per load, collecting the 12 existing ghosts without a migration script — the shared predicates live in `frontend/src/features/dungeons/maplab/roomContent.ts`. |

## Touches

- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/model/maplabModel.ts`
