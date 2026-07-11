import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { SplitPane } from '../../components/SplitPane'
import { Card } from '../../components/Card'
import { DiceText } from '../../components/DiceText'
import { parseDungeonData, getRooms, getRoomById, getExitsFromRoom, getRoomThreatHints, groupEntriesByType } from './dungeonModel'
import './DungeonViewPage.css'

export function DungeonViewPage() {
  const { dungeonId: dungeonIdStr, roomId: roomIdStr } = useParams()
  const navigate = useNavigate()

  const [dungeon, setDungeon] = useState<Dungeon | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const dungeonId = dungeonIdStr ? Number(dungeonIdStr) : undefined
  const roomId = roomIdStr ? Number(roomIdStr) : undefined

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
        <button type="button" onClick={() => navigate('/dungeons')}>
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
        <button type="button" onClick={() => navigate(`/dungeons/${dungeonId}`)}>
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
        <button type="button" onClick={() => navigate('/dungeons')}>
          Back to dungeons
        </button>
      </div>

      <div className="dungeon-view-split">
        <SplitPane
          leftLabel="room index"
          left={<DungeonRail rooms={rooms} currentRoomId={roomId} onRoomSelect={handleRoomSelect} />}
          right={
            currentRoom ? (
              <DungeonRoomPanel dungeon={dungeon} room={currentRoom} onNavigate={handleRoomSelect} />
            ) : (
              <p className="dungeon-view-empty">Select a room to begin.</p>
            )
          }
        />
      </div>
    </div>
  )
}

function DungeonRail({
  rooms,
  currentRoomId,
  onRoomSelect,
}: {
  rooms: ReturnType<typeof getRooms>
  currentRoomId?: number
  onRoomSelect: (roomId: number) => void
}) {
  return (
    <div className="dungeon-rail">
      {rooms.length === 0 ? (
        <p className="dungeon-rail-empty">No rooms in this dungeon.</p>
      ) : (
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
                    {hints.hasTrap && <span title="Contains trap">⚠️</span>}
                    {hints.hasMonster && <span title="Contains monster">👹</span>}
                    {hints.hasEncounter && <span title="Contains encounter">👥</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DungeonRoomPanel({
  dungeon,
  room,
  onNavigate,
}: {
  dungeon: Dungeon
  room: ReturnType<typeof getRoomById>
  onNavigate: (roomId: number) => void
}) {
  const parsed = parseDungeonData(dungeon.data)
  const exits = getExitsFromRoom(parsed, room.room_id)
  const grouped = groupEntriesByType(room)

  return (
    <div className="dungeon-room-panel">
      <Card title={room.title} variant="neutral">
        {/* Entries grouped by type */}
        <div className="dungeon-room-entries">
          {Object.entries(grouped).length > 0 ? (
            Object.entries(grouped).map(([label, groups]) => (
              <div key={label} className="dungeon-room-group">
                <h4 className="dungeon-room-group-label">{label}</h4>
                {groups.map((g, i) => (
                  <div key={i}>
                    {g.entries.map((entry, j) => (
                      <div key={j} className="dungeon-room-entry">
                        {entry.title && <strong>{entry.title}</strong>}
                        {entry.content && (
                          <p className="dungeon-room-entry-content">
                            <DiceText>{entry.content}</DiceText>
                          </p>
                        )}
                        {entry.is_hidden && (
                          <span className="dungeon-room-entry-hidden" title={`Hidden, DC ${entry.hidden_dc ?? '?'}`}>
                            🗝️ DC {entry.hidden_dc ?? '?'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
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
                {exits.map((exit) => (
                  <button
                    key={exit.door.door_id}
                    type="button"
                    className={`dungeon-exit-card ${exit.isHidden ? 'hidden' : ''}`}
                    onClick={() => onNavigate(exit.toRoomId)}
                    title={exit.door.content || undefined}
                  >
                    <span className="dungeon-exit-icon">{exit.isHidden ? '🗝' : '🚪'}</span>
                    <span className="dungeon-exit-door">{exit.door.title}</span>
                    <span className="dungeon-exit-arrow">→</span>
                    <span className="dungeon-exit-destination">{exit.toRoom?.title || `Room ${exit.toRoomId}`}</span>
                    {exit.isHidden && (
                      <span className="dungeon-exit-dc" title="Hidden door difficulty">
                        DC {exit.hiddenDc ?? '?'}
                      </span>
                    )}
                  </button>
                ))}
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
