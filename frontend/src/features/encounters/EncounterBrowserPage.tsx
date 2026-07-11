import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../api/client'
import type { Encounter } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { EncounterEditor } from './EncounterEditor'
import './EncounterBrowserPage.css'

export function EncounterBrowserPage() {
  const navigate = useNavigate()
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEncounter, setEditingEncounter] = useState<Encounter | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Encounter | null>(null)

  const load = () => {
    api
      .listEncounters()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
        setEncounters(sorted)
        setLoadError(null)
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load encounters.'))
  }

  useEffect(load, [])

  const selected = encounters.find((e) => e.id === selectedId) || null

  const openCreate = () => {
    setEditingEncounter(undefined)
    setEditorOpen(true)
  }
  const openEdit = (encounter: Encounter) => {
    setEditingEncounter(encounter)
    setEditorOpen(true)
  }
  const handleSaved = (encounter: Encounter) => {
    setEditorOpen(false)
    setSelectedId(encounter.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteEncounter(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="encounter-browser-page">
      <div className="encounter-browser-toolbar">
        <h2>Encounters</h2>
        <button type="button" className="encounter-browser-new" onClick={openCreate}>
          New Encounter
        </button>
      </div>

      {loadError && <p className="encounter-browser-error">{loadError}</p>}

      <div className="encounter-browser-split">
        <SplitPane
          leftLabel="encounter list"
          left={
            <SearchList
              items={encounters}
              getId={(e) => e.id}
              getLabel={(e) => e.title}
              getMeta={(e) => (e.creatures ? `${e.creatures.length} creature(s)` : undefined)}
              selectedId={selectedId}
              onSelect={(e) => setSelectedId(e.id)}
              variant="neutral"
              searchPlaceholder="Search encounters…"
              emptyMessage="No encounters found."
            />
          }
          right={
            selected ? (
              <div className="encounter-browser-detail">
                <Card
                  title={selected.title}
                  tag={selected.creatures ? `${selected.creatures.length} creature(s)` : undefined}
                  variant="neutral"
                  footer={
                    <div className="encounter-browser-actions">
                      <button
                        type="button"
                        className="encounter-browser-run"
                        onClick={() => navigate(`/encounters/${selected.id}/run`)}
                      >
                        Run
                      </button>
                      <button type="button" onClick={() => openEdit(selected)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="encounter-browser-delete"
                        onClick={() => setPendingDelete(selected)}
                      >
                        Delete
                      </button>
                    </div>
                  }
                >
                  {selected.creatures && selected.creatures.length > 0 ? (
                    <ul className="encounter-browser-creatures">
                      {selected.creatures.map((creature, i) => (
                        <li key={i}>
                          <span className="encounter-browser-creature-name">{creature.name || 'Unknown'}</span>
                          <span className="encounter-browser-creature-meta">
                            {creature.hp_current != null && creature.hp_max != null
                              ? `HP ${creature.hp_current}/${creature.hp_max}`
                              : null}
                            {creature.ac != null ? ` AC ${creature.ac}` : ''}
                            {creature.status ? ` · ${creature.status}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="encounter-browser-empty-creatures">No creatures in this encounter.</p>
                  )}
                </Card>
              </div>
            ) : (
              <p className="encounter-browser-empty">Select an encounter to see its details.</p>
            )
          }
        />
      </div>

      {editorOpen && (
        <EncounterEditor encounter={editingEncounter} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
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
