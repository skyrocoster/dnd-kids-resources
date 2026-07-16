import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../api/client'
import type { Dungeon } from '../../api/types'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { DoorIcon } from '../../components/icons'
import './DungeonBrowserPage.css'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

export function DungeonBrowserPage() {
  const navigate = useNavigate()
  const [dungeonsRemote, setDungeonsRemote] = useState<RemoteState<Dungeon[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Dungeon | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setDungeonsRemote(remoteLoading())
    try {
      const data = await api.listDungeons()
      const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
      setDungeonsRemote(remoteSuccess(sorted))
      if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
    } catch (error) {
      setDungeonsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load dungeons.'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const dungeons = dungeonsRemote.status === 'success' ? dungeonsRemote.data : []
  const selected = dungeons.find((d) => d.id === selectedId) || null
  const data = asRecord(selected?.data)
  const rooms = asArray(data.rooms)

  const createDungeon = async () => {
    setCreating(true)
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
      setDungeonsRemote(remoteError(message))
    } finally {
      setCreating(false)
    }
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteDungeon(pendingDelete.id)
      setPendingDelete(null)
      setSelectedId(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dungeon-browser-page">
      <BrowserLayout
        title="Dungeons"
        chapterIcon={<DoorIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={
          <Button type="button" onClick={createDungeon} disabled={creating}>
            {creating ? 'Creating...' : 'New Dungeon'}
          </Button>
        }
        error={dungeonsRemote.status === 'error' ? dungeonsRemote.error : null}
        listLabel="dungeon list"
        list={
          <SearchList
            items={dungeons}
            getId={(d) => d.id}
            getLabel={(d) => d.title}
            selectedId={selectedId}
            onSelect={(d) => setSelectedId(d.id)}
            variant="neutral"
            searchPlaceholder="Search dungeons…"
            emptyMessage="No dungeons found."
            status={
              dungeonsRemote.status === 'loading' || dungeonsRemote.status === 'idle'
                ? 'loading'
                : dungeonsRemote.status === 'error'
                  ? 'error'
                  : 'ready'
            }
          />
        }
        detail={
          selected ? (
            <div className="dungeon-browser-detail">
              <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>
                Back to dungeons
              </Button>
              <Card
                title={selected.title}
                tag={`${rooms.length} room(s)`}
                variant="neutral"
                footer={
                  <div className="dungeon-browser-actions">
                    <Button variant="secondary" onClick={() => navigate(`/dungeons/${selected.id}`)}>
                      Enter
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/dungeons/${selected.id}/edit`)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                  </div>
                }
              >
                <p className="dungeon-browser-empty-content">
                  Open this dungeon in the map editor to see rooms, entries, and doors.
                </p>
              </Card>
            </div>
          ) : (
            <StatePanel status="noSelection" message="Choose a dungeon from the list to see its details." />
          )
        }
        dialog={
          pendingDelete && (
            <ConfirmDialog
              message={`Delete ${pendingDelete.title}?`}
              onConfirm={confirmDelete}
              onCancel={() => setPendingDelete(null)}
              pending={deleting}
            />
          )
        }
      />
    </div>
  )
}
