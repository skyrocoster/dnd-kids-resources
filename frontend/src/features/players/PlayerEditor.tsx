import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Player } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { TextField } from '../../components/form/TextField'
import {
  emptyPlayerForm,
  formStateToPlayerInput,
  playerToFormState,
  validatePlayerForm,
} from './playerForm'
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
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const patch = (fields: Partial<PlayerFormState>) => {
    setForm((prev) => ({ ...prev, ...fields }))
    setValidationErrors([])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const errors = validatePlayerForm(form)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
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
      {validationErrors.length > 0 && (
        <ul className="player-editor-validation">
          {validationErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <form id={formId} onSubmit={handleSubmit} className="player-editor-form">
        <fieldset className="player-editor-fieldset" data-region="identity">
          <legend>Identity</legend>
          <div className="player-editor-grid">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <TextField
              label="Child's Name"
              value={form.child_name}
              onChange={(e) => patch({ child_name: e.target.value })}
            />
            <TextField label="Class" value={form.class_} onChange={(e) => patch({ class_: e.target.value })} />
            <TextField label="Subclass" value={form.subclass} onChange={(e) => patch({ subclass: e.target.value })} />
            <TextField label="Ancestry" value={form.ancestry} onChange={(e) => patch({ ancestry: e.target.value })} />
            <TextField
              label="Background"
              value={form.background}
              onChange={(e) => patch({ background: e.target.value })}
            />
            <TextField
              label="Level"
              type="number"
              value={form.level}
              onChange={(e) => patch({ level: e.target.value })}
            />
            <TextField label="Size (comma-separated)" value={form.size} onChange={(e) => patch({ size: e.target.value })} />
            <TextField label="Alignment" value={form.alignment} onChange={(e) => patch({ alignment: e.target.value })} />
            <TextField
              label="Creature Type"
              value={form.creatureType}
              onChange={(e) => patch({ creatureType: e.target.value })}
            />
            <TextField
              label="Creature Tags"
              value={form.creatureTags}
              onChange={(e) => patch({ creatureTags: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="player-editor-fieldset" data-region="defenses">
          <legend>Combat / Defenses</legend>
          <div className="player-editor-grid">
            <TextField label="AC" type="number" value={form.acValue} onChange={(e) => patch({ acValue: e.target.value })} />
            <TextField label="AC Note" value={form.acNote} onChange={(e) => patch({ acNote: e.target.value })} />
            <TextField
              label="HP (average)"
              type="number"
              value={form.hpAverage}
              onChange={(e) => patch({ hpAverage: e.target.value })}
            />
            <TextField label="HP Formula" value={form.hpFormula} onChange={(e) => patch({ hpFormula: e.target.value })} />
            <TextField
              label="Speed (e.g. 30, fly 60)"
              value={form.speedText}
              onChange={(e) => patch({ speedText: e.target.value })}
            />
            <TextField
              label="Initiative"
              type="number"
              value={form.initiative}
              onChange={(e) => patch({ initiative: e.target.value })}
            />
          </div>
          <TextField
            label="Damage Resistances (one per line)"
            multiline
            value={form.damageResistances}
            onChange={(e) => patch({ damageResistances: e.target.value })}
          />
          <TextField
            label="Damage Immunities (one per line)"
            multiline
            value={form.damageImmunities}
            onChange={(e) => patch({ damageImmunities: e.target.value })}
          />
          <TextField
            label="Damage Vulnerabilities (one per line)"
            multiline
            value={form.damageVulnerabilities}
            onChange={(e) => patch({ damageVulnerabilities: e.target.value })}
          />
          <TextField
            label="Condition Immunities (one per line)"
            multiline
            value={form.conditionImmunities}
            onChange={(e) => patch({ conditionImmunities: e.target.value })}
          />
          <TextField
            label="Senses (one per line)"
            multiline
            value={form.sensesText}
            onChange={(e) => patch({ sensesText: e.target.value })}
          />
        </fieldset>

        <fieldset className="player-editor-fieldset" data-region="abilities">
          <legend>Abilities</legend>
          <div className="player-editor-ability-grid">
            <TextField label="STR" type="number" value={form.abilityStr} onChange={(e) => patch({ abilityStr: e.target.value })} />
            <TextField label="DEX" type="number" value={form.abilityDex} onChange={(e) => patch({ abilityDex: e.target.value })} />
            <TextField label="CON" type="number" value={form.abilityCon} onChange={(e) => patch({ abilityCon: e.target.value })} />
            <TextField label="INT" type="number" value={form.abilityInt} onChange={(e) => patch({ abilityInt: e.target.value })} />
            <TextField label="WIS" type="number" value={form.abilityWis} onChange={(e) => patch({ abilityWis: e.target.value })} />
            <TextField label="CHA" type="number" value={form.abilityCha} onChange={(e) => patch({ abilityCha: e.target.value })} />
          </div>
          <TextField
            label="Saving Throws (one per line, e.g. str: +5)"
            multiline
            value={form.savingThrowsText}
            onChange={(e) => patch({ savingThrowsText: e.target.value })}
          />
          <TextField
            label="Skills (one per line, e.g. perception: +7)"
            multiline
            value={form.skillsText}
            onChange={(e) => patch({ skillsText: e.target.value })}
          />
          <TextField
            label="Passive Perception"
            type="number"
            value={form.passivePerception}
            onChange={(e) => patch({ passivePerception: e.target.value })}
          />
        </fieldset>

        <fieldset className="player-editor-fieldset" data-region="spellcasting">
          <legend>Spellcasting</legend>
          <div className="player-editor-grid">
            <TextField
              label="Proficiency Bonus"
              type="number"
              value={form.proficiencyBonus}
              onChange={(e) => patch({ proficiencyBonus: e.target.value })}
            />
            <TextField
              label="Spell Attack Bonus"
              type="number"
              value={form.spellAttackBonus}
              onChange={(e) => patch({ spellAttackBonus: e.target.value })}
            />
            <TextField
              label="Spell Save DC"
              type="number"
              value={form.spellSaveDc}
              onChange={(e) => patch({ spellSaveDc: e.target.value })}
            />
          </div>
          <TextField
            label="Max Spell Slots (one per line, e.g. 1: 4)"
            multiline
            value={form.maxSpellSlotsText}
            onChange={(e) => patch({ maxSpellSlotsText: e.target.value })}
          />
          <TextField
            label="Spellcasting"
            multiline
            value={form.spellcastingText}
            onChange={(e) => patch({ spellcastingText: e.target.value })}
          />
        </fieldset>

        <fieldset className="player-editor-fieldset" data-region="features">
          <legend>Features &amp; Lore</legend>
          <TextField
            label="Traits (name: description per line)"
            multiline
            value={form.traitsText}
            onChange={(e) => patch({ traitsText: e.target.value })}
          />
          <TextField
            label="Actions (name: description per line)"
            multiline
            value={form.actionsText}
            onChange={(e) => patch({ actionsText: e.target.value })}
          />
          <TextField
            label="Bonus Actions"
            multiline
            value={form.bonusActionsText}
            onChange={(e) => patch({ bonusActionsText: e.target.value })}
          />
          <TextField
            label="Reactions"
            multiline
            value={form.reactionsText}
            onChange={(e) => patch({ reactionsText: e.target.value })}
          />
          <TextField
            label="Legendary Intro"
            value={form.legendaryIntro}
            onChange={(e) => patch({ legendaryIntro: e.target.value })}
          />
          <TextField
            label="Legendary Actions Per Round"
            type="number"
            value={form.legendaryActionsPerRound}
            onChange={(e) => patch({ legendaryActionsPerRound: e.target.value })}
          />
          <TextField
            label="Legendary Actions (name: description per line)"
            multiline
            value={form.legendaryActionsText}
            onChange={(e) => patch({ legendaryActionsText: e.target.value })}
          />
          <TextField
            label="Mythic Actions"
            multiline
            value={form.mythicActionsText}
            onChange={(e) => patch({ mythicActionsText: e.target.value })}
          />
          <TextField label="Languages" value={form.languages} onChange={(e) => patch({ languages: e.target.value })} />
          <TextField label="Notes" multiline value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </fieldset>
      </form>
    </Dialog>
  )
}
