import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createLoomNode, updateLoomNode } from '../../api/client'
import type { LoomAnchorStatus, LoomNode, LoomNodeInput, LoomNodeKind, LoomThread } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { MultiSelectField } from '../../components/form/MultiSelectField'
import './LoomEditor.css'

interface LoomNodeEditorProps {
  node?: LoomNode
  initialKind?: LoomNodeKind
  threads: LoomThread[]
  defaultPosition: { x: number; y: number }
  onClose: () => void
  onSaved: (node: LoomNode) => void
}

const KIND_OPTIONS = [
  { value: 'update', label: 'Update' },
  { value: 'anchor', label: 'Anchor' },
]

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'reached', label: 'Reached' },
  { value: 'abandoned', label: 'Abandoned' },
]

export function LoomNodeEditor({ node, initialKind, threads, defaultPosition, onClose, onSaved }: LoomNodeEditorProps) {
  const formId = useId()
  const [kind, setKind] = useState<LoomNodeKind>(node?.kind ?? initialKind ?? 'update')
  const [title, setTitle] = useState(node?.title ?? '')
  const [body, setBody] = useState(node?.body ?? '')
  const [status, setStatus] = useState<LoomAnchorStatus>(node?.status ?? 'planned')
  const [sessionTag, setSessionTag] = useState(node?.session_tag ?? '')
  const [threadIds, setThreadIds] = useState<string[]>((node?.thread_ids ?? []).map(String))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const threadOptions = threads.map((thread) => ({ value: String(thread.id), label: thread.name }))
  const kindLabel = kind === 'anchor' ? 'Anchor' : 'Update'
  const title_ = node ? `Edit ${kindLabel}: ${node.title}` : `Add New ${kindLabel}`

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload: LoomNodeInput = {
      kind,
      title,
      body: body || null,
      status: kind === 'anchor' ? status : null,
      session_tag: sessionTag || null,
      x: node ? node.x : defaultPosition.x,
      y: node ? node.y : defaultPosition.y,
      thread_ids: threadIds.map(Number),
    }
    try {
      const saved = node ? await updateLoomNode(node.id, payload) : await createLoomNode(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the node.')
      setSaving(false)
    }
  }

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
          value={kind}
          disabled={!!node}
          onChange={(e) => setKind(e.target.value as LoomNodeKind)}
        />
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextField label="Body" multiline value={body} onChange={(e) => setBody(e.target.value)} />
        {kind === 'anchor' && (
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as LoomAnchorStatus)}
          />
        )}
        <TextField label="Session tag" value={sessionTag} onChange={(e) => setSessionTag(e.target.value)} />
        <MultiSelectField label="Threads" options={threadOptions} selected={threadIds} onChange={setThreadIds} />
      </form>
    </Dialog>
  )
}
