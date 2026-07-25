# Dungeons Glossary

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
A freestanding one-square marker linking to a non-adjacent destination. The destination is optional —
a portal can be dropped and saved before its `to` is chosen — and is either an in-dungeon pair
(auto-paired, two-way) or a Gateway (one-way in the data, paired only as a UI/workflow concept).
_Avoid_: teleporter, warp

**Gateway**:
A portal whose destination is another dungeon (`to.dungeon_id` set) rather than a floor+cell in this
one. Renders with a distinct icon, names its destination dungeon in the inspector, and navigates to
that dungeon's route on click. The link is one-way data — the target dungeon's editor only *shows* the
incoming link with a one-click "Add the return gateway" action; nothing is auto-written into a
document that might be open elsewhere.
_Avoid_: teleporter link, cross-link, portal link — use Portal for the in-dungeon case, Gateway only
for the cross-dungeon case.

**Resolve List**:
The Map Lab editor's list of connections that do not yet have two ends: a portal with no destination,
a gateway whose target dungeon was deleted (`[repoint]`/`[remove]`), or another dungeon's gateway
pointing here with no return portal ("Add the return gateway"). Each row names what is broken with a
one-click action to fix it.
_Avoid_: todo list, linter, warnings panel

**Prop**:
A static map object: chest, table, mirror, barrel, statue, window, encounter, npc, or other. Carries Passage Flags and optional loot bundle. The `encounter` and `npc` kinds additionally soft-reference a record by id (`encounter_id`, `npc_id`) — there is no separate first-class marker type for either.
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

**Wall Kind**:
The edge appearance of a room's perimeter: `solid` (default), `natural` (cave/rough), or `open` (unbounded space like a courtyard). Set per room; distinguished by colour plus texture, never stroke weight.
_Avoid_: wall_type, border_style

**Feature**:
A polyomino cell set (`river`, `trees`) authored on the outside of rooms, rendered as filled textured cells behind rooms. Features use absolute cell coordinates, may be disconnected, and can overlap rooms non-destructively.
_Avoid_: terrain, area, outside_region

**Outside Feature**:
See Feature (the two are interchangeable — "Outside Feature" is the full term, "Feature" is the short form used in code and UI).
_Avoid_: terrain_patch, area_effect, decoration_layer

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
