import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Weapon } from '../../api/types'
import { MultiSelectField } from '../../components/form/MultiSelectField'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { CLASS_OPTIONS } from '../spells/constants'
import type { WeaponAttackRow, WeaponFormState } from './weaponForm'
import { addWeaponAttackRow, emptyWeaponForm, formStateToWeaponInput, weaponToFormState } from './weaponForm'
import './WeaponEditor.css'

interface WeaponEditorProps {
  weapon?: Weapon
  onClose: () => void
  onSaved: (weapon: Weapon) => void
}

const ATTACK_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
]

export function WeaponEditor({ weapon, onClose, onSaved }: WeaponEditorProps) {
  const [form, setForm] = useState<WeaponFormState>(() => (weapon ? weaponToFormState(weapon) : emptyWeaponForm()))
  const [propertyOptions, setPropertyOptions] = useState<{ value: string; label: string }[]>([])
  const [damageTypeOptions, setDamageTypeOptions] = useState<{ value: string; label: string }[]>([])
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .getWeaponProperties()
      .then((props) => setPropertyOptions(props.map((p) => ({ value: p.code, label: p.name }))))
      .catch(() => setPropertyOptions([]))
    api
      .getDamageTypes()
      .then((types) => setDamageTypeOptions(types.map((t) => ({ value: t.code, label: t.name }))))
      .catch(() => setDamageTypeOptions([]))
  }, [])

  const patch = (fields: Partial<WeaponFormState>) => setForm((prev) => ({ ...prev, ...fields }))

  const updateAttackRow = (id: string, fields: Partial<WeaponAttackRow>) => {
    patch({ attackRows: form.attackRows.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }
  const removeAttackRow = (id: string) => {
    patch({ attackRows: form.attackRows.filter((r) => r.id !== id) })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving weapon…' })
    const payload = formStateToWeaponInput(form)
    try {
      const saved = weapon ? await api.updateWeapon(weapon.id, payload) : await api.createWeapon(payload)
      setStatus({ message: 'Weapon saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save weapon.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="weapon-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="weapon-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={weapon ? `Edit ${weapon.name}` : 'Add new weapon'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="weapon-editor-header">
          <h2>{weapon ? `Edit Weapon: ${weapon.name}` : 'Add New Weapon'}</h2>
          <button type="button" className="weapon-editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {status.message && <p className={`weapon-editor-status ${status.kind || ''}`}>{status.message}</p>}

        <form onSubmit={handleSubmit} className="weapon-editor-form">
          <div className="weapon-editor-grid">
            <TextField label="Name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <TextField
              label="Base Weapon"
              value={form.base_weapon}
              onChange={(e) => patch({ base_weapon: e.target.value })}
            />
            <TextField label="Rarity" value={form.rarity} onChange={(e) => patch({ rarity: e.target.value })} />
            <TextField
              label="Category"
              value={form.weapon_category}
              onChange={(e) => patch({ weapon_category: e.target.value })}
              placeholder="simple, martial…"
            />
            <TextField
              label="Weight"
              type="number"
              value={form.weight}
              onChange={(e) => patch({ weight: e.target.value })}
            />
            <TextField
              label="Requires Attunement"
              value={form.req_attune}
              onChange={(e) => patch({ req_attune: e.target.value })}
            />
          </div>

          {propertyOptions.length > 0 && (
            <MultiSelectField
              label="Properties"
              options={propertyOptions}
              selected={form.property}
              onChange={(property) => patch({ property })}
            />
          )}

          <MultiSelectField
            label="Spellcasting Focus For"
            options={CLASS_OPTIONS}
            selected={form.focus}
            onChange={(focus) => patch({ focus })}
          />

          <section className="weapon-editor-section">
            <div className="weapon-editor-section-header">
              <h3>Attack Rows</h3>
              <button
                type="button"
                className="weapon-editor-add"
                onClick={() => patch({ attackRows: addWeaponAttackRow(form.attackRows) })}
              >
                Add Attack
              </button>
            </div>
            {form.attackRows.length === 0 && <p className="weapon-editor-empty">No attack rows added.</p>}
            {form.attackRows.map((row) => (
              <div className="weapon-editor-row-card" key={row.id}>
                <div className="weapon-editor-row-grid">
                  <SelectField
                    label="Type"
                    value={row.type}
                    onChange={(e) => updateAttackRow(row.id, { type: e.target.value })}
                    options={ATTACK_TYPE_OPTIONS}
                  />
                  <TextField
                    label="Damage"
                    value={row.damage}
                    onChange={(e) => updateAttackRow(row.id, { damage: e.target.value })}
                    placeholder="1d8"
                  />
                  <SelectField
                    label="Damage Type"
                    value={row.damage_type}
                    onChange={(e) => updateAttackRow(row.id, { damage_type: e.target.value })}
                    options={damageTypeOptions}
                    placeholder="— (none)"
                  />
                  <TextField
                    label="Hands"
                    type="number"
                    value={row.hands}
                    onChange={(e) => updateAttackRow(row.id, { hands: e.target.value })}
                  />
                </div>
                <button type="button" className="weapon-editor-row-remove" onClick={() => removeAttackRow(row.id)}>
                  Remove Row
                </button>
              </div>
            ))}
          </section>

          <TextField
            label="Description (blank line separates entries)"
            multiline
            value={form.entries}
            onChange={(e) => patch({ entries: e.target.value })}
          />

          <div className="weapon-editor-actions">
            <button type="button" className="weapon-editor-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="weapon-editor-save" disabled={saving}>
              {weapon ? 'Save Changes' : 'Create Weapon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
