/* Static test layout data for Map Lab prototype.
 * Keyed by real Isly Castle (dungeon 4) room/door/stair ids.
 * Case 1: Two adjacent rooms with a shared wall door.
 * Case 2 (M2): Stairs connecting two floors.
 */

import type { MapLayout, MapRoom, MapDoor, MapStair, MapProp } from './maplabModel'

// ============================================================================
// Case 1: Combat Training Hall (room 17) ↔ Armoury (room 23)
// ============================================================================

/** Room 17 "Combat Training Hall" — rectangular, castle-realistic 6×4 (30×20 ft) on ground floor (z:0) */
const room17: MapRoom = {
  room_id: 17,
  z: 0,
  title: 'Combat Training Hall',
  description: 'A spacious hall for combat training and drills. Weapons racks line the walls.',
  origin: [0, 0],
  cells: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
  ],
}

/** Room 23 "Armoury" — L-shaped, castle-realistic (4×4 footprint minus a 2×2 notch, 20×20 ft), placed
 * east of room 17. The notch preserves the original topology (proportionately scaled 2x). */
const room23: MapRoom = {
  room_id: 23,
  z: 0,
  title: 'Armoury',
  description: 'A well-stocked armory with racks of weapons, armor, and supplies.',
  origin: [6, 0], // placed to the east (right) of room 17
  cells: [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1],
    [0, 2], [1, 2], // notch: [2,2] and [3,2] missing
    [0, 3], [1, 3], // notch: [2,3] and [3,3] missing
  ],
}

/** Door 32 "Heavy Stone Door" — on the shared wall between room 17's and room 23's southeast corners.
 * State from the verified seed anchor: `door_mechanics:"DC23 to break; DC18 to pick lock"`. */
const door32: MapDoor = {
  door_id: 32,
  cell: [5, 3], // room 17's southeast cell, relative to room 17's origin [0,0]
  side: 'E', // east wall = shared boundary with room 23's [0,3] (absolute [6,3])
  z: 0,
  title: 'Heavy Stone Door',
  hidden: false,
  locked: true,
  trapped: false,
  breakDc: 23,
  pickDc: 18,
}

/** Door 98 "Rusty Trap Door" — a Stage-4 test fixture on room 32's own wall (facing unknown space,
 * no adjoining room), authored locked *and* trapped so the session-state controls (lock/unlock,
 * disarm trap) have a real fixture to exercise both independent flags on. */
const door98: MapDoor = {
  door_id: 98,
  cell: [11, 0],
  side: 'N',
  z: 0, // room 32's own floor — room 33 (z:1) coincidentally shares this [x,y] (stair-aligned)
  title: 'Rusty Trap Door',
  hidden: false,
  locked: true,
  trapped: true,
  breakDc: 20,
}

// ============================================================================
// Case 2: Stairs — placed with a gap of unknown space east of the Armoury
// ============================================================================

/** Room 32 "Back Stairwell" — single cell on ground floor (z:0) */
const room32: MapRoom = {
  room_id: 32,
  z: 0,
  title: 'Back Stairwell',
  description: 'A narrow stairwell providing access between floors.',
  origin: [11, 0],
  cells: [[0, 0]],
}

/** Room 33 "First Floor Landing" — single cell on first floor (z:1) */
const room33: MapRoom = {
  room_id: 33,
  z: 1,
  title: 'First Floor Landing',
  description: 'A small landing at the top of the back stairs.',
  origin: [11, 0], // same x/y as room 32 but on a different z
  cells: [[0, 0]],
}

// ============================================================================
// Stage 1 test pair: Two interlocking L-shaped rooms (z:2) tessellating a 4×4 square
// ============================================================================
//
// The boundary steps twice (a genuine zigzag, not a straight divide) so the pair proves
// interlocking L-shapes rather than two plain rectangles: West gets a wide top (3 cells)
// tapering to a narrow bottom (1 cell); East mirrors it, narrow top (1 cell) widening to a
// wide bottom (3 cells). See the Stage-1 shared-wall test for the exact 6-edge boundary.

/** Test room 99a "West Wing" — 8-cell L-shape, left/upper portion of a 4×4 square (20×20 ft). */
const room99a: MapRoom = {
  room_id: 99,
  z: 2,
  title: 'West Wing',
  description: 'The western wing of a four-room complex. An L-shape interlocking with the East Wing.',
  origin: [0, 0],
  cells: [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1],
    [0, 2], [1, 2],
    [0, 3],
  ],
}

/** Test room 99b "East Wing" — 8-cell L-shape, right/lower portion of a 4×4 square (20×20 ft).
 * Together with room 99a, fills a 4×4 grid perfectly with no overlap or gaps. The zigzag shared
 * boundary proves that adjacent L-shapes render shared walls correctly and highlight only their
 * own cells (the interlocking notch is never highlighted for either room). */
const room99b: MapRoom = {
  room_id: 100,
  z: 2,
  title: 'East Wing',
  description: 'The eastern wing of a four-room complex. An L-shape interlocking with the West Wing.',
  origin: [0, 0],
  cells: [
    [3, 0],
    [2, 1], [3, 1],
    [2, 2], [3, 2],
    [1, 3], [2, 3], [3, 3],
  ],
}

/** Stair 2 "Stone Stairs" — Back Stairwell (room 32, z:0) ↔ First Floor Landing (room 33, z:1).
 * No special state in the seed — plain stairs, presented via the same passagePresentation as a door. */
const stair2: MapStair = {
  stair_id: 2,
  from: { z: 0, cell: [11, 0] },
  to: { z: 1, cell: [11, 0] },
  title: 'Stone Stairs',
  hidden: false,
  locked: false,
  trapped: false,
}

// ============================================================================
// Props (fixtures) — Phase F seeding (M3+)
// ============================================================================

/** Prop 1 "Treasure Chest" — locked chest in the Armoury (room 23), center cell. */
const prop1: MapProp = {
  prop_id: 1,
  kind: 'chest',
  cell: [7, 1], // absolute [6+1, 0+1] = Armoury center
  z: 0,
  title: 'Treasure Chest',
  hidden: false,
  locked: true,
  trapped: false,
  pickDc: 16,
}

// ============================================================================
// Export the complete layout for Case 1 + Case 2
// ============================================================================

export const mapLabLayout: MapLayout = {
  meta: { cellSizeFt: 5, padding: 3 },
  rooms: [room17, room23, room32, room33, room99a, room99b],
  doors: [door32, door98],
  stairs: [stair2],
  floors: [
    { z: 0, title: 'Ground Floor' },
    { z: 1, title: 'First Floor' },
    { z: 2, title: 'Two-Wing Test Layout' },
  ],
  props: [prop1],
}
