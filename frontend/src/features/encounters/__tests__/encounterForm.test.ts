import { describe, expect, it } from 'vitest'
import type { Condition, Encounter, Monster } from '../../../api/types'
import {
  addEncounterCreatureRow,
  emptyEncounterForm,
  encounterToFormState,
  formStateToEncounterInput,
  isConditionSelected,
  mergeConditionOptions,
  toggleCondition,
} from '../encounterForm'
import { deriveCreatureStats } from '../encounterStats'
import { combatantFromMonster } from '../encounterRunner'

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: 1,
    name: 'Monster',
    aliases: [],
    sizes: [],
    family: null,
    alignment: null,
    creature_type: null,
    ac: null,
    hp: null,
    speed: [],
    abilities: null,
    saving_throws: {},
    skills: {},
    passive_perception: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    condition_immunities: [],
    senses: [],
    languages: [],
    audio_path: null,
    features: {
      traits: [],
      spellcasting: [],
      actions: [],
      bonus_actions: [],
      reactions: [],
      reaction_intro: null,
      legendary_actions: [],
      legendary_intro: null,
      legendary_actions_per_round: null,
      mythic_actions: [],
    },
    cr: null,
    cr_sort: null,
    cr_note: null,
    experience_points: null,
    ...overrides,
  }
}

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
  it('picking a monster fills HP current/max/AC from defaults', () => {
    const goblin = monster({ id: 42, name: 'Goblin', ac: { value: 15, note: null, alternatives: [] }, hp: { average: 7, formula: null } })
    const { hpAverage, ac } = deriveCreatureStats(goblin)
    expect(hpAverage).toBe(7)
    expect(ac).toBe(15)
  })

  it('degrades to blank when the monster lacks hp.average or ac', () => {
    const mystery = monster({ id: 43, name: 'Mystery', ac: null, hp: null })
    const { hpAverage, ac } = deriveCreatureStats(mystery)
    expect(hpAverage).toBeNull()
    expect(ac).toBeNull()
  })

  it('shares logic with combatantFromMonster', () => {
    const ogre = monster({ id: 44, name: 'Ogre', ac: { value: 11, note: null, alternatives: [] }, hp: { average: 59, formula: null } })
    const derived = deriveCreatureStats(ogre)
    const combatant = combatantFromMonster(ogre)
    expect(combatant.hp_current).toBe(derived.hpAverage)
    expect(combatant.hp_max).toBe(derived.hpAverage)
    expect(combatant.ac).toBe(derived.ac)
  })
})

describe('C2: Condition checkboxes', () => {
  const canonical: Condition[] = [
    { id: 1, name: 'Poisoned' },
    { id: 2, name: 'Prone' },
  ]

  it('conditions render as checkboxes from getConditions', () => {
    expect(mergeConditionOptions(canonical, [])).toEqual([
      { value: 'Poisoned', label: 'Poisoned' },
      { value: 'Prone', label: 'Prone' },
    ])
  })

  it('toggling conditions updates form state', () => {
    expect(toggleCondition([], 'Poisoned')).toEqual(['Poisoned'])
    expect(toggleCondition(['Poisoned'], 'Poisoned')).toEqual([])
    expect(isConditionSelected(['poisoned'], 'Poisoned')).toBe(true)
  })

  it('conditions round-trip through formStateToEncounterInput', () => {
    const [row] = addEncounterCreatureRow([])
    const form = {
      title: 'Test',
      creatureRows: [{ ...row, conditions: ['Poisoned', 'Poisoned', ' Prone '] }],
    }
    const input = formStateToEncounterInput(form)
    expect(input.creatures?.[0].conditions).toEqual(['Poisoned', 'Prone'])
  })

  it('legacy/unknown conditions survive an edit', () => {
    const encounter: Encounter = {
      ...baseEncounter,
      creatures: [{ ...baseEncounter.creatures![0], conditions: ['stunned (legacy)'] }],
    }
    const form = encounterToFormState(encounter)
    expect(form.creatureRows[0].conditions).toEqual(['stunned (legacy)'])

    const options = mergeConditionOptions(canonical, form.creatureRows[0].conditions)
    expect(options).toContainEqual({ value: 'stunned (legacy)', label: 'stunned (legacy) (custom)' })

    const input = formStateToEncounterInput(form)
    expect(input.creatures?.[0].conditions).toEqual(['stunned (legacy)'])
  })
})
