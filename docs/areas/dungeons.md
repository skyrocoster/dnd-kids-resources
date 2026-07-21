# Dungeons Area Guide

> **Active plan:** [Dungeon Outside](../plans/active/dungeon-outside.md) (next up), then [Dungeon Connections](../plans/active/dungeon-connections.md).

## Scope

Owns dungeon CRUD, Map Lab viewer/editor composition, room content, layouts, and dungeon-to-encounter/NPC links. It does not own encounter-runner rules or shared visual primitives.

## Domain vocabulary

**Dungeon**:
A runtime-created record with a title and a data blob containing room-reading content, such as general info, rooms, doors, floors, and stairs.
_Avoid_: adventure, module

**Dungeon Data**:
The JSON blob containing `general_info`, rooms, doors, floors, stairs, and map image.
_Avoid_: content_blob, room_data, corridor — a stale term surviving only in `archive/ingestion/parse_dungeon.py`, not in the live model.

**Map Layout**:
The geometry and coordinate model stored separately: rooms, doors, stairs, floors, props, and portals with cell coordinates.
_Avoid_: grid_data, spatial_data

**Map Lab**:
The visual dungeon editor/viewer frontend feature.
_Avoid_: dungeon_editor, map_editor

**Room**:
A navigable space within a dungeon with content entries and NPC references. On the map: an origin cell plus a polyomino cell set.
_Avoid_: area, zone, chamber

**Entry**:
A content item within a room: trap, monster, treasure, feature, NPC, trick, door, or encounter.
_Avoid_: item, which conflicts with the Item domain term; detail.

**Entry Type**:
Classification of a room entry: door, feature, trap, encounter, monster, treasure, npc, or trick.
_Avoid_: content_type, kind

**Floor**:
A vertical level or layer of a dungeon, using the z-axis. Multiple floors can be connected by stairs.
_Avoid_: level, which conflicts with spell and character level; layer.

**Door**:
A wall passage between two rooms on the same floor, with state flags for hidden, locked, or trapped.
_Avoid_: passage, opening

**Passage Flags**:
Independent boolean state on doors, stairs, and props: hidden, locked, trapped, plus DC values and note.
_Avoid_: state_flags, lock_state

**DC (Difficulty Check)**:
A numeric threshold for checks: break DC, pick lock DC, or perception hidden DC.
_Avoid_: difficulty_class, check_value

**Stair**:
A vertical passage crossing floor levels on the z-axis.
_Avoid_: ladder, elevator, stairway

**Portal**:
A freestanding one-square marker linking to a non-adjacent destination, paired and two-way.
_Avoid_: teleporter, warp

**Prop**:
A static map object: chest, table, mirror, barrel, statue, window, encounter, or other. Carries Passage Flags and optional loot bundle.
_Avoid_: object, which is too generic; decoration.

**Polyomino**:
The shape of a room defined as a set of cells relative to an origin point.
_Avoid_: footprint, shape, room_cells

**Map Cell**:
An integer `[x, y]` coordinate on a floor plane.
_Avoid_: coordinate, tile, grid_position

**Cardinal Side**:
N/S/E/W direction for wall segments and door placement.
_Avoid_: direction, orientation, face

**Cell Size**:
Scale constant: feet per grid cell, default 5.
_Avoid_: grid_scale, tile_size

**Threat Hints**:
Derived per-room booleans: `hasTrap`, `hasMonster`, and `hasEncounter`. Used for rail badges.
_Avoid_: danger_flags, threat_indicators

**Dungeon Graph**:
Normalized node/edge graph of rooms connected by doors and stairs.
_Avoid_: room_graph, connectivity_map

**Dual-Save**:
Map Lab's editor saving both content data and layout data in parallel.
_Avoid_: parallel_save, split_save

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/dungeons.py` and `layouts.py`.
- Frontend: `frontend/src/features/dungeons/`.
- Tests: dungeon router tests and colocated dungeon frontend tests.

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Dungeon browser | `/dungeons` | prep | DM |
| Map Lab session view | `/dungeons/:dungeonId` | play | DM |
| Map Lab editor | `/dungeons/:dungeonId/edit` | prep | DM |
| Inspector panel | within both Map Lab surfaces | follows its host | DM |

The session view is the surface that is open while a game is running: it must stay glanceable and must never lose session toggle state. The editor is prep work and may be as dense as it needs to be.

## Invariants

- Runtime-authored dungeons and layouts are not seed data and are never exported.
- Preserve Map Lab geometry, reducer, autosave, zoom/pan, fullscreen, and layout persistence unless a focused plan explicitly owns them.
- Rooms are the focal element of the map. Anything drawn outside them is reinforcement and must not out-shout them.
- No authored map content is ever silently clipped by the map's extent.

## Work queue

- [Dungeon Outside](../plans/active/dungeon-outside.md) is active: wall kinds, per-side padding and a real extent, outside features, then clarity controls.
- [Dungeon Connections](../plans/active/dungeon-connections.md) is active but not next: permanent per-dungeon session state, optional portal destinations with a connections resolve list, then cross-dungeon gateways. It inherits the next-up slot when Dungeon Outside completes — the two share `MapPortal` and `MapLayout` and must not run concurrently. It owns passage-session persistence.
- Create a focused plan before other deferred dungeon work, including cross-reference pop-outs.
- New vocabulary from the active plan — Outside Feature, Wall Kind, Extent, Gateway — is added here by `reconcile` as each stage ships, not in advance.

## Cross-references

`../ARCHITECTURE.md`, `../DATA_MODEL.md`, `../complete/dungeon_plan.md`, and `encounters.md`.
