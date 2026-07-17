import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createLoomThread, deleteLoomThread, updateLoomThread } from '../../api/client'
import type { LoomThread, ThreadColor } from '../../api/types'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/form/TextField'
import { TrashIcon, PlusIcon } from '../../components/icons'
import './LoomEditor.css'

const THREAD_COLORS: ThreadColor[] = ['thread-1', 'thread-2', 'thread-3', 'thread-4', 'thread-5', 'thread-6']

interface LoomThreadManagerProps {
  threads: LoomThread[]
  onClose: () => void
  onChanged: () => void
}

interface ThreadFormState {
  name: string
  color: ThreadColor
  description: string
}

function emptyForm(): ThreadFormState {
  return { name: '', color: 'thread-1', description: '' }
}

function threadToForm(thread: LoomThread): ThreadFormState {
  return { name: thread.name, color: thread.color, description: thread.description ?? '' }
}

function ColorPicker({ value, onChange }: { value: ThreadColor; onChange: (color: ThreadColor) => void }) {
  return (
    <div className="loom-thread-color-picker" role="radiogroup" aria-label="Thread color">
      {THREAD_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          className="loom-thread-swatch"
          data-selected={value === color || undefined}
          style={{ backgroundColor: `var(--md-loom-${color})` }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

export function LoomThreadManager({ threads, onClose, onChanged }: LoomThreadManagerProps) {
  const formId = useId()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ThreadFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LoomThread | null>(null)
  const [deleting, setDeleting] = useState(false)

  const patch = (fields: Partial<ThreadFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const startCreate = () => {
    setEditingId(null)
    setCreating(true)
    setForm(emptyForm())
    setError(null)
  }

  const startEdit = (thread: LoomThread) => {
    setCreating(false)
    setEditingId(thread.id)
    setForm(threadToForm(thread))
    setError(null)
  }

  const cancelForm = () => {
    setCreating(false)
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { name: form.name, color: form.color, description: form.description || null }
    try {
      if (editingId != null) {
        await updateLoomThread(editingId, payload)
      } else {
        await createLoomThread(payload)
      }
      setCreating(false)
      setEditingId(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the thread.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteLoomThread(pendingDelete.id)
      setPendingDelete(null)
      onChanged()
    } finally {
      setDeleting(false)
    }
  }

  const showForm = creating || editingId != null

  return (
    <Dialog open title="Manage Threads" onClose={onClose} className="loom-thread-manager-dialog">
      <ul className="loom-thread-manager-list">
        {threads.map((thread) => (
          <li key={thread.id} className="loom-thread-manager-row">
            <span
              className="loom-thread-swatch loom-thread-swatch--static"
              style={{ backgroundColor: `var(--md-loom-${thread.color})` }}
              aria-hidden="true"
            />
            <span className="loom-thread-manager-name">{thread.name}</span>
            <Button variant="secondary" size="compact" onClick={() => startEdit(thread)}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="compact"
              onClick={() => setPendingDelete(thread)}
              aria-label={`Delete ${thread.name}`}
            >
              <TrashIcon width={16} height={16} aria-hidden="true" />
            </Button>
          </li>
        ))}
        {threads.length === 0 && <li className="loom-thread-manager-empty">No threads yet.</li>}
      </ul>

      {showForm ? (
        <>
          {error && (
            <p role="status" className="loom-node-editor-error">
              {error}
            </p>
          )}
          <form id={formId} onSubmit={handleSubmit} className="loom-thread-manager-form">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <ColorPicker value={form.color} onChange={(color) => patch({ color })} />
            <TextField
              label="Description"
              multiline
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
            <div className="loom-thread-manager-form-actions">
              <Button type="button" variant="secondary" onClick={cancelForm}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId != null ? 'Save Changes' : 'Create Thread'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <Button variant="secondary" onClick={startCreate}>
          <PlusIcon width={16} height={16} aria-hidden="true" /> New Thread
        </Button>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete thread "${pendingDelete.name}"? Nodes keep their content but lose this grouping.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
          pending={deleting}
        />
      )}
    </Dialog>
  )
}
