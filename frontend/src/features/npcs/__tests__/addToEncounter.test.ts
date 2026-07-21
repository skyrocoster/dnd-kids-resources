import { describe, expect, it } from 'vitest'
import type { Encounter, EncounterCreature, NPC } from '../../../api/types'
import { combatantFromNpc, appendCreatureToEncounter } from '../addToEncounter'

function npc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 7,
    name: 'Emery Hart',
    ...overrides,
  }
}

describe('combatantFromNpc', () => {
  it('derives hp/ac from a statted NPC and sets source_kind to npc', () => {
    const n = npc({
      hp: { average: 27, formula: '5d8 + 5' },
      ac: { value: 15, note: 'leather armour', alternatives: [] },
    })
    const result = combatantFromNpc(n)
    expect(result.creature_id).toBe(7)
    expect(result.source_kind).toBe('npc')
    expect(result.original_name).toBe('Emery Hart')
    expect(result.name).toBe('Emery Hart')
    expect(result.hp_current).toBe(27)
    expect(result.hp_max).toBe(27)
    expect(result.ac).toBe(15)
    expect(result.status).toBe('alive')
    expect(result.conditions).toEqual([])
  })

  it('produces null hp/ac for a statless NPC', () => {
    const n = npc({ hp: null, ac: null })
    const result = combatantFromNpc(n)
    expect(result.hp_current).toBeNull()
    expect(result.hp_max).toBeNull()
    expect(result.ac).toBeNull()
  })
})

describe('appendCreatureToEncounter', () => {
  it('appends a creature to an existing creatures array', () => {
    const existing: EncounterCreature = {
      creature_id: 1,
      source_kind: 'monster',
      original_name: 'Goblin',
      name: 'Goblin',
      hp_current: 7,
      hp_max: 7,
      ac: 15,
      status: 'alive',
      conditions: [],
    }
    const encounter: Encounter = {
      id: 1,
      title: 'Test Encounter',
      creatures: [existing],
      active_index: 0,
    }
    const npcCreature = combatantFromNpc(npc())
    const result = appendCreatureToEncounter(encounter, npcCreature)
    expect(result.title).toBe('Test Encounter')
    expect(result.creatures).toHaveLength(2)
    expect(result.creatures![0]).toEqual(existing)
    expect(result.creatures![1]).toEqual(npcCreature)
    expect(result.active_index).toBe(0)
  })

  it('handles creatures: null', () => {
    const encounter: Encounter = {
      id: 2,
      title: 'Empty',
      creatures: null,
      active_index: null,
    }
    const npcCreature = combatantFromNpc(npc({ id: 8, name: 'Soren' }))
    const result = appendCreatureToEncounter(encounter, npcCreature)
    expect(result.creatures).toHaveLength(1)
    expect(result.creatures![0].creature_id).toBe(8)
    expect(result.active_index).toBeNull()
  })
})
