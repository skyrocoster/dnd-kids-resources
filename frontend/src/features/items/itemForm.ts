import type { Item, ItemInput } from '../../api/types'

export interface ItemFormState {
  name: string
  valueGp: string
  category: string
  description: string
}

export type ItemFormErrors = Partial<Record<keyof ItemFormState, string>>

export function emptyItemForm(): ItemFormState {
  return { name: '', valueGp: '', category: 'other', description: '' }
}

export function itemToFormState(item: Item): ItemFormState {
  return {
    name: item.name,
    valueGp: String(item.value_gp),
    category: item.category || 'other',
    description: item.description || '',
  }
}

export function validateItemForm(form: ItemFormState): ItemFormErrors {
  const errors: ItemFormErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  const valueGp = Number(form.valueGp)
  if (!form.valueGp.trim() || !Number.isFinite(valueGp) || valueGp < 0) {
    errors.valueGp = 'Value must be a number of 0 gp or more.'
  }
  return errors
}

export function formStateToItemInput(form: ItemFormState): ItemInput {
  return {
    name: form.name.trim(),
    value_gp: Number(form.valueGp),
    category: form.category || null,
    description: form.description.trim() || null,
  }
}
