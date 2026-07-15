import type { Spell } from '../../../api/types'

export const targetSpell: Spell = {
  id: 1,
  name: 'Plant Growth',
  level: 3,
  school: 'transmutation',
  description: 'Plants in the area grow vigorously.',
  alternate_description: null,
  damage: [],
  healing: { amount: null, temp_hp: false, max_hp: false },
  range: '150 feet',
  higher_levels: { text: null, damage_by_slot: {} },
  casting_times: ['1 action', '8 hours'],
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  components: ['V', 'S'],
  materials: null,
  attacks: [],
  area_of_effect: { shape: 'cylinder', size: 100 },
}

export const targetSpells: Spell[] = [targetSpell]
