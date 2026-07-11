/* Typed coordinate model for programmatic dungeon maps.
 * Type declarations only. Function bodies are stubs for M0b/M1/M2.
 * Zero logic; pure type definitions to anchor later stages.
 */

import { TrapIcon, LockIcon, UnlockIcon, HiddenIcon, type LucideIcon } from '../../../components/icons'

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
  description?: string // added Stage 0
  kind?: string // added Stage 0
}

/** Independent state flags shared by any passage (door or stair) a DM might need to call out at the
 * table: a passage can be locked *and* trapped at once, so these are booleans, not one enum. */
export interface PassageFlags {
  hidden: boolean
  locked: boolean
  trapped: boolean
  breakDc?: number
  pickDc?: number
  hiddenDc?: number
  note?: string
}

/** Door = wall segment on boundary between two rooms, carrying independent state flags */
export interface MapDoor extends PassageFlags {
  door_id: number
  cell: MapCell // absolute [x, y]
  side: CardinalSide // which wall of this cell
  title?: string
}

/** Stair = crosses z-axis with endpoint cells on two planes. Carries the same `PassageFlags` as a
 * door (e.g. a hidden or trapped stairwell) — a stair is presented the same way a door is. */
export interface MapStair extends PassageFlags {
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

/** Item = forward-compat content slot, keyed by absolute cell. Unrendered in M2.1 — geometry stays
 * pure; contents attach via this parallel array rather than restructuring room cells. */
export interface MapItem {
  item_id: number
  cell: MapCell
  title: string
}

/** Layout-wide scale/presentation constants: makes the 5 ft/cell scale and the unknown-space
 * padding margin explicit data, not magic numbers in the renderer. */
export interface MapLayoutMeta {
  cellSizeFt: number
  padding: number // cells of unknown-space margin around the authored room union
}

/** Layout = complete coordinate model for a map */
export interface MapLayout {
  meta: MapLayoutMeta
  rooms: MapRoom[]
  doors: MapDoor[]
  stairs: MapStair[]
  floors: MapFloor[]
  items: MapItem[]
}

// ============================================================================
// Selector stubs (to be implemented in M0b)
// ============================================================================

/** Convert room-relative cells to absolute cells */
export function absoluteCells(room: MapRoom): MapCell[] {
  const [ox, oy] = room.origin
  return room.cells.map(([cx, cy]) => [ox + cx, oy + cy])
}

/** Get min/max bounds (x, y) for layout viewBox */
export function layoutBounds(rooms: MapRoom[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (rooms.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const room of rooms) {
    for (const [x, y] of absoluteCells(room)) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  return { minX, maxX, minY, maxY }
}

const CARDINAL_DELTAS: Record<CardinalSide, MapCell> = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
}

/** Get neighbor cell across a cardinal direction */
export function neighborCell(cell: MapCell, side: CardinalSide): MapCell {
  const [dx, dy] = CARDINAL_DELTAS[side]
  const [x, y] = cell
  return [x + dx, y + dy]
}

/** A wall segment: one cell's named side. Doors sit on one of these; plain walls are the rest. */
export interface WallEdge {
  cell: MapCell
  side: CardinalSide
}

/** Get two corner points of a wall segment for SVG rendering. Takes the minimal `{cell, side}` shape
 * (a `MapDoor` satisfies it too) so it serves both door glyphs and plain wall strokes. */
export function doorWallSegment(edge: WallEdge, cellSize: number): { x1: number; y1: number; x2: number; y2: number } {
  const [x, y] = edge.cell
  // Corners of this cell, in grid units, converted to pixels via cellSize.
  const left = x * cellSize
  const top = y * cellSize
  const right = (x + 1) * cellSize
  const bottom = (y + 1) * cellSize

  switch (edge.side) {
    case 'N':
      return { x1: left, y1: top, x2: right, y2: top }
    case 'S':
      return { x1: left, y1: bottom, x2: right, y2: bottom }
    case 'E':
      return { x1: right, y1: top, x2: right, y2: bottom }
    case 'W':
      return { x1: left, y1: top, x2: left, y2: bottom }
  }
}

const OPPOSITE_SIDE: Record<CardinalSide, CardinalSide> = { N: 'S', S: 'N', E: 'W', W: 'E' }

/** The side a neighbor cell would see this same physical wall from. */
export function oppositeSide(side: CardinalSide): CardinalSide {
  return OPPOSITE_SIDE[side]
}

function cellKey(cell: MapCell): string {
  return `${cell[0]},${cell[1]}`
}

/** A room's perimeter edges — an edge is a wall iff the cell across it is *not* part of the same
 * room. This covers the outer boundary facing unknown space *and* any boundary shared with a
 * different authored room (e.g. the Hall/Armoury shared wall) identically: both are "not this room's
 * own cell," so both wall. Interior edges between two cells of the *same* room are excluded. */
export function roomWallSegments(room: MapRoom): WallEdge[] {
  const cells = absoluteCells(room)
  const own = new Set(cells.map(cellKey))
  const sides: CardinalSide[] = ['N', 'S', 'E', 'W']
  const edges: WallEdge[] = []
  for (const cell of cells) {
    for (const side of sides) {
      if (!own.has(cellKey(neighborCell(cell, side)))) {
        edges.push({ cell, side })
      }
    }
  }
  return edges
}

/** The door occupying a wall edge, matched from either room's perspective — a door's own
 * `{cell, side}` and the mirrored `{neighborCell, oppositeSide}` are the same physical segment. */
export function findDoorAtEdge(edge: WallEdge, doors: MapDoor[]): MapDoor | undefined {
  return doors.find((door) => {
    if (cellKey(door.cell) === cellKey(edge.cell) && door.side === edge.side) return true
    const mirrorCell = neighborCell(door.cell, door.side)
    return cellKey(mirrorCell) === cellKey(edge.cell) && oppositeSide(door.side) === edge.side
  })
}

/** A room's perimeter edges minus the ones occupied by a door — the plain-wall renderer draws these;
 * the door glyph renders the excluded segment instead, so the two never draw on the same line. */
export function nonDoorWallSegments(room: MapRoom, doors: MapDoor[]): WallEdge[] {
  return roomWallSegments(room).filter((edge) => !findDoorAtEdge(edge, doors))
}

/** Find room containing a given absolute cell */
export function roomOfCell(cell: MapCell, rooms: MapRoom[]): MapRoom | null {
  const [cx, cy] = cell
  for (const room of rooms) {
    for (const [x, y] of absoluteCells(room)) {
      if (x === cx && y === cy) {
        return room
      }
    }
  }
  return null
}

/** Tight room-union bounds expanded by `meta.padding` cells on every side — equal padding on all
 * sides is what centers the union within the resulting viewBox, giving the DM a margin of visible
 * "unknown space" (not-yet-authored content) around every authored room. */
export function paddedBounds(layout: MapLayout): { minX: number; maxX: number; minY: number; maxY: number } {
  const tight = layoutBounds(layout.rooms)
  const { padding } = layout.meta
  return {
    minX: tight.minX - padding,
    maxX: tight.maxX + padding,
    minY: tight.minY - padding,
    maxY: tight.maxY + padding,
  }
}

/** All floors in a layout, sorted by z ascending */
export function floorsInLayout(layout: MapLayout): MapFloor[] {
  return [...layout.floors].sort((a, b) => a.z - b.z)
}

/** All rooms in a layout on a given floor plane */
export function roomsOnZ(layout: MapLayout, z: number): MapRoom[] {
  return layout.rooms.filter((room) => room.z === z)
}

/** All stairs in a layout with an endpoint on a given floor plane */
export function stairEndpointsForZ(layout: MapLayout, z: number): MapStair[] {
  return layout.stairs.filter((stair) => stair.from.z === z || stair.to.z === z)
}

/** A passage's (door or stair) single dominant presentation state, in display precedence order. */
export type PassageState = 'trapped' | 'locked' | 'hidden' | 'unlocked'

const PASSAGE_STATE_PRECEDENCE: PassageState[] = ['trapped', 'locked', 'hidden', 'unlocked']

function isPassageStateActive(state: PassageState, passage: PassageFlags): boolean {
  if (state === 'unlocked') return !passage.trapped && !passage.locked && !passage.hidden
  return passage[state]
}

/** Pure state → { icon, token, label } mapping, consumed by M2.3's door/stair rendering. Reuses
 * existing MD3 semantic roles rather than a dedicated passage-state palette (per the design-system
 * "no new hues without the harmonize generator" rule). Precedence when multiple flags are set:
 * trapped > locked > hidden > unlocked — callers surface the rest as secondary chips via
 * `secondaryPassageStates`. Generalized (formerly `doorPresentation`, M2.1) so doors and stairs share
 * one mapping. */
export interface PassagePresentation {
  state: PassageState
  icon: LucideIcon
  token: string
  label: string
}

export function passagePresentation(passage: PassageFlags): PassagePresentation {
  if (passage.trapped) {
    return { state: 'trapped', icon: TrapIcon, token: '--md-error', label: 'Trapped' }
  }
  if (passage.locked) {
    return { state: 'locked', icon: LockIcon, token: '--md-secondary', label: 'Locked' }
  }
  if (passage.hidden) {
    return { state: 'hidden', icon: HiddenIcon, token: '--md-outline', label: 'Hidden' }
  }
  return { state: 'unlocked', icon: UnlockIcon, token: '--md-on-surface-variant', label: 'Unlocked' }
}

/** The other active state flags beyond the primary one `passagePresentation` already surfaces —
 * rendered as secondary chips so a passage that's both locked and trapped doesn't hide either fact. */
export function secondaryPassageStates(passage: PassageFlags): PassageState[] {
  const primary = passagePresentation(passage).state
  return PASSAGE_STATE_PRECEDENCE.filter(
    (state) => state !== primary && state !== 'unlocked' && isPassageStateActive(state, passage),
  )
}

// ============================================================================
// Session state and effective state (Stage 4)
// ============================================================================

/** Live session override layer for passages — the authored PassageFlags are the reset baseline.
 * The session state tracks temporary runtime changes (a trap disarmed mid-game, a door manually
 * unlocked) without mutating the authored data. The sandbox has no persistence; production will
 * need to decide where this layer lives (ephemeral per-session, or stored per-encounter/per-save). */
export interface PassageSessionState {
  isOpen: boolean
  isLocked: boolean
  trapDisarmed: boolean
  trapSprung?: boolean
}

/** Effective state = authored defaults merged with session overrides. Merging precedence:
 * authored locked + session unlocked → effective unlocked (session wins for locks).
 * authored trapped + trapDisarmed session → effective disarmed (trap state overridden). */
export interface EffectivePassageState extends PassageFlags {
  sessionOpen?: boolean
  sessionLocked?: boolean
  trapDisarmed?: boolean
}

/** Merge authored PassageFlags with optional session state, producing the effective state.
 * STUB for Stage 4. */
export function effectivePassageState(
  _flags: PassageFlags,
  _session?: PassageSessionState,
): EffectivePassageState {
  throw new Error('not implemented')
}

// ============================================================================
// Generic inspector (Stage 3)
// ============================================================================

/** Discriminated union of inspectable elements: rooms, doors, stairs, and forward-compat items.
 * Each carries enough data to render a descriptor panel. Items are currently unrendered
 * (geometry-only hook for later expansion). */
export type Inspectable =
  | { kind: 'room'; room: MapRoom }
  | { kind: 'door'; door: MapDoor }
  | { kind: 'stair'; stair: MapStair }
  | { kind: 'item'; item: MapItem }

/** Descriptor for an element: title, type label, icon, and structured detail rows.
 * Consumed by the Stage-3 generic inspector panel and Stage-4 session controls. */
export interface InspectableDescriptor {
  title: string
  typeLabel: string
  icon: LucideIcon
  token: string // MD3 semantic token for the icon/accent color
  lines: { label: string; value: string }[]
}

/** Produce a descriptor for any inspectable element.
 * STUB for Stage 3. */
export function inspectableDescriptor(_target: Inspectable): InspectableDescriptor {
  throw new Error('not implemented')
}

// ============================================================================
// Stage 1 geometry helpers (L-shape interlocking proof)
// ============================================================================

/** Wall segments shared by two specific rooms — both rooms must include the edge as a perimeter.
 * Used to verify that adjacent (L-shaped and rectangular) rooms share only the edge between them,
 * not overlapping cells. STUB for Stage 1. */
export function sharedWallSegments(_roomA: MapRoom, _roomB: MapRoom, _doors: MapDoor[]): WallEdge[] {
  throw new Error('not implemented')
}

// ============================================================================
// Stage 2 presentation helpers (stair/door iconography)
// ============================================================================

/** Direction of a stair (up or down) based on the z-levels of its endpoints.
 * Returns 'up' if from.z < to.z, 'down' if from.z > to.z, 'level' if equal. */
export function stairDirection(_stair: MapStair): 'up' | 'down' | 'level' {
  throw new Error('not implemented')
}

/** Presentation for a stair including directional glyph information.
 * Extends PassagePresentation with stair-specific iconography (StairsUp vs StairsDown).
 * STUB for Stage 2. */
export interface StairPresentation extends PassagePresentation {
  direction: 'up' | 'down' | 'level'
}

export function stairPresentation(_stair: MapStair): StairPresentation {
  throw new Error('not implemented')
}
