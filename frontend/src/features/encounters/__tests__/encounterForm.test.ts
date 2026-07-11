import { describe, expect, it } from 'vitest'
import type { Encounter } from '../../../api/types'
import { emptyEncounterForm, encounterToFormState, formStateToEncounterInput } from '../encounterForm'

const baseEncounter: Encounter = {
  id: 1,
  title: 'Ants',
  creatures: [
    {
      monster_id: 1098,
      original_name: 'Giant Toad',
      name: 'Giant Toad',
      hp_current: 39,
      hp_max: 39,
      ac: null,
      status: 'alive',
      conditions: [],
    },
  ],
}

describe('encounterToFormState', () => {
  it('flattens creature dicts into editable rows', () => {
    const form = encounterToFormState(baseEncounter)
    expect(form.title).toBe('Ants')
    expect(form.creatureRows).toHaveLength(1)
    expect(form.creatureRows[0].monsterId).toBe('1098')
    expect(form.creatureRows[0].hpCurrent).toBe('39')
    expect(form.creatureRows[0].status).toBe('alive')
  })
})

describe('formStateToEncounterInput', () => {
  it('round-trips rows back into API-shaped creature dicts', () => {
    const input = formStateToEncounterInput(encounterToFormState(baseEncounter))
    expect(input.creatures).toEqual([
      {
        monster_id: 1098,
        original_name: 'Giant Toad',
        name: 'Giant Toad',
        hp_current: 39,
        hp_max: 39,
        ac: null,
        status: 'alive',
        conditions: [],
      },
    ])
  })

  it('omits creatures for a blank form', () => {
    const input = formStateToEncounterInput(emptyEncounterForm())
    expect(input.creatures).toBeNull()
  })
})
