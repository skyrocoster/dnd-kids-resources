import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Dungeon, NPC, Quest } from '../../api/types'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { emptyQuestForm, formStateToQuestInput, questToFormState } from './questForm'
import type { QuestFormState } from './questForm'
import './QuestEditor.css'

interface QuestEditorProps {
  quest?: Quest
  onClose: () => void
  onSaved: (quest: Quest) => void
}

export function QuestEditor({ quest, onClose, onSaved }: QuestEditorProps) {
  const [form, setForm] = useState<QuestFormState>(() => (quest ? questToFormState(quest) : emptyQuestForm()))
  const [npcs, setNPCs] = useState<NPC[]>([])
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .listNPCs()
      .then(setNPCs)
      .catch(() => setNPCs([]))
    api
      .listDungeons()
      .then(setDungeons)
      .catch(() => setDungeons([]))
  }, [])

  const patch = (fields: Partial<QuestFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving quest…' })
    const payload = formStateToQuestInput(form)
    try {
      const saved = quest ? await api.updateQuest(quest.id, payload) : await api.createQuest(payload)
      setStatus({ message: 'Quest saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save quest.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="quest-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="quest-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={quest ? `Edit ${quest.title}` : 'Add new quest'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="quest-editor-header">
          <h2>{quest ? `Edit Quest: ${quest.title}` : 'Add New Quest'}</h2>
          <button type="button" className="quest-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`quest-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="quest-editor-form">
          <TextField label="Title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
          <TextField
            label="Summary"
            multiline
            value={form.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />

          <div className="quest-editor-grid">
            <SelectField
              label="Quest Giver"
              value={form.questGiver}
              onChange={(e) => patch({ questGiver: e.target.value })}
              options={npcs.map((n) => ({ value: String(n.id), label: n.name }))}
              placeholder="— none —"
            />
            <SelectField
              label="Dungeon"
              value={form.dungeonId}
              onChange={(e) => patch({ dungeonId: e.target.value })}
              options={dungeons.map((d) => ({ value: String(d.id), label: d.title }))}
              placeholder="— none —"
            />
            <TextField label="Location" value={form.location} onChange={(e) => patch({ location: e.target.value })} />
          </div>

          <TextField
            label="Objectives (one per line)"
            multiline
            value={form.objectivesText}
            onChange={(e) => patch({ objectivesText: e.target.value })}
          />
          <TextField
            label="Details (one per line)"
            multiline
            value={form.detailsText}
            onChange={(e) => patch({ detailsText: e.target.value })}
          />
          <TextField
            label="Rewards (one per line)"
            multiline
            value={form.rewardText}
            onChange={(e) => patch({ rewardText: e.target.value })}
          />

          <div className="quest-editor-actions">
            <button type="button" className="quest-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="quest-editor-save" disabled={saving}>
              {quest ? 'Save Changes' : 'Create Quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
