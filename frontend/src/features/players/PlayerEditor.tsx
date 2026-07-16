import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Player } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
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
  const formId = useId()
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
    <Dialog
      open
      title={player ? `Edit Player: ${player.name}` : 'Add New Player'}
      onClose={onClose}
      pending={saving}
      className="player-editor-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {player ? 'Save Changes' : 'Create Player'}
          </Button>
        </>
      }
    >
      {status.message && (
        <p role="status" className={`player-editor-status ${status.kind || ''}`}>
          {status.message}
        </p>
      )}

      <form id={formId} onSubmit={handleSubmit} className="player-editor-form">
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
      </form>
    </Dialog>
  )
}
