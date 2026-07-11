import { describe, expect, it } from 'vitest'
import type { Player } from '../../../api/types'
import { emptyPlayerForm, formStateToPlayerInput, playerToFormState } from '../playerForm'

const basePlayer: Player = { id: 1, name: 'Pip', class_: 'Wizard', level: 3 }

describe('playerToFormState', () => {
  it('converts a player into editable form fields', () => {
    const form = playerToFormState(basePlayer)
    expect(form.name).toBe('Pip')
    expect(form.class_).toBe('Wizard')
    expect(form.level).toBe('3')
  })
})

describe('formStateToPlayerInput', () => {
  it('round-trips form state back into API-shaped input', () => {
    const input = formStateToPlayerInput(playerToFormState(basePlayer))
    expect(input).toEqual({ name: 'Pip', class_: 'Wizard', level: 3 })
  })

  it('nulls out blank optional fields for an empty form', () => {
    const input = formStateToPlayerInput(emptyPlayerForm())
    expect(input.class_).toBeNull()
    expect(input.level).toBeNull()
  })
})
