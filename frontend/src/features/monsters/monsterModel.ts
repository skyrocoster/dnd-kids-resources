import type { Monster } from '../../api/types'

export interface AbilityScore {
  key: string
  score: number
  modifier: number
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  if (mod < 0) return `−${Math.abs(mod)}`
  return `+${mod}`
}

export function getAbilityScores(monster: Monster): AbilityScore[] {
  if (!monster.abilities) return []
  return ABILITY_KEYS
    .map((key) => {
      const score = monster.abilities![key]
      if (score === null || score === undefined) return null
      return { key: key.toUpperCase(), score, modifier: abilityModifier(score) }
    })
    .filter((entry): entry is AbilityScore => entry !== null)
}

/** Format a modifier value from a skill/save entry into signed string. */
function signedBonus(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

export function formatAc(monster: Monster): string | null {
  const ac = monster.ac
  if (!ac) return null
  return ac.note ? `${ac.value} (${ac.note})` : String(ac.value)
}

export function formatHp(monster: Monster): string | null {
  const hp = monster.hp
  if (!hp) return null
  return hp.formula ? `${hp.average} (${hp.formula})` : String(hp.average)
}

export function formatSpeed(monster: Monster): string | null {
  if (!monster.speed.length) return null
  return monster.speed
    .map((entry) => {
      const base = entry.mode === 'walk' ? `${entry.feet} ft.` : `${entry.mode} ${entry.feet} ft.`
      const hover = entry.hover ? ' (hover)' : ''
      return entry.note ? `${base}${hover} (${entry.note})` : `${base}${hover}`
    })
    .join(', ')
}

export function formatSenses(monster: Monster): string | null {
  const parts: string[] = []
  if (monster.senses.length) {
    parts.push(...monster.senses.map((s) => {
      const note = s.note ? ` (${s.note})` : ''
      return `${s.type} ${s.range} ft.${note}`
    }))
  }
  if (monster.passive_perception != null) {
    parts.push(`passive Perception ${monster.passive_perception}`)
  }
  return parts.length ? parts.join(', ') : null
}

export function formatDamageList(modifiers: Monster['damage_resistances']): string | null {
  if (!modifiers.length) return null
  return modifiers
    .map((d) => {
      const note = d.note ? ` (${d.note})` : ''
      return `${d.damage_type}${note}`
    })
    .join(', ')
}

export function formatCr(monster: Monster): string | null {
  if (!monster.cr) return null
  const note = monster.cr_note ? ` (${monster.cr_note})` : ''
  return `CR ${monster.cr}${note}`
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

export interface DictEntry {
  label: string
  value: string
}

export function formatSavingThrows(monster: Monster): DictEntry[] {
  return Object.entries(monster.saving_throws)
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({ label: humanizeKey(key), value: signedBonus(value) }))
}

export function formatSkills(monster: Monster): DictEntry[] {
  return Object.entries(monster.skills)
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({ label: humanizeKey(key), value: signedBonus(value) }))
}

/** Describe a feature as display text (name + prose). */
export function describeFeature(feature: { name: string; description: string | null; attack: unknown }): string {
  if (!feature.description) return feature.name
  return `${feature.name}: ${feature.description}`
}

/** Identity line: "Medium humanoid, chaotic evil" or null. */
export function identityLine(monster: Monster): string | null {
  const parts: string[] = []
  if (monster.sizes.length) parts.push(monster.sizes.join(' or '))
  if (monster.creature_type) parts.push(monster.creature_type.category)
  if (monster.alignment) parts.push(monster.alignment)
  return parts.length ? parts.join(', ') : null
}
