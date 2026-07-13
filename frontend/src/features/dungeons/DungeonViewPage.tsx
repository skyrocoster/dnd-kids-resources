import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { SplitPane } from '../../components/SplitPane'
import { Card } from '../../components/Card'
import { DiceText } from '../../components/DiceText'
import { FloatingWindow } from '../../components/FloatingWindow'
import { EncounterDock } from '../encounters/EncounterDock'
import { NpcChip } from '../npcs/NpcChip'
import { NPCStatCard } from '../npcs/NPCStatCard'
import { useNpc } from '../npcs/useNpc'
import {
  parseDungeonData,
  getRooms,
  getRoomById,
  getExitsFromRoom,
  getRoomThreatHints,
  groupEntriesByType,
  getFloors,
  getRoomsOnFloor,
  getFloorForRoom,
} from './dungeonModel'
import type { DungeonData, DungeonEntry, DungeonRoom } from './dungeonModel'
import { trailReducer } from './trailReducer'
import type { Trail } from './trailReducer'
import {
  DoorIcon,
  KeyIcon,
  StairsIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrapIcon,
  SkullIcon,
  UsersIcon,
  SparklesIcon,
  NextTurnIcon,
} from '../../components/icons'
import './DungeonViewPage.css'

function trailStorageKey(dungeonId: number): string {
  return `dungeon-trail-${dungeonId}`
}

function loadTrail(dungeonId: number): Trail {
  try {
    const stored = sessionStorage.getItem(trailStorageKey(dungeonId))
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'number') ? parsed : []
  } catch {
    return []
  }
}

function saveTrail(dungeonId: number, trail: Trail): void {
  try {
    sessionStorage.setItem(trailStorageKey(dungeonId), JSON.stringify(trail))
  } catch {
    // sessionStorage unavailable (e.g. private browsing quota) — trail just won't persist.
  }
}

export function DungeonViewPage() {
  const { dungeonId: dungeonIdStr, roomId: roomIdStr } = useParams()
  const navigate = useNavigate()

  const [dungeon, setDungeon] = useState<Dungeon | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [trail, setTrail] = useState<Trail>([])
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [activeEncounterId, setActiveEncounterId] = useState<number | null>(null)
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null)

  const dungeonId = dungeonIdStr ? Number(dungeonIdStr) : undefined
  const roomId = roomIdStr ? Number(roomIdStr) : undefined

  // Load the persisted trail whenever the dungeon changes.
  useEffect(() => {
    if (!dungeonId) return
    setTrail(loadTrail(dungeonId))
  }, [dungeonId])

  // Append (or revisit-collapse) the current room into the trail, and persist it.
  useEffect(() => {
    if (!dungeonId || !roomId) return
    setTrail((prev) => {
      const next = trailReducer(prev, roomId)
      saveTrail(dungeonId, next)
      return next
    })
  }, [dungeonId, roomId])

  // Fetch dungeon on mount or when dungeonId changes
  useEffect(() => {
    if (!dungeonId) {
      setLoadError('No dungeon specified.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    api
      .getDungeon(dungeonId)
      .then((d) => {
        setDungeon(d)
        setLoadError(null)

        // If no room specified, navigate to the first room
        if (!roomId) {
          const parsed = parseDungeonData(d.data)
          const rooms = getRooms(parsed)
          if (rooms.length > 0) {
            navigate(`/dungeons/${dungeonId}/rooms/${rooms[0].room_id}`, { replace: true })
          }
        }
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load dungeon.')
        setDungeon(null)
      })
      .finally(() => setIsLoading(false))
  }, [dungeonId, navigate, roomId])

  if (isLoading) {
    return <div className="dungeon-view-page"><p>Loading dungeon…</p></div>
  }

  if (loadError || !dungeon) {
    return (
      <div className="dungeon-view-page">
        <p className="dungeon-view-error">
          {loadError || 'Dungeon not found.'}
        </p>
        <button type="button" className="dungeon-back-button" onClick={() => navigate('/dungeons')}>
          Back to dungeons
        </button>
      </div>
    )
  }

  const parsed = parseDungeonData(dungeon.data)
  const rooms = getRooms(parsed)
  const currentRoom = roomId ? getRoomById(parsed, roomId) : null

  if (roomId && !currentRoom) {
    return (
      <div className="dungeon-view-page">
        <p className="dungeon-view-error">Room not found.</p>
        <button type="button" className="dungeon-back-button" onClick={() => navigate(`/dungeons/${dungeonId}`)}>
          Back to dungeon
        </button>
      </div>
    )
  }

  const handleRoomSelect = (rid: number) => {
    navigate(`/dungeons/${dungeonId}/rooms/${rid}`)
  }

  return (
    <div className="dungeon-view-page">
      <div className="dungeon-view-header">
        <h1>{dungeon.title}</h1>
        <button type="button" className="dungeon-back-button" onClick={() => navigate('/dungeons')}>
          Back to dungeons
        </button>
      </div>

      <DungeonBreadcrumbs dungeonTitle={dungeon.title} dungeonId={dungeonId as number} trail={trail} parsed={parsed} />

      <div className="dungeon-view-split">
        {railCollapsed ? (
          <div className="dungeon-view-collapsed">
            <button
              type="button"
              className="dungeon-rail-reopen"
              onClick={() => setRailCollapsed(false)}
              aria-label="Show room index"
              title="Show room index"
            >
              →
            </button>
            <div className="dungeon-view-collapsed-content">
              {currentRoom ? (
                <DungeonRoomPanel
                  dungeon={dungeon}
                  dungeonId={dungeonId as number}
                  room={currentRoom}
                  onRunEncounter={setActiveEncounterId}
                  onOpenNpc={setActiveNpcId}
                />
              ) : (
                <p className="dungeon-view-empty">Select a room to begin.</p>
              )}
            </div>
          </div>
        ) : (
          <SplitPane
            leftLabel="room index"
            left={
              <DungeonRail
                parsed={parsed}
                rooms={rooms}
                currentRoomId={roomId}
                onRoomSelect={handleRoomSelect}
                mapImage={parsed.map_image ?? null}
                onCollapse={() => setRailCollapsed(true)}
              />
            }
            right={
              currentRoom ? (
                <DungeonRoomPanel
                  dungeon={dungeon}
                  dungeonId={dungeonId as number}
                  room={currentRoom}
                  onRunEncounter={setActiveEncounterId}
                  onOpenNpc={setActiveNpcId}
                />
              ) : (
                <p className="dungeon-view-empty">Select a room to begin.</p>
              )
            }
          />
        )}
      </div>

      {activeEncounterId != null && (
        <EncounterDock encounterId={activeEncounterId} onClose={() => setActiveEncounterId(null)} />
      )}

      {activeNpcId != null && <NpcDock npcId={activeNpcId} onClose={() => setActiveNpcId(null)} />}
    </div>
  )
}

function NpcDock({ npcId, onClose }: { npcId: number; onClose: () => void }) {
  const { npc, loading } = useNpc(npcId)

  return (
    <FloatingWindow
      title={loading || !npc ? 'Loading…' : npc.name}
      storageKey="dungeon-npc-dock-position"
      onClose={onClose}
    >
      {!loading && npc && <NPCStatCard npc={npc} compact />}
    </FloatingWindow>
  )
}

function DungeonBreadcrumbs({
  dungeonTitle,
  dungeonId,
  trail,
  parsed,
}: {
  dungeonTitle: string
  dungeonId: number
  trail: Trail
  parsed: ReturnType<typeof parseDungeonData>
}) {
  return (
    <nav className="dungeon-breadcrumbs" aria-label="Breadcrumb">
      <Link to={`/dungeons/${dungeonId}`} className="dungeon-breadcrumb-link">
        {dungeonTitle}
      </Link>
      {trail.map((crumbRoomId, i) => {
        const room = getRoomById(parsed, crumbRoomId)
        const title = room?.title ?? `Room ${crumbRoomId}`
        const isLast = i === trail.length - 1
        return (
          <span key={crumbRoomId} className="dungeon-breadcrumb-segment">
            <span className="dungeon-breadcrumb-separator" aria-hidden="true">
              ›
            </span>
            {isLast ? (
              <span className="dungeon-breadcrumb-current" aria-current="page">
                {title}
              </span>
            ) : (
              <Link to={`/dungeons/${dungeonId}/rooms/${crumbRoomId}`} className="dungeon-breadcrumb-link">
                {title}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function DungeonRailRoomList({
  rooms,
  currentRoomId,
  onRoomSelect,
}: {
  rooms: ReturnType<typeof getRooms>
  currentRoomId?: number
  onRoomSelect: (roomId: number) => void
}) {
  return (
    <ul className="dungeon-rail-list">
      {rooms.map((room) => {
        const hints = getRoomThreatHints(room)
        const isSelected = room.room_id === currentRoomId
        return (
          <li key={room.room_id}>
            <button
              type="button"
              className={`dungeon-rail-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onRoomSelect(room.room_id)}
            >
              <span className="dungeon-rail-marker">{isSelected ? '●' : '○'}</span>
              <span className="dungeon-rail-title">{room.title}</span>
              <span className="dungeon-rail-hints">
                {hints.hasTrap && <TrapIcon size={16} aria-label="Contains trap" />}
                {hints.hasMonster && <SkullIcon size={16} aria-label="Contains monster" />}
                {hints.hasEncounter && <UsersIcon size={16} aria-label="Contains encounter" />}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function DungeonRail({
  parsed,
  rooms,
  currentRoomId,
  onRoomSelect,
  mapImage,
  onCollapse,
}: {
  parsed: DungeonData
  rooms: ReturnType<typeof getRooms>
  currentRoomId?: number
  onRoomSelect: (roomId: number) => void
  mapImage: string | null
  onCollapse: () => void
}) {
  const floors = getFloors(parsed)
  const currentFloor = currentRoomId ? getFloorForRoom(parsed, currentRoomId) : undefined

  return (
    <div className="dungeon-rail">
      <div className="dungeon-rail-toolbar">
        <span className="dungeon-rail-toolbar-label">Rooms</span>
        <button
          type="button"
          className="dungeon-rail-collapse"
          onClick={onCollapse}
          aria-label="Hide room index"
          title="Hide room index"
        >
          ←
        </button>
      </div>
      {mapImage && (
        <div className="dungeon-rail-map">
          <img src={mapImage} alt="Dungeon map" />
        </div>
      )}
      {rooms.length === 0 ? (
        <p className="dungeon-rail-empty">No rooms in this dungeon.</p>
      ) : floors.length > 1 ? (
        floors.map((floor) => {
          const floorRooms = getRoomsOnFloor(parsed, floor.floor_id)
          const isCurrentFloor = currentFloor?.floor_id === floor.floor_id
          return (
            <details key={floor.floor_id} className="dungeon-rail-floor" open={isCurrentFloor}>
              <summary className="dungeon-rail-floor-summary">
                {floor.title || `Floor ${floor.floor_id}`} · {floorRooms.length} room{floorRooms.length === 1 ? '' : 's'}
              </summary>
              <DungeonRailRoomList rooms={floorRooms} currentRoomId={currentRoomId} onRoomSelect={onRoomSelect} />
            </details>
          )
        })
      ) : (
        <DungeonRailRoomList rooms={rooms} currentRoomId={currentRoomId} onRoomSelect={onRoomSelect} />
      )}
    </div>
  )
}

function getEntryTypeIcon(type: string, size: number) {
  const iconMap: Record<string, React.ReactNode> = {
    feature: <SparklesIcon size={size} aria-hidden />,
    trap: <TrapIcon size={size} aria-hidden />,
    monster: <SkullIcon size={size} aria-hidden />,
    encounter: <UsersIcon size={size} aria-hidden />,
    treasure: <SparklesIcon size={size} aria-hidden />,
    npc: <UsersIcon size={size} aria-hidden />,
    trick: <SparklesIcon size={size} aria-hidden />,
    door: <DoorIcon size={size} aria-hidden />,
  }
  return iconMap[type] ?? <SparklesIcon size={size} aria-hidden />
}

function getGroupIcon(type: string) {
  return (
    <span style={{ marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center' }}>
      {getEntryTypeIcon(type, 16)}
    </span>
  )
}

/** Left-accent + icon-badge color class per entry type (feature=neutral, trap=error, monster=tertiary,
 * encounter=primary, treasure=secondary). Unmapped types (npc, trick, door) fall back to neutral. */
function entryAccentClass(type: string): string {
  const known = ['feature', 'trap', 'monster', 'encounter', 'treasure']
  return known.includes(type) ? type : 'neutral'
}

function FeatureTile({
  entry,
  type,
  onRunEncounter,
}: {
  entry: DungeonEntry
  type: string
  onRunEncounter?: (encounterId: number) => void
}) {
  const accent = entryAccentClass(type)
  const canRunEncounter = type === 'encounter' && entry.encounter_id != null && onRunEncounter

  return (
    <div className={`feature-tile feature-tile-${accent}`}>
      <div className="feature-tile-header">
        <span className={`feature-tile-icon feature-tile-icon-${accent}`}>{getEntryTypeIcon(type, 16)}</span>
        {entry.title && <span className="feature-tile-title">{entry.title}</span>}
        {entry.count !== null && <span className="feature-tile-count">×{entry.count}</span>}
        {entry.is_hidden && (
          <span className="feature-tile-hidden" title={`Hidden, DC ${entry.hidden_dc ?? '?'}`}>
            <KeyIcon size={14} aria-label="Hidden" />
            DC {entry.hidden_dc ?? '?'}
          </span>
        )}
        <span className="feature-tile-actions">
          {canRunEncounter && (
            <button
              type="button"
              className="feature-tile-run-encounter"
              onClick={() => onRunEncounter(entry.encounter_id as number)}
            >
              <NextTurnIcon size={14} aria-hidden />
              Run encounter
            </button>
          )}
        </span>
      </div>

      {entry.content && (
        <p className="feature-tile-body">
          <DiceText text={entry.content} />
        </p>
      )}

      {entry.container && (
        <div className="feature-tile-meta">
          <span className="dungeon-room-detail-label">Container:</span>
          {entry.container}
          {entry.container_mechanics && (
            <span className="dungeon-room-detail-mechanics">({entry.container_mechanics})</span>
          )}
        </div>
      )}

      {entry.treasure_contents && entry.treasure_contents.length > 0 && (
        <div className="feature-tile-meta">
          <span className="dungeon-room-detail-label">Treasure:</span>
          <ul className="dungeon-treasure-list">
            {entry.treasure_contents.map((item, idx) => {
              const itemRecord = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
              const qty = (itemRecord.quantity || itemRecord.qty || 1) as number
              const name = (itemRecord.name || itemRecord.title || String(item)) as string
              const value = (itemRecord.value || itemRecord.gold || null) as string | number | null
              return (
                <li key={idx}>
                  {qty > 1 && `${qty}× `}
                  {name}
                  {value && <span className="dungeon-treasure-value">({value}gp)</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {(entry.monster_id !== null || entry.encounter_id !== null || (entry.trap_ids && entry.trap_ids.length > 0)) && (
        <div className="feature-tile-refs">
          {entry.monster_id !== null && (
            <span className="dungeon-chip dungeon-chip-monster">Monster #{entry.monster_id}</span>
          )}
          {entry.encounter_id !== null && (
            <span className="dungeon-chip dungeon-chip-encounter">Encounter #{entry.encounter_id}</span>
          )}
          {entry.trap_ids && entry.trap_ids.length > 0 && (
            <span className="dungeon-chip dungeon-chip-trap">
              Trap{entry.trap_ids.length > 1 ? 's' : ''} #{entry.trap_ids.join(', #')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DungeonRoomPanel({
  dungeon,
  dungeonId,
  room,
  onRunEncounter,
  onOpenNpc,
}: {
  dungeon: Dungeon
  dungeonId: number
  room: DungeonRoom
  onRunEncounter?: (encounterId: number) => void
  onOpenNpc?: (npcId: number) => void
}) {
  const parsed = parseDungeonData(dungeon.data)
  const exits = getExitsFromRoom(parsed, room.room_id)
  const grouped = groupEntriesByType(room)
  const roomNpcs = Array.isArray(room.npcs) ? room.npcs : []

  const [npcRoster, setNpcRoster] = useState<Map<number, string>>(new Map())
  useEffect(() => {
    api
      .listNPCs()
      .then((npcs) => setNpcRoster(new Map(npcs.map((n) => [n.id, n.name]))))
      .catch(() => setNpcRoster(new Map()))
  }, [])

  return (
    <div className="dungeon-room-panel">
      <Card title={room.title} variant="neutral">
        {/* Room-level NPCs */}
        {roomNpcs.length > 0 && (
          <div className="dungeon-room-npcs">
            <p className="dungeon-room-npcs-label">NPCs present</p>
            <div className="dungeon-chip-group">
              {roomNpcs.map((npcId) => (
                <NpcChip key={npcId} npcId={npcId} roster={npcRoster} onClick={onOpenNpc ?? (() => {})} />
              ))}
            </div>
          </div>
        )}

        {/* Entries grouped by type */}
        <div className="dungeon-room-entries">
          {grouped.length > 0 ? (
            grouped.map((group) => (
              <div key={group.type} className="dungeon-room-group">
                <h4 className="dungeon-room-group-label">
                  {getGroupIcon(group.type)}
                  {group.label}
                </h4>
                {group.entries.map((entry, j) => (
                  <FeatureTile key={j} entry={entry} type={group.type} onRunEncounter={onRunEncounter} />
                ))}
              </div>
            ))
          ) : (
            <p className="dungeon-room-empty-entries">This room is empty.</p>
          )}
        </div>

        {/* Exits */}
        <div className="dungeon-room-exits">
          {exits.length > 0 ? (
            <>
              <h4 className="dungeon-room-exits-label">Exits →</h4>
              <div className="dungeon-room-exit-cards">
                {exits.map((exit) => {
                  const isStair = exit.kind === 'stair'
                  const exitTitle = isStair ? exit.stair?.title : exit.door?.title
                  const exitContent = isStair ? undefined : exit.door?.content
                  const exitKey = isStair ? `stair-${exit.stair?.stair_id}` : `door-${exit.door?.door_id}`
                  const doorMechanics = !isStair ? exit.door?.door_mechanics : null
                  const hasMeta = exit.isHidden || doorMechanics || (isStair && exit.toFloorTitle)
                  return (
                    <Link
                      key={exitKey}
                      to={`/dungeons/${dungeonId}/rooms/${exit.toRoomId}`}
                      className={`dungeon-exit-card ${exit.isHidden ? 'hidden' : ''}`}
                      title={exitContent || undefined}
                    >
                      <div className="dungeon-exit-icon-zone">
                        <span className="dungeon-exit-icon">
                          {exit.isHidden ? (
                            <KeyIcon size={22} aria-label="Hidden door" />
                          ) : isStair ? (
                            <StairsIcon size={22} aria-label="Stairs" />
                          ) : (
                            <DoorIcon size={22} aria-label="Door" />
                          )}
                        </span>
                        {isStair && exit.direction && (
                          <span className="dungeon-exit-direction-badge">
                            {exit.direction === 'up' ? (
                              <ChevronUpIcon size={16} aria-label="Up" />
                            ) : (
                              <ChevronDownIcon size={16} aria-label="Down" />
                            )}
                            {exit.direction === 'up' ? 'Up' : 'Down'}
                          </span>
                        )}
                      </div>
                      <span className="dungeon-exit-door">{exitTitle}</span>
                      <span className="dungeon-exit-destination">→ {exit.toRoom?.title || `Room ${exit.toRoomId}`}</span>
                      {hasMeta && (
                        <div className="dungeon-exit-card-meta">
                          {exit.isHidden && (
                            <span className="dungeon-exit-dc" title="Hidden door difficulty">
                              DC {exit.hiddenDc ?? '?'}
                            </span>
                          )}
                          {doorMechanics && <span className="dungeon-exit-mechanics">{doorMechanics}</span>}
                          {isStair && exit.toFloorTitle && (
                            <span className="dungeon-exit-floor-label">{exit.toFloorTitle}</span>
                          )}
                        </div>
                      )}
                      <span className="exit-card-actions" />
                    </Link>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="dungeon-room-no-exits">No visible exits.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
