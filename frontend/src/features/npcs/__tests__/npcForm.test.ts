import { describe, expect, it } from 'vitest'
import type { NPC } from '../../../api/types'
import { emptyNPCForm, formStateToNPCInput, npcToFormState } from '../npcForm'

const baseNPC: NPC = {
  id: 1,
  name: 'Emery Hart',
  race: 'Human',
  gender: 'Male',
  background: 'Village Guard',
  size: 'Medium',
  stats: { strength: 14, dexterity: 12 },
  armor_class: 16,
  hit_points: 22,
  speed: '30',
  saving_throws: { strength: 2 },
  skills: { athletics: 4 },
  senses: [{ type: 'darkvision', range: 60 }],
  languages: 'Common',
  appearance: { hair_colour: 'black' },
  notes: 'Duty-bound.',
}

describe('npcToFormState', () => {
  it('flattens dict/list columns into editable text blocks', () => {
    const form = npcToFormState(baseNPC)
    expect(form.name).toBe('Emery Hart')
    expect(form.statsText).toContain('strength: 14')
    expect(form.sensesText).toBe('darkvision: 60')
    expect(form.appearanceText).toBe('hair_colour: black')
  })
})

describe('formStateToNPCInput', () => {
  it('round-trips a full NPC form back into API-shaped input', () => {
    const input = formStateToNPCInput(npcToFormState(baseNPC))
    expect(input.name).toBe('Emery Hart')
    expect(input.stats).toEqual({ strength: 14, dexterity: 12 })
    expect(input.senses).toEqual([{ type: 'darkvision', range: 60 }])
    expect(input.armor_class).toBe(16)
  })

  it('nulls out empty structured fields for a blank form', () => {
    const input = formStateToNPCInput(emptyNPCForm())
    expect(input.stats).toBeNull()
    expect(input.senses).toBeNull()
    expect(input.armor_class).toBeNull()
  })
})
