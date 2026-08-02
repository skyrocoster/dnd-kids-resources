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

/** Coerce a numeric or numeric-string value to a number; null for anything else (incl. empty string). */
function numOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
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
  door_mechanics?: string | null
  trap_ids?: number[] | null
}

export interface DungeonFloor {
  floor_id: number
  title: string
  room_ids: number[]
  floor_above?: number | null
  floor_below?: number | null
  map_image?: string | null
}

export interface DungeonStair {
  stair_id: number
  title: string
  leads_to_rooms: number[] | number
  leads_to_floors?: number[] | null
}

export interface DungeonData {
  general_info?: GeneralInfo | null
  rooms?: DungeonRoom[] | null
  doors?: DungeonDoor[] | null
  floors?: DungeonFloor[] | null
  stairs?: DungeonStair[] | null
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
            container: entry.container ? str(entry.container) : null,
            container_mechanics: entry.container_mechanics ? str(entry.container_mechanics) : null,
            count: typeof entry.count === 'number' ? entry.count : null,
            monster_id: numOrNull(entry.monster_id),
            encounter_id: numOrNull(entry.encounter_id),
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
        door_mechanics: door.door_mechanics ? str(door.door_mechanics) : null,
        trap_ids: asArray(door.trap_ids).filter((x) => typeof x === 'number'),
      }
    }),
    floors: asArray(rec.floors).map((f) => {
      const floor = asRecord(f)
      return {
        floor_id: typeof floor.floor_id === 'number' ? floor.floor_id : 0,
        title: str(floor.title),
        room_ids: asArray(floor.room_ids).filter((x) => typeof x === 'number'),
        floor_above: typeof floor.floor_above === 'number' ? floor.floor_above : null,
        floor_below: typeof floor.floor_below === 'number' ? floor.floor_below : null,
        map_image: floor.map_image ? str(floor.map_image) : null,
      }
    }),
    stairs: asArray(rec.stairs).map((s) => {
      const stair = asRecord(s)
      return {
        stair_id: typeof stair.stair_id === 'number' ? stair.stair_id : 0,
        title: str(stair.title),
        leads_to_rooms: Array.isArray(stair.leads_to_rooms)
          ? stair.leads_to_rooms.filter((x) => typeof x === 'number')
          : typeof stair.leads_to_rooms === 'number'
            ? [stair.leads_to_rooms]
            : [],
        leads_to_floors: asArray(stair.leads_to_floors).filter((x) => typeof x === 'number'),
      }
    }),
    corridors: asArray(rec.corridors),
    map_image: rec.map_image ? str(rec.map_image) : null,
    map_image_length: typeof rec.map_image_length === 'number' ? rec.map_image_length : null,
  }
}

/** Get all rooms from parsed dungeon data. */
export function getRooms(data: DungeonData): DungeonRoom[] {
  return data.rooms ?? []
}

/** Get a specific room by room_id. */
export function getRoomById(data: DungeonData, roomId: number): DungeonRoom | undefined {
  return getRooms(data).find((r) => r.room_id === roomId)
}

/** Get all floors, ordered ground-first (floors without floor_below are ground level). */
export function getFloors(data: DungeonData): DungeonFloor[] {
  const floors = asArray(data.floors) as DungeonFloor[]
  if (floors.length === 0) return []

  // Sort so ground floor (no floor_below) comes first
  const sorted = [...floors]
  sorted.sort((a, b) => {
    const aIsGround = a.floor_below === undefined || a.floor_below === null
    const bIsGround = b.floor_below === undefined || b.floor_below === null
    if (aIsGround && !bIsGround) return -1
    if (!aIsGround && bIsGround) return 1
    return (a.floor_id || 0) - (b.floor_id || 0)
  })
  return sorted
}

/** Get the floor containing a specific room. */
export function getFloorForRoom(data: DungeonData, roomId: number): DungeonFloor | undefined {
  const floors = asArray(data.floors) as DungeonFloor[]
  return floors.find((f) => asArray(f.room_ids).includes(roomId))
}

/** Get all rooms on a specific floor. */
export function getRoomsOnFloor(data: DungeonData, floorId: number): DungeonRoom[] {
  const floors = asArray(data.floors) as DungeonFloor[]
  const floor = floors.find((f) => f.floor_id === floorId)
  if (!floor) return []

  const rooms = getRooms(data)
  const floorRoomIds = new Set(asArray(floor.room_ids))
  return rooms.filter((r) => floorRoomIds.has(r.room_id))
}

export interface EntryTypeGroup {
  type: string
  label: string
  entries: DungeonEntry[]
}

/** Group room entries by type for display. Returns typed groups with entry_type key, label string, and entries array. */
export function groupEntriesByType(room: DungeonRoom): EntryTypeGroup[] {
  const entries = room.entries ?? []

  const typeMap: Record<string, string> = {
    door: 'Doors',
    feature: 'Features',
    trap: 'Traps',
    encounter: 'Encounters',
    monster: 'Monsters',
    treasure: 'Treasure',
    npc: 'NPCs',
    trick: 'Tricks',
  }

  const grouped: Record<string, DungeonEntry[]> = {}
  for (const entry of entries) {
    const type = entry.entry_type || 'feature'
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(entry)
  }

  const result: EntryTypeGroup[] = []
  for (const [type, entryList] of Object.entries(grouped)) {
    const label = typeMap[type] || 'Other'
    result.push({ type, label, entries: entryList })
  }

  return result
}

/** Get threat hints for a room (used for rail badges). */
export function getRoomThreatHints(room: DungeonRoom): ThreatHints {
  const entries = room.entries ?? []
  return {
    hasTrap: entries.some((e) => e.entry_type === 'trap'),
    hasMonster: entries.some((e) => e.entry_type === 'monster'),
    hasEncounter: entries.some((e) => e.entry_type === 'encounter'),
  }
}

