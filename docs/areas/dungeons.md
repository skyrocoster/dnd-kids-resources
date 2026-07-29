# Dungeons Area Guide

- **Read trigger:** Dungeon behavior

## Scope

Owns dungeon CRUD, Map Lab viewer/editor composition, room content, layouts, and dungeon-to-encounter/NPC links. It does not own encounter-runner rules or shared visual primitives.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/dungeons.py`, `layouts.py`, and `session_state.py`.
- Frontend: `frontend/src/features/dungeons/`.
- Tests: dungeon router tests and colocated dungeon frontend tests.

## Change map

| Change type | Source globs |
|---|---|
| Dungeon browsing or CRUD | `backend/app/routers/dungeons.py`<br>`frontend/src/features/dungeons/**` |
| Map Lab composition or editing | `backend/app/routers/layouts.py`<br>`frontend/src/features/dungeons/**` |
| Map Lab backend tests | `backend/tests/routers/test_layouts.py` |
| Canvas geometry or model behavior | `frontend/src/model/maplabModel.ts` |
| Room content or details | `frontend/src/features/dungeons/**` |
| Session state | `backend/app/routers/session_state.py` |
| Session state backend tests | `backend/tests/routers/test_session_state.py` |
| Map assets | `data/maps/*.png` |
| Dungeon seed data | `data/seeds/seed_dungeons.json`<br>`data/seeds/seed_map_layouts.json`<br>`data/seeds/seed_map_session_state.json`<br>`data/seeds/seed_map_knowledge.json` |

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Dungeon browser | `/dungeons` | prep | DM |
| Map Lab session view | `/dungeons/:dungeonId` | play | DM |
| Map Lab editor | `/dungeons/:dungeonId/edit` | prep | DM |
| Inspector panel | within both Map Lab surfaces | follows its host | DM |

The session view is the surface that is open while a game is running: it must stay glanceable and must never lose session toggle state. Door/stair/portal toggle state and the deliberately selected party room persist on the backend (`map_session_state`, per dungeon), so a refresh or a return visit restores them; a "Reset dungeon" action clears them back to authored defaults. The editor is prep work and may be as dense as it needs to be.

## Invariants

- Dungeons, map layouts, and map session state **are** seed-backed and **must** be exported before a
  rebuild. `scripts/init_database.py` drops all three, so authored dungeon content that has not been
  written to `data/seeds/` is lost. Freeze it with `scripts/export_db_seeds.py`, which now covers
  them; restore with `scripts/seed_database.py --dungeons`. This reverses the previous rule that
  dungeons were never seed data — that rule left the one domain nobody can regenerate as the only
  domain with no backup path.
- Preserve Map Lab geometry, reducer, autosave, zoom/pan, fullscreen, and layout persistence unless a focused plan explicitly owns them.
- Rooms are the focal element of the map. Anything drawn outside them is reinforcement and must not out-shout them.
- No authored map content is ever silently clipped by the map's extent.
- Map geometry and room content are separate documents and neither writes to the other. Where a room
  view shows both — the NPC list is the explicit `dungeons.data` room NPCs unioned with the NPC
  markers standing in that room — the union is **derived at read time only**. Placing or moving a
  marker never edits room content, and editing a room's NPC list never moves a marker.

## Work queue

<!-- GENERATED:AREA_PLANS:dungeons:START -->
_No plan is in flight for this area._
<!-- GENERATED:AREA_PLANS:dungeons:END -->

What the table cannot derive:

- [Dungeon Outside](../plans/done/dungeon-outside/dungeon-outside.md) shipped: wall kinds, per-side padding and a real extent, outside features, and clarity controls.
- [Dungeon Connections](../plans/done/dungeon-connections/dungeon-connections.md) shipped: permanent per-dungeon session state, optional portal destinations with a connections resolve list, and cross-dungeon gateways. It owns passage-session persistence.
- [Map Lab UX Pass](../plans/done/maplab-ux-pass/maplab-ux-pass.md) shipped the ghost-floor door-leak fix, gesture core, tool palette/popovers, brush model, forgiveness layer, responsive editor/viewer shells, NPC markers, and canvas-local viewer failure feedback.
- **No plan yet, raised by [Kid Map Viewer](../plans/active/kid-map-viewer/kid-map-viewer.md)
  planning:** move `npc` and `encounter` out of the fixture flyout — a person and a fight should not be
  chosen from the same menu as Barrel and Statue. This is an authoring-palette change only: no storage
  split, no migration, and the pin concept stays, because losing it loses the ability to say "the
  shopkeeper is behind *this* counter".
- **No plan yet, raised by the same planning:** warn in Map Lab when a marker sits on a cell no room
  owns (dungeon 4's stair 2 upper endpoint, cell (2,1), is one today). A warning, not a block —
  hard-blocking would eventually prevent placing a stair in a corridor that is not roomed yet, and the
  kid map deliberately still draws these rather than quietly hiding nonsense.

## Cross-references

`../ARCHITECTURE.md`, `../DATA_MODEL.md`, `../plans/done/dungeon_plan/dungeon_plan.md`, and `encounters.md`.
