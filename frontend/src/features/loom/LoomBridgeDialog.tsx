import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { LoomNode } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/form/TextField'
import './LoomEditor.css'

/** @deprecated Removed in PB2. Kept as dead code until then. */
interface LoomBridgeDialogProps {
  source: LoomNode
  anchor: LoomNode
  onClose: () => void
  onBridged: () => void
}

/** @deprecated Removed in PB2. */
export function LoomBridgeDialog({ source, anchor, onClose }: LoomBridgeDialogProps) {
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
      // Bridge endpoint retired in PA1 — stub until PB2 removes this component
      void title; void body; void sessionTag
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the bridge.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title={`Bridge "${source.title}" → "${anchor.title}"`}
      description="Splice a new Session between this head and the planned beat."
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
