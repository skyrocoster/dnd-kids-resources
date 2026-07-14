import { useReducer, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { LootBundle } from '../../api/types'
import { TextField } from '../../components/form/TextField'
import { CloseIcon, PackageIcon, PlusIcon } from '../../components/icons'
import { categoryIcon } from './itemCategories'
import { AddItemPanel } from './AddItemPanel'
import { AddWeaponPanel } from './AddWeaponPanel'
import {
  emptyLootBundleForm,
  formStateToLootBundleInput,
  itemToLootEntry,
  lootBundleFormReducer,
  lootBundleToFormState,
  weaponToLootEntry,
} from './lootBundleForm'
import { computeBundleTotal, formatGp } from './lootTotals'
import './LootBundleEditor.css'

interface LootBundleEditorProps {
  bundle?: LootBundle
  onClose: () => void
  onSaved: (bundle: LootBundle) => void
}

export function LootBundleEditor({ bundle, onClose, onSaved }: LootBundleEditorProps) {
  const [form, dispatch] = useReducer(lootBundleFormReducer, bundle, (value) =>
    value ? lootBundleToFormState(value) : emptyLootBundleForm(),
  )
  const [picker, setPicker] = useState<'item' | 'weapon' | null>(null)
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)
  const gold = Number(form.gold)
  const total = computeBundleTotal(Number.isFinite(gold) ? gold : 0, form.contents)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus({ message: 'Saving loot bundle…' })
    try {
      const payload = formStateToLootBundleInput(form)
      const saved = bundle ? await api.updateLootBundle(bundle.id, payload) : await api.createLootBundle(payload)
      setStatus({ message: 'Loot bundle saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save loot bundle.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="loot-editor-backdrop" role="presentation" onClick={onClose}>
      <div className="loot-editor-modal" role="dialog" aria-modal="true" aria-label={bundle ? `Edit ${bundle.name}` : 'Add new loot bundle'} onClick={(event) => event.stopPropagation()}>
        <header className="loot-editor-header">
          <h2>{bundle ? `Edit Loot Bundle: ${bundle.name}` : 'Add New Loot Bundle'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><CloseIcon size={20} aria-hidden /></button>
        </header>
        {status.message && <p className={`loot-editor-status ${status.kind || ''}`}>{status.message}</p>}
        <form onSubmit={handleSubmit}>
          <TextField label="Name" value={form.name} onChange={(event) => dispatch({ type: 'setName', name: event.target.value })} required />
          <TextField label="Gold (gp)" type="number" min="0" step="any" value={form.gold} onChange={(event) => dispatch({ type: 'setGold', gold: event.target.value })} required />
          <section className="loot-editor-section">
            <div className="loot-editor-section-header">
              <h3>Contents</h3>
              <div className="loot-editor-add-actions">
                <button type="button" onClick={() => setPicker(picker === 'item' ? null : 'item')}><PlusIcon size={16} aria-hidden /> Add Item</button>
                <button type="button" onClick={() => setPicker(picker === 'weapon' ? null : 'weapon')}><PlusIcon size={16} aria-hidden /> Add Weapon</button>
              </div>
            </div>
            {picker === 'item' && <AddItemPanel onAdd={(item) => dispatch({ type: 'addEntry', entry: itemToLootEntry(item) })} onClose={() => setPicker(null)} />}
            {picker === 'weapon' && <AddWeaponPanel onAdd={(weapon) => dispatch({ type: 'addEntry', entry: weaponToLootEntry(weapon) })} onClose={() => setPicker(null)} />}
            {form.contents.length === 0 ? <p className="loot-editor-empty">No items or weapons added.</p> : (
              <ul className="loot-editor-contents">
                {form.contents.map((entry, index) => {
                  const EntryIcon = entry.kind === 'item' ? categoryIcon(entry.category) : PackageIcon
                  return <li key={`${entry.kind}-${entry.ref_id}-${index}`}>
                    <EntryIcon size={20} aria-hidden="true" />
                    <span className="loot-editor-entry-name">{entry.name}</span>
                    <span className="loot-editor-entry-value">{entry.value_gp == null ? 'Value pending' : formatGp(entry.value_gp)}</span>
                    <label>Quantity <input type="number" min="1" step="1" value={entry.quantity} onChange={(event) => dispatch({ type: 'setQuantity', index, quantity: Number(event.target.value) })} /></label>
                    <button type="button" className="loot-editor-remove" onClick={() => dispatch({ type: 'removeEntry', index })}>Remove</button>
                  </li>
                })}
              </ul>
            )}
          </section>
          <p className="loot-editor-total">Total value: <strong>{formatGp(total)}</strong></p>
          <div className="loot-editor-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="loot-editor-save" disabled={saving}>{bundle ? 'Save Changes' : 'Create Loot Bundle'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
