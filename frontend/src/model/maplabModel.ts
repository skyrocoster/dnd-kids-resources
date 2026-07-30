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
  description?: string // added Stage 0
  kind?: string // added Stage 0
  wallKind?: string // added Stage 1
}

/** Disclosure keys for what the party knows about a passage — never a snapshot of current state. */
export type KnowledgeFact = 'exists' | 'lock' | 'trap'

/** Independent state flags shared by any passage (door or stair) a DM might need to call out at the
 * table: a passage can be locked *and* trapped at once, so these are booleans, not one enum. */
export interface PassageFlags {
  hidden: boolean
  locked: boolean
  trapped: boolean
  breakDc?: number
  pickDc?: number
  hiddenDc?: number
  searchDc?: number
  note?: string
}

/** Door = wall segment on boundary between two rooms, carrying independent state flags */
export interface MapDoor extends PassageFlags {
  door_id: number
  cell: MapCell // absolute [x, y]
  side: CardinalSide // which wall of this cell
  /** Authored floor. Optional for back-compat with data saved before floor-stacking was
   * disambiguated (Stage G1) — `doorsOnFloor` falls back to spatial inference when absent, which
   * is exact for a single-floor layout but ambiguous wherever two floors share an [x,y] (e.g. a
   * stairwell's aligned coordinates), the case this field was added to fix. */
  z?: number
  title?: string
  state?: FixtureState
}

/** Stair = crosses z-axis with endpoint cells on two planes. Carries the same `PassageFlags` as a
 * door (e.g. a hidden or trapped stairwell) — a stair is presented the same way a door is. */
export interface MapStair extends PassageFlags {
  stair_id: number
  from: { z: number; cell: MapCell }
  to: { z: number; cell: MapCell }
  title?: string
  state?: FixtureState
}

/** Floor = plane identifier */
export interface MapFloor {
  z: number
  title?: string
}

/** Loot bundle soft-reference carried by a map prop. Soft-reference (not snapshot): the prop
 * points to a bundle by id and renders it live at inspection time — a chest reflects the
 * bundle's current contents. `bundle_name` is a cached display label for when the bundle list
 * hasn't loaded yet or the bundle has been deleted. (Design Phase M.) */
export interface PropLoot {
  bundle_id: number
  bundle_name?: string
}

/** Prop = static object placed on a grid square or wall (chest, table, mirror, etc.).
 * Carries PassageFlags like doors for flexible authored state (hidden, locked, trapped, DCs).
 * Unrendered in Phase F Stages 0-1; Stage F2+ renders and authors these. */
export interface MapProp extends PassageFlags {
  prop_id: number
  kind: string // 'chest' | 'table' | 'mirror' | 'barrel' | 'statue' | 'window' | 'other' | 'encounter' | 'npc'
  cell: MapCell // absolute [x, y]
  side?: CardinalSide // ABSENT = on square; PRESENT = attached to that wall
  /** Authored floor. Optional for back-compat — see `MapDoor.z`. */
  z?: number
  title?: string
  loot?: PropLoot // forward-compat; round-trips via autosave
  /** (D0+) Encounter marker: links to an encounter id for launching the runner. */
  encounter_id?: number | null
  /** (D1+) NPC marker: links to an npc id. */
  npc_id?: number | null
  state?: FixtureState
}

/** Portal = a freestanding on-square door linking to a non-adjacent destination with floor + exact-cell
 * targeting. Portals are paired/two-way (setting a portal's destination auto-creates or re-links a matching
 * return portal at the target). Carries PassageFlags like doors and stairs. (Phase H, Stage 0+) */
export interface MapPortal extends PassageFlags {
  portal_id: number
  cell: MapCell // absolute [x, y]
  z: number // floor level
  title?: string
  /** In-dungeon pair sets z/cell and omits dungeon_id; a gateway to another dungeon sets
   * dungeon_id and omits z/cell (this document has no access to that dungeon's layout, so it
   * can't name an exact floor+cell target there). */
  to?: { z?: number; cell?: MapCell; dungeon_id?: number }
  state?: FixtureState
}

/** Feature = outdoor region drawn on the outside grid (river, trees, etc.).
 * Cells are absolute coordinates (no origin/relative pattern). Features may be
 * disconnected; there is no adjacency requirement. */
export interface MapFeature {
  feature_id: number
  z: number
  kind: string
  title?: string
  cells: MapCell[] // absolute coords
}

/** Layout-wide scale/presentation constants: makes the 5 ft/cell scale and the unknown-space
 * padding margin explicit data, not magic numbers in the renderer. */
export interface MapLayoutMeta {
  cellSizeFt: number
  padding: { top: number; right: number; bottom: number; left: number }
}

/** Layout = complete coordinate model for a map */
export interface MapLayout {
  meta: MapLayoutMeta
  rooms: MapRoom[]
  doors: MapDoor[]
  stairs: MapStair[]
  floors: MapFloor[]
  props: MapProp[]
  portals: MapPortal[] // added Phase H
  features: MapFeature[]
}

export function createEmptyMapLayout(floorTitle: string = 'Starting Floor'): MapLayout {
  return {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: floorTitle }],
    props: [],
    portals: [],
    features: [],
  }
}

// ============================================================================
// Selector stubs (to be implemented in M0b)
// ============================================================================

/** Convert room-relative cells to absolute cells */
export function absoluteCells(room: MapRoom): MapCell[] {
  const [ox, oy] = room.origin
  return room.cells.map(([cx, cy]) => [ox + cx, oy + cy])
}

function roomCellsForBounds(room: MapRoom): MapCell[] {
  const cells = absoluteCells(room)
  return cells.length > 0 ? cells : [room.origin]
}

/** Grid-unit bounding box, shared by `layoutBounds`/`paddedBounds` and the Stage E2 zoom/pan
 * layer (`useMapCanvasZoom`, `MapCanvas`) which sizes the scrollable canvas from it. */
export type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

/** Get min/max bounds (x, y) for layout viewBox */
export function layoutBounds(rooms: MapRoom[]): Bounds {
  if (rooms.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const room of rooms) {
    for (const [x, y] of roomCellsForBounds(room)) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  return { minX, maxX, minY, maxY }
}

export const CARDINAL_DELTAS: Record<CardinalSide, MapCell> = {
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

/** A door drawn as a full-length line along the wall is geometrically identical in shape to a
 * plain wall segment — the M2.3 "clash" where an unlocked door and a wall both read as
 * `--md-on-surface-variant` was really this shape problem wearing a color problem's clothes. A
 * real door symbol is a *gap* in the wall (which `nonDoorWallSegments` already produces, since it
 * excludes the door's own edge) plus a hinged leaf and its swing arc — distinct from a wall by
 * shape alone, independent of color, satisfying the "never hue-alone" accessibility floor too. */
export interface DoorSwingGeometry {
  hinge: { x: number; y: number }
  leafTip: { x: number; y: number }
  farJamb: { x: number; y: number }
  radius: number
  sweepFlag: 0 | 1
}

/** Computes the leaf (hinge → tip, swung a quarter-turn off the wall into the room) and its swing
 * arc (tip → the far jamb) for a door's wall segment. `sweepFlag` is derived per-edge from the
 * cross product of the wall vector and the inward normal — the four cardinal sides don't share one
 * fixed handedness, so it can't be hardcoded. */
export function doorSwingGeometry(edge: WallEdge, cellSize: number): DoorSwingGeometry {
  const segment = doorWallSegment(edge, cellSize)
  const hinge = { x: segment.x1, y: segment.y1 }
  const farJamb = { x: segment.x2, y: segment.y2 }
  const wallVec = { x: farJamb.x - hinge.x, y: farJamb.y - hinge.y }
  const radius = Math.hypot(wallVec.x, wallVec.y)
  const [dx, dy] = CARDINAL_DELTAS[edge.side]
  const normal = { x: -dx, y: -dy } // inward: opposite the outward cell-to-neighbor direction
  const leafTip = { x: hinge.x + normal.x * radius, y: hinge.y + normal.y * radius }
  const cross = wallVec.x * normal.y - wallVec.y * normal.x
  const sweepFlag: 0 | 1 = cross > 0 ? 1 : 0
  return { hinge, leafTip, farJamb, radius, sweepFlag }
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

/** Like a centroid, but guaranteed to sit on one of the room's own cells —
 * the arithmetic-mean centroid alone can land in a hole or notch of an
 * L-shaped, U-shaped, or ring-shaped room.  This finds the owned cell whose
 * coordinate is nearest the centroid, then returns its pixel centre. */
export function roomLabelAnchor(room: MapRoom, cellSize: number): { x: number; y: number } {
  const cells = absoluteCells(room)
  if (cells.length === 0) {
    return { x: (room.origin[0] + 0.5) * cellSize, y: (room.origin[1] + 0.5) * cellSize }
  }
  const sumX = cells.reduce((s, [x]) => s + x, 0)
  const sumY = cells.reduce((s, [, y]) => s + y, 0)
  const cx = sumX / cells.length
  const cy = sumY / cells.length
  let best: MapCell = cells[0]
  let bestDist = Infinity
  for (const cell of cells) {
    const [x, y] = cell
    const dx = x - cx
    const dy = y - cy
    const d = dx * dx + dy * dy
    if (d < bestDist || (d === bestDist && (y < best[1] || (y === best[1] && x < best[0])))) {
      best = cell
      bestDist = d
    }
  }
  return { x: (best[0] + 0.5) * cellSize, y: (best[1] + 0.5) * cellSize }
}

/** Tight room-union bounds expanded by `meta.padding` cells on every side — per-side padding
 * is what centers the union within the resulting viewBox, giving the DM a margin of visible
 * "unknown space" (not-yet-authored content) around every authored room. */
export function paddedBounds(layout: MapLayout): Bounds {
  const tight = layoutBounds(layout.rooms)
  const { padding } = layout.meta

  let minX = tight.minX
  let maxX = tight.maxX
  let minY = tight.minY
  let maxY = tight.maxY

  for (const [x, y] of (layout.features ?? []).flatMap((f) => f.cells)) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  return {
    minX: minX - padding.left,
    maxX: maxX + padding.right,
    minY: minY - padding.top,
    maxY: maxY + padding.bottom,
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

/** The cell a stair occupies on floor `z`, or `null` if `z` isn't one of its two endpoints. */
export function stairCellForZ(stair: MapStair, z: number): MapCell | null {
  if (stair.from.z === z) return stair.from.cell
  if (stair.to.z === z) return stair.to.cell
  return null
}

/** The floor at the opposite end of a stair from `currentZ`. */
export function otherFloorZ(stair: MapStair, currentZ: number): number {
  return stair.from.z === currentZ ? stair.to.z : stair.from.z
}

/** The largest marker group `gridMarkerOffset` lays out (a 2x2 block) — placement UIs should refuse
 * adding a 5th stair/portal/prop to a cell that already holds this many rather than silently
 * dropping it off the grid. */
export const MAX_MARKERS_PER_CELL = 4

/** Marker circle radius (as a fraction of cell size) for a lone on-square marker (stair/portal/
 * on-square prop) — shrunk to `GROUPED_MARKER_RADIUS_FRACTION` instead once 2+ markers share a
 * cell. Exported so every on-square marker renderer (stair/portal/prop) sizes consistently. */
export const MARKER_RADIUS_FRACTION = 0.32

/** Marker circle radius (as a fraction of cell size) once 2+ markers share a cell — smaller than
 * `MARKER_RADIUS_FRACTION` so `gridMarkerOffset`'s spacing can actually separate them instead of
 * stacking same-size circles a few px apart. Exported so every grouped-marker renderer
 * (stair/portal/prop) sizes consistently with the offsets it's laid out by. */
export const GROUPED_MARKER_RADIUS_FRACTION = 0.18

/** Marker circle radius / icon-scale fractions for a wall-attached prop (door pattern) — smaller
 * than an on-square marker since it anchors to a wall segment rather than centering in a cell. */
export const WALL_PROP_RADIUS_FRACTION = 0.22
export const WALL_PROP_ICON_SCALE = 0.28

/** Fractional-cell offset (as a multiple of cell size) for a marker among `count` markers sharing
 * the same grid cell, at position `index` in a stable order. 1 marker centers (no offset); 2+
 * markers lay out in a grid of up to 2 columns, wrapping into additional rows (2 = one row
 * side-by-side, 3-4 = a 2x2 block), each row/column centered around the cell midpoint the same way
 * `stairMarkerOffset` centered its one-dimensional fan. The spacing is sized against
 * `GROUPED_MARKER_RADIUS_FRACTION` (2x the radius, plus a visible gap) so grouped markers actually
 * separate rather than overlap — two 0.32-radius circles a mere 0.22 apart barely clear each other.
 * Supersedes `stairMarkerOffset`, generalized to any marker type and to two dimensions. */
export function gridMarkerOffset(count: number, index: number): { dx: number; dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 }
  const spacing = GROUPED_MARKER_RADIUS_FRACTION * 2 + 0.04
  const columns = Math.min(count, 2)
  const rows = Math.ceil(count / columns)
  const col = index % columns
  const row = Math.floor(index / columns)
  const colMid = (columns - 1) / 2
  const rowMid = (rows - 1) / 2
  return { dx: (col - colMid) * spacing, dy: (row - rowMid) * spacing }
}

/** Gather all stairs/portals/on-square-props sharing the exact (z, cell) location, in a stable
 * type-then-id order (stairs, then portals, then props) — the grouping `gridMarkerOffset` lays out
 * together. Stairs match via `stairCellForZ` (either endpoint on this floor); props are restricted
 * to on-square ones (`side` absent) since wall-attached props anchor to a wall segment, not a cell,
 * and never compete for the same marker slot. */
export function markersAtCell(layout: MapLayout, z: number, cell: MapCell): Array<{ type: 'stair' | 'portal' | 'prop'; id: number }> {
  const [cx, cy] = cell
  const stairs = layout.stairs
    .filter((stair) => {
      const c = stairCellForZ(stair, z)
      return c !== null && c[0] === cx && c[1] === cy
    })
    .map((stair) => ({ type: 'stair' as const, id: stair.stair_id }))
    .sort((a, b) => a.id - b.id)
  const portals = layout.portals
    .filter((portal) => portal.z === z && portal.cell[0] === cx && portal.cell[1] === cy)
    .map((portal) => ({ type: 'portal' as const, id: portal.portal_id }))
    .sort((a, b) => a.id - b.id)
  const props = layout.props
    .filter((prop) => prop.side === undefined && prop.z === z && prop.cell[0] === cx && prop.cell[1] === cy)
    .map((prop) => ({ type: 'prop' as const, id: prop.prop_id }))
    .sort((a, b) => a.id - b.id)
  return [...stairs, ...portals, ...props]
}

/** The nearest floor strictly below `activeZ` that has rooms, for ghosting in the editor.
 * "Below" = smaller z (Isly Castle convention: floor 1 Ground < floor 2 First). Returns `null`
 * when there is no such floor (already at the lowest one with rooms). */
export function ghostFloorZ(layout: MapLayout, activeZ: number): number | null {
  const lowerZs = layout.rooms
    .map((room) => room.z)
    .filter((z) => z < activeZ)
  if (lowerZs.length === 0) return null
  return Math.max(...lowerZs)
}

/** Doors belonging to floor `z`: the authored `door.z` when present (exact), else spatial
 * inference from owned-cell membership (correct for a single floor, but ambiguous wherever two
 * floors share an `[x,y]` — e.g. a stairwell's aligned coordinates — since a cell match alone can't
 * tell which floor authored the door). Extracted so the ghost layer and the active floor share one
 * helper instead of duplicating the filter. */
export function doorsOnFloor(layout: MapLayout, z: number): MapDoor[] {
  const rooms = roomsOnZ(layout, z)
  const ownedCells = new Set(rooms.flatMap((room) => absoluteCells(room).map(cellKey)))
  return layout.doors.filter((door) =>
    door.z !== undefined ? door.z === z : ownedCells.has(cellKey(door.cell)),
  )
}

/** Props belonging to floor `z` — the prop analog of `doorsOnFloor`. */
export function propsOnFloor(layout: MapLayout, z: number): MapProp[] {
  const rooms = roomsOnZ(layout, z)
  const ownedCells = new Set(rooms.flatMap((room) => absoluteCells(room).map(cellKey)))
  return layout.props.filter((prop) =>
    prop.z !== undefined ? prop.z === z : ownedCells.has(cellKey(prop.cell)),
  )
}

/** NPC ids derived from markers (props with kind='npc') standing inside a room, de-duplicated and
 * ordered by prop_id. Returns only props on the room's floor with a non-null npc_id whose cell
 * matches one of the room's absolute cells. */
export function npcIdsFromMarkersInRoom(layout: MapLayout, room: MapRoom): number[] {
  const floorProps = propsOnFloor(layout, room.z)
  const roomCells = new Set(absoluteCells(room).map(cellKey))
  const seen = new Set<number>()
  const result: { npc_id: number; prop_id: number }[] = []

  for (const prop of floorProps) {
    if (prop.kind === 'npc' && prop.npc_id !== null && prop.npc_id !== undefined && roomCells.has(cellKey(prop.cell))) {
      if (!seen.has(prop.npc_id)) {
        seen.add(prop.npc_id)
        result.push({ npc_id: prop.npc_id, prop_id: prop.prop_id })
      }
    }
  }

  // Sort by prop_id for stable ordering (first occurrence of each unique npc_id)
  result.sort((a, b) => a.prop_id - b.prop_id)
  return result.map((item) => item.npc_id)
}

/** Compute the union of explicit room NPCs and marker-derived NPCs, de-duplicated.
 * Explicit NPCs come first, followed by marker-derived NPCs not already in the explicit list.
 * If layout is not provided, falls back to explicit NPCs only. */
export function getNpcUnion(explicitNpcIds: number[] | null | undefined, room: MapRoom | null | undefined, layout: MapLayout | null | undefined): number[] {
  if (!room || !layout) {
    return explicitNpcIds ?? []
  }

  const explicit = new Set(explicitNpcIds ?? [])
  const fromMarkers = npcIdsFromMarkersInRoom(layout, room)

  // Explicit-first, then marker-derived, de-duplicated
  const result: number[] = []
  for (const id of explicit) {
    result.push(id)
  }
  for (const id of fromMarkers) {
    if (!explicit.has(id)) {
      result.push(id)
    }
  }
  return result
}

/** Portals belonging to floor `z` — unlike doors/props, `z` is a required authored field on
 * `MapPortal` (never inferred), so this is a direct filter. */
export function portalsOnFloor(layout: MapLayout, z: number): MapPortal[] {
  return layout.portals.filter((portal) => portal.z === z)
}

/** A passage's (door or stair) single dominant presentation state, in display precedence order. */
export type PassageState = 'trapped' | 'locked' | 'hidden' | 'unlocked'

export const PASSAGE_STATE_PRECEDENCE: PassageState[] = ['trapped', 'locked', 'hidden', 'unlocked']

export function isPassageStateActive(state: PassageState, passage: PassageFlags): boolean {
  if (state === 'unlocked') return !passage.trapped && !passage.locked && !passage.hidden
  return passage[state]
}

// ============================================================================
// Design Phase J — Map Lab Decluttering
// ============================================================================

/** State → MD3 token, split out of `passagePresentation`'s inline mapping. J3 repoints
 * `locked`/`hidden` at `docs/design_plan.md` DP1's banked tokens (`--md-passage-locked`/
 * `--md-passage-hidden`) — gold (`--md-secondary`) collided with the dungeon viewer's exit
 * choice-cards, and grey (`--md-outline`) was too close to unlocked's grey at a glance.
 * `trapped`/`unlocked` are unchanged. */
export const PASSAGE_STATE_TOKENS: Record<PassageState, string> = {
  trapped: '--md-error',
  locked: '--md-passage-locked',
  hidden: '--md-passage-hidden',
  unlocked: '--md-on-surface-variant',
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

/** Merge authored PassageFlags with optional session state, producing the effective state. No
 * session (the reset baseline) falls back to the authored `locked`/`trapped` as-is, door closed
 * (doors render and start closed in the editor and viewer unless explicitly opened), trap armed.
 * A session overrides `locked`/`isOpen`/`trapDisarmed` independently of one another — a
 * locked+trapped door can be unlocked while the trap stays armed, or vice versa.
 * Accepts both legacy `PassageSessionState` and newer `SessionFixtureState`. */
export function effectivePassageState(
  flags: PassageFlags,
  session?: PassageSessionState | SessionFixtureState,
): EffectivePassageState {
  const isLegacy = session != null && 'isOpen' in session
  const sessionOpen = isLegacy
    ? (session as PassageSessionState).isOpen
    : (session as SessionFixtureState | undefined)?.open ?? false
  const locked = isLegacy
    ? (session as PassageSessionState).isLocked
    : (session as SessionFixtureState | undefined)?.obstacles?.lock?.armed ?? flags.locked
  const trapDisarmed = isLegacy
    ? (session as PassageSessionState).trapDisarmed
    : (session as SessionFixtureState | undefined)?.obstacles?.trap?.armed === false
  return {
    ...flags,
    locked,
    trapped: flags.trapped && !trapDisarmed,
    sessionOpen,
    sessionLocked: locked,
    trapDisarmed,
  }
}

/** The authored-default session state for a passage — the reset baseline every session control
 * starts from and returns to. */
export function defaultPassageSession(flags: PassageFlags): PassageSessionState {
  return { isOpen: false, isLocked: flags.locked, trapDisarmed: false }
}

// ============================================================================
// Fixture-state model (replaces PassageSessionState for session overrides)
// ============================================================================

/** Full authored fixture state — the baseline that session overrides merge onto.
 * Converted from PassageFlags on load; persisted as part of the layout. */
export interface FixtureState {
  open: boolean
  obstacles: {
    concealment: { armed: boolean }
    lock: { armed: boolean; shown: boolean }
    trap: { armed: boolean; shown: boolean }
  }
}

/** Session-only partial of FixtureState. Every leaf may be absent (fall back to authored),
 * explicitly false (override authored), or present with a value. DCs, if present in a
 * malformed session record, are ignored and pruned on persistence. */
export interface SessionFixtureState {
  open?: boolean
  obstacles?: {
    concealment?: {
      armed?: boolean
    }
    lock?: {
      armed?: boolean
      shown?: boolean
    }
    trap?: {
      armed?: boolean
      shown?: boolean
    }
  }
}

/** Top-level persisted session override layer, organizing fixture-state overrides by
 * kind and ID. Absence means "fall back to authored"; explicit false or presence means
 * "runtime override". partyRoomId tracks the party's current location. */
export interface MapSessionState {
  doors?: Record<string, SessionFixtureState>
  stairs?: Record<string, SessionFixtureState>
  props?: Record<string, SessionFixtureState>
  portals?: Record<string, SessionFixtureState>
  partyRoomId?: number | null
}

/** Authored-default FixtureState values. Concealment armed false; lock armed false and
 * shown false; trap armed false and shown false; door open false. DCs remain absent. */
export function defaultFixtureState(): FixtureState {
  return {
    open: false,
    obstacles: {
      concealment: { armed: false },
      lock: { armed: false, shown: false },
      trap: { armed: false, shown: false },
    },
  }
}

/** Convert a PassageFlags-typed fixture to its FixtureState. Note the reversal:
 * `locked: true` in PassageFlags means the lock obstacle is armed; `trapped: true`
 * means the trap obstacle is armed. */
export function fixtureStateFromFlags(flags: PassageFlags): FixtureState {
  return {
    open: false,
    obstacles: {
      concealment: { armed: flags.hidden },
      lock: { armed: flags.locked, shown: flags.locked },
      trap: { armed: flags.trapped, shown: flags.trapped },
    },
  }
}

/** Merge authored FixtureState with an optional session override. A session value that is
 * present (even `false`) overrides the authored value; absent leaves the authored value. */
export function effectiveFixtureState(
  authored: FixtureState,
  session?: SessionFixtureState,
): FixtureState {
  return {
    open: session?.open ?? authored.open,
    obstacles: {
      concealment: {
        armed: session?.obstacles?.concealment?.armed ?? authored.obstacles.concealment.armed,
      },
      lock: {
        armed: session?.obstacles?.lock?.armed ?? authored.obstacles.lock.armed,
        shown: session?.obstacles?.lock?.shown ?? authored.obstacles.lock.shown,
      },
      trap: {
        armed: session?.obstacles?.trap?.armed ?? authored.obstacles.trap.armed,
        shown: session?.obstacles?.trap?.shown ?? authored.obstacles.trap.shown,
      },
    },
  }
}

// ============================================================================
// Generic inspector (Stage 3)
// ============================================================================

/** Discriminated union of inspectable elements: rooms, doors, stairs, and props.
 * Each carries enough data to render a descriptor panel. */
export type Inspectable =
  | { kind: 'room'; room: MapRoom }
  | { kind: 'door'; door: MapDoor; session?: SessionFixtureState }
  | { kind: 'stair'; stair: MapStair; session?: SessionFixtureState }
  | { kind: 'prop'; prop: MapProp; session?: SessionFixtureState }
  | { kind: 'portal'; portal: MapPortal; session?: SessionFixtureState }
  | { kind: 'feature'; feature: MapFeature }



// ============================================================================
// Stage 1 geometry helpers (L-shape interlocking proof)
// ============================================================================

/** Wall segments shared by two specific rooms — both rooms must include the edge as a perimeter.
 * Used to verify that adjacent (L-shaped and rectangular) rooms share only the edge between them,
 * not overlapping cells. Returned from `roomA`'s perspective (its own `{cell, side}`); call again
 * with the arguments swapped to get `roomB`'s mirrored edges. A shared edge is still "shared" even
 * where a door sits — a doorway is a passage through a wall, not the absence of one — so `doors` is
 * accepted for signature symmetry with the rest of the passage helpers but doesn't filter results. */
export function sharedWallSegments(roomA: MapRoom, roomB: MapRoom, _doors: MapDoor[]): WallEdge[] {
  const bCells = new Set(absoluteCells(roomB).map(cellKey))
  return roomWallSegments(roomA).filter((edge) => bCells.has(cellKey(neighborCell(edge.cell, edge.side))))
}

export function stairDirection(stair: MapStair, fromZ: number = stair.from.z): 'up' | 'down' | 'level' {
  const toZ = fromZ === stair.to.z ? stair.from.z : stair.to.z
  if (toZ === fromZ) return 'level'
  return toZ > fromZ ? 'up' : 'down'
}

// ============================================================================
// Editor helpers (Stage D2 — cell painting)
// ============================================================================

/** Whether `cell` is orthogonally adjacent to any cell already owned by `room` (same floor is the
 * caller's responsibility — this only compares against the room's own absolute cells). */
export function isCellAdjacentToRoom(cell: MapCell, room: MapRoom): boolean {
  const own = new Set(absoluteCells(room).map(cellKey))
  const sides: CardinalSide[] = ['N', 'S', 'E', 'W']
  return sides.some((side) => own.has(cellKey(neighborCell(cell, side))))
}

/** Whether no room in `rooms` already owns `cell` — callers scope `rooms` to one floor so the same
 * `[x, y]` can be painted independently on different z planes. */
export function isCellFree(cell: MapCell, rooms: MapRoom[]): boolean {
  return roomOfCell(cell, rooms) === null
}

/** Whether `cell` can be painted into `roomId`: it must be free on that room's own floor, and either
 * the room has no cells yet (a fresh room may start anywhere) or the cell is adjacent to a cell the
 * room already owns (rooms stay one connected polyomino). */
export function canPaintCell(layout: MapLayout, roomId: number, cell: MapCell): boolean {
  const room = layout.rooms.find((r) => r.room_id === roomId)
  if (!room) return false

  const sameFloorRooms = layout.rooms.filter((r) => r.z === room.z)
  if (!isCellFree(cell, sameFloorRooms)) return false

  const cells = absoluteCells(room)
  if (cells.length === 0) return true
  return isCellAdjacentToRoom(cell, room)
}

/** Takes a room's new absolute cell set (post paint/erase) and returns it as `{origin, cells}` with
 * a fixed `[0, 0]` origin — rooms are created at origin `[0, 0]` and stay there, so their `cells`
 * are just their absolute coordinates directly rather than re-anchored to a bounding-box minimum. */
export function normalizeCells(cells: MapCell[]): { origin: MapCell; cells: MapCell[] } {
  return { origin: [0, 0], cells }
}

/** Feature-kind registry — same shape as WALL_KIND_OPTIONS in wallKinds.ts */
export const FEATURE_KIND_OPTIONS = [
  { value: 'river', label: 'River' },
  { value: 'trees', label: 'Trees' },
] as const

export const DEFAULT_FEATURE_KIND = 'river'

/** Next free room id — one past the current maximum (1 for an empty layout). */
export function nextRoomId(layout: MapLayout): number {
  return Math.max(0, ...layout.rooms.map((r) => r.room_id)) + 1
}

/** Next free door id — one past the current maximum (1 for an empty layout). */
export function nextDoorId(layout: MapLayout): number {
  return Math.max(0, ...layout.doors.map((d) => d.door_id)) + 1
}

/** Next free prop id — one past the current maximum (1 for an empty layout). */
export function nextPropId(layout: MapLayout): number {
  return Math.max(0, ...layout.props.map((p) => p.prop_id)) + 1
}

/** Next free stair id — one past the current maximum (1 for an empty layout). */
export function nextStairId(layout: MapLayout): number {
  return Math.max(0, ...layout.stairs.map((s) => s.stair_id)) + 1
}

/** Next free portal id — one past the current maximum (1 for an empty layout). */
export function nextPortalId(layout: MapLayout): number {
  return Math.max(0, ...layout.portals.map((p) => p.portal_id)) + 1
}

/** Next free feature id — one past the current maximum (1 for an empty layout). */
export function nextFeatureId(layout: MapLayout): number {
  return Math.max(0, ...layout.features.map((f) => f.feature_id)) + 1
}

/** Defends against an older persisted `map_layout` row saved before `props` existed (it was named
 * `items` and unrendered) — normalizes a loaded layout so `props` is always an array. Also backfills
 * `z` on any door/prop saved before floor-stacking was disambiguated (Stage G1), inferring it from
 * whichever room's cells the door/prop spatially overlaps — a best-effort one-time migration so
 * floor-coincident data (e.g. a stairwell) resolves correctly from here on rather than re-inferring
 * ambiguously on every render. Defaults `portals` to an empty array (Phase H). Migrates the old
 * single-number `meta.padding` to per-side padding. */
export function normalizeLayout(layout: MapLayout): MapLayout {
  const props = layout.props ?? []
  const portals = layout.portals ?? []
  const features = layout.features ?? []
  const inferZ = (cell: MapCell): number | undefined => roomOfCell(cell, layout.rooms)?.z
  const meta =
    typeof layout.meta.padding === 'number'
      ? { ...layout.meta, padding: { top: layout.meta.padding, right: layout.meta.padding, bottom: layout.meta.padding, left: layout.meta.padding } }
      : layout.meta
  return {
    ...layout,
    meta,
    props: props.map((prop) => (prop.z !== undefined ? prop : { ...prop, z: inferZ(prop.cell) })),
    doors: layout.doors.map((door) => (door.z !== undefined ? door : { ...door, z: inferZ(door.cell) })),
    portals,
    features,
  }
}
