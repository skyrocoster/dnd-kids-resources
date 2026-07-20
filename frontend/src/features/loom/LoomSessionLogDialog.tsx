import { useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { logLoomSession } from '../../api/client'
import type { LoomSessionLogOutcome, LoomTapestry } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { liveThreads, nextBeat } from './loomGraph'
import './LoomEditor.css'

interface LoomSessionLogDialogProps {
  tapestry: LoomTapestry
  onClose: () => void
  onLogged: () => void
  onError: (msg: string) => void
}

interface ThreadOutcomeState {
  outcome: LoomSessionLogOutcome
  title: string
}

const OUTCOME_OPTIONS = [
  { value: 'happened', label: 'Happened / Done' },
  { value: 'not_reached', label: 'Not Reached' },
  { value: 'banked', label: 'Banked' },
]

export function LoomSessionLogDialog({ tapestry, onClose, onLogged, onError }: LoomSessionLogDialogProps) {
  const formId = useId()
  const live = useMemo(() => liveThreads(tapestry), [tapestry])
  const nextOrdinal = Math.max(...tapestry.sessions.map((s) => s.ordinal), 0) + 1

  const [name, setName] = useState('')
  const [ordinal, setOrdinal] = useState(String(nextOrdinal))
  const [playedOn, setPlayedOn] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [outcomes, setOutcomes] = useState<Record<number, ThreadOutcomeState>>(() => {
    const initial: Record<number, ThreadOutcomeState> = {}
    for (const thread of live) {
      initial[thread.id] = { outcome: 'happened', title: '' }
    }
    return initial
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const ordinalNum = parseInt(ordinal, 10)
    if (isNaN(ordinalNum)) {
      setError('Ordinal must be a number.')
      return
    }
    if (!name.trim()) {
      setError('Session name is required.')
      return
    }

    setSaving(true)
    setError(null)

    const allOutcomes: Record<number, { outcome: LoomSessionLogOutcome; title?: string | null }> = {}
    for (const thread of tapestry.threads) {
      const isLive = live.some((t) => t.id === thread.id)
      if (isLive) {
        const state = outcomes[thread.id]
        allOutcomes[thread.id] = {
          outcome: state?.outcome ?? 'happened',
          ...(state?.outcome === 'happened' && state?.title ? { title: state.title } : {}),
        }
      } else {
        allOutcomes[thread.id] = { outcome: 'quiet' }
      }
    }

    try {
      await logLoomSession({
        ordinal: ordinalNum,
        name: name.trim(),
        played_on: playedOn || null,
        notes: notes || null,
        outcomes: allOutcomes,
      })
      onLogged()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log session.'
      setError(msg)
      onError(msg)
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title="Log Session"
      onClose={onClose}
      pending={saving}
      className="loom-session-log-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Save Session
          </Button>
        </>
      }
    >
      {error && (
        <p role="status" className="loom-node-editor-error">
          {error}
        </p>
      )}
      <form id={formId} onSubmit={handleSubmit} className="loom-session-log-form">
        <TextField label="Session Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField
          label="Ordinal"
          type="number"
          value={ordinal}
          onChange={(e) => setOrdinal(e.target.value)}
        />
        <TextField label="Date" type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
        <TextField label="Notes" multiline value={notes} onChange={(e) => setNotes(e.target.value)} />

        <fieldset className="loom-session-log-outcomes">
          <legend>Thread Outcomes</legend>
          {live.map((thread) => {
            const beat = nextBeat(thread, tapestry.nodes)
            const state = outcomes[thread.id]
            return (
              <div key={thread.id} className="loom-session-log-outcome-row">
                <div className="loom-session-log-thread-name">{thread.name}</div>
                {beat && <div className="loom-session-log-beat-title">Next: {beat.title}</div>}
                <SelectField
                  label="Outcome"
                  options={OUTCOME_OPTIONS}
                  value={state?.outcome ?? 'happened'}
                  onChange={(e) =>
                    setOutcomes((prev) => ({
                      ...prev,
                      [thread.id]: { ...prev[thread.id], outcome: e.target.value as LoomSessionLogOutcome },
                    }))
                  }
                />
                {state?.outcome === 'happened' && (
                  <TextField
                    label="Custom Title"
                    value={state?.title ?? ''}
                    onChange={(e) =>
                      setOutcomes((prev) => ({
                        ...prev,
                        [thread.id]: { ...prev[thread.id], title: e.target.value },
                      }))
                    }
                  />
                )}
              </div>
            )
          })}
        </fieldset>
      </form>
    </Dialog>
  )
}
