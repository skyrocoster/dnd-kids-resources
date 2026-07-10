import { describe, expect, it } from 'vitest'
import type { Weapon } from '../../../api/types'
import { emptyWeaponForm, formStateToWeaponInput, weaponToFormState } from '../weaponForm'

const baseWeapon: Weapon = {
  id: 1,
  name: 'Longsword',
  base_weapon: 'Longsword',
  rarity: null,
  weapon_category: 'martial',
  weight: 3,
  req_attune: null,
  property: ['V'],
  focus: [],
  attack: [{ type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 }],
  entries: ['A sturdy blade.'],
}

describe('weaponToFormState', () => {
  it('flattens attack rows and entries for editing', () => {
    const form = weaponToFormState(baseWeapon)
    expect(form.name).toBe('Longsword')
    expect(form.attackRows).toHaveLength(1)
    expect(form.attackRows[0].damage).toBe('1d8')
    expect(form.attackRows[0].hands).toBe('1')
    expect(form.entries).toBe('A sturdy blade.')
    expect(form.weight).toBe('3')
  })
})

describe('formStateToWeaponInput', () => {
  it('round-trips a weapon form back into API-shaped input', () => {
    const form = weaponToFormState(baseWeapon)
    const input = formStateToWeaponInput(form)
    expect(input.name).toBe('Longsword')
    expect(input.attack).toEqual([{ type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 }])
    expect(input.entries).toEqual(['A sturdy blade.'])
    expect(input.weight).toBe(3)
  })

  it('omits empty structured sections for a blank form', () => {
    const input = formStateToWeaponInput(emptyWeaponForm())
    expect(input.attack).toBeNull()
    expect(input.entries).toBeNull()
    expect(input.property).toBeNull()
    expect(input.weight).toBeNull()
  })
})
