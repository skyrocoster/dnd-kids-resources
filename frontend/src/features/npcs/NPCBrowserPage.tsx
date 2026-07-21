import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { NPC } from '../../api/types'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { MasksIcon } from '../../components/icons'
import { NPCEditor } from './NPCEditor'
import { NPCStatCard } from './NPCStatCard'
import { AddToEncounterDialog } from './AddToEncounterDialog'
import { PullFromMonsterDialog } from './PullFromMonsterDialog'
import './NPCBrowserPage.css'

export function NPCBrowserPage() {
  const [npcsRemote, setNPCsRemote] = useState<RemoteState<NPC[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNPC, setEditingNPC] = useState<NPC | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<NPC | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pullTarget, setPullTarget] = useState<NPC | null>(null)
  const [addToEncounterTarget, setAddToEncounterTarget] = useState<NPC | null>(null)

  const load = () => {
    setNPCsRemote(remoteLoading())
    api
      .listNPCs()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setNPCsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setNPCsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load NPCs.')))
  }

  useEffect(load, [])

  const npcs = npcsRemote.status === 'success' ? npcsRemote.data : []
  const selected = npcs.find((n) => n.id === selectedId) || null

  const openCreate = () => {
    setEditingNPC(undefined)
    setEditorOpen(true)
  }
  const openEdit = (npc: NPC) => {
    setEditingNPC(npc)
    setEditorOpen(true)
  }
  const handleSaved = (npc: NPC) => {
    setEditorOpen(false)
    setSelectedId(npc.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteNPC(pendingDelete.id)
      setPendingDelete(null)
      setSelectedId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="npc-browser-page">
      <BrowserLayout
        title="NPCs"
        chapterIcon={<MasksIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New NPC</Button>}
        error={npcsRemote.status === 'error' ? npcsRemote.error : null}
        listLabel="npc list"
        list={
          <SearchList
            items={npcs}
            getId={(n) => n.id}
            getLabel={(n) => n.name}
            getMeta={(n) => n.race || undefined}
            selectedId={selectedId}
            onSelect={(n) => setSelectedId(n.id)}
            variant="neutral"
            searchPlaceholder="Search NPCs…"
            emptyMessage="No NPCs found."
            status={npcsRemote.status === 'loading' || npcsRemote.status === 'idle' ? 'loading' : npcsRemote.status === 'error' ? 'error' : 'ready'}
          />
        }
        detail={
          selected ? (
            <div className="npc-browser-detail">
              <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to NPCs</Button>
              <NPCStatCard npc={selected} onPull={() => setPullTarget(selected)} />
              <div className="npc-browser-actions">
                <Button variant="secondary" onClick={() => setPullTarget(selected)}>Pull from a monster…</Button>
                <Button variant="secondary" onClick={() => setAddToEncounterTarget(selected)}>Add to encounter…</Button>
                <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
              </div>
            </div>
          ) : (
            <StatePanel status="noSelection" message="Choose an NPC from the list to see their details." />
          )
        }
        editor={editorOpen && <NPCEditor npc={editingNPC} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
        dialog={pendingDelete && (
          <ConfirmDialog
            message={`Delete ${pendingDelete.name}?`}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
            pending={deleting}
          />
        )}
      />
      {pullTarget && (
        <PullFromMonsterDialog
          npc={pullTarget}
          onClose={() => setPullTarget(null)}
          onPulled={() => { setPullTarget(null); load() }}
        />
      )}
      {addToEncounterTarget && (
        <AddToEncounterDialog
          npc={addToEncounterTarget}
          onClose={() => setAddToEncounterTarget(null)}
          onAdded={() => setAddToEncounterTarget(null)}
        />
      )}
    </div>
  )
}
