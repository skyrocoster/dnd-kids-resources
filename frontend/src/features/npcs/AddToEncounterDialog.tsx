import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Encounter, NPC } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { combatantFromNpc, appendCreatureToEncounter } from './addToEncounter'
import './AddToEncounterDialog.css'

interface AddToEncounterDialogProps {
  npc: NPC
  onClose: () => void
  onAdded: () => void
}

export function AddToEncounterDialog({ npc, onClose, onAdded }: AddToEncounterDialogProps) {
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingEncounters, setLoadingEncounters] = useState(true)
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    api
      .listEncounters()
      .then((data) => {
        setEncounters([...data].sort((a, b) => a.title.localeCompare(b.title)))
        setLoadError(null)
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load encounters.')
      })
      .finally(() => setLoadingEncounters(false))
  }, [])

  const handleCommit = async () => {
    if (!selectedEncounter) return
    setSaving(true)
    setStatus('Adding…')
    const creature = combatantFromNpc(npc)
    const input = appendCreatureToEncounter(selectedEncounter, creature)
    try {
      await api.updateEncounter(selectedEncounter.id, input)
      onAdded()
      onClose()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to add to encounter.')
      setSaving(false)
    }
  }

  const searchListStatus = loadingEncounters ? 'loading' : loadError ? 'error' : 'ready'

  return (
    <Dialog
      open
      title={`Add to encounter: ${npc.name}`}
      onClose={onClose}
      pending={saving}
      className="add-to-encounter-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedEncounter}
            loading={saving}
            onClick={handleCommit}
          >
            Add
          </Button>
          {status && (
            <p role="status" className="add-to-encounter-footer-status">
              {status}
            </p>
          )}
        </>
      }
    >
      <div className="add-to-encounter-body">
        {loadError && <StatePanel status="error" message={loadError} />}

        {!loadError && encounters.length === 0 && !loadingEncounters && (
          <StatePanel status="empty" message="No encounters found." />
        )}

        {!loadError && encounters.length > 0 && (
          <SearchList
            items={encounters}
            getId={(e) => e.id}
            getLabel={(e) => e.title}
            selectedId={selectedEncounter?.id ?? null}
            onSelect={setSelectedEncounter}
            variant="neutral"
            searchPlaceholder="Search encounters…"
            emptyMessage="No encounters match your search."
            status={searchListStatus}
          />
        )}
      </div>
    </Dialog>
  )
}
