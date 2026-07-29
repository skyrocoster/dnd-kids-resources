# Player Map Knowledge — the DM controls each fact the party has learned

> **Status:** All 5 stages shipped — feature complete.

- **Area guide:** [Players](../../../areas/players.md)
- **Read trigger:** Reversible per-fact disclosure, the map knowledge document, inspector selection, or the DM's player-result preview


## What we're building & why

The map becomes a trustworthy memory of discovery rather than a copy of authored truth. For every
passage-like object, the DM can independently and reversibly disclose that it exists, that its lock
is understood, and that it is trapped. Live truth remains separate: changing a lock or trap does not
claim the party noticed it, while a disclosed condition presents the current in-world value without
exposing its DC or DM notes.

Knowledge is stored per dungeon against stable object identities and passes through the Curtain.
The kid map and the DM's **What they see** preview consume the same transformed result, so there is
one answer to what the players can see. Room titles and descriptions remain unchanged until Fog.

## UX decisions — Map Lab session view knowledge controls

```text
Surface:      Map Lab session view (/dungeons/:dungeonId) — existing Dungeons Surfaces row.
Mode:         play. Operator: DM.
Focal:        the selected map object; its truth and player-knowledge controls share the existing
              inspector, grouped under explicit "World now" and "Players know" headings.
Route shape:  Viewer — unchanged.
Edit style:   direct controls in the existing inspector; no dialog and no form-wide save.
Save:         immediate per toggle. A failed write leaves the prior confirmed value in place.
Empty:        unchanged — this work adds no independently loaded region.
Filtered empty: n/a — there is no filter.
No selection: unchanged — the existing inspector prompt remains.
Load failure: the existing map failure state fills the map region; knowledge failure leaves the
              authored map visible and disables disclosure controls with an inline status.
Action failure: inline beside the knowledge controls, role="status".
Destructive:  none — every disclosure can be reversed directly.
Keyboard:     controls follow inspector DOM order; Enter/Space toggle; Escape closes the View
              popover or returns from preview without changing selection.
Touch:        48px floor; no new exceptions.
```

## UX decisions — What they see preview

```text
Surface:      What they see mode within Map Lab session view — same route and Surfaces row.
Mode:         play. Operator: DM.
Focal:        the actual player-visible map result; authoring and live-state chrome yield to it.
Route shape:  bespoke mode of the existing Viewer, not a separate route.
Edit style:   none in Knowledge; the preview verifies disclosure but does not edit map structure.
Save:         none; entering and leaving the mode changes only local presentation.
Empty:        "The players cannot see any map objects yet."
Filtered empty: n/a — there is no filter.
No selection: n/a — preview does not require selection.
Load failure: the existing map error state fills the map region.
Action failure: n/a — preview performs no writes in this plan.
Destructive:  none.
Keyboard:     the toolbar toggle follows DOM order; Enter/Space enter or leave preview; Escape
              leaves preview and restores the prior viewer selection.
Touch:        48px floor; no new exceptions.
```

## UX decisions — Kid map knowledge presentation

```text
Surface:      Kid map (/play/map) — existing Players Surfaces row.
Mode:         play. Operator: kid.
Focal:        the visible rooms and disclosed objects; known conditions remain secondary icon-and-
              text cues attached to the object and never compete with room geometry.
Route shape:  Viewer — unchanged.
Edit style:   none. Save: none. Read-only forever.
Empty:        unchanged — "No map yet."
Filtered empty: n/a — the kid map has no filters.
No selection: n/a — this stage adds no kid selection.
Load failure: unchanged — "The map didn't load. Ask your DM."
Action failure: n/a. Poll failures retain the last good player-view result and retry silently.
Destructive:  none.
Keyboard:     unchanged; disclosed cues add no focus targets.
Touch:        64px floor for existing controls; disclosed cues are presentation, not controls.
```

## Stages

1. **One vocabulary and stable identities.** Give every existing passage-like discovery a stable
   identity and the shared applicable fact vocabulary, including room entries, while keeping rooms
   themselves outside that vocabulary. Preserve existing authored dungeon and layout data through an
   explicit migration/defaulting path.
2. **Knowledge persists apart from truth.** Add a per-dungeon knowledge document and API whose fact
   masks can be set or cleared independently. Keep it separate from authored layout, live session
   values, and Fog, and include it in the dungeon seed export/rebuild contract.
3. **The Curtain learns facts.** Extend the single player-view transform to consume knowledge and
   omit undiscovered hidden objects entirely. Disclose existence, lock, and trap independently while
   proving that DCs, search mechanics, and DM notes never cross the Curtain.
4. **The inspector separates world from knowledge.** Put immediate reversible knowledge controls
   beside live values for the selected passage-like object, with clear grouping and local failures.
   Mouse hover may highlight a room, but only click changes the selected inspector object.
5. **The DM sees the real player result.** Add **What they see** to the session-view toolbar and render
   the same Curtain output used by `/play`; preview does not become a structural editor. Teach the
   kid renderer to show independently disclosed lock and trap conditions without exposing mechanics.

The sparse knowledge document is kind-qualified: optional `doors`, `stairs`, `props`, `portals`, and
`roomEntries` maps are keyed by stable object identity. Each object maps to optional `exists`, `lock`,
and `trap` facts whose only stored value is `true`; an absent fact means unknown, and clearing a fact
removes that key.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Passage-like map objects now share the `exists`, `lock`, and `trap` knowledge vocabulary, with Perception DC and Search DC authored and presented separately while both remain behind the Curtain. Room entries have deterministic room-qualified identities derived from stable room ID and one-based authored order without changing legacy dungeon data. |
| 2 | Each dungeon now has an independently persisted, cascade-deleted knowledge document with replacement-style GET, PUT, and DELETE endpoints. Knowledge participates in seed export and rebuild separately from authored layout, live session truth, and Fog. |
| 3 | The player-view Curtain now consumes sparse knowledge and grouped live passage state, omits authored-hidden objects until existence is disclosed, and reveals lock and trap values independently without leaking DM-only fields. The kid map polls knowledge alongside layout and session state, treating missing knowledge as empty and retaining the last good frame after later knowledge failures. |
| 4 | Map Lab's inspector now separates live world controls from reversible `Players know` disclosures for passage objects, with immediate local failure handling and 48px controls. Focus and click establish the selected inspector object; hover no longer replaces it. |
| 5 | The kid map and DM preview share a common `PlayerVisibleMap` renderer with lock and trap icon-text cues. Map Lab's **What they see** mode renders the Curtain result for the DM, previewing what players actually see, without editing layout, session, or knowledge. |

## Touches

- `scripts/init_database.py`
- `scripts/seed_database.py`
- `scripts/export_db_seeds.py`
- `data/seeds/**`
- `data/generated/export_schema.json`
- `backend/app/main.py`
- `backend/app/schemas.py`
- `backend/app/routers/**`
- `backend/tests/routers/**`
- `backend/tests/test_integration_real_data.py`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/model/maplabModel.ts`
- `frontend/src/features/dungeons/dungeonModel.ts`
- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/player/**`
- `frontend/src/map/**`
- `frontend/src/theme.css`

