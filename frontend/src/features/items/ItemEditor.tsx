import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../api/client'
import type { Item } from '../../api/types'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { ITEM_CATEGORIES } from '../loot/itemCategories'
import { emptyItemForm, formStateToItemInput, itemToFormState, validateItemForm } from './itemForm'
import type { ItemFormErrors, ItemFormState } from './itemForm'
import './ItemEditor.css'

interface ItemEditorProps {
  item?: Item
  onClose: () => void
  onSaved: (item: Item) => void
}

export function ItemEditor({ item, onClose, onSaved }: ItemEditorProps) {
  const formId = useId()
  const [form, setForm] = useState<ItemFormState>(() => (item ? itemToFormState(item) : emptyItemForm()))
  const [errors, setErrors] = useState<ItemFormErrors>({})
  const [status, setStatus] = useState<{ message: string; kind?: 'error' | 'success' }>({ message: '' })
  const [saving, setSaving] = useState(false)
  const patch = (fields: Partial<ItemFormState>) => setForm((previous) => ({ ...previous, ...fields }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateItemForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setStatus({ message: 'Saving item…' })
    try {
      const saved = item ? await api.updateItem(item.id, formStateToItemInput(form)) : await api.createItem(formStateToItemInput(form))
      setStatus({ message: 'Item saved.', kind: 'success' })
      onSaved(saved)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Failed to save item.', kind: 'error' })
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title={item ? `Edit Item: ${item.name}` : 'Add New Item'}
      onClose={onClose}
      pending={saving}
      className="item-editor-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} loading={saving}>{item ? 'Save Changes' : 'Create Item'}</Button>
        </>
      }
    >
      {status.message && (
        <p role="status" className={`item-editor-status ${status.kind || ''}`}>{status.message}</p>
      )}
      <form id={formId} onSubmit={handleSubmit} className="item-editor-form">
        <div className="item-editor-grid">
          <TextField label="Name" value={form.name} onChange={(event) => patch({ name: event.target.value })} error={errors.name} required />
          <TextField label="Value (gp)" type="number" min="0" step="any" value={form.valueGp} onChange={(event) => patch({ valueGp: event.target.value })} error={errors.valueGp} required />
          <SelectField label="Category" value={form.category} onChange={(event) => patch({ category: event.target.value })} options={ITEM_CATEGORIES.map(({ slug, label }) => ({ value: slug, label }))} />
        </div>
        <TextField label="Description" multiline value={form.description} onChange={(event) => patch({ description: event.target.value })} />
      </form>
    </Dialog>
  )
}
