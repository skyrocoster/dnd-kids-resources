import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../api/client'
import type { Encounter } from '../../api/types'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { ShieldIcon } from '../../components/icons'
import { EncounterEditor } from './EncounterEditor'
import './EncounterBrowserPage.css'

export function EncounterBrowserPage() {
  const navigate = useNavigate()
  const [encountersRemote, setEncountersRemote] = useState<RemoteState<Encounter[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEncounter, setEditingEncounter] = useState<Encounter | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Encounter | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setEncountersRemote(remoteLoading())
    api
      .listEncounters()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title))
        setEncountersRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) =>
        setEncountersRemote(remoteError(error instanceof Error ? error.message : 'Failed to load encounters.')),
      )
  }

  useEffect(load, [])

  const encounters = encountersRemote.status === 'success' ? encountersRemote.data : []
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
    setDeleting(true)
    try {
      await api.deleteEncounter(pendingDelete.id)
      setPendingDelete(null)
      setSelectedId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="encounter-browser-page">
      <BrowserLayout
        title="Encounters"
        chapterIcon={<ShieldIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Encounter</Button>}
        error={encountersRemote.status === 'error' ? encountersRemote.error : null}
        listLabel="encounter list"
        list={
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
            status={
              encountersRemote.status === 'loading' || encountersRemote.status === 'idle'
                ? 'loading'
                : encountersRemote.status === 'error'
                  ? 'error'
                  : 'ready'
            }
          />
        }
        detail={
          selected ? (
            <div className="encounter-browser-detail">
              <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>
                Back to encounters
              </Button>
              <Card
                title={selected.title}
                tag={selected.creatures ? `${selected.creatures.length} creature(s)` : undefined}
                variant="neutral"
                footer={
                  <div className="encounter-browser-actions">
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/encounters/${selected.id}/run`)}
                    >
                      Run
                    </Button>
                    <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                    <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
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
            <StatePanel status="noSelection" message="Choose an encounter from the list to see its details." />
          )
        }
        editor={
          editorOpen && (
            <EncounterEditor encounter={editingEncounter} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
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
