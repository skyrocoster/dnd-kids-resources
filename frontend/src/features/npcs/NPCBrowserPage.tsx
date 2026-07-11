import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { NPC } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { NPCEditor } from './NPCEditor'
import { NPCStatCard } from './NPCStatCard'
import './NPCBrowserPage.css'

export function NPCBrowserPage() {
  const [npcs, setNPCs] = useState<NPC[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNPC, setEditingNPC] = useState<NPC | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<NPC | null>(null)

  const load = () => {
    api
      .listNPCs()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setNPCs(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load NPCs.'))
  }

  useEffect(load, [])

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
    await api.deleteNPC(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="npc-browser-page">
      <div className="npc-browser-toolbar">
        <h2>NPCs</h2>
        <button type="button" className="npc-browser-new" onClick={openCreate}>
          New NPC
        </button>
      </div>

      {loadError && <p className="npc-browser-error">{loadError}</p>}

      <div className="npc-browser-split">
        <SplitPane
          leftLabel="npc list"
          left={
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
            />
          }
          right={
            selected ? (
              <div className="npc-browser-detail">
                <NPCStatCard npc={selected} />
                <div className="npc-browser-actions">
                  <button type="button" onClick={() => openEdit(selected)}>
                    Edit
                  </button>
                  <button type="button" className="npc-browser-delete" onClick={() => setPendingDelete(selected)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <p className="npc-browser-empty">Select an NPC to see their details.</p>
            )
          }
        />
      </div>

      {editorOpen && <NPCEditor npc={editingNPC} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.name}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
