/* Typed coordinate model for programmatic dungeon maps.
 * Type declarations only. Function bodies are stubs for M0b/M1/M2.
 * Zero logic; pure type definitions to anchor later stages.
 */

import {
  TrapIcon,
  LockIcon,
  UnlockIcon,
  HiddenIcon,
  StairsUpIcon,
  StairsDownIcon,
  StairsIcon,
  RoomIcon,
  ItemIcon,
  DoorOpenIcon,
  DoorClosedIcon,
  type LucideIcon,
} from '../../../components/icons'
import { PROP_KIND_ICONS } from './fixtureTypes'

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
  /** Authored floor. Optional for back-compat with data saved before floor-stacking was
   * disambiguated (Stage G1) — `doorsOnFloor` falls back to spatial inference when absent, which
   * is exact for a single-floor layout but ambiguous wherever two floors share an [x,y] (e.g. a
   * stairwell's aligned coordinates), the case this field was added to fix. */
  z?: number
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

/** Loot (reserved forward-compat slot; Phase G fills this) */
export interface PropLoot {
  /* empty for now */
}

/** Prop = static object placed on a grid square or wall (chest, table, mirror, etc.).
 * Carries PassageFlags like doors for flexible authored state (hidden, locked, trapped, DCs).
 * Unrendered in Phase F Stages 0-1; Stage F2+ renders and authors these. */
export interface MapProp extends PassageFlags {
  prop_id: number
  kind: string // 'chest' | 'table' | 'mirror' | 'barrel' | 'statue' | 'other'
  cell: MapCell // absolute [x, y]
  side?: CardinalSide // ABSENT = on square; PRESENT = attached to that wall
  /** Authored floor. Optional for back-compat — see `MapDoor.z`. */
  z?: number
  title?: string
  loot?: PropLoot // forward-compat; round-trips via autosave
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
  props: MapProp[]
}

// ============================================================================
// Selector stubs (to be implemented in M0b)
// ============================================================================

/** Convert room-relative cells to absolute cells */
export function absoluteCells(room: MapRoom): MapCell[] {
  const [ox, oy] = room.origin
  return room.cells.map(([cx, cy]) => [ox + cx, oy + cy])
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

/** Tight room-union bounds expanded by `meta.padding` cells on every side — equal padding on all
 * sides is what centers the union within the resulting viewBox, giving the DM a margin of visible
 * "unknown space" (not-yet-authored content) around every authored room. */
export function paddedBounds(layout: MapLayout): Bounds {
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

/** Merge authored PassageFlags with optional session state, producing the effective state. No
 * session (the reset baseline) falls back to the authored `locked`/`trapped` as-is, door open
 * (the shipped Stage-2 default — there's no authored open/closed concept, so "open" is the
 * baseline a DM starts from and toggles shut), trap armed. A session overrides
 * `locked`/`isOpen`/`trapDisarmed` independently of one another — a locked+trapped door can be
 * unlocked while the trap stays armed, or vice versa. */
export function effectivePassageState(
  flags: PassageFlags,
  session?: PassageSessionState,
): EffectivePassageState {
  const sessionOpen = session?.isOpen ?? true
  const locked = session?.isLocked ?? flags.locked
  const trapDisarmed = session?.trapDisarmed ?? false
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
  return { isOpen: true, isLocked: flags.locked, trapDisarmed: false }
}

// ============================================================================
// Generic inspector (Stage 3)
// ============================================================================

/** Discriminated union of inspectable elements: rooms, doors, stairs, and props.
 * Each carries enough data to render a descriptor panel. */
export type Inspectable =
  | { kind: 'room'; room: MapRoom }
  | { kind: 'door'; door: MapDoor; session?: PassageSessionState }
  | { kind: 'stair'; stair: MapStair; session?: PassageSessionState }
  | { kind: 'prop'; prop: MapProp }

/** Descriptor for an element: title, type label, icon, and structured detail rows.
 * Consumed by the Stage-3 generic inspector panel and Stage-4 session controls. */
export interface InspectableDescriptor {
  title: string
  typeLabel: string
  icon: LucideIcon
  token: string // MD3 semantic token for the icon/accent color
  lines: { label: string; value: string }[]
}

/** Shared line-builder for the two passage kinds (door/stair) — state, any secondary flags, DCs,
 * and a free-text note. Previously duplicated inline in `MapLabPage.tsx`'s `PassageDetails`; the
 * generic inspector needs the same content as plain `{label, value}` rows instead of bespoke JSX. */
function passageDescriptorLines(passage: PassageFlags): { label: string; value: string }[] {
  const presentation = passagePresentation(passage)
  const lines: { label: string; value: string }[] = [{ label: 'State', value: presentation.label }]

  const secondary = secondaryPassageStates(passage)
  if (secondary.length > 0) {
    lines.push({ label: 'Also', value: secondary.map((s) => s[0].toUpperCase() + s.slice(1)).join(', ') })
  }
  if (passage.breakDc !== undefined) lines.push({ label: 'Break DC', value: String(passage.breakDc) })
  if (passage.pickDc !== undefined) lines.push({ label: 'Pick DC', value: String(passage.pickDc) })
  if (passage.hiddenDc !== undefined) lines.push({ label: 'Perception DC', value: String(passage.hiddenDc) })
  if (passage.note) lines.push({ label: 'Note', value: passage.note })

  return lines
}

/** Produce a descriptor for any inspectable element — the generic form of the door/stair
 * affordance panel, extended to rooms (and a typed, unrendered hook for items). A room carries no
 * passage state, so its lines are kind/size/description instead; door and stair share
 * `passageDescriptorLines`, since a stair is presented identically to a door throughout this
 * feature. Items produce a minimal descriptor only — no content rendering, per the Stage-3 scope
 * (item/chest authoring is deferred). */
export function inspectableDescriptor(target: Inspectable): InspectableDescriptor {
  switch (target.kind) {
    case 'room': {
      const { room } = target
      const lines: { label: string; value: string }[] = []
      if (room.kind) lines.push({ label: 'Kind', value: room.kind })
      lines.push({ label: 'Size', value: `${absoluteCells(room).length} squares` })
      if (room.description) lines.push({ label: 'Description', value: room.description })
      return {
        title: room.title ?? `Room ${room.room_id}`,
        typeLabel: 'Room',
        icon: RoomIcon,
        token: '--md-on-surface-variant',
        lines,
      }
    }
    case 'door': {
      const { door, session } = target
      const presentation = doorPresentation(door, session)
      const effective = effectivePassageState(door, session)
      const lines = passageDescriptorLines(effective)
      lines.unshift({ label: 'Position', value: effective.sessionOpen ? 'Open' : 'Closed' })
      if (door.trapped && effective.trapDisarmed) lines.push({ label: 'Trap', value: 'Disarmed' })
      return {
        title: door.title ?? `Door ${door.door_id}`,
        typeLabel: 'Door',
        icon: presentation.icon,
        token: presentation.token,
        lines,
      }
    }
    case 'stair': {
      const { stair, session } = target
      const effective = effectivePassageState(stair, session)
      const presentation = passagePresentation(effective)
      const lines = passageDescriptorLines(effective)
      if (stair.trapped && effective.trapDisarmed) lines.push({ label: 'Trap', value: 'Disarmed' })
      return {
        title: stair.title ?? `Stair ${stair.stair_id}`,
        typeLabel: 'Stair',
        icon: presentation.icon,
        token: presentation.token,
        lines,
      }
    }
    case 'prop': {
      const { prop } = target
      return {
        title: prop.title ?? prop.kind,
        typeLabel: 'Prop',
        icon: PROP_KIND_ICONS[prop.kind] ?? ItemIcon,
        token: passagePresentation(prop).token,
        lines: passageDescriptorLines(prop),
      }
    }
  }
}

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

// ============================================================================
// Stage 2 presentation helpers (stair/door iconography)
// ============================================================================

/** Direction of a stair, from the perspective of standing on `fromZ` (defaults to the stair's own
 * authored `from.z`, so calling with one argument answers "does this stair rise or fall?"). A DM
 * viewing the *other* endpoint sees the opposite travel direction — pass the active floor's `z` to
 * get the direction as seen from there (e.g. a stair authored z0→z1 reads "up" from z0 but "down"
 * from z1, the same physical stair). */
export function stairDirection(stair: MapStair, fromZ: number = stair.from.z): 'up' | 'down' | 'level' {
  const toZ = fromZ === stair.to.z ? stair.from.z : stair.to.z
  if (toZ === fromZ) return 'level'
  return toZ > fromZ ? 'up' : 'down'
}

/** Presentation for a stair including directional glyph information.
 * Extends PassagePresentation with stair-specific iconography (StairsUp vs StairsDown). */
export interface StairPresentation extends PassagePresentation {
  direction: 'up' | 'down' | 'level'
}

/** A stair reuses `passagePresentation`'s state (trapped/locked/hidden/unlocked), computed on the
 * *effective* (session-merged) flags when a session is given — a session-unlocked stair recolors
 * exactly like an authored-unlocked one, and a disarmed trap steps to the next flag the same way
 * `secondaryPassageStates` already handles multiple authored flags. The M2.3 marker mixed the state
 * token with a hardcoded `--md-tertiary-container` fill, two unrelated color families on one glyph;
 * the state token is now the marker's only color family (see `.maplab-stair-marker` in
 * MapLabPage.css, which fills neutral and strokes from the token). The plain/unlocked case — the
 * common one — swaps the generic unlock icon for a real directional glyph; a trapped/locked/hidden
 * stair keeps its state icon, matching how doors already prioritize state over decoration. */
export function stairPresentation(stair: MapStair, fromZ?: number, session?: PassageSessionState): StairPresentation {
  const effective = effectivePassageState(stair, session)
  const base = passagePresentation(effective)
  const direction = stairDirection(stair, fromZ)
  const icon =
    base.state === 'unlocked'
      ? direction === 'up'
        ? StairsUpIcon
        : direction === 'down'
          ? StairsDownIcon
          : StairsIcon
      : base.icon
  return { ...base, icon, direction }
}

/** Presentation for a door including its effective open/closed state. */
export interface DoorPresentation extends PassagePresentation {
  isOpen: boolean
}

/** A door reuses `passagePresentation`'s state on the *effective* (session-merged) flags — a
 * session-unlocked door recolors exactly like an authored-unlocked one, and a disarmed trap steps
 * to the next flag the same way `secondaryPassageStates` already handles multiple authored flags.
 * The plain/unlocked case additionally swaps the generic unlock icon for an open/closed door glyph,
 * mirroring how `stairPresentation` swaps in a directional glyph for its own unlocked case. */
export function doorPresentation(door: MapDoor, session?: PassageSessionState): DoorPresentation {
  const effective = effectivePassageState(door, session)
  const base = passagePresentation(effective)
  const isOpen = effective.sessionOpen ?? false
  const icon = base.state === 'unlocked' ? (isOpen ? DoorOpenIcon : DoorClosedIcon) : base.icon
  return { ...base, icon, isOpen }
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

/** Defends against an older persisted `map_layout` row saved before `props` existed (it was named
 * `items` and unrendered) — normalizes a loaded layout so `props` is always an array. Also backfills
 * `z` on any door/prop saved before floor-stacking was disambiguated (Stage G1), inferring it from
 * whichever room's cells the door/prop spatially overlaps — a best-effort one-time migration so
 * floor-coincident data (e.g. a stairwell) resolves correctly from here on rather than re-inferring
 * ambiguously on every render. */
export function normalizeLayout(layout: MapLayout): MapLayout {
  const props = layout.props ?? []
  const inferZ = (cell: MapCell): number | undefined => roomOfCell(cell, layout.rooms)?.z
  return {
    ...layout,
    props: props.map((prop) => (prop.z !== undefined ? prop : { ...prop, z: inferZ(prop.cell) })),
    doors: layout.doors.map((door) => (door.z !== undefined ? door : { ...door, z: inferZ(door.cell) })),
  }
}
