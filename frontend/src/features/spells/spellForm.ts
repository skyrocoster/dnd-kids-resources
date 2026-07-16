import type { Spell, SpellInput } from '../../api/types'

let rowIdCounter = 0
export function nextRowId(): string {
  rowIdCounter += 1
  return `row-${rowIdCounter}`
}

export interface AttackRow {
  id: string
  kind: '' | 'melee' | 'ranged'
  savingThrows: string[]
}

export interface DamageRow {
  id: string
  name: string
  formula: string
  damageTypes: string[]
}

export interface SpellFormState {
  name: string
  level: string
  school: string
  castingTimes: string
  duration: string
  range: string
  concentration: boolean
  ritual: boolean
  materials: string
  description: string
  alternateDescription: string
  higherLevelsText: string
  higherLevelDamageBySlot: Record<string, string>
  areaShape: string
  areaSize: string
  attackRows: AttackRow[]
  damageRows: DamageRow[]
  healingAmount: string
  healingTempHp: boolean
  healingMaxHp: boolean
  components: string[]
}

export function emptySpellForm(): SpellFormState {
  return {
    name: '',
    level: '0',
    school: '',
    castingTimes: '',
    duration: '',
    range: '',
    concentration: false,
    ritual: false,
    materials: '',
    description: '',
    alternateDescription: '',
    higherLevelsText: '',
    higherLevelDamageBySlot: {},
    areaShape: '',
    areaSize: '',
    attackRows: [],
    damageRows: [],
    healingAmount: '',
    healingTempHp: false,
    healingMaxHp: false,
    components: [],
  }
}

export function spellToFormState(spell: Spell): SpellFormState {
  return {
    name: spell.name,
    level: String(spell.level),
    school: spell.school || '',
    castingTimes: spell.casting_times.join('\n'),
    duration: spell.duration,
    range: spell.range,
    concentration: spell.concentration,
    ritual: spell.ritual,
    materials: spell.materials || '',
    description: spell.description,
    alternateDescription: spell.alternate_description || '',
    higherLevelsText: spell.higher_levels.text || '',
    higherLevelDamageBySlot: spell.higher_levels.damage_by_slot,
    areaShape: spell.area_of_effect.shape || '',
    areaSize: spell.area_of_effect.size == null ? '' : String(spell.area_of_effect.size),
    attackRows: spell.attacks.map((attack) => ({
      id: nextRowId(),
      kind: attack.kind || '',
      savingThrows: attack.saving_throws,
    })),
    damageRows: spell.damage.map((damage) => ({
      id: nextRowId(),
      name: damage.name,
      formula: damage.formula,
      damageTypes: damage.damage_types,
    })),
    healingAmount: spell.healing.amount || '',
    healingTempHp: spell.healing.temp_hp,
    healingMaxHp: spell.healing.max_hp,
    components: spell.components,
  }
}

export function formStateToSpellInput(form: SpellFormState): SpellInput {
  const size = Number.parseInt(form.areaSize, 10)

  return {
    name: form.name || 'New Spell',
    level: Number.parseInt(form.level, 10) || 0,
    school: form.school || null,
    description: form.description,
    alternate_description: form.alternateDescription || null,
    damage: form.damageRows.map(({ name, formula, damageTypes }) => ({
      name,
      formula,
      damage_types: damageTypes,
    })),
    healing: {
      amount: form.healingAmount || null,
      temp_hp: form.healingTempHp,
      max_hp: form.healingMaxHp,
    },
    range: form.range,
    higher_levels: { text: form.higherLevelsText || null, damage_by_slot: form.higherLevelDamageBySlot },
    casting_times: form.castingTimes
      .split('\n')
      .map((time) => time.trim())
      .filter(Boolean),
    duration: form.duration,
    concentration: form.concentration,
    ritual: form.ritual,
    components: form.components,
    materials: form.materials || null,
    attacks: form.attackRows.map(({ kind, savingThrows }) => ({ kind: kind || null, saving_throws: savingThrows })),
    area_of_effect: {
      shape: form.areaShape || null,
      size: Number.isNaN(size) ? null : size,
    },
  }
}
