import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../../api/client'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { StatePanel } from '../../components/StatePanel'
import { TextField } from '../../components/form/TextField'
import {
  emptyMonsterForm,
  formStateToMonsterInput,
  monsterToFormState,
  validateMonsterForm,
} from './monsterForm'
import type { MonsterFormState } from './monsterForm'
import './MonsterEditor.css'

export function MonsterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState<MonsterFormState>(emptyMonsterForm())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [originalId, setOriginalId] = useState<number | null>(null)

  useEffect(() => {
    if (!isEdit) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    setOriginalId(null)
    const monsterId = Number(id)
    if (Number.isNaN(monsterId)) {
      setLoadError('Invalid monster ID.')
      setLoading(false)
      return
    }
    let active = true
    api
      .getMonster(monsterId)
      .then((monster) => {
        if (!active) return
        setForm(monsterToFormState(monster))
        setOriginalId(monster.id)
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Failed to load monster.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id, isEdit])

  const patch = (fields: Partial<MonsterFormState>) => {
    setForm((prev) => ({ ...prev, ...fields }))
    setValidationErrors([])
    setSubmitError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const errors = validateMonsterForm(form)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setSaving(true)
    setSubmitError(null)
    const payload = formStateToMonsterInput(form)
    try {
      const saved = isEdit
        ? await api.updateMonster(originalId!, payload)
        : await api.createMonster(payload)
      navigate(`/monsters`, { state: { selectedId: saved.id }, replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save monster.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!originalId) return
    setSaving(true)
    try {
      await api.deleteMonster(originalId)
      navigate('/monsters', { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to delete monster.')
      setSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancel = () => {
    navigate('/monsters')
  }

  if (loadError) {
    return (
      <div className="monster-editor">
        <h2>Error</h2>
        <p className="monster-editor-error">{loadError}</p>
        <button type="button" className="monster-editor-cancel" onClick={handleCancel}>
          Back to Monsters
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="monster-editor"><StatePanel status="loading" message="Loading monster…" /></div>
  }

  return (
    <div className="monster-editor">
      <h2 className="monster-editor-title">{isEdit ? 'Edit Monster' : 'Add New Monster'}</h2>

      {submitError && <p className="monster-editor-error">{submitError}</p>}
      {validationErrors.length > 0 && (
        <ul className="monster-editor-validation">
          {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="monster-editor-form" data-testid="monster-editor-form">
        <fieldset className="monster-editor-fieldset" data-region="identity">
          <legend>Identity</legend>
          <div className="monster-editor-grid">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <TextField label="Size (comma-separated)" value={form.size} onChange={(e) => patch({ size: e.target.value })} />
            <TextField label="Creature Type" value={form.creatureType} onChange={(e) => patch({ creatureType: e.target.value })} />
            <TextField label="Creature Tags" value={form.creatureTags} onChange={(e) => patch({ creatureTags: e.target.value })} />
            <TextField label="Alignment" value={form.alignment} onChange={(e) => patch({ alignment: e.target.value })} />
            <TextField label="Family" value={form.family} onChange={(e) => patch({ family: e.target.value })} />
            <TextField label="Aliases" value={form.aliases} onChange={(e) => patch({ aliases: e.target.value })} />
            <TextField label="CR (e.g. 1/4)" value={form.cr} onChange={(e) => patch({ cr: e.target.value })} />
            <TextField label="CR Note" value={form.crNote} onChange={(e) => patch({ crNote: e.target.value })} />
            <TextField label="Experience Points" type="number" value={form.experiencePoints} onChange={(e) => patch({ experiencePoints: e.target.value })} />
          </div>
        </fieldset>

        <fieldset className="monster-editor-fieldset" data-region="defenses">
          <legend>Defenses</legend>
          <div className="monster-editor-grid">
            <TextField label="AC" type="number" value={form.acValue} onChange={(e) => patch({ acValue: e.target.value })} />
            <TextField label="AC Note" value={form.acNote} onChange={(e) => patch({ acNote: e.target.value })} />
            <TextField label="HP (average)" type="number" value={form.hpAverage} onChange={(e) => patch({ hpAverage: e.target.value })} />
            <TextField label="HP Formula" value={form.hpFormula} onChange={(e) => patch({ hpFormula: e.target.value })} />
            <TextField label="Speed (e.g. 30, fly 60)" value={form.speedText} onChange={(e) => patch({ speedText: e.target.value })} />
          </div>
          <TextField label="Damage Resistances (one per line)" multiline value={form.damageResistances} onChange={(e) => patch({ damageResistances: e.target.value })} />
          <TextField label="Damage Immunities (one per line)" multiline value={form.damageImmunities} onChange={(e) => patch({ damageImmunities: e.target.value })} />
          <TextField label="Damage Vulnerabilities (one per line)" multiline value={form.damageVulnerabilities} onChange={(e) => patch({ damageVulnerabilities: e.target.value })} />
          <TextField label="Condition Immunities (one per line)" multiline value={form.conditionImmunities} onChange={(e) => patch({ conditionImmunities: e.target.value })} />
          <TextField label="Senses (one per line)" multiline value={form.sensesText} onChange={(e) => patch({ sensesText: e.target.value })} />
        </fieldset>

        <fieldset className="monster-editor-fieldset" data-region="abilities">
          <legend>Abilities</legend>
          <div className="monster-editor-ability-grid">
            <TextField label="STR" type="number" value={form.abilityStr} onChange={(e) => patch({ abilityStr: e.target.value })} />
            <TextField label="DEX" type="number" value={form.abilityDex} onChange={(e) => patch({ abilityDex: e.target.value })} />
            <TextField label="CON" type="number" value={form.abilityCon} onChange={(e) => patch({ abilityCon: e.target.value })} />
            <TextField label="INT" type="number" value={form.abilityInt} onChange={(e) => patch({ abilityInt: e.target.value })} />
            <TextField label="WIS" type="number" value={form.abilityWis} onChange={(e) => patch({ abilityWis: e.target.value })} />
            <TextField label="CHA" type="number" value={form.abilityCha} onChange={(e) => patch({ abilityCha: e.target.value })} />
          </div>
          <TextField label="Saving Throws (one per line, e.g. str: +5)" multiline value={form.savingThrowsText} onChange={(e) => patch({ savingThrowsText: e.target.value })} />
          <TextField label="Skills (one per line, e.g. perception: +7)" multiline value={form.skillsText} onChange={(e) => patch({ skillsText: e.target.value })} />
          <TextField label="Passive Perception" type="number" value={form.passivePerception} onChange={(e) => patch({ passivePerception: e.target.value })} />
        </fieldset>

        <fieldset className="monster-editor-fieldset" data-region="actions">
          <legend>Actions</legend>
          <TextField label="Actions (name: description per line)" multiline value={form.actionsText} onChange={(e) => patch({ actionsText: e.target.value })} />
          <TextField label="Bonus Actions" multiline value={form.bonusActionsText} onChange={(e) => patch({ bonusActionsText: e.target.value })} />
          <TextField label="Reactions" multiline value={form.reactionsText} onChange={(e) => patch({ reactionsText: e.target.value })} />
          <TextField label="Spellcasting" multiline value={form.spellcastingText} onChange={(e) => patch({ spellcastingText: e.target.value })} />
          <TextField label="Legendary Intro" value={form.legendaryIntro} onChange={(e) => patch({ legendaryIntro: e.target.value })} />
          <TextField label="Legendary Actions Per Round" type="number" value={form.legendaryActionsPerRound} onChange={(e) => patch({ legendaryActionsPerRound: e.target.value })} />
          <TextField label="Legendary Actions (name: description per line)" multiline value={form.legendaryActionsText} onChange={(e) => patch({ legendaryActionsText: e.target.value })} />
          <TextField label="Mythic Actions" multiline value={form.mythicActionsText} onChange={(e) => patch({ mythicActionsText: e.target.value })} />
        </fieldset>

        <fieldset className="monster-editor-fieldset" data-region="lore">
          <legend>Lore</legend>
          <TextField label="Traits (name: description per line)" multiline value={form.traitsText} onChange={(e) => patch({ traitsText: e.target.value })} />
          <TextField label="Languages" value={form.languages} onChange={(e) => patch({ languages: e.target.value })} />
          <TextField label="Audio Path" value={form.audioPath} onChange={(e) => patch({ audioPath: e.target.value })} />
        </fieldset>

        <div className="monster-editor-actions">
          <button type="button" className="monster-editor-cancel" onClick={handleCancel}>
            Cancel
          </button>
          {isEdit && (
            <button type="button" className="monster-editor-delete" onClick={() => setShowDeleteConfirm(true)} disabled={saving}>
              Delete
            </button>
          )}
          <button type="submit" className="monster-editor-save" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Monster'}
          </button>
        </div>
      </form>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Delete "${form.name}"? This cannot be undone.`}
          confirmLabel="Delete Monster"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          pending={saving}
        />
      )}
    </div>
  )
}
