import { useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Player } from '../../api/types'
import { TextField } from '../../components/form/TextField'
import { emptyPlayerForm, formStateToPlayerInput, playerToFormState } from './playerForm'
import type { PlayerFormState } from './playerForm'
import './PlayerEditor.css'

interface PlayerEditorProps {
  player?: Player
  onClose: () => void
  onSaved: (player: Player) => void
}

export function PlayerEditor({ player, onClose, onSaved }: PlayerEditorProps) {
  const [form, setForm] = useState<PlayerFormState>(() => (player ? playerToFormState(player) : emptyPlayerForm()))
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  const patch = (fields: Partial<PlayerFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving player…' })
    const payload = formStateToPlayerInput(form)
    try {
      const saved = player ? await api.updatePlayer(player.id, payload) : await api.createPlayer(payload)
      setStatus({ message: 'Player saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save player.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="player-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="player-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={player ? `Edit ${player.name}` : 'Add new player'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="player-editor-header">
          <h2>{player ? `Edit Player: ${player.name}` : 'Add New Player'}</h2>
          <button type="button" className="player-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`player-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="player-editor-form">
          <div className="player-editor-grid">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <TextField label="Class" value={form.class_} onChange={(e) => patch({ class_: e.target.value })} />
            <TextField
              label="Level"
              type="number"
              value={form.level}
              onChange={(e) => patch({ level: e.target.value })}
            />
          </div>

          <div className="player-editor-actions">
            <button type="button" className="player-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="player-editor-save" disabled={saving}>
              {player ? 'Save Changes' : 'Create Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
