import { useEffect, useMemo, useRef } from 'react'
import { getRoomById, getRoomThreatHints, type DungeonData } from '../dungeonModel'
import { floorsInLayout, roomsOnZ, type MapLayout } from './maplabModel'

interface ViewerRoomRailProps {
  layout: MapLayout
  parsed: DungeonData
  activeRoomId: number | null
  onSelectRoom: (roomId: number) => void
}

export function ViewerRoomRail({ layout, parsed, activeRoomId, onSelectRoom }: ViewerRoomRailProps) {
  const activeItemRef = useRef<HTMLLIElement | null>(null)

  const floorGroups = useMemo(() => {
    return floorsInLayout(layout)
      .map((floor) => ({ floor, rooms: roomsOnZ(layout, floor.z) }))
      .filter((group) => group.rooms.length > 0)
  }, [layout])

  const showFloorTitles = floorGroups.length > 1

  useEffect(() => {
    if (typeof activeItemRef.current?.scrollIntoView === 'function') {
      activeItemRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeRoomId])

  return (
    <div className="maplab-viewer-rail" role="navigation" aria-label="Room navigation">
      {floorGroups.map(({ floor, rooms }) => {
        const floorTitle = floor.title ?? `Floor ${floor.z}`
        return (
          <section key={floor.z} className="maplab-viewer-rail-floor">
            {showFloorTitles && <h4 className="maplab-viewer-rail-floor-title">{floorTitle}</h4>}
            <ul className="maplab-viewer-rail-room-list" role="listbox" aria-label={`${floorTitle} rooms`}>
              {rooms.map((room) => {
                const dataRoom = getRoomById(parsed, room.room_id)
                const title = dataRoom?.title ?? room.title ?? `Room ${room.room_id}`
                const threatHints = dataRoom ? getRoomThreatHints(dataRoom) : null
                const isSelected = room.room_id === activeRoomId

                return (
                  <li
                    key={room.room_id}
                    ref={isSelected ? activeItemRef : null}
                    className="maplab-viewer-rail-room-item"
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected || undefined}
                  >
                    <button type="button" aria-pressed={isSelected} onClick={() => onSelectRoom(room.room_id)}>
                      <span className="maplab-viewer-rail-room-name">{title}</span>
                      {threatHints && (threatHints.hasTrap || threatHints.hasMonster || threatHints.hasEncounter) && (
                        <span className="maplab-viewer-rail-room-hints" aria-label="Threat hints">
                          {threatHints.hasTrap && <span className="maplab-viewer-rail-room-hint">Trap</span>}
                          {threatHints.hasMonster && <span className="maplab-viewer-rail-room-hint">Monster</span>}
                          {threatHints.hasEncounter && <span className="maplab-viewer-rail-room-hint">Encounter</span>}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
