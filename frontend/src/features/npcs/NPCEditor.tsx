import { useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { NPC } from '../../api/types'
import { TextField } from '../../components/form/TextField'
import { emptyNPCForm, formStateToNPCInput, npcToFormState } from './npcForm'
import type { NPCFormState } from './npcForm'
import './NPCEditor.css'

interface NPCEditorProps {
  npc?: NPC
  onClose: () => void
  onSaved: (npc: NPC) => void
}

export function NPCEditor({ npc, onClose, onSaved }: NPCEditorProps) {
  const [form, setForm] = useState<NPCFormState>(() => (npc ? npcToFormState(npc) : emptyNPCForm()))
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  const patch = (fields: Partial<NPCFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving NPC…' })
    const payload = formStateToNPCInput(form)
    try {
      const saved = npc ? await api.updateNPC(npc.id, payload) : await api.createNPC(payload)
      setStatus({ message: 'NPC saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save NPC.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="npc-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="npc-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={npc ? `Edit ${npc.name}` : 'Add new NPC'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="npc-editor-header">
          <h2>{npc ? `Edit NPC: ${npc.name}` : 'Add New NPC'}</h2>
          <button type="button" className="npc-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`npc-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="npc-editor-form">
          <div className="npc-editor-grid">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <TextField label="Race" value={form.race} onChange={(e) => patch({ race: e.target.value })} />
            <TextField label="Gender" value={form.gender} onChange={(e) => patch({ gender: e.target.value })} />
            <TextField
              label="Background"
              value={form.background}
              onChange={(e) => patch({ background: e.target.value })}
            />
            <TextField label="Size" value={form.size} onChange={(e) => patch({ size: e.target.value })} />
            <TextField
              label="Armor Class"
              type="number"
              value={form.armorClass}
              onChange={(e) => patch({ armorClass: e.target.value })}
            />
            <TextField
              label="Hit Points"
              type="number"
              value={form.hitPoints}
              onChange={(e) => patch({ hitPoints: e.target.value })}
            />
            <TextField label="Speed" value={form.speed} onChange={(e) => patch({ speed: e.target.value })} />
            <TextField
              label="Languages"
              value={form.languages}
              onChange={(e) => patch({ languages: e.target.value })}
            />
          </div>

          <section className="npc-editor-section">
            <TextField
              label="Ability Scores (one per line, e.g. strength: 14)"
              multiline
              value={form.statsText}
              onChange={(e) => patch({ statsText: e.target.value })}
            />
            <TextField
              label="Saving Throws (one per line)"
              multiline
              value={form.savingThrowsText}
              onChange={(e) => patch({ savingThrowsText: e.target.value })}
            />
            <TextField
              label="Skills (one per line)"
              multiline
              value={form.skillsText}
              onChange={(e) => patch({ skillsText: e.target.value })}
            />
            <TextField
              label="Senses (one per line, e.g. darkvision: 60)"
              multiline
              value={form.sensesText}
              onChange={(e) => patch({ sensesText: e.target.value })}
            />
            <TextField
              label="Appearance (one per line, e.g. hair_colour: silver)"
              multiline
              value={form.appearanceText}
              onChange={(e) => patch({ appearanceText: e.target.value })}
            />
          </section>

          <TextField label="Notes" multiline value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />

          <div className="npc-editor-actions">
            <button type="button" className="npc-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="npc-editor-save" disabled={saving}>
              {npc ? 'Save Changes' : 'Create NPC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
