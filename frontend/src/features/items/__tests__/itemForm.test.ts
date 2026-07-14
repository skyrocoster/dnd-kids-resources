import { describe, expect, it } from 'vitest'
import { emptyItemForm, formStateToItemInput, itemToFormState, validateItemForm } from '../itemForm'

describe('itemForm', () => {
  it('converts catalog items to editable state and back', () => {
    const form = itemToFormState({ id: 3, name: 'Ruby', value_gp: 12.5, category: 'gem', description: 'Bright.' })
    expect(form).toEqual({ name: 'Ruby', valueGp: '12.5', category: 'gem', description: 'Bright.' })
    expect(formStateToItemInput(form)).toEqual({ name: 'Ruby', value_gp: 12.5, category: 'gem', description: 'Bright.' })
  })

  it('requires a name and a non-negative numeric value', () => {
    expect(validateItemForm(emptyItemForm())).toEqual({ name: 'Name is required.', valueGp: 'Value must be a number of 0 gp or more.' })
    expect(validateItemForm({ ...emptyItemForm(), name: 'Rope', valueGp: '-1' })).toEqual({ valueGp: 'Value must be a number of 0 gp or more.' })
  })
})
