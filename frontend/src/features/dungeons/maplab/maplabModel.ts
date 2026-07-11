/* Typed coordinate model for programmatic dungeon maps.
 * Type declarations only. Function bodies are stubs for M0b/M1/M2.
 * Zero logic; pure type definitions to anchor later stages.
 */

// ============================================================================
// Type definitions
// ============================================================================

/** Integer cell coordinate on a floor plane */
export type MapCell = [number, number] // [x, y] — x=column(right), y=row(down)

/** Cardinal direction: N=up, S=down, E=right, W=left */
export type CardinalSide = 'N' | 'S' | 'E' | 'W'

/** Room = origin cell + a set of cells relative to origin (polyomino shape) */
export interface MapRoom {
  room_id: number
  z: number // floor level
  origin: MapCell // absolute [x, y]
  cells: MapCell[] // relative to origin; e.g. [[0,0],[1,0],[0,1]] for L-shape
  title?: string
}

/** Door = wall segment on boundary between two rooms */
export interface MapDoor {
  door_id: number
  cell: MapCell // absolute [x, y]
  side: CardinalSide // which wall of this cell
  title?: string
}

/** Stair = crosses z-axis with endpoint cells on two planes */
export interface MapStair {
  stair_id: number
  from: { z: number; cell: MapCell }
  to: { z: number; cell: MapCell }
  title?: string
}

/** Floor = plane identifier */
export interface MapFloor {
  z: number
  title?: string
}

/** Layout = complete coordinate model for a map */
export interface MapLayout {
  rooms: MapRoom[]
  doors: MapDoor[]
  stairs: MapStair[]
  floors: MapFloor[]
}

// ============================================================================
// Selector stubs (to be implemented in M0b)
// ============================================================================

/** Convert room-relative cells to absolute cells */
export function absoluteCells(room: MapRoom): MapCell[] {
  throw new Error('not implemented')
}

/** Get min/max bounds (x, y) for layout viewBox */
export function layoutBounds(rooms: MapRoom[]): { minX: number; maxX: number; minY: number; maxY: number } {
  throw new Error('not implemented')
}

/** Get neighbor cell across a cardinal direction */
export function neighborCell(cell: MapCell, side: CardinalSide): MapCell {
  throw new Error('not implemented')
}

/** Get two corner points of door wall segment for SVG rendering */
export function doorWallSegment(door: MapDoor, cellSize: number): { x1: number; y1: number; x2: number; y2: number } {
  throw new Error('not implemented')
}

/** Find room containing a given absolute cell */
export function roomOfCell(cell: MapCell, rooms: MapRoom[]): MapRoom | null {
  throw new Error('not implemented')
}
