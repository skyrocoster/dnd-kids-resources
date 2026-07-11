import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { DungeonEditor } from './DungeonEditor'
import './DungeonBrowserPage.css'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

export function DungeonBrowserPage() {
  const navigate = useNavigate()
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDungeon, setEditingDungeon] = useState<Dungeon | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Dungeon | null>(null)

  const load = () => {
    api
      .listDungeons()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
        setDungeons(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load dungeons.'))
  }

  useEffect(load, [])

  const selected = dungeons.find((d) => d.id === selectedId) || null
  const data = asRecord(selected?.data)
  const generalInfo = asRecord(data.general_info)
  const rooms = asArray(data.rooms)
  const doors = asArray(data.doors)

  const openCreate = () => {
    setEditingDungeon(undefined)
    setEditorOpen(true)
  }
  const openEdit = (dungeon: Dungeon) => {
    setEditingDungeon(dungeon)
    setEditorOpen(true)
  }
  const handleSaved = (dungeon: Dungeon) => {
    setEditorOpen(false)
    setSelectedId(dungeon.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteDungeon(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }
  const handleEnter = (dungeon: Dungeon) => {
    navigate(`/dungeons/${dungeon.id}`)
  }

  return (
    <div className="dungeon-browser-page">
      <div className="dungeon-browser-toolbar">
        <h2>Dungeons</h2>
        <button type="button" className="dungeon-browser-new" onClick={openCreate}>
          New Dungeon
        </button>
      </div>

      {loadError && <p className="dungeon-browser-error">{loadError}</p>}

      <div className="dungeon-browser-split">
        <SplitPane
          leftLabel="dungeon list"
          left={
            <SearchList
              items={dungeons}
              getId={(d) => d.id}
              getLabel={(d) => d.title}
              selectedId={selectedId}
              onSelect={(d) => setSelectedId(d.id)}
              variant="neutral"
              searchPlaceholder="Search dungeons…"
              emptyMessage="No dungeons found."
            />
          }
          right={
            selected ? (
              <div className="dungeon-browser-detail">
                <Card
                  title={selected.title}
                  subtitle={typeof generalInfo.size === 'string' ? generalInfo.size : undefined}
                  tag={rooms.length ? `${rooms.length} room(s)` : undefined}
                  variant="neutral"
                  footer={
                    <div className="dungeon-browser-actions">
                      <button type="button" className="dungeon-browser-enter" onClick={() => handleEnter(selected)}>
                        Enter
                      </button>
                      <button type="button" onClick={() => openEdit(selected)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dungeon-browser-delete"
                        onClick={() => setPendingDelete(selected)}
                      >
                        Delete
                      </button>
                    </div>
                  }
                >
                  {rooms.length > 0 && (
                    <div className="dungeon-browser-block">
                      <h4>Rooms</h4>
                      <ul>
                        {rooms.map((room, i) => (
                          <li key={i}>
                            <strong>{String(room.title || `Room ${room.room_id ?? i}`)}</strong>
                            {asArray(room.entries).length > 0 && (
                              <ul>
                                {asArray(room.entries).map((entry, j) => (
                                  <li key={j}>
                                    {entry.title ? `${entry.title}: ` : ''}
                                    {String(entry.content || '')}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {doors.length > 0 && (
                    <div className="dungeon-browser-block">
                      <h4>Doors</h4>
                      <ul>
                        {doors.map((door, i) => (
                          <li key={i}>
                            {String(door.title || `Door ${door.door_id ?? i}`)}
                            {Array.isArray(door.leads_to) && door.leads_to.length > 0
                              ? ` → rooms ${(door.leads_to as unknown[]).join(', ')}`
                              : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rooms.length === 0 && doors.length === 0 && (
                    <p className="dungeon-browser-empty-content">This dungeon has no rooms or doors yet.</p>
                  )}
                </Card>
              </div>
            ) : (
              <p className="dungeon-browser-empty">Select a dungeon to see its details.</p>
            )
          }
        />
      </div>

      {editorOpen && (
        <DungeonEditor dungeon={editingDungeon} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.title}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
