import type { Spell, SpellInput } from '../../api/types'

let rowIdCounter = 0
export function nextRowId(): string {
  rowIdCounter += 1
  return `row-${rowIdCounter}`
}

export interface AttackRow {
  id: string
  name: string
  type: string
  save: string[]
}

export interface DamageRow {
  id: string
  name: string
  damage: string
  type: string[]
}

export interface SpellFormState {
  spell_name: string
  icon: string
  level: string
  school: string
  casting_time: string
  duration: string
  range: string
  action: string
  concentration: boolean
  ritual: boolean
  materials: string
  spell_text: string
  spell_alt_text: string
  higher_levels: string
  heal_at_spell_slots: string
  damage_at_higher_levels: string
  classes: string[]
  subclasses: string
  components: string[]
  areaShape: string
  areaSize: string
  attackRows: AttackRow[]
  damageRows: DamageRow[]
  healAmount: string
  healTempHp: boolean
  healMaxHp: boolean
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  return []
}

function jsonToText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function emptySpellForm(): SpellFormState {
  return {
    spell_name: '',
    icon: '✨',
    level: '0',
    school: '',
    casting_time: '',
    duration: '',
    range: '',
    action: '',
    concentration: false,
    ritual: false,
    materials: '',
    spell_text: '',
    spell_alt_text: '',
    higher_levels: '',
    heal_at_spell_slots: '',
    damage_at_higher_levels: '',
    classes: [],
    subclasses: '',
    components: [],
    areaShape: '',
    areaSize: '',
    attackRows: [],
    damageRows: [],
    healAmount: '',
    healTempHp: false,
    healMaxHp: false,
  }
}

export function spellToFormState(spell: Spell): SpellFormState {
  const areaEntries = spell.area_of_effect ? Object.entries(spell.area_of_effect) : []
  const [areaShape, areaSizeRaw] = areaEntries[0] || ['', '']

  const attackTypeEntries: Array<{ name?: string; type?: string; save?: string[] | string }> = Array.isArray(
    spell.attack_type,
  )
    ? (spell.attack_type as unknown as Array<{ name?: string; type?: string; save?: string[] | string }>)
    : spell.attack_type && typeof spell.attack_type === 'object'
      ? [spell.attack_type as { name?: string; type?: string; save?: string[] | string }]
      : []

  const damageEntries: Array<{ name?: string; damage?: string; type?: string[] | string }> = Array.isArray(
    spell.damage,
  )
    ? (spell.damage as unknown as Array<{ name?: string; damage?: string; type?: string[] | string }>)
    : spell.damage && typeof spell.damage === 'object'
      ? [spell.damage as { name?: string; damage?: string; type?: string[] | string }]
      : []

  const healEntry = Array.isArray(spell.heal)
    ? (spell.heal as unknown[])[0]
    : spell.heal && typeof spell.heal === 'object'
      ? spell.heal
      : null
  const heal = (healEntry || {}) as { amount?: string; temp_hp?: boolean; max_hp?: boolean }

  return {
    spell_name: spell.spell_name || '',
    icon: spell.icon || '',
    level: spell.level || '0',
    school: spell.school || '',
    casting_time: spell.casting_time || '',
    duration: spell.duration || '',
    range: spell.range || '',
    action: spell.action || '',
    concentration: Boolean(spell.concentration),
    ritual: Boolean(spell.ritual),
    materials: spell.materials || '',
    spell_text: spell.spell_text || '',
    spell_alt_text: spell.spell_alt_text || '',
    higher_levels: spell.higher_levels || '',
    heal_at_spell_slots: jsonToText(spell.heal_at_spell_slots),
    damage_at_higher_levels: jsonToText(spell.damage_at_higher_levels),
    classes: asStringArray(spell.classes),
    subclasses: asStringArray(spell.subclasses).join(', '),
    components: asStringArray(spell.components),
    areaShape: areaShape || '',
    areaSize: areaSizeRaw == null ? '' : String(areaSizeRaw),
    attackRows: attackTypeEntries.map((entry) => ({
      id: nextRowId(),
      name: entry.name || '',
      type: entry.type || '',
      save: asStringArray(entry.save) .length ? asStringArray(entry.save) : entry.save ? [String(entry.save)] : [],
    })),
    damageRows: damageEntries.map((entry) => ({
      id: nextRowId(),
      name: entry.name || '',
      damage: entry.damage || '',
      type: asStringArray(entry.type).length ? asStringArray(entry.type) : entry.type ? [String(entry.type)] : [],
    })),
    healAmount: heal.amount || '',
    healTempHp: Boolean(heal.temp_hp),
    healMaxHp: Boolean(heal.max_hp),
  }
}

export function formStateToSpellInput(form: SpellFormState): SpellInput {
  const subclasses = form.subclasses
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const area_of_effect = form.areaShape.trim()
    ? { [form.areaShape.trim()]: form.areaSize.trim() ? form.areaSize.trim() : null }
    : null

  const attack_type = form.attackRows.length
    ? form.attackRows.map((row) => ({
        name: row.name,
        type: row.type,
        ...(row.save.length ? { save: row.save.length === 1 ? row.save[0] : row.save } : {}),
      }))
    : null

  const damage = form.damageRows.length
    ? form.damageRows.map((row) => ({
        name: row.name,
        damage: row.damage,
        ...(row.type.length ? { type: row.type.length === 1 ? row.type[0] : row.type } : {}),
      }))
    : null

  const heal = form.healAmount
    ? { amount: form.healAmount, temp_hp: form.healTempHp, max_hp: form.healMaxHp }
    : null

  return {
    spell_name: form.spell_name || 'New Spell',
    icon: form.icon || null,
    level: form.level || null,
    school: form.school || null,
    spell_text: form.spell_text || null,
    spell_alt_text: form.spell_alt_text || null,
    damage,
    heal,
    heal_at_spell_slots: parseOrNull(form.heal_at_spell_slots),
    range: form.range || null,
    higher_levels: form.higher_levels || null,
    damage_at_higher_levels: form.damage_at_higher_levels || null,
    casting_time: form.casting_time || null,
    duration: form.duration || null,
    concentration: form.concentration,
    ritual: form.ritual,
    components: form.components.length ? form.components : null,
    materials: form.materials || null,
    attack_type: attack_type as unknown as SpellInput['attack_type'],
    area_of_effect,
    action: form.action || null,
    classes: form.classes.length ? form.classes : null,
    subclasses: subclasses.length ? subclasses : null,
  }
}

function parseOrNull(text: string): Record<string, unknown> | null {
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
