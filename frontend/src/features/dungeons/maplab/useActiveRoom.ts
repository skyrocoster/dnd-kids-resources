import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DungeonData, DungeonRoom } from '../dungeonModel'
import { roomsOnZ, type MapLayout, type MapRoom } from './maplabModel'

export interface UseActiveRoomResult {
  activeRoomId: number | null
  setActiveRoomId: (roomId: number | null) => void
  activeLayoutRoom: MapRoom | null
  activeDungeonRoom: DungeonRoom | null
  isLayoutOnly: boolean
  isDataOnly: boolean
}

function defaultRoomId(layout: MapLayout, activeZ: number, parsed: DungeonData): number | null {
  const layoutRooms = roomsOnZ(layout, activeZ)
  if (layoutRooms.length === 0) return null

  const dataRoomIds = new Set((parsed.rooms ?? []).map((room) => room.room_id))
  const matched = layoutRooms.find((room) => dataRoomIds.has(room.room_id))
  return matched?.room_id ?? layoutRooms[0].room_id
}

export function useActiveRoom(
  layout: MapLayout,
  activeZ: number,
  parsed: DungeonData,
  onFloorChange: (z: number) => void,
): UseActiveRoomResult {
  const [activeRoomId, setActiveRoomIdState] = useState<number | null>(null)

  const layoutRooms = useMemo(() => roomsOnZ(layout, activeZ), [layout, activeZ])
  const roomFloorById = useMemo(() => {
    const next = new Map<number, number>()
    for (const room of layout.rooms) {
      next.set(room.room_id, room.z)
    }
    return next
  }, [layout.rooms])

  useEffect(() => {
    if (layoutRooms.length === 0) {
      if (activeRoomId !== null) setActiveRoomIdState(null)
      return
    }

    const isOnActiveFloor = activeRoomId !== null && layoutRooms.some((room) => room.room_id === activeRoomId)
    if (isOnActiveFloor) return

    setActiveRoomIdState(defaultRoomId(layout, activeZ, parsed))
  }, [activeRoomId, activeZ, layout, layoutRooms, parsed])

  const setActiveRoomId = useCallback((roomId: number | null) => {
    if (roomId === null) {
      setActiveRoomIdState(null)
      return
    }

    const targetZ = roomFloorById.get(roomId)
    if (targetZ !== undefined && targetZ !== activeZ) {
      onFloorChange(targetZ)
    }
    setActiveRoomIdState(roomId)
  }, [activeZ, onFloorChange, roomFloorById])

  const activeLayoutRoom = useMemo(
    () => layoutRooms.find((room) => room.room_id === activeRoomId) ?? null,
    [activeRoomId, layoutRooms],
  )

  const activeDungeonRoom = useMemo(
    () => (parsed.rooms ?? []).find((room) => room.room_id === activeRoomId) ?? null,
    [activeRoomId, parsed.rooms],
  )

  return {
    activeRoomId,
    setActiveRoomId,
    activeLayoutRoom,
    activeDungeonRoom,
    isLayoutOnly: activeRoomId !== null && activeLayoutRoom !== null && activeDungeonRoom === null,
    isDataOnly: activeRoomId !== null && activeLayoutRoom === null && activeDungeonRoom !== null,
  }
}
