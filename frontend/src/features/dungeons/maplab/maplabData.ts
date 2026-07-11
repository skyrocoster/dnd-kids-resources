/* Static test layout data for Map Lab prototype.
 * Keyed by real Isly Castle (dungeon 4) room/door/stair ids.
 * Case 1: Two adjacent rooms with a shared wall door.
 * Case 2 (M2): Stairs connecting two floors.
 */

import type { MapLayout, MapRoom, MapDoor, MapFloor } from './maplabModel'

// ============================================================================
// Case 1: Combat Training Hall (room 17) ↔ Armoury (room 23)
// ============================================================================

/** Room 17 "Combat Training Hall" — rectangular 3×2 on ground floor (z:0) */
const room17: MapRoom = {
  room_id: 17,
  z: 0,
  title: 'Combat Training Hall',
  origin: [0, 0],
  cells: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
}

/** Room 23 "Armoury" — L-shaped on ground floor (z:0), placed east of room 17 */
const room23: MapRoom = {
  room_id: 23,
  z: 0,
  title: 'Armoury',
  origin: [3, 0], // placed to the east (right) of room 17
  cells: [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
}

/** Door 32 "Heavy Stone Door" — on east wall of room 17's southeast corner cell */
const door32: MapDoor = {
  door_id: 32,
  cell: [2, 1], // room 17's southeast cell, relative to room 17's origin [0,0]
  side: 'E', // east wall = shared boundary with room 23
  title: 'Heavy Stone Door',
}

// ============================================================================
// Case 2 (will be extended in M2): Stairs
// ============================================================================

/** Room 32 "Back Stairwell" — single cell on ground floor (z:0) — placeholder for M2 */
const room32: MapRoom = {
  room_id: 32,
  z: 0,
  title: 'Back Stairwell',
  origin: [6, 0],
  cells: [[0, 0]],
}

/** Room 33 "First Floor Landing" — single cell on first floor (z:1) — placeholder for M2 */
const room33: MapRoom = {
  room_id: 33,
  z: 1,
  title: 'First Floor Landing',
  origin: [6, 0], // same x/y as room 32 but on a different z
  cells: [[0, 0]],
}

/** Stair 2 "Stone Stairs" — placeholder for M2 */
// This will be uncommented and wired in M2
// const stair2: MapStair = {
//   stair_id: 2,
//   from: { z: 0, cell: [6, 0] },
//   to: { z: 1, cell: [6, 0] },
//   title: 'Stone Stairs',
// }

// ============================================================================
// Export the complete layout for Case 1
// ============================================================================

export const mapLabLayout: MapLayout = {
  rooms: [room17, room23, room32, room33], // room32/33 for M2
  doors: [door32],
  stairs: [], // will add stair2 in M2
  floors: [
    { z: 0, title: 'Ground Floor' },
    { z: 1, title: 'First Floor' },
  ],
}
