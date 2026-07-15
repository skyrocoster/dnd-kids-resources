import { useEffect, useMemo, useState } from 'react'
import { listNPCs } from '../../../api/client'
import type { NPC } from '../../../api/types'
import { DiceText } from '../../../components/DiceText'
import { NpcChip } from '../../npcs/NpcChip'
import {
  getRoomThreatHints,
  groupEntriesByType,
  type DungeonData,
  type DungeonEntry,
  type DungeonRoom,
} from '../dungeonModel'
import type { MapRoom } from './maplabModel'
import './RoomDetailsPanel.css'

interface RoomDetailsPanelProps {
  room: MapRoom | null
  dungeonRoom: DungeonRoom | null
  parsed: DungeonData
  dungeonId: number
  onRunEncounter: (encounterId: number) => void
  onOpenNpc: (npcId: number) => void
}

function roomTitle(room: MapRoom | null, dungeonRoom: DungeonRoom | null): string {
  if (dungeonRoom?.title) return dungeonRoom.title
  if (room?.title) return room.title
  if (room) return `Room #${room.room_id}`
  return 'Room details'
}

function formatTreasureContents(contents: unknown[] | null | undefined): string | null {
  if (!contents || contents.length === 0) return null

  const labels = contents
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item)
      if (!item || typeof item !== 'object') return null

      const record = item as Record<string, unknown>
      const name = typeof record.name === 'string'
        ? record.name
        : typeof record.title === 'string'
          ? record.title
          : typeof record.item_name === 'string'
            ? record.item_name
            : null
      if (!name) return null

      const quantity = typeof record.quantity === 'number'
        ? record.quantity
        : typeof record.count === 'number'
          ? record.count
          : null
      return quantity && quantity > 1 ? `${quantity} x ${name}` : name
    })
    .filter((item): item is string => item !== null)

  return labels.length > 0 ? labels.join(', ') : 'Treasure present'
}

function EntryBlock({
  entry,
  onRunEncounter,
}: {
  entry: DungeonEntry
  onRunEncounter: (encounterId: number) => void
}) {
  const treasure = formatTreasureContents(entry.treasure_contents)

  return (
    <article className="maplab-room-details-entry">
      {(entry.title || entry.encounter_id != null) && (
        <header className="maplab-room-details-entry-header">
          {entry.title && <h4 className="maplab-room-details-entry-title">{entry.title}</h4>}
          {entry.encounter_id != null && (
            <button
              type="button"
              className="maplab-pill-button maplab-room-details-encounter-button"
              onClick={() => onRunEncounter(entry.encounter_id as number)}
            >
              Run encounter
            </button>
          )}
        </header>
      )}
      {entry.content && (
        <p className="maplab-room-details-entry-content">
          <DiceText text={entry.content} />
        </p>
      )}
      {treasure && <p className="maplab-room-details-treasure">Treasure: {treasure}</p>}
    </article>
  )
}

export function RoomDetailsPanel({
  room,
  dungeonRoom,
  parsed: _parsed,
  dungeonId,
  onRunEncounter,
  onOpenNpc,
}: RoomDetailsPanelProps) {
  const [npcs, setNpcs] = useState<NPC[]>([])

  useEffect(() => {
    let cancelled = false
    listNPCs()
      .then((result) => {
        if (!cancelled) setNpcs(result)
      })
      .catch(() => {
        if (!cancelled) setNpcs([])
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  const roster = useMemo(() => new Map(npcs.map((npc) => [npc.id, npc.name] as const)), [npcs])
  const entryGroups = dungeonRoom ? groupEntriesByType(dungeonRoom) : []
  const threatHints = dungeonRoom ? getRoomThreatHints(dungeonRoom) : null

  if (room === null) {
    return (
      <section className="maplab-room-details-panel" aria-label="Room details">
        <p className="maplab-room-details-empty">Select a room on the map to see its details.</p>
      </section>
    )
  }

  return (
    <section className="maplab-room-details-panel" aria-label="Room details">
      <header className="maplab-room-details-header">
        <h3 className="maplab-room-details-title">{roomTitle(room, dungeonRoom)}</h3>
        {threatHints && (threatHints.hasTrap || threatHints.hasMonster || threatHints.hasEncounter) && (
          <div className="maplab-room-details-badges" aria-label="Threat hints">
            {threatHints.hasTrap && <span className="maplab-room-details-badge">Trap</span>}
            {threatHints.hasMonster && <span className="maplab-room-details-badge">Monster</span>}
            {threatHints.hasEncounter && <span className="maplab-room-details-badge">Encounter</span>}
          </div>
        )}
      </header>

      {dungeonRoom === null ? (
        <p className="maplab-room-details-empty">This room has no content data yet.</p>
      ) : (
        <>
          {entryGroups.length > 0 ? (
            <div className="maplab-room-details-groups">
              {entryGroups.map((group) => (
                <section key={group.type} className="maplab-room-details-group">
                  <h4 className="maplab-room-details-group-title">{group.label}</h4>
                  <div className="maplab-room-details-entry-list">
                    {group.entries.map((entry, index) => (
                      <EntryBlock
                        key={`${group.type}-${entry.title}-${index}`}
                        entry={entry}
                        onRunEncounter={onRunEncounter}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="maplab-room-details-empty">This room is empty.</p>
          )}

          {(dungeonRoom.npcs ?? []).length > 0 && (
            <section className="maplab-room-details-group">
              <h4 className="maplab-room-details-group-title">NPCs</h4>
              <div className="maplab-room-details-npcs">
                {(dungeonRoom.npcs ?? []).map((npcId) => (
                  <NpcChip key={npcId} npcId={npcId} roster={roster} onClick={onOpenNpc} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  )
}
