import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { createLoomBridge } from '../../api/client'
import type { LoomBridgeResult, LoomNode } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/form/TextField'
import './LoomEditor.css'

interface LoomBridgeDialogProps {
  source: LoomNode
  anchor: LoomNode
  onClose: () => void
  onBridged: (result: LoomBridgeResult) => void
}

export function LoomBridgeDialog({ source, anchor, onClose, onBridged }: LoomBridgeDialogProps) {
  const formId = useId()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sessionTag, setSessionTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await createLoomBridge({
        source_id: source.id,
        anchor_id: anchor.id,
        title,
        body: body || null,
        session_tag: sessionTag || null,
      })
      onBridged(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the bridge.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title={`Bridge "${source.title}" → "${anchor.title}"`}
      description="Splice a new Update between this head and the planned anchor."
      onClose={onClose}
      pending={saving}
      className="loom-node-editor-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Create Bridge
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
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextField label="Body" multiline value={body} onChange={(e) => setBody(e.target.value)} />
        <TextField label="Session tag" value={sessionTag} onChange={(e) => setSessionTag(e.target.value)} />
      </form>
    </Dialog>
  )
}
