import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Popover } from '../../../components/Popover'
import { getRoomById, getRoomThreatHints, type DungeonData } from '../dungeonModel'
import { floorsInLayout, getNpcUnion, roomsOnZ, type MapLayout } from '../../../model/maplabModel'

interface ViewerRoomRailProps {
  layout: MapLayout
  parsed: DungeonData
  activeRoomId: number | null
  onSelectRoom: (roomId: number) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ViewerRoomRail({ layout, parsed, activeRoomId, onSelectRoom, open, onOpenChange }: ViewerRoomRailProps) {
  const activeItemRef = useRef<HTMLLIElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = open ?? localOpen
  const setIsOpen = useCallback((next: boolean) => {
    if (open === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }, [onOpenChange, open])

  const floorGroups = useMemo(() => {
    return floorsInLayout(layout)
      .map((floor) => ({ floor, rooms: roomsOnZ(layout, floor.z) }))
      .filter((group) => group.rooms.length > 0)
  }, [layout])

  const showFloorTitles = floorGroups.length > 1
  const activeFloor = floorGroups.find((group) => group.rooms.some((room) => room.room_id === activeRoomId))?.floor.z
  const offMapRooms = useMemo(
    () => (parsed.rooms ?? []).filter((room) => !layout.rooms.some((layoutRoom) => layoutRoom.room_id === room.room_id)),
    [layout.rooms, parsed.rooms],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matchesRoom = (roomId: number, title: string, floorTitle: string) =>
    !normalizedQuery || `${roomId} ${title} ${floorTitle}`.toLocaleLowerCase().includes(normalizedQuery)
  const orderedFloorGroups = useMemo(
    () => [...floorGroups].sort((a, b) => Number(b.floor.z === activeFloor) - Number(a.floor.z === activeFloor)),
    [activeFloor, floorGroups],
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }, [setIsOpen])

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setIsOpen(true)
    }
  }, [setIsOpen])

  const setActiveItemRef = useCallback((element: HTMLLIElement | null) => {
    activeItemRef.current = element
    if (typeof element?.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [])

  const selectRoom = (roomId: number) => {
    onSelectRoom(roomId)
    close()
  }

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const panel = searchRef.current?.closest<HTMLElement>('.maplab-viewer-rail-panel')
      const focusable = panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        event.stopPropagation()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        event.stopPropagation()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [close, isOpen])

  useEffect(() => {
    if (typeof activeItemRef.current?.scrollIntoView === 'function') {
      activeItemRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeRoomId, isOpen])

  return (
    <Popover.Root open={isOpen} closeOnOutsidePress={false} closeOnEscape={false} onOpenChange={handleOpenChange}>
      <div className="maplab-viewer-rail" role="navigation" aria-label="Room navigation">
        <Popover.Trigger ref={triggerRef} type="button" className="maplab-viewer-rail-trigger" aria-expanded={isOpen}>
          Find room…
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" className="maplab-viewer-rail-positioner">
          <Popover.Popup
            className="maplab-viewer-rail-panel"
            role="dialog"
            aria-label="Find room"
            initialFocus={searchRef}
            finalFocus={(closeType) => closeType === 'keyboard' ? triggerRef : false}
          >
            <div className="maplab-viewer-rail-search-row">
              <label htmlFor="maplab-room-search">Find room…</label>
              <button type="button" className="maplab-viewer-rail-close" onClick={close} aria-label="Close room finder">Close</button>
            </div>
            <input ref={searchRef} id="maplab-room-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by number, title, or floor" />
            <p className="maplab-viewer-rail-result-summary" aria-live="polite">Results from all floors</p>
            {orderedFloorGroups.map(({ floor, rooms }) => {
              const floorTitle = floor.title ?? `Floor ${floor.z}`
              const visibleRooms = rooms.filter((room) => {
                const dataRoom = getRoomById(parsed, room.room_id)
                return matchesRoom(room.room_id, dataRoom?.title ?? room.title ?? `Room ${room.room_id}`, floorTitle)
              })
              if (visibleRooms.length === 0) return null
              return (
                <section key={floor.z} className="maplab-viewer-rail-floor">
                  {showFloorTitles && <h4 className="maplab-viewer-rail-floor-title">{floorTitle}</h4>}
                  <ul className="maplab-viewer-rail-room-list" role="listbox" aria-label={`${floorTitle} rooms`}>
                    {visibleRooms.map((room) => {
                      const dataRoom = getRoomById(parsed, room.room_id)
                      const title = dataRoom?.title ?? room.title ?? `Room ${room.room_id}`
                      const threatHints = dataRoom ? getRoomThreatHints(dataRoom) : null
                      const npcUnion = getNpcUnion(dataRoom?.npcs, room, layout)
                      const isSelected = room.room_id === activeRoomId
                      const hasHints = threatHints && (threatHints.hasTrap || threatHints.hasMonster || threatHints.hasEncounter)
                      const hasNpcHint = npcUnion.length > 0

                      return (
                        <li
                          key={room.room_id}
                          ref={isSelected ? setActiveItemRef : null}
                          className="maplab-viewer-rail-room-item"
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isSelected || undefined}
                        >
                          <button type="button" aria-pressed={isSelected} onClick={() => selectRoom(room.room_id)}>
                            <span className="maplab-viewer-rail-room-name">{title}</span>
                            <span className="maplab-viewer-rail-room-number" aria-hidden="true">#{room.room_id}</span>
                            {(hasHints || hasNpcHint) && (
                              <span className="maplab-viewer-rail-room-hints" aria-label="Room hints">
                                {threatHints?.hasTrap && <span className="maplab-viewer-rail-room-hint">Trap</span>}
                                {threatHints?.hasMonster && <span className="maplab-viewer-rail-room-hint">Monster</span>}
                                {threatHints?.hasEncounter && <span className="maplab-viewer-rail-room-hint">Encounter</span>}
                                {hasNpcHint && <span className="maplab-viewer-rail-room-hint">{npcUnion.length === 1 ? '1 NPC' : `${npcUnion.length} NPCs`}</span>}
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
            {offMapRooms.filter((room) => matchesRoom(room.room_id, room.title ?? `Room ${room.room_id}`, 'Off map')).length > 0 && (
              <section className="maplab-viewer-rail-floor">
                <h4 className="maplab-viewer-rail-floor-title">Off map</h4>
                <ul className="maplab-viewer-rail-room-list" role="listbox" aria-label="Off map rooms">
                  {offMapRooms.filter((room) => matchesRoom(room.room_id, room.title ?? `Room ${room.room_id}`, 'Off map')).map((room) => (
                    <li key={room.room_id} className="maplab-viewer-rail-room-item" role="option" aria-selected={room.room_id === activeRoomId}>
                      <button type="button" aria-pressed={room.room_id === activeRoomId} onClick={() => selectRoom(room.room_id)}>
                        <span className="maplab-viewer-rail-room-name">{room.title ?? `Room ${room.room_id}`}</span>
                        <span className="maplab-viewer-rail-room-number" aria-hidden="true">Off map · #{room.room_id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
