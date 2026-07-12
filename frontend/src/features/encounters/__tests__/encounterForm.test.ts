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

describe('C1: Stat propagation', () => {
  it.skip('picking a monster fills HP current/max/AC from defaults', () => {
    // TODO C1: test that selecting a monster populates hpCurrent, hpMax, ac
    expect(true).toBe(true)
  })

  it.skip('degrades to blank when the monster lacks hp.average or ac', () => {
    // TODO C1: test graceful degradation when monster data is missing
    expect(true).toBe(true)
  })

  it.skip('shares logic with combatantFromMonster', () => {
    // TODO C1: verify that editor + runner derive identical values for same monster
    expect(true).toBe(true)
  })
})

describe('C2: Condition checkboxes', () => {
  it.skip('conditions render as checkboxes from getConditions', () => {
    // TODO C2: verify condition checkboxes render
    expect(true).toBe(true)
  })

  it.skip('toggling conditions updates form state', () => {
    // TODO C2: verify checkbox toggle updates conditions: string[]
    expect(true).toBe(true)
  })

  it.skip('conditions round-trip through formStateToEncounterInput', () => {
    // TODO C2: verify structured conditions survive save/restore
    expect(true).toBe(true)
  })

  it.skip('legacy/unknown conditions survive an edit', () => {
    // TODO C2: verify conditions not in canonical list persist
    expect(true).toBe(true)
  })
})
