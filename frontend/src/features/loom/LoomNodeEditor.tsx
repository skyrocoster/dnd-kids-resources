import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createLoomNode, updateLoomNode } from '../../api/client'
import type { LoomNode, LoomNodeInput, LoomNodeKind } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import './LoomEditor.css'

interface LoomNodeEditorProps {
  node?: LoomNode
  initialKind?: LoomNodeKind
  defaultPosition: { x: number; y: number }
  onClose: () => void
  onSaved: (node: LoomNode) => void
}

const KIND_OPTIONS = [
  { value: 'session', label: 'Session' },
  { value: 'beat', label: 'Story Beat' },
]

function kindLabel(kind: LoomNodeKind): string {
  switch (kind) {
    case 'start':
      return 'Start'
    case 'end':
      return 'End'
    case 'beat':
      return 'Beat'
    case 'session':
      return 'Session'
  }
}

export function LoomNodeEditor({ node, initialKind, defaultPosition, onClose, onSaved }: LoomNodeEditorProps) {
  const formId = useId()
  const [kind, setKind] = useState<LoomNodeKind>(node?.kind ?? initialKind ?? 'session')
  const [title, setTitle] = useState(node?.title ?? '')
  const [body, setBody] = useState(node?.body ?? '')
  const [sessionTag, setSessionTag] = useState(node?.session_tag ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only 'beat' and 'session' are creatable via the node editor.
  // start/end are created automatically with threads; beat/session via this dialog.
  const creatableKind = (kind === 'beat' || kind === 'session') ? kind : 'session'
  const title_ = node ? `Edit ${kindLabel(node.kind)}: ${node.title}` : `Add New ${kindLabel(creatableKind)}`

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload: LoomNodeInput = {
      kind: creatableKind,
      title,
      body: body || null,
      session_tag: sessionTag || null,
      x: node ? node.x : defaultPosition.x,
      y: node ? node.y : defaultPosition.y,
    }
    try {
      const saved = node ? await updateLoomNode(node.id, payload as import('../../api/types').LoomNodeInput) : await createLoomNode(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the node.')
      setSaving(false)
    }
  }

  // In the new model, kind is immutable on PUT except for the one
  // fulfil-undo transition (session→beat). For PB0, we keep kind editable
  // on create and locked on edit (matching the old UX contract).
  const isEditing = !!node

  return (
    <Dialog
      open
      title={title_}
      onClose={onClose}
      pending={saving}
      className="loom-node-editor-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {node ? 'Save Changes' : 'Create Node'}
          </Button>
        </>
      }
    >
      {error && (
        <p role="status" className="loom-node-editor-error">
          {error}
        </p>
      )}
      <form id={formId} onSubmit={handleSubmit} className="loom-node-editor-form">
        <SelectField
          label="Kind"
          options={KIND_OPTIONS}
          value={creatableKind}
          disabled={isEditing}
          onChange={(e) => setKind(e.target.value as LoomNodeKind)}
        />
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextField label="Body" multiline value={body} onChange={(e) => setBody(e.target.value)} />
        <TextField label="Session tag" value={sessionTag} onChange={(e) => setSessionTag(e.target.value)} />
      </form>
    </Dialog>
  )
}
