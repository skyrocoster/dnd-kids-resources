import { describe, expect, it } from 'vitest'
import type { NPC } from '../../../api/types'
import { emptyNPCForm, formStateToNPCInput, npcToFormState } from '../npcForm'

const baseNPC: NPC = {
  id: 1,
  name: 'Emery Hart',
  race: 'Human',
  gender: 'Male',
  background: 'Village Guard',
  sizes: ['medium'],
  alignment: 'lawful good',
  creature_type: { category: 'humanoid', tags: ['human'], swarm_size: null },
  ac: { value: 16, note: 'chain shirt', alternatives: [{ value: 18, note: 'with shield' }] },
  hp: { average: 22, formula: '4d8+4' },
  speed: [
    { mode: 'walk', feet: 30, note: 'armored', hover: false },
    { mode: 'climb', feet: 15, note: 'ladder drills', hover: false },
  ],
  abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
  saving_throws: { str: 2, con: 1 },
  skills: { athletics: 4 },
  passive_perception: 13,
  damage_resistances: [{ damage_type: 'poison', note: 'training', conditional: true }],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: ['frightened'],
  senses: [{ type: 'darkvision', range: 60, note: 'borrowed goggles' }],
  languages: ['Common'],
  features: {
    traits: [{ name: 'Guarded', description: 'Keeps watch.', attack: null }],
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
  cr: '1/4',
  cr_note: 'ally',
  experience_points: 50,
  appearance: { hair_colour: 'black' },
  notes: 'Duty-bound.',
}

describe('npcToFormState', () => {
  it('flattens structured wire fields into the existing editable controls', () => {
    const form = npcToFormState(baseNPC)
    expect(form.name).toBe('Emery Hart')
    expect(form.size).toBe('medium')
    expect(form.armorClass).toBe('16')
    expect(form.hitPoints).toBe('22')
    expect(form.speed).toBe('30')
    expect(form.languages).toBe('Common')
    expect(form.statsText).toContain('strength: 14')
    expect(form.savingThrowsText).toContain('strength: 2')
    expect(form.skillsText).toContain('passive_perception: 13')
    expect(form.sensesText).toBe('darkvision: 60')
    expect(form.appearanceText).toBe('hair_colour: black')
  })
})

describe('formStateToNPCInput', () => {
  it('round-trips a full NPC form back into structured API-shaped input', () => {
    const input = formStateToNPCInput(npcToFormState(baseNPC), baseNPC)
    expect(input.name).toBe('Emery Hart')
    expect(input.sizes).toEqual(['medium'])
    expect(input.ac).toEqual({ value: 16, note: 'chain shirt', alternatives: [{ value: 18, note: 'with shield' }] })
    expect(input.hp).toEqual({ average: 22, formula: '4d8+4' })
    expect(input.speed).toEqual([
      { mode: 'walk', feet: 30, note: 'armored', hover: false },
      { mode: 'climb', feet: 15, note: 'ladder drills', hover: false },
    ])
    expect(input.abilities).toEqual({ str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 })
    expect(input.saving_throws).toEqual({ str: 2, con: 1 })
    expect(input.skills).toEqual({ athletics: 4 })
    expect(input.passive_perception).toBe(13)
    expect(input.senses).toEqual([{ type: 'darkvision', range: 60, note: 'borrowed goggles' }])
    expect(input.languages).toEqual(['Common'])
    expect(input.damage_resistances).toEqual(baseNPC.damage_resistances)
    expect(input.condition_immunities).toEqual(['frightened'])
    expect(input.features).toEqual(baseNPC.features)
    expect(input.cr).toBe('1/4')
    expect(input.experience_points).toBe(50)
    expect(input).not.toHaveProperty('size')
    expect(input).not.toHaveProperty('stats')
    expect(input).not.toHaveProperty('armor_class')
    expect(input).not.toHaveProperty('hit_points')
  })

  it('emits valid empty/null structured defaults for a blank create form', () => {
    const input = formStateToNPCInput(emptyNPCForm())
    expect(input.sizes).toEqual([])
    expect(input.alignment).toBeNull()
    expect(input.creature_type).toBeNull()
    expect(input.ac).toBeNull()
    expect(input.hp).toBeNull()
    expect(input.speed).toEqual([])
    expect(input.abilities).toBeNull()
    expect(input.saving_throws).toEqual({})
    expect(input.skills).toEqual({})
    expect(input.passive_perception).toBeNull()
    expect(input.damage_resistances).toEqual([])
    expect(input.condition_immunities).toEqual([])
    expect(input.senses).toEqual([])
    expect(input.languages).toEqual([])
    expect(input.features?.actions).toEqual([])
    expect(input.cr).toBeNull()
    expect(input.experience_points).toBeNull()
    expect(input.appearance).toBeNull()
    expect(input).not.toHaveProperty('size')
  })

  it('recognizes size and ability labels case-insensitively', () => {
    const form = emptyNPCForm()
    form.size = 'Medium'
    form.statsText = 'Strength: 15\nDEXTERITY: 13'
    form.savingThrowsText = 'Constitution: 4\nwis: 2'
    const input = formStateToNPCInput(form)
    expect(input.sizes).toEqual(['medium'])
    expect(input.abilities).toMatchObject({ str: 15, dex: 13 })
    expect(input.saving_throws).toEqual({ con: 4, wis: 2 })
  })

  it('preserves unexposed statblock data and non-walk movement when editing', () => {
    const form = npcToFormState(baseNPC)
    form.armorClass = '17'
    form.speed = '35'
    form.languages = 'Common, Dwarvish'
    const input = formStateToNPCInput(form, baseNPC)
    expect(input.ac).toEqual({ value: 17, note: 'chain shirt', alternatives: [{ value: 18, note: 'with shield' }] })
    expect(input.speed).toEqual([
      { mode: 'walk', feet: 35, note: 'armored', hover: false },
      { mode: 'climb', feet: 15, note: 'ladder drills', hover: false },
    ])
    expect(input.languages).toEqual(['Common', 'Dwarvish'])
    expect(input.creature_type).toEqual(baseNPC.creature_type)
    expect(input.damage_resistances).toEqual(baseNPC.damage_resistances)
    expect(input.features).toEqual(baseNPC.features)
  })
})
