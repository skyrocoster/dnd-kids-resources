import type { MapRoom, MapCell } from '../../../model/maplabModel'
import type { DungeonRoom } from '../dungeonModel'

/**
 * Check if a room is off the map (has no cells).
 */
export function roomIsOffMap(room: MapRoom): boolean {
  return room.cells.length === 0
}

/**
 * Check if a room carries authored content.
 * A room carries content if either blob has non-empty content:
 * - MapRoom has non-empty title, description, kind, or wallKind
 * - DungeonRoom has non-empty title, entries, or npcs
 * Empty strings and whitespace-only strings count as no content.
 */
export function roomCarriesContent(
  room: MapRoom,
  dataRoom: DungeonRoom | undefined
): boolean {
  // Check MapRoom content signals
  if (room.title && room.title.trim()) return true
  if (room.description && room.description.trim()) return true
  if (room.kind && room.kind.trim()) return true
  if (room.wallKind && room.wallKind.trim()) return true

  // Check DungeonRoom content signals
  if (dataRoom) {
    if (dataRoom.title && dataRoom.title.trim()) return true
    if (dataRoom.entries && dataRoom.entries.length > 0) return true
    if (dataRoom.npcs && dataRoom.npcs.length > 0) return true
  }

  return false
}

/**
 * Outcome of erasing a room's last square.
 */
export type RoomEraseOutcome = 'shrink' | 'flag' | 'drop'

/**
 * Determine what should happen when erasing the last square from a room.
 * - 'shrink': cells remain after erase (room just got smaller)
 * - 'flag': no cells remain and room carries content (room stays, off-map, nothing lost)
 * - 'drop': no cells remain and room carries nothing (room goes; reversible, no dialog)
 */
export function roomEraseOutcome(
  remainingCells: MapCell[],
  room: MapRoom,
  dataRoom: DungeonRoom | undefined
): RoomEraseOutcome {
  if (remainingCells.length > 0) {
    return 'shrink'
  }

  if (roomCarriesContent(room, dataRoom)) {
    return 'flag'
  }

  return 'drop'
}

/**
 * Get the room IDs of all ghost rooms (off-map, carry no content).
 */
export function ghostRoomIds(
  rooms: MapRoom[],
  dataRooms: DungeonRoom[] | null | undefined
): number[] {
  // Build a map of data rooms by room_id for quick lookup
  const dataRoomMap = new Map<number, DungeonRoom>()
  if (dataRooms) {
    for (const dr of dataRooms) {
      dataRoomMap.set(dr.room_id, dr)
    }
  }

  return rooms
    .filter((room) => {
      const isOff = roomIsOffMap(room)
      const dataRoom = dataRoomMap.get(room.room_id)
      const hasContent = roomCarriesContent(room, dataRoom)
      return isOff && !hasContent
    })
    .map((room) => room.room_id)
}
