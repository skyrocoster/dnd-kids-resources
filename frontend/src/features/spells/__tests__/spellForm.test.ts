import { describe, expect, it } from 'vitest'
import type { Spell } from '../../../api/types'
import { emptySpellForm, formStateToSpellInput, spellToFormState } from '../spellForm'

const baseSpell: Spell = {
  id: 1,
  spell_name: 'Acid Splash',
  icon: '✨',
  level: '0',
  school: 'conjuration',
  spell_text: 'You hurl a bubble of acid.',
  spell_alt_text: null,
  damage: [{ name: 'primary', damage: '1d6', type: ['acid'] }],
  heal: null,
  heal_at_spell_slots: null,
  range: '60 feet',
  higher_levels: null,
  damage_at_higher_levels: null,
  casting_time: '1 action',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  components: ['V', 'S'],
  materials: null,
  attack_type: [{ name: 'initial', type: '', save: ['dex'] }],
  area_of_effect: { 'multiple targets': null },
  action: null,
  classes: ['Wizard', 'Sorcerer'],
  subclasses: null,
}

describe('spellToFormState', () => {
  it('flattens structured damage/attack rows for editing', () => {
    const form = spellToFormState(baseSpell)
    expect(form.spell_name).toBe('Acid Splash')
    expect(form.damageRows).toHaveLength(1)
    expect(form.damageRows[0].damage).toBe('1d6')
    expect(form.damageRows[0].type).toEqual(['acid'])
    expect(form.attackRows).toHaveLength(1)
    expect(form.attackRows[0].save).toEqual(['dex'])
    expect(form.areaShape).toBe('multiple targets')
    expect(form.classes).toEqual(['Wizard', 'Sorcerer'])
    expect(form.components).toEqual(['V', 'S'])
  })

  it('handles a spell with no structured fields', () => {
    const form = spellToFormState({ ...baseSpell, damage: null, attack_type: null, area_of_effect: null, heal: null })
    expect(form.damageRows).toEqual([])
    expect(form.attackRows).toEqual([])
    expect(form.areaShape).toBe('')
    expect(form.healAmount).toBe('')
  })
})

describe('formStateToSpellInput', () => {
  it('round-trips a full spell form back into API-shaped input', () => {
    const form = spellToFormState(baseSpell)
    const input = formStateToSpellInput(form)

    expect(input.spell_name).toBe('Acid Splash')
    expect(input.damage).toEqual([{ name: 'primary', damage: '1d6', type: 'acid' }])
    expect(input.attack_type).toEqual([{ name: 'initial', type: '', save: 'dex' }])
    expect(input.area_of_effect).toEqual({ 'multiple targets': null })
    expect(input.classes).toEqual(['Wizard', 'Sorcerer'])
  })

  it('omits empty structured sections', () => {
    const input = formStateToSpellInput(emptySpellForm())
    expect(input.damage).toBeNull()
    expect(input.attack_type).toBeNull()
    expect(input.area_of_effect).toBeNull()
    expect(input.heal).toBeNull()
    expect(input.spell_name).toBe('New Spell')
  })

  it('serializes heal fields when an amount is set', () => {
    const form = emptySpellForm()
    form.healAmount = '1d8+3'
    form.healTempHp = true
    const input = formStateToSpellInput(form)
    expect(input.heal).toEqual({ amount: '1d8+3', temp_hp: true, max_hp: false })
  })
})
