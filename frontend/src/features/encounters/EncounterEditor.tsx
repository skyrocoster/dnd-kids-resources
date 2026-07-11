import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Encounter, Monster } from '../../api/types'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import type { EncounterCreatureRow, EncounterFormState } from './encounterForm'
import { addEncounterCreatureRow, emptyEncounterForm, encounterToFormState, formStateToEncounterInput } from './encounterForm'
import './EncounterEditor.css'

interface EncounterEditorProps {
  encounter?: Encounter
  onClose: () => void
  onSaved: (encounter: Encounter) => void
}

const STATUS_OPTIONS = [
  { value: 'alive', label: 'Alive' },
  { value: 'unconscious', label: 'Unconscious' },
  { value: 'dead', label: 'Dead' },
  { value: 'fled', label: 'Fled' },
]

export function EncounterEditor({ encounter, onClose, onSaved }: EncounterEditorProps) {
  const [form, setForm] = useState<EncounterFormState>(() =>
    encounter ? encounterToFormState(encounter) : emptyEncounterForm(),
  )
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => setMonsters([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setMonsters([]))
  }, [])

  const patch = (fields: Partial<EncounterFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const updateRow = (id: string, fields: Partial<EncounterCreatureRow>) => {
    patch({ creatureRows: form.creatureRows.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }
  const removeRow = (id: string) => {
    patch({ creatureRows: form.creatureRows.filter((r) => r.id !== id) })
  }
  const handlePickMonster = (rowId: string, monsterId: string) => {
    const monster = monsters.find((m) => String(m.id) === monsterId)
    updateRow(rowId, {
      monsterId,
      originalName: monster?.name || '',
      name: monster?.name || '',
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
        onClick={(e) => e.stopPropagation()}
      >
        <header className="encounter-editor-header">
          <h2>{encounter ? `Edit Encounter: ${encounter.title}` : 'Add New Encounter'}</h2>
          <button type="button" className="encounter-editor-close" onClick={onClose} aria-label="Close">
            ×
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
                Add Creature
              </button>
            </div>
            {form.creatureRows.length === 0 && <p className="encounter-editor-empty">No creatures added.</p>}
            {form.creatureRows.map((row) => (
              <div className="encounter-editor-row-card" key={row.id}>
                <div className="encounter-editor-row-grid">
                  <SelectField
                    label="Monster"
                    value={row.monsterId}
                    onChange={(e) => handlePickMonster(row.id, e.target.value)}
                    options={monsters.map((m) => ({ value: String(m.id), label: m.name }))}
                    placeholder="Choose a monster…"
                  />
                  <TextField
                    label="Display Name"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  />
                  <TextField
                    label="HP Current"
                    type="number"
                    value={row.hpCurrent}
                    onChange={(e) => updateRow(row.id, { hpCurrent: e.target.value })}
                  />
                  <TextField
                    label="HP Max"
                    type="number"
                    value={row.hpMax}
                    onChange={(e) => updateRow(row.id, { hpMax: e.target.value })}
                  />
                  <TextField
                    label="AC"
                    type="number"
                    value={row.ac}
                    onChange={(e) => updateRow(row.id, { ac: e.target.value })}
                  />
                  <SelectField
                    label="Status"
                    value={row.status}
                    onChange={(e) => updateRow(row.id, { status: e.target.value })}
                    options={STATUS_OPTIONS}
                  />
                  <TextField
                    label="Conditions (comma-separated)"
                    value={row.conditionsText}
                    onChange={(e) => updateRow(row.id, { conditionsText: e.target.value })}
                  />
                </div>
                <button type="button" className="encounter-editor-row-remove" onClick={() => removeRow(row.id)}>
                  Remove Creature
                </button>
              </div>
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
