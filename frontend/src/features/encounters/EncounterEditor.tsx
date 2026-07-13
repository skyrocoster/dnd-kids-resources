import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Condition, Encounter, Monster } from '../../api/types'
import { TextField } from '../../components/form/TextField'
import { CloseIcon, PlusIcon } from '../../components/icons'
import { CreatureRowCard } from './CreatureRowCard'
import type { EncounterCreatureRow, EncounterFormState } from './encounterForm'
import { addEncounterCreatureRow, emptyEncounterForm, encounterToFormState, formStateToEncounterInput } from './encounterForm'
import { deriveCreatureStats } from './encounterStats'
import './EncounterEditor.css'

interface EncounterEditorProps {
  encounter?: Encounter
  onClose: () => void
  onSaved: (encounter: Encounter) => void
}

export function EncounterEditor({ encounter, onClose, onSaved }: EncounterEditorProps) {
  const [form, setForm] = useState<EncounterFormState>(() =>
    encounter ? encounterToFormState(encounter) : emptyEncounterForm(),
  )
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => setMonsters([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setMonsters([]))
  }, [])

  useEffect(() => {
    api
      .getConditions()
      .then((data) => setConditions(data))
      .catch(() => setConditions([]))
  }, [])

  const patch = (fields: Partial<EncounterFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const updateRow = (id: string, fields: Partial<EncounterCreatureRow>) => {
    patch({ creatureRows: form.creatureRows.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }
  const removeRow = (id: string) => {
    patch({ creatureRows: form.creatureRows.filter((r) => r.id !== id) })
  }
  const toggleRowCollapsed = (id: string) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const handlePickMonster = (rowId: string, monsterId: string) => {
    const monster = monsters.find((m) => String(m.id) === monsterId)
    // Picking (or changing) the monster replaces this row's HP/AC with its defaults — the row
    // represents "an instance of this monster." Hand-edits persist until the monster is re-picked.
    const { hpAverage, ac } = monster ? deriveCreatureStats(monster) : { hpAverage: null, ac: null }
    updateRow(rowId, {
      monsterId,
      originalName: monster?.name || '',
      name: monster?.name || '',
      hpCurrent: hpAverage != null ? String(hpAverage) : '',
      hpMax: hpAverage != null ? String(hpAverage) : '',
      ac: ac != null ? String(ac) : '',
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving encounter…' })
    const payload = formStateToEncounterInput(form)
    try {
      const saved = encounter ? await api.updateEncounter(encounter.id, payload) : await api.createEncounter(payload)
      setStatus({ message: 'Encounter saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save encounter.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="encounter-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="encounter-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={encounter ? `Edit ${encounter.title}` : 'Add new encounter'}
        data-variant="monster"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="encounter-editor-header">
          <h2>{encounter ? `Edit Encounter: ${encounter.title}` : 'Add New Encounter'}</h2>
          <button type="button" className="encounter-editor-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={20} aria-hidden />
          </button>
        </header>

        {status.message && <p className={`encounter-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="encounter-editor-form">
          <TextField label="Title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />

          <section className="encounter-editor-section">
            <div className="encounter-editor-section-header">
              <h3>Creatures</h3>
              <button
                type="button"
                className="encounter-editor-add"
                onClick={() => patch({ creatureRows: addEncounterCreatureRow(form.creatureRows) })}
              >
                <PlusIcon size={16} aria-hidden />
                Add Creature
              </button>
            </div>
            {form.creatureRows.length === 0 && <p className="encounter-editor-empty">No creatures added.</p>}
            {form.creatureRows.map((row) => (
              <CreatureRowCard
                key={row.id}
                row={row}
                monsters={monsters}
                conditions={conditions}
                collapsed={collapsedRows.has(row.id)}
                onToggleCollapsed={() => toggleRowCollapsed(row.id)}
                onPickMonster={(monsterId) => handlePickMonster(row.id, monsterId)}
                onChange={(fields) => updateRow(row.id, fields)}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </section>

          <div className="encounter-editor-actions">
            <button type="button" className="encounter-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="encounter-editor-save" disabled={saving}>
              {encounter ? 'Save Changes' : 'Create Encounter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
