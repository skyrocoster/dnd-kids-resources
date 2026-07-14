import { describe, expect, it } from 'vitest'
import type { Encounter, Monster } from '../../../api/types'
import {
  combatantFromMonster,
  combatantFromPlayer,
  combatantsToCreatures,
  createInitialState,
  encounterRunnerReducer,
  hydrate,
  type RunnerState,
} from '../encounterRunner'

const baseEncounter: Encounter = {
  id: 1,
  title: 'Kennels',
  active_index: null,
  creatures: [
    { monster_id: 1, original_name: 'Goblin', name: 'Goblin', hp_current: 7, hp_max: 7, ac: 15, status: 'alive', conditions: [] },
    { monster_id: 2, original_name: 'Wolf', name: 'Wolf', hp_current: 11, hp_max: 11, ac: 13, status: 'alive', conditions: [] },
    { monster_id: 3, original_name: 'Bandit', name: 'Bandit', hp_current: 11, hp_max: 11, ac: 12, status: 'alive', conditions: [] },
  ],
}

function hydrated(encounter: Encounter = baseEncounter): RunnerState {
  return hydrate(encounter)
}

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

describe('hydrate', () => {
  it('assigns a stable clientId per combatant and defaults active to the first combatant', () => {
    const state = hydrated()
    expect(state.combatants).toHaveLength(3)
    expect(new Set(state.combatants.map((c) => c.clientId)).size).toBe(3)
    expect(state.activeClientId).toBe(state.combatants[0].clientId)
    expect(state.round).toBe(1)
  })

  it('maps encounter.active_index back to the matching clientId', () => {
    const state = hydrated({ ...baseEncounter, active_index: 2 })
    expect(state.activeClientId).toBe(state.combatants[2].clientId)
  })

  it('handles an empty encounter', () => {
    const state = hydrated({ id: 1, title: 'Empty', creatures: [] })
    expect(state.combatants).toEqual([])
    expect(state.activeClientId).toBeNull()
  })
})

describe('adjustHp / setHp', () => {
  it('clamps damage at 0', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'adjustHp', clientId, delta: -100 })
    expect(next.combatants[0].hp_current).toBe(0)
  })

  it('clamps healing at hp_max', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'adjustHp', clientId, delta: 100 })
    expect(next.combatants[0].hp_current).toBe(7)
  })

  it('setHp clamps an absolute value into range', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'setHp', clientId, hp: -5 })
    expect(next.combatants[0].hp_current).toBe(0)
  })
})

describe('setStatus / rename', () => {
  it('updates status for the targeted combatant only', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'setStatus', clientId, status: 'unconscious' })
    expect(next.combatants[0].status).toBe('unconscious')
    expect(next.combatants[1].status).toBe('alive')
  })

  it('renames a combatant', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'rename', clientId, name: 'Goblin Boss' })
    expect(next.combatants[0].name).toBe('Goblin Boss')
  })
})

describe('setConditions', () => {
  it('replaces conditions for the targeted combatant only', () => {
    const state = hydrated()
    const [a, b] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'setConditions', clientId: a.clientId, conditions: ['prone', 'poisoned'] })
    expect(next.combatants[0].conditions).toEqual(['prone', 'poisoned'])
    expect(next.combatants[1].conditions).toEqual(b.conditions)
  })

  it('clears conditions back to an empty array', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const withConditions = encounterRunnerReducer(state, { type: 'setConditions', clientId, conditions: ['prone'] })
    const cleared = encounterRunnerReducer(withConditions, { type: 'setConditions', clientId, conditions: [] })
    expect(cleared.combatants[0].conditions).toEqual([])
  })

  it('leaves order untouched', () => {
    const state = hydrated()
    const [a, b, c] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'setConditions', clientId: b.clientId, conditions: ['stunned'] })
    expect(next.combatants.map((x) => x.clientId)).toEqual([a.clientId, b.clientId, c.clientId])
  })
})

describe('duplicate', () => {
  it('inserts a full-HP copy directly after the source, keeping name/ac and a new clientId', () => {
    const state = hydrated()
    const source = state.combatants[0]
    const damaged = encounterRunnerReducer(state, { type: 'adjustHp', clientId: source.clientId, delta: -3 })
    const next = encounterRunnerReducer(damaged, { type: 'duplicate', clientId: source.clientId })
    expect(next.combatants).toHaveLength(4)
    expect(next.combatants[1].name).toBe('Goblin')
    expect(next.combatants[1].ac).toBe(15)
    expect(next.combatants[1].hp_current).toBe(7)
    expect(next.combatants[1].clientId).not.toBe(source.clientId)
  })
})

describe('addFromMonster', () => {
  const owlbear: Monster = monster({
    id: 42,
    name: 'Owlbear',
    ac: { value: 13, note: 'natural armour', alternatives: [] },
    hp: { average: 59, formula: '7d10 + 21' },
  })

  it('derives hp_current/hp_max from hp.average and appends to the end', () => {
    const state = hydrated()
    const next = encounterRunnerReducer(state, { type: 'addFromMonster', monster: owlbear })
    expect(next.combatants).toHaveLength(4)
    const added = next.combatants[3]
    expect(added.monster_id).toBe(42)
    expect(added.name).toBe('Owlbear')
    expect(added.hp_current).toBe(59)
    expect(added.hp_max).toBe(59)
    expect(added.ac).toBe(13)
    expect(added.status).toBe('alive')
  })

  it('falls back to null hp/ac when the monster data cannot derive them', () => {
    const oddMonster: Monster = monster({ id: 43, name: 'Aberrant Spirit', ac: null, hp: null })
    const state = hydrated({ id: 1, title: 'Empty', creatures: [] })
    const next = encounterRunnerReducer(state, { type: 'addFromMonster', monster: oddMonster })
    expect(next.combatants[0].hp_current).toBeNull()
    expect(next.combatants[0].ac).toBeNull()
  })
})

describe('remove', () => {
  it('reassigns active to the next combatant when the active one is removed', () => {
    const state = hydrated()
    const [a, b] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'remove', clientId: a.clientId })
    expect(next.combatants).toHaveLength(2)
    expect(next.activeClientId).toBe(b.clientId)
  })

  it('sets active to null when the last combatant is removed', () => {
    const state = hydrated({ id: 1, title: 'Solo', creatures: [baseEncounter.creatures![0]] })
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'remove', clientId })
    expect(next.combatants).toEqual([])
    expect(next.activeClientId).toBeNull()
  })

  it('leaves active untouched when removing a non-active combatant', () => {
    const state = hydrated()
    const [a, , c] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'remove', clientId: c.clientId })
    expect(next.activeClientId).toBe(a.clientId)
  })
})

describe('reorder / moveUp / moveDown', () => {
  it('reorder moves a combatant from one index to another', () => {
    const state = hydrated()
    const [a, b, c] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'reorder', fromIndex: 0, toIndex: 2 })
    expect(next.combatants.map((x) => x.clientId)).toEqual([b.clientId, c.clientId, a.clientId])
  })

  it('moveUp swaps with the previous combatant and no-ops at the top', () => {
    const state = hydrated()
    const [a, b] = state.combatants
    const moved = encounterRunnerReducer(state, { type: 'moveUp', clientId: b.clientId })
    expect(moved.combatants.map((x) => x.clientId)[0]).toBe(b.clientId)
    expect(moved.combatants.map((x) => x.clientId)[1]).toBe(a.clientId)

    const noop = encounterRunnerReducer(moved, { type: 'moveUp', clientId: b.clientId })
    expect(noop.combatants.map((x) => x.clientId)[0]).toBe(b.clientId)
  })

  it('moveDown swaps with the next combatant and no-ops at the bottom', () => {
    const state = hydrated()
    const [, , c] = state.combatants
    const noop = encounterRunnerReducer(state, { type: 'moveDown', clientId: c.clientId })
    expect(noop.combatants.map((x) => x.clientId)[2]).toBe(c.clientId)
  })
})

describe('nextTurn', () => {
  it('advances the active combatant in order', () => {
    const state = hydrated()
    const [a, b] = state.combatants
    expect(state.activeClientId).toBe(a.clientId)
    const next = encounterRunnerReducer(state, { type: 'nextTurn' })
    expect(next.activeClientId).toBe(b.clientId)
    expect(next.round).toBe(1)
  })

  it('wraps to the first combatant and increments round', () => {
    const state = hydrated()
    let s = state
    s = encounterRunnerReducer(s, { type: 'nextTurn' })
    s = encounterRunnerReducer(s, { type: 'nextTurn' })
    expect(s.activeClientId).toBe(state.combatants[2].clientId)
    expect(s.round).toBe(1)
    s = encounterRunnerReducer(s, { type: 'nextTurn' })
    expect(s.activeClientId).toBe(state.combatants[0].clientId)
    expect(s.round).toBe(2)
  })

  it('is a no-op with zero combatants', () => {
    const state = createInitialState()
    const next = encounterRunnerReducer(state, { type: 'nextTurn' })
    expect(next).toEqual(state)
  })
})

describe('combatantsToCreatures', () => {
  it('strips clientId, preserves order and conditions, and derives active_index', () => {
    const state = hydrated({
      ...baseEncounter,
      active_index: 1,
      creatures: baseEncounter.creatures!.map((c, i) => (i === 0 ? { ...c, conditions: ['prone'] } : c)),
    })
    const { creatures, active_index } = combatantsToCreatures(state)
    expect(creatures).toHaveLength(3)
    expect(creatures[0]).not.toHaveProperty('clientId')
    expect(creatures[0].conditions).toEqual(['prone'])
    expect(active_index).toBe(1)
  })

  it('returns active_index null when nothing is active', () => {
    const state = { ...hydrated(), activeClientId: null }
    const { active_index } = combatantsToCreatures(state)
    expect(active_index).toBeNull()
  })

  it('round-trips conditions set via setConditions', () => {
    const state = hydrated()
    const clientId = state.combatants[0].clientId
    const next = encounterRunnerReducer(state, { type: 'setConditions', clientId, conditions: ['grappled'] })
    const { creatures } = combatantsToCreatures(next)
    expect(creatures[0].conditions).toEqual(['grappled'])
    expect(creatures[1].conditions).toEqual([])
  })

  it('kind field survives combatantsToCreatures -> hydrate round-trip', () => {
    const state = encounterRunnerReducer(hydrated(), { type: 'addPlayer', name: 'Frodo', conditions: [] })
    const { creatures } = combatantsToCreatures(state)
    expect(creatures[3].kind).toBe('player')

    const rehydrated = hydrate({ id: 1, title: 'Test', creatures, active_index: 3 })
    expect(rehydrated.combatants[3].kind).toBe('player')
    expect(rehydrated.combatants[3].hp_current).toBeNull()
    expect(rehydrated.combatants[3].name).toBe('Frodo')
  })
})

describe('combatantFromMonster', () => {
  it('assigns a fresh clientId each call', () => {
    const rat = monster({ id: 1, name: 'Rat', ac: { value: 11, note: null, alternatives: [] }, hp: { average: 4, formula: null } })
    const a = combatantFromMonster(rat)
    const b = combatantFromMonster(rat)
    expect(a.clientId).not.toBe(b.clientId)
  })
})

describe('addPlayer', () => {
  it('appends a player combatant with null HP and kind player', () => {
    const state = hydrated()
    const next = encounterRunnerReducer(state, { type: 'addPlayer', name: 'Aragorn', conditions: ['prone'] })
    expect(next.combatants).toHaveLength(4)
    const player = next.combatants[3]
    expect(player.name).toBe('Aragorn')
    expect(player.kind).toBe('player')
    expect(player.hp_current).toBeNull()
    expect(player.hp_max).toBeNull()
    expect(player.ac).toBeNull()
    expect(player.monster_id).toBeNull()
    expect(player.conditions).toEqual(['prone'])
    expect(player.status).toBe('alive')
  })

  it('preserves existing combatant order', () => {
    const state = hydrated()
    const [a, b, c] = state.combatants
    const next = encounterRunnerReducer(state, { type: 'addPlayer', name: 'Legolas' })
    expect(next.combatants.map((x) => x.clientId)).toEqual([
      a.clientId, b.clientId, c.clientId, next.combatants[3].clientId,
    ])
  })

  it('defaults conditions to empty array', () => {
    const state = hydrated()
    const next = encounterRunnerReducer(state, { type: 'addPlayer', name: 'Gimli' })
    expect(next.combatants[3].conditions).toEqual([])
  })
})

describe('combatantFromPlayer', () => {
  it('returns a combatant with kind player and null HP/AC', () => {
    const player = combatantFromPlayer('Gandalf', ['stunned'])
    expect(player.kind).toBe('player')
    expect(player.hp_current).toBeNull()
    expect(player.hp_max).toBeNull()
    expect(player.ac).toBeNull()
    expect(player.monster_id).toBeNull()
    expect(player.original_name).toBe('Gandalf')
    expect(player.name).toBe('Gandalf')
    expect(player.status).toBe('alive')
    expect(player.conditions).toEqual(['stunned'])
    expect(player.clientId).toBeTruthy()
  })

  it('defaults conditions to empty when not provided', () => {
    const player = combatantFromPlayer('Frodo')
    expect(player.conditions).toEqual([])
  })

  it('assigns a fresh clientId each call', () => {
    const a = combatantFromPlayer('Boromir')
    const b = combatantFromPlayer('Aragorn')
    expect(a.clientId).not.toBe(b.clientId)
  })
})
