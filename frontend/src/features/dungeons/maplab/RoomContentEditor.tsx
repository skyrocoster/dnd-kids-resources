import { useEffect, useMemo, useState } from 'react'
import { listNPCs } from '../../../api/client'
import type { NPC } from '../../../api/types'
import { DiceText } from '../../../components/DiceText'
import { NpcChip } from '../../npcs/NpcChip'
import { groupEntriesByType, type DungeonEntry, type DungeonRoom } from '../dungeonModel'
import { InspectorPanel } from './InspectorPanel'
import type { MapRoom } from './maplabModel'

interface RoomContentEditorProps {
  room: MapRoom
  dungeonRoom: DungeonRoom | null
  onUpdateRoomTitle: (roomId: number, title: string) => void
  onUpdateRoomEntries: (roomId: number, entries: DungeonEntry[] | null | undefined) => void
  onUpdateRoomNpcs: (roomId: number, npcs: number[]) => void
  onCreateRoomData: (roomId: number) => void
}

const ENTRY_TYPES = [
  'feature',
  'encounter',
  'monster',
  'trap',
  'treasure',
  'npc',
  'trick',
  'door',
] as const

function emptyEntry(): DungeonEntry {
  return { entry_type: 'feature', title: '', content: '' }
}

function entryLabel(entryType: string): string {
  switch (entryType) {
    case 'door':
      return 'Door'
    case 'encounter':
      return 'Encounter'
    case 'monster':
      return 'Monster'
    case 'npc':
      return 'NPC'
    case 'trap':
      return 'Trap'
    case 'treasure':
      return 'Treasure'
    case 'trick':
      return 'Trick'
    default:
      return 'Feature'
  }
}

export function RoomContentEditor({
  room,
  dungeonRoom,
  onUpdateRoomTitle,
  onUpdateRoomEntries,
  onUpdateRoomNpcs,
  onCreateRoomData,
}: RoomContentEditorProps) {
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [editingNpcs, setEditingNpcs] = useState(false)
  const [entryDraft, setEntryDraft] = useState<DungeonEntry>(emptyEntry())
  const [editingEntries, setEditingEntries] = useState(false)
  const [selectedNpcIds, setSelectedNpcIds] = useState<number[]>(dungeonRoom?.npcs ?? [])

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
  }, [])

  useEffect(() => {
    setSelectedNpcIds(dungeonRoom?.npcs ?? [])
    setEditingNpcs(false)
    setEditingEntries(false)
    setEntryDraft(emptyEntry())
  }, [room.room_id, dungeonRoom?.npcs])

  const roster = useMemo(() => new Map(npcs.map((npc) => [npc.id, npc.name] as const)), [npcs])
  const entryGroups = dungeonRoom ? groupEntriesByType(dungeonRoom) : []
  const title = dungeonRoom?.title ?? room.title ?? ''
  const description = room.description ?? 'No description'
  const kind = room.kind ?? 'Unspecified'

  return (
    <section className="maplab-room-content-editor" aria-label="Room content editor">
      <InspectorPanel target={{ kind: 'room', room }} />

      <div className="maplab-fixture-form maplab-room-content-editor-form">
        <label className="maplab-field-row maplab-room-content-field">
          <span>Title</span>
          <input type="text" value={title} onChange={(event) => onUpdateRoomTitle(room.room_id, event.target.value)} />
        </label>

        <div className="maplab-room-content-readonly">
          <div className="maplab-room-content-readonly-row">
            <span className="maplab-room-content-label">Description</span>
            <span className="maplab-room-content-value">{description}</span>
          </div>
          <div className="maplab-room-content-readonly-row">
            <span className="maplab-room-content-label">Kind</span>
            <span className="maplab-room-content-value">{kind}</span>
          </div>
        </div>

        {dungeonRoom ? (
          <>
            <section className="maplab-room-content-section">
              <div className="maplab-room-content-section-header">
                <h4 className="maplab-room-content-section-title">NPCs</h4>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => setEditingNpcs((active) => !active)}
                >
                  {editingNpcs ? 'Done' : 'Edit NPCs'}
                </button>
              </div>
              {(dungeonRoom.npcs ?? []).length > 0 ? (
                <div className="maplab-room-content-chip-row">
                  {(dungeonRoom.npcs ?? []).map((npcId) => (
                    <NpcChip key={npcId} npcId={npcId} roster={roster} onClick={() => undefined} />
                  ))}
                </div>
              ) : (
                <p className="maplab-room-content-muted">No NPCs assigned.</p>
              )}
              {editingNpcs && (
                <div className="maplab-room-content-checkbox-list" role="group" aria-label="Edit NPCs">
                  {npcs.map((npc) => {
                    const checked = selectedNpcIds.includes(npc.id)
                    return (
                      <label key={npc.id} className="maplab-room-content-checkbox-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedNpcIds, npc.id]
                              : selectedNpcIds.filter((id) => id !== npc.id)
                            setSelectedNpcIds(next)
                            onUpdateRoomNpcs(room.room_id, next)
                          }}
                        />
                        <span>{npc.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="maplab-room-content-section">
              <div className="maplab-room-content-section-header">
                <h4 className="maplab-room-content-section-title">Entries</h4>
                <button
                  type="button"
                  className="maplab-pill-button maplab-editor-toolbar-button"
                  onClick={() => setEditingEntries((active) => !active)}
                >
                  {editingEntries ? 'Close entry form' : 'Add entry'}
                </button>
              </div>

              {entryGroups.length > 0 ? (
                <div className="maplab-room-content-entry-groups">
                  {entryGroups.map((group) => (
                    <section key={group.type} className="maplab-room-content-entry-group">
                      <h5 className="maplab-room-content-section-subtitle">{group.label}</h5>
                      <div className="maplab-room-content-entry-list">
                        {group.entries.map((entry, index) => (
                          <article key={`${group.type}-${entry.title}-${index}`} className="maplab-room-content-entry-card">
                            <header className="maplab-room-content-entry-card-header">
                              <strong>{entry.title || entryLabel(entry.entry_type)}</strong>
                              <span>{entry.entry_type}</span>
                            </header>
                            {entry.content && (
                              <p className="maplab-room-content-entry-text">
                                <DiceText text={entry.content} />
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="maplab-room-content-muted">No entries yet.</p>
              )}

              {editingEntries && (
                <form
                  className="maplab-room-content-entry-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const nextEntries = [...(dungeonRoom.entries ?? []), entryDraft]
                    onUpdateRoomEntries(room.room_id, nextEntries)
                    setEntryDraft(emptyEntry())
                  }}
                >
                  <label className="maplab-field-row maplab-room-content-field">
                    <span>Type</span>
                    <select
                      value={entryDraft.entry_type}
                      onChange={(event) => setEntryDraft((current) => ({ ...current, entry_type: event.target.value }))}
                    >
                      {ENTRY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {entryLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="maplab-field-row maplab-room-content-field">
                    <span>Title</span>
                    <input
                      type="text"
                      value={entryDraft.title}
                      onChange={(event) => setEntryDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label className="maplab-room-content-textarea-row">
                    <span className="maplab-room-content-label">Content</span>
                    <textarea
                      value={entryDraft.content}
                      onChange={(event) => setEntryDraft((current) => ({ ...current, content: event.target.value }))}
                    />
                  </label>
                  <button type="submit" className="maplab-pill-button maplab-editor-toolbar-button">
                    Add entry
                  </button>
                </form>
              )}
            </section>
          </>
        ) : (
          <section className="maplab-room-content-section">
            <p className="maplab-room-content-muted">No content data.</p>
            <button
              type="button"
              className="maplab-pill-button maplab-editor-toolbar-button"
              onClick={() => onCreateRoomData(room.room_id)}
            >
              Create room data
            </button>
          </section>
        )}
      </div>
    </section>
  )
}
