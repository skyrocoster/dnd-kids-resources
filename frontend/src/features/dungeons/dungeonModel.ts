/* Typed read-model for dungeon data shape, selectors, and graph structure.
 * All functions are pure and work against the opaque dungeon.data blob.
 */

// ============================================================================
// Shared type helpers
// ============================================================================

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

// ============================================================================
// Type definitions — mirrors the shape from seed_dungeons.json
// ============================================================================

export interface GeneralInfo {
  title?: string | null
  size?: string | null
  walls?: string | null
  floor?: string | null
  temperature?: string | null
  illumination?: string | null
}

export interface DungeonEntry {
  entry_type: string
  title: string
  content: string
  is_hidden?: boolean | null
  hidden_dc?: number | null
  container?: string | null
  container_mechanics?: string | null
  count?: number | null
  monster_id?: number | null
  encounter_id?: number | null
  trap_ids?: number[] | null
  treasure_contents?: unknown[] | null
}

export interface DungeonRoom {
  room_id: number
  title: string
  entries?: DungeonEntry[] | null
  npcs?: number[] | null
}

export interface DungeonDoor {
  door_id: number
  entry_type: 'door'
  title: string
  content: string
  leads_to: number[] | number
  is_hidden?: boolean | null
  hidden_dc?: number | null
  door_mechanics?: string | null
  trap_ids?: number[] | null
}

export interface DungeonData {
  general_info?: GeneralInfo | null
  rooms?: DungeonRoom[] | null
  doors?: DungeonDoor[] | null
  corridors?: unknown[] | null
  map_image?: string | null
  map_image_length?: number | null
  [key: string]: unknown
}

export interface ThreatHints {
  hasTrap: boolean
  hasMonster: boolean
  hasEncounter: boolean
}

export interface RoomExit {
  door: DungeonDoor
  toRoomId: number
  toRoom?: DungeonRoom
  isHidden: boolean
  hiddenDc: number | null
}

export interface RoomNode {
  roomId: number
  title: string
  hints: ThreatHints
  position?: { x: number; y: number } | null
  floorId?: number | null
}

export interface DoorEdge {
  doorId: number
  a: number
  b: number
  isHidden: boolean
  hiddenDc: number | null
  title: string
}

export interface DungeonGraph {
  nodes: RoomNode[]
  edges: DoorEdge[]
}

// ============================================================================
// Selectors — pure functions over the data blob
// ============================================================================

/** Parse and normalize dungeon data from the opaque blob. */
export function parseDungeonData(data: unknown): DungeonData {
  const rec = asRecord(data)
  return {
    general_info: asRecord(rec.general_info),
    rooms: asArray(rec.rooms).map((r) => {
      const room = asRecord(r)
      return {
        room_id: typeof room.room_id === 'number' ? room.room_id : 0,
        title: str(room.title),
        entries: asArray(room.entries).map((e) => {
          const entry = asRecord(e)
          return {
            entry_type: str(entry.entry_type),
            title: str(entry.title),
            content: str(entry.content),
            is_hidden: entry.is_hidden === true,
            hidden_dc: typeof entry.hidden_dc === 'number' ? entry.hidden_dc : null,
            container: entry.container ? str(entry.container) : null,
            container_mechanics: entry.container_mechanics ? str(entry.container_mechanics) : null,
            count: typeof entry.count === 'number' ? entry.count : null,
            monster_id: typeof entry.monster_id === 'number' ? entry.monster_id : null,
            encounter_id: typeof entry.encounter_id === 'number' ? entry.encounter_id : null,
            trap_ids: asArray(entry.trap_ids).filter((x) => typeof x === 'number'),
            treasure_contents: asArray(entry.treasure_contents),
          }
        }),
        npcs: asArray(room.npcs).filter((x) => typeof x === 'number'),
      }
    }),
    doors: asArray(rec.doors).map((d) => {
      const door = asRecord(d)
      return {
        door_id: typeof door.door_id === 'number' ? door.door_id : 0,
        entry_type: 'door' as const,
        title: str(door.title),
        content: str(door.content),
        leads_to: Array.isArray(door.leads_to)
          ? door.leads_to.filter((x) => typeof x === 'number')
          : typeof door.leads_to === 'number'
            ? [door.leads_to]
            : [],
        is_hidden: door.is_hidden === true,
        hidden_dc: typeof door.hidden_dc === 'number' ? door.hidden_dc : null,
        door_mechanics: door.door_mechanics ? str(door.door_mechanics) : null,
        trap_ids: asArray(door.trap_ids).filter((x) => typeof x === 'number'),
      }
    }),
    corridors: asArray(rec.corridors),
    map_image: rec.map_image ? str(rec.map_image) : null,
    map_image_length: typeof rec.map_image_length === 'number' ? rec.map_image_length : null,
  }
}

/** Get all rooms from parsed dungeon data. */
export function getRooms(data: DungeonData): DungeonRoom[] {
  return asArray(data.rooms)
}

/** Get a specific room by room_id. */
export function getRoomById(data: DungeonData, roomId: number): DungeonRoom | undefined {
  return getRooms(data).find((r) => r.room_id === roomId)
}

/** Group room entries by type for display (emoji + label pairs). */
export function groupEntriesByType(
  room: DungeonRoom,
): Record<string, Array<{ label: string; entries: DungeonEntry[] }>> {
  const entries = asArray(room.entries)

  const typeMap: Record<string, { emoji: string; label: string }> = {
    door: { emoji: '🚪', label: 'Doors' },
    feature: { emoji: '✨', label: 'Features' },
    trap: { emoji: '⚠️', label: 'Traps' },
    encounter: { emoji: '👥', label: 'Encounters' },
    monster: { emoji: '👹', label: 'Monsters' },
    treasure: { emoji: '💎', label: 'Treasure' },
    npc: { emoji: '🧑‍🤝‍🧑', label: 'NPCs' },
    trick: { emoji: '🎭', label: 'Tricks' },
  }

  const grouped: Record<string, DungeonEntry[]> = {}
  for (const entry of entries) {
    const type = entry.entry_type || 'feature'
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(entry)
  }

  const result: Record<string, Array<{ label: string; entries: DungeonEntry[] }>> = {}
  for (const [type, entryList] of Object.entries(grouped)) {
    const meta = typeMap[type] || { emoji: '❓', label: 'Other' }
    result[`${meta.emoji} ${meta.label}`] = [{ label: `${meta.emoji} ${meta.label}`, entries: entryList }]
  }

  return result
}

/** Get threat hints for a room (used for rail badges). */
export function getRoomThreatHints(room: DungeonRoom): ThreatHints {
  const entries = asArray(room.entries)
  return {
    hasTrap: entries.some((e) => e.entry_type === 'trap'),
    hasMonster: entries.some((e) => e.entry_type === 'monster'),
    hasEncounter: entries.some((e) => e.entry_type === 'encounter'),
  }
}

/** Normalize leads_to into the destination room_id from the current room perspective.
 * doors.leads_to is a 2-element array of the two rooms the door connects.
 * This resolves the *other* room_id. */
function resolveLeadsTo(door: DungeonDoor, fromRoomId: number): number | undefined {
  const leadsTo = asArray(door.leads_to).filter((x) => typeof x === 'number')
  if (leadsTo.length !== 2) return undefined
  return leadsTo[0] === fromRoomId ? leadsTo[1] : leadsTo[0]
}

/** Get adjacent room IDs (convenience over the graph edges). */
export function getAdjacentRoomIds(data: DungeonData, roomId: number): number[] {
  const exits = getExitsFromRoom(data, roomId)
  return exits.map((e) => e.toRoomId)
}

/** Build a normalized, renderer-agnostic graph structure for the dungeon.
 * Used by the rail, exits, and future map renderers. */
export function getRoomGraph(data: DungeonData): DungeonGraph {
  const rooms = getRooms(data)
  const doors = asArray(data.doors) as DungeonDoor[]

  const nodes: RoomNode[] = rooms.map((room) => ({
    roomId: room.room_id,
    title: room.title,
    hints: getRoomThreatHints(room),
    position: undefined,
    floorId: undefined,
  }))

  const edges: DoorEdge[] = []
  const roomIdSet = new Set(rooms.map((r) => r.room_id))

  for (const door of doors) {
    const leadsTo = asArray(door.leads_to).filter((x) => typeof x === 'number')
    if (leadsTo.length !== 2) continue

    const [a, b] = leadsTo
    if (!roomIdSet.has(a) || !roomIdSet.has(b)) continue // Skip edges to unknown rooms
    if (a === b) continue // Skip self-loops

    edges.push({
      doorId: door.door_id,
      a,
      b,
      isHidden: door.is_hidden || false,
      hiddenDc: door.hidden_dc || null,
      title: door.title,
    })
  }

  return { nodes, edges }
}

/** Get exits (doors) leaving from a specific room.
 * Derives from the graph to ensure consistency.
 * Deduplicates by destination room (first door wins). */
export function getExitsFromRoom(data: DungeonData, roomId: number): RoomExit[] {
  const graph = getRoomGraph(data)
  const allExits: RoomExit[] = []
  const seenDestinations = new Set<number>()

  for (const edge of graph.edges) {
    // Find which end of the edge is the current room
    const destId = edge.a === roomId ? edge.b : edge.b === roomId ? edge.a : undefined
    if (destId === undefined) continue

    if (seenDestinations.has(destId)) continue // Dedupe by destination
    seenDestinations.add(destId)

    // Find the door for this edge
    const doors = asArray(data.doors) as DungeonDoor[]
    const door = doors.find((d) => d.door_id === edge.doorId)
    if (!door) continue

    const destRoom = getRoomById(data, destId)
    allExits.push({
      door,
      toRoomId: destId,
      toRoom: destRoom,
      isHidden: edge.isHidden,
      hiddenDc: edge.hiddenDc,
    })
  }

  return allExits
}
