import { describe, expect, it } from 'vitest'
import type { Spell } from '../../../api/types'
import { emptySpellForm, formStateToSpellInput, spellToFormState } from '../spellForm'
import { targetSpell } from './spellFixtures'

const baseSpell: Spell = {
  ...targetSpell,
  name: 'Acid Splash',
  level: 0,
  school: 'conjuration',
  description: 'You hurl a bubble of acid.',
  damage: [{ name: 'primary', formula: '1d6', damage_types: ['acid'] }],
  attacks: [{ kind: null, saving_throws: ['dex'] }],
  area_of_effect: { shape: 'multiple targets', size: null },
  higher_levels: { text: 'The damage increases.', damage_by_slot: { '2': '2d6' } },
}

describe('spellToFormState', () => {
  it('flattens structured damage/attack rows for editing', () => {
    const form = spellToFormState(baseSpell)
    expect(form.name).toBe('Acid Splash')
    expect(form.damageRows).toHaveLength(1)
    expect(form.damageRows[0].formula).toBe('1d6')
    expect(form.damageRows[0].damageTypes).toEqual(['acid'])
    expect(form.attackRows).toHaveLength(1)
    expect(form.attackRows[0].savingThrows).toEqual(['dex'])
    expect(form.areaShape).toBe('multiple targets')
    expect(form.higherLevelDamageBySlot).toEqual({ '2': '2d6' })
    expect(form.components).toEqual(['V', 'S'])
  })

  it('handles a spell with no structured fields', () => {
    const form = spellToFormState({
      ...baseSpell,
      damage: [],
      attacks: [],
      area_of_effect: { shape: null, size: null },
      healing: { amount: null, temp_hp: false, max_hp: false },
    })
    expect(form.damageRows).toEqual([])
    expect(form.attackRows).toEqual([])
    expect(form.areaShape).toBe('')
    expect(form.healingAmount).toBe('')
  })
})

describe('formStateToSpellInput', () => {
  it('round-trips a full spell form back into API-shaped input', () => {
    const form = spellToFormState(baseSpell)
    const input = formStateToSpellInput(form)

    expect(input.name).toBe('Acid Splash')
    expect(input.damage).toEqual([{ name: 'primary', formula: '1d6', damage_types: ['acid'] }])
    expect(input.attacks).toEqual([{ kind: null, saving_throws: ['dex'] }])
    expect(input.area_of_effect).toEqual({ shape: 'multiple targets', size: null })
    expect(input.higher_levels).toEqual({ text: 'The damage increases.', damage_by_slot: { '2': '2d6' } })
  })

  it('omits empty structured sections', () => {
    const input = formStateToSpellInput(emptySpellForm())
    expect(input.damage).toEqual([])
    expect(input.attacks).toEqual([])
    expect(input.area_of_effect).toEqual({ shape: null, size: null })
    expect(input.healing).toEqual({ amount: null, temp_hp: false, max_hp: false })
    expect(input.name).toBe('New Spell')
  })

  it('serializes heal fields when an amount is set', () => {
    const form = emptySpellForm()
    form.healingAmount = '1d8+3'
    form.healingTempHp = true
    const input = formStateToSpellInput(form)
    expect(input.healing).toEqual({ amount: '1d8+3', temp_hp: true, max_hp: false })
  })
})
