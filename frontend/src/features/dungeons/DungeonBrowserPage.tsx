import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
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
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Dungeon | null>(null)

  const load = async () => {
    try {
      const data = await api.listDungeons()
      const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
      setDungeons(sorted)
      setLoadError(null)
      if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load dungeons.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selected = dungeons.find((d) => d.id === selectedId) || null
  const data = asRecord(selected?.data)
  const rooms = asArray(data.rooms)

  const createDungeon = async () => {
    setCreating(true)
    setLoadError(null)
    try {
      const base = 'Untitled Dungeon'
      let title = base
      let n = 2
      while (dungeons.some((d) => d.title === title)) {
        title = `${base} ${n}`
        n++
      }
      const dungeon = await api.createDungeon({ title, data: {} })
      navigate(`/dungeons/${dungeon.id}/edit`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create dungeon.'
      await load()
      setLoadError(message)
    } finally {
      setCreating(false)
    }
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
        <button type="button" className="dungeon-browser-new" onClick={createDungeon} disabled={creating}>
          {creating ? 'Creating...' : 'New Dungeon'}
        </button>
      </div>

      {loadError && <p className="dungeon-browser-error" role="alert">{loadError}</p>}

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
                  tag={`${rooms.length} room(s)`}
                  variant="neutral"
                  footer={
                    <div className="dungeon-browser-actions">
                      <button type="button" className="dungeon-browser-enter" onClick={() => handleEnter(selected)}>
                        Enter
                      </button>
                      <button type="button" onClick={() => navigate(`/dungeons/${selected.id}/edit`)}>
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
                  <p className="dungeon-browser-empty-content">
                    Open this dungeon in the map editor to see rooms, entries, and doors.
                  </p>
                </Card>
              </div>
            ) : (
              <p className="dungeon-browser-empty">Select a dungeon to see its details.</p>
            )
          }
        />
      </div>

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
