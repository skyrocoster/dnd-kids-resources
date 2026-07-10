import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Spell } from '../../api/types'
import { CheckboxField } from '../../components/form/CheckboxField'
import { MultiSelectField } from '../../components/form/MultiSelectField'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { ACTION_OPTIONS, ATTACK_TYPE_OPTIONS, CLASS_OPTIONS, LEVEL_OPTIONS, SCHOOL_OPTIONS } from './constants'
import { DiceRollField } from './DiceRollField'
import type { AttackRow, DamageRow, SpellFormState } from './spellForm'
import { emptySpellForm, formStateToSpellInput, nextRowId, spellToFormState } from './spellForm'
import './SpellEditor.css'

interface SpellEditorProps {
  spell?: Spell
  onClose: () => void
  onSaved: (spell: Spell) => void
}

export function SpellEditor({ spell, onClose, onSaved }: SpellEditorProps) {
  const [form, setForm] = useState<SpellFormState>(() => (spell ? spellToFormState(spell) : emptySpellForm()))
  const [damageTypeOptions, setDamageTypeOptions] = useState<{ value: string; label: string }[]>([])
  const [abilityOptions, setAbilityOptions] = useState<{ value: string; label: string }[]>([])
  const [componentOptions, setComponentOptions] = useState<{ value: string; label: string }[]>([])
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .getDamageTypes()
      .then((types) => setDamageTypeOptions(types.map((t) => ({ value: t.code, label: t.name }))))
      .catch(() => setDamageTypeOptions([]))
    api
      .getAbilities()
      .then((abilities) => setAbilityOptions(abilities.map((a) => ({ value: a.code, label: a.name }))))
      .catch(() => setAbilityOptions([]))
    api
      .getSpellComponents()
      .then((components) => setComponentOptions(components.map((c) => ({ value: c.code, label: c.name }))))
      .catch(() => setComponentOptions([]))
  }, [])

  const patch = (fields: Partial<SpellFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const addAttackRow = () => {
    const row: AttackRow = { id: nextRowId(), name: form.spell_name, type: '', save: [] }
    patch({ attackRows: [...form.attackRows, row] })
  }
  const updateAttackRow = (id: string, fields: Partial<AttackRow>) => {
    patch({ attackRows: form.attackRows.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }
  const removeAttackRow = (id: string) => {
    patch({ attackRows: form.attackRows.filter((r) => r.id !== id) })
  }

  const addDamageRow = () => {
    const row: DamageRow = { id: nextRowId(), name: form.spell_name, damage: '', type: [] }
    patch({ damageRows: [...form.damageRows, row] })
  }
  const updateDamageRow = (id: string, fields: Partial<DamageRow>) => {
    patch({ damageRows: form.damageRows.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }
  const removeDamageRow = (id: string) => {
    patch({ damageRows: form.damageRows.filter((r) => r.id !== id) })
  }

  const toggleRowMulti = (values: string[], value: string): string[] =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value]

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving spell…' })
    const payload = formStateToSpellInput(form)
    try {
      const saved = spell ? await api.updateSpell(spell.id, payload) : await api.createSpell(payload)
      setStatus({ message: 'Spell saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save spell.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="spell-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="spell-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={spell ? `Edit ${spell.spell_name}` : 'Add new spell'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="spell-editor-header">
          <h2>{spell ? `Edit Spell: ${spell.spell_name}` : 'Add New Spell'}</h2>
          <button type="button" className="spell-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`spell-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="spell-editor-form">
          <div className="spell-editor-grid">
            <TextField
              label="Spell Name"
              value={form.spell_name}
              onChange={(e) => patch({ spell_name: e.target.value })}
              required
            />
            <TextField label="Icon" value={form.icon} onChange={(e) => patch({ icon: e.target.value })} />
            <SelectField
              label="Level"
              value={form.level}
              onChange={(e) => patch({ level: e.target.value })}
              options={LEVEL_OPTIONS}
            />
            <SelectField
              label="School"
              value={form.school}
              onChange={(e) => patch({ school: e.target.value })}
              options={SCHOOL_OPTIONS}
              placeholder="— (none)"
            />
            <TextField
              label="Casting Time"
              value={form.casting_time}
              onChange={(e) => patch({ casting_time: e.target.value })}
              placeholder="1 action"
            />
            <TextField
              label="Duration"
              value={form.duration}
              onChange={(e) => patch({ duration: e.target.value })}
              placeholder="Instantaneous"
            />
            <TextField
              label="Range"
              value={form.range}
              onChange={(e) => patch({ range: e.target.value })}
              placeholder="60 feet"
            />
            <SelectField
              label="Action"
              value={form.action}
              onChange={(e) => patch({ action: e.target.value })}
              options={ACTION_OPTIONS}
            />
            <CheckboxField
              label="Concentration"
              checked={form.concentration}
              onChange={(e) => patch({ concentration: e.target.checked })}
            />
            <CheckboxField label="Ritual" checked={form.ritual} onChange={(e) => patch({ ritual: e.target.checked })} />
          </div>

          <TextField
            label="Materials"
            multiline
            value={form.materials}
            onChange={(e) => patch({ materials: e.target.value })}
          />

          <MultiSelectField
            label="Classes"
            options={CLASS_OPTIONS}
            selected={form.classes}
            onChange={(classes) => patch({ classes })}
          />

          <TextField
            label="Subclasses (comma-separated)"
            value={form.subclasses}
            onChange={(e) => patch({ subclasses: e.target.value })}
          />

          {componentOptions.length > 0 && (
            <MultiSelectField
              label="Components"
              options={componentOptions}
              selected={form.components}
              onChange={(components) => patch({ components })}
            />
          )}

          <section className="spell-editor-section">
            <h3>Area Of Effect</h3>
            <div className="spell-editor-inline-grid">
              <TextField
                label="Shape"
                value={form.areaShape}
                onChange={(e) => patch({ areaShape: e.target.value })}
                placeholder="cone, cube, sphere…"
              />
              <TextField
                label="Size"
                value={form.areaSize}
                onChange={(e) => patch({ areaSize: e.target.value })}
                placeholder="30"
              />
            </div>
          </section>

          <section className="spell-editor-section">
            <div className="spell-editor-section-header">
              <h3>Attack / Save Rows</h3>
              <button type="button" className="spell-editor-add" onClick={addAttackRow}>
                Add Attack
              </button>
            </div>
            {form.attackRows.length === 0 && <p className="spell-editor-empty">No rows added.</p>}
            {form.attackRows.map((row) => (
              <div className="spell-editor-row-card" key={row.id}>
                <div className="spell-editor-row-grid">
                  <TextField
                    label="Name"
                    value={row.name}
                    onChange={(e) => updateAttackRow(row.id, { name: e.target.value })}
                  />
                  <SelectField
                    label="Attack Type"
                    value={row.type}
                    onChange={(e) => updateAttackRow(row.id, { type: e.target.value })}
                    options={ATTACK_TYPE_OPTIONS}
                  />
                  <fieldset className="spell-editor-check-group">
                    <legend>Save</legend>
                    {abilityOptions.map((ability) => (
                      <label key={ability.value} className="spell-editor-check-option">
                        <input
                          type="checkbox"
                          checked={row.save.includes(ability.value)}
                          onChange={() => updateAttackRow(row.id, { save: toggleRowMulti(row.save, ability.value) })}
                        />
                        {ability.label}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <button type="button" className="spell-editor-row-remove" onClick={() => removeAttackRow(row.id)}>
                  Remove Row
                </button>
              </div>
            ))}
          </section>

          <section className="spell-editor-section">
            <div className="spell-editor-section-header">
              <h3>Damage Rows</h3>
              <button type="button" className="spell-editor-add" onClick={addDamageRow}>
                Add Damage
              </button>
            </div>
            {form.damageRows.length === 0 && <p className="spell-editor-empty">No rows added.</p>}
            {form.damageRows.map((row) => (
              <div className="spell-editor-row-card" key={row.id}>
                <div className="spell-editor-row-grid">
                  <TextField
                    label="Name"
                    value={row.name}
                    onChange={(e) => updateDamageRow(row.id, { name: e.target.value })}
                  />
                  <DiceRollField
                    label="Damage"
                    value={row.damage}
                    onChange={(damage) => updateDamageRow(row.id, { damage })}
                  />
                  <fieldset className="spell-editor-check-group">
                    <legend>Damage Type</legend>
                    {damageTypeOptions.map((dt) => (
                      <label key={dt.value} className="spell-editor-check-option">
                        <input
                          type="checkbox"
                          checked={row.type.includes(dt.value)}
                          onChange={() => updateDamageRow(row.id, { type: toggleRowMulti(row.type, dt.value) })}
                        />
                        {dt.label}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <button type="button" className="spell-editor-row-remove" onClick={() => removeDamageRow(row.id)}>
                  Remove Row
                </button>
              </div>
            ))}
          </section>

          <section className="spell-editor-section">
            <h3>Heal</h3>
            <div className="spell-editor-inline-grid">
              <DiceRollField label="Amount" value={form.healAmount} onChange={(healAmount) => patch({ healAmount })} />
            </div>
            <div className="spell-editor-bool-row">
              <CheckboxField
                label="Temporary HP"
                checked={form.healTempHp}
                onChange={(e) => patch({ healTempHp: e.target.checked })}
              />
              <CheckboxField
                label="Increases Max HP"
                checked={form.healMaxHp}
                onChange={(e) => patch({ healMaxHp: e.target.checked })}
              />
            </div>
          </section>

          <TextField
            label="Higher Levels"
            multiline
            value={form.higher_levels}
            onChange={(e) => patch({ higher_levels: e.target.value })}
          />

          <TextField
            label="Spell Text"
            multiline
            value={form.spell_text}
            onChange={(e) => patch({ spell_text: e.target.value })}
          />

          <div className="spell-editor-actions">
            <button type="button" className="spell-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="spell-editor-save" disabled={saving}>
              {spell ? 'Save Changes' : 'Create Spell'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
