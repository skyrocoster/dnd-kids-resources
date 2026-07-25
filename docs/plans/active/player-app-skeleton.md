# Player App Skeleton — a tablet at the table showing the live dungeon map

> **Status:** Stages 1–5 shipped; Stage 6 partially shipped (sleep/wake polling and touch-target token done; live session run blocked — requires a human at the table with a 4- and 6-year-old). This is Plan 0 of four (skeleton → fog → knowledge → identity); it remains the next-up plan for the Player App area.

- **Area guide:** [Player App](../../areas/player-app.md)

## What we're building & why

The players are four and six. They cannot keep notes, and they cannot yet hold a connected space in
their heads, so the app becomes their memory and that memory is keyed to place. The full design —
fog as an information ratchet, per-object knowledge, ambient identity — is settled at the level of
intent in `scratch/dm-player-split-intent.md`. This plan builds none of it.

What it builds is the **shape**: a second app at `/play`, on the same build and the same backend,
rendering the live dungeon map on a tablet, read-only, with no way out. Every structural claim the
later plans rest on gets proven here while it is still cheap to be wrong — one Vite app with two
shells, one API with no player-facing surface, concealment funnelled through a single transform,
storage that separates what ratchets from what oscillates, and polling as the whole of liveness.

Nothing is concealed yet. The curtain is a pass-through and the fog store is empty by design: the
seams exist and carry no load, so Plan 1 fills them in rather than introducing them. The payoff for
sequencing it this way is that a real tablet is on a real table by the end of this plan, and
everything we learn there — legibility, touch, whether polling is invisible, whether a four-year-old
can use it at all — lands before we build on top of assumptions about it.

## UX decisions — Player shell (`/play`)

Surface:      Player shell — new `## Surfaces` row in `areas/player-app.md`
Mode:         play (the kid operator has no prep mode; kids never author)
Operator:     **kid** — the first non-DM surface in the app. Requires a new *Operators → Kid*
              subsection in `UX_PATTERNS.md`, per the structural reservation already recorded there.
Focal:        the destination content, full-bleed. The shell is chrome and must lose — a single row
              of large destination targets, no header, no page title, no breadcrumb.
Route shape:  bespoke. Not Browser/Viewer/Editor — there is no list, no record, no editing. Mounted
              as a sibling of `/` in `router.tsx`, not a child of `AppShell`.
Edit style:   none. No kid surface writes, now or later.
Save:         none. Read-only forever.
Empty:        n/a — the shell always has one destination.
Filtered empty: n/a — no filtering on any kid surface in this plan.
No selection: n/a — the shell always renders its one destination.
Load failure: n/a — the shell fetches nothing.
Action failure: n/a — no actions.
Destructive:  none. No kid surface offers a destructive action.
Keyboard:     focus order is DOM order; destination targets are native `<button>`/`<a>`. No global
              hotkeys. `:focus-visible` ring preserved even though the device is touch-only.
Touch:        **64px floor for kid surfaces**, above the app's 48px `--control-height`. This is a
              raised floor, not an exception, so it needs no entry in the DESIGN_SYSTEM exception
              list. Every destination carries an icon as well as a word — the four-year-old is only
              beginning to read.

Proposed *Operators → Kid* rules, to be written into `UX_PATTERNS.md` in Stage 1:

- **Read-only.** No kid surface mutates shared truth. Every mutation happens on the DM's device.
- **No exit.** No link, button, gesture, or error state leads out of `/play`. Reaching the DM app
  means typing a URL. This is temptation design, not security.
- **Two taps to an answer.** A kid picks the device up with a question and puts it down once it is
  answered. More than two taps from the shell is a failed surface.
- **Never text-alone.** Any control or state a kid must act on carries an icon or picture as well as
  words, for the same reason `Never hue-alone` exists.
- **Liveness is automatic.** Kid surfaces poll. No manual refresh gesture — pull-to-refresh is
  explicitly rejected.
- **Concealment via the curtain only.** Kid components consume the player-view transform's output and
  never raw dungeon data.

## UX decisions — Kid map (`/play/map`)

Surface:      Kid map — new `## Surfaces` row in `areas/player-app.md`
Mode:         play
Operator:     kid
Focal:        the map itself, filling the viewport. Rooms are the focal element (the Dungeons
              invariant carries over). No inspector, no rail, no legend, no fixture properties.
Route shape:  bespoke canvas surface, in the same family as the Map Lab canvas and the Loom board —
              not forced into the record triad.
Edit style:   none. Pan and zoom only; no selection in this plan.
Save:         none.
Empty:        Player-local centered state — `No map yet.`
Filtered empty: n/a.
No selection: n/a — the map shows the whole dungeon; tapping a room arrives in Plan 2.
Load failure: Player-local centered state fills the map region — `The map didn't load. Ask your DM.`
              Routing the child to the human is correct: the app informs, the DM adjudicates.
Action failure: n/a — no actions. A failed poll leaves the last good map on screen and retries
              silently; it never blanks a map mid-session.
Destructive:  none.
Keyboard:     n/a for pan/zoom (touch gestures). The surface takes focus so a keyboard user can
              reach it; arrow keys pan, consistent with `Arrow keys are for spatial controls only`.
Touch:        pan and pinch-zoom are the only gestures. No small hit targets exist on this surface
              yet, so the 64px floor is not yet under strain — it will be in Plan 2.

**Which dungeon does it show?** One dungeon is marked *at the table*, server-side, set by a single
control in the DM's Map Lab session view. The kid device never navigates and never chooses; it shows
whatever is currently at the table and follows when the DM changes it. This keeps the tablet a
zero-decision object and keeps the DM's action inside something they were already doing — opening the
dungeon they are running.

## Stages

1. **Cut the seam.** Create the Player App area guide and its manifest row; write the *Operators →
   Kid* subsection into `UX_PATTERNS.md`; add the `player/` directory, `PlayerShell`, and the `/play`
   route as a sibling of `/`. Establish and mechanically enforce the import rule — `player/` may
   import from `api/`, `theme.css`, and pure model modules, never components from `features/`.
   Ends with `/play` rendering a shell with one empty destination.

2. **Promote the shared model.** The map's geometry and types (`maplabModel.ts` and its kin) are pure
   and belong to both apps; the map *renderer* is a component and belongs only to the DM. Move the
   pure model to a neutral location both sides may import, leaving the DM's renderer where it is.
   Ends with the import rule satisfiable without either app reaching into the other.

3. **Build the empty seams.** Backend: a fog store separate from `map_session_state` — a revealed-cell
   set per dungeon whose write is a union, never a replace, so the ratchet is enforced by the endpoint
   rather than by callers; plus the *at the table* pointer. Frontend: the player-view transform as a
   documented pass-through, with a test asserting it currently conceals nothing, so Plan 1 changes one
   module and one test. Ends with the storage and concealment seams in place, carrying no load.

4. **Author a large dungeon and export it as the seed.** The school fixture now gives Stage 5 a substantial map to render and fog meaningful content to hide.

   The backup path this needs **already shipped ahead of this plan** — `export_db_seeds.py` now
   covers `dungeons`, `map_layout`, and `map_session_state`, with column lists generated from
   `init_database.py`. So this stage authors the school **in the Map Lab UI** and exports it, rather
   than hand-writing seed JSON. That keeps the seed real data instead of invented data, and avoids
   hand-maintaining a restatement of the schema.

   The inventory below is therefore an **authoring checklist**, not a JSON spec. The dungeon must be
   large enough that fog is a real question — a school with grounds, several floors,
   and enough secrets to be worth revisiting — and must exercise the awkward corners of the model, so
   that later plans meet them here rather than at the table:

   - **Geometry:** concave and U-shaped polyomino rooms, a one-cell closet, a hall long enough to be
     partly revealed, and content sitting hard against the map extent on every side.
   - **Wall kinds:** `solid`, `natural`, and `open` all present, including a courtyard that is real
     space but not a room.
   - **Outside features:** disconnected cell sets, a feature overlapping a room non-destructively,
     and two features overlapping each other.
   - **Floors and stairs:** at least three floors, stairs both up and down, and one hidden stair.
   - **Doors:** on all four cardinal sides, and every meaningful flag combination — plain, hidden,
     locked, trapped, and locked+trapped with distinct `breakDc`/`pickDc`/`hiddenDc`.
   - **Portals:** an auto-paired in-dungeon pair, a portal saved with **no destination**, a Gateway
     to a second seeded dungeon, and a Gateway whose target is missing — so the resolve list has
     something to resolve on a fresh database.
   - **Entries:** every entry type present (door, feature, trap, encounter, monster, treasure, npc,
     trick), a room with NPC references, a deliberately empty room, and one entry with long prose.
   - **Text:** apostrophes and non-ASCII in titles, to catch encoding and escaping early.

   Ends with `init_database.py` followed by `seed_database.py` producing a dungeon worth exploring
   on a clean machine.

5. **Put a map on the tablet.** The kid map surface: reads the at-the-table dungeon, renders it
   through the transform, polls for liveness, pans and zooms, and holds its last good frame through a
   failed poll. Its own renderer, sized for a child. Ends with the tablet showing the live map.

6. **Table-readiness pass.** Conform the kid surfaces to the rules Stage 1 wrote: 64px targets, the
   exact empty and error copy, an audit that nothing leads out of `/play`, and polling that survives
   the tablet sleeping and waking. Then run a real session and record what the device taught us, as
   the input to Plan 1.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | The `/play` route now mounts a full-bleed `PlayerShell` (`frontend/src/player/`) as a sibling of `/`, rendering one 64px icon+word destination with no exit. The `player/` import rule (no `features/`, `components/`, `layout/`, `pages/`) is enforced by a filesystem architecture test, and the *Operators → Kid* rules are written into `UX_PATTERNS.md`. |
| 2 | `maplabModel.ts` was split: icon-bearing presentation helpers moved to `maplabPresentation.ts` and the now-pure model relocated to `frontend/src/model/maplabModel.ts`. All 22 importers repointed; `player/` can now import the model without violating the import rule. |
| 3 | Backend: `revealed_cells` table (union-write fog ratchet via `INSERT OR IGNORE`) and `at_the_table` single-row pointer, both with GET/PUT endpoints and export policy entries. Frontend: TypeScript types and `fetch`-wrapper client functions for both; `playerViewTransform` curtain module (pass-through) with a test asserting it currently conceals nothing. |
| 4 | Authored and exported `Widdershins Academy` plus `The Underlake Annex`, preserving a large three-floor Map Lab layout, Stage 4 geometry, fixtures, portals, room content, and seed rebuildability. A clean schema initialization followed by `seed_database.py --dungeons` restored the school and its layout successfully. |
| 5.1 | The player map data seam now polls `at-the-table` every five seconds, loads the selected dungeon layout, normalizes it through the curtain transform, and reports loading/empty/error/ready states. A failed poll after a good frame keeps that last visible map on screen and retries silently. |
| 5.2 | The player app owns an independent full-bleed map renderer for transformed layouts, including rooms, walls, floors, authored outside features, touch pan/pinch zoom, keyboard focus, and arrow-key panning. It imports no DM feature components and keeps the player import boundary under test. |
| 5.3 | `/play` now remains a player-shell route family outside `AppShell`, with its native Map destination linking to `/play/map`. `/play/map` composes the live data seam and player renderer, shows exact loading/empty/error copy, and offers no back/home/DM link or manual refresh control. |
| 5.4 | Fixed a gap found ahead of Order 03: `setAtTheTable` existed in `api/client.ts` and the backend but no component ever called it, so the tablet had no way to ever show a dungeon. The Map Lab session view (`MapLabPage.tsx`) Session toolbar tray now has a "Put at the table" / "At the table" control that reads and sets the pointer. |
| 6.1 | Map polling now uses recursive `setTimeout` chaining with a `visibilitychange` listener that triggers a fresh poll on device wake, preventing interval pile-up and stale-data windows. |
| 6.2 | Added `--kid-control-height: 64px` CSS token to `theme.css` (raised touch floor for kid surfaces); `PlayerShell` test verifies `.player-destination` computed `min-height >= 64px`. |

## Stage 6 note (pre-run fix)

Order 03 (session-run) failed because it requires a human running a real session with a 4- and
6-year-old on a tablet — an AI cannot perform that. Ahead of a real run, reviewing this plan
surfaced that the run would have failed regardless: nothing in the DM app ever called
`setAtTheTable`, so `/play/map` could never show anything but "No map yet." That gap is fixed
(Stage 5.4). Order 03 is otherwise unchanged and still needs a human to run the actual tablet
session — set the school at the table from the Map Lab session view's new control, then observe and
write the real `## Stage 6 learnings` section this note is not a substitute for.
