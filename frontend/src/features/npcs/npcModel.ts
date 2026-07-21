/* Headless formatting helpers for NPC dossier rendering.
 * Pure functions only - no UI, no fetching. NPC appearance is a messy
 * human-authored dict (see api/types.ts); every helper here degrades
 * gracefully on missing/absent fields rather than assuming a fixed shape.
 */
import type { Monster, MonsterFeatures, MovementSpeed, NPC, Sense } from '../../api/types'

export interface AbilityScore {
  key: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'
  label: string
  score: number
  modifier: number
}

interface AbilityDef {
  key: AbilityScore['key']
  label: string
  field: keyof NonNullable<NPC['abilities']>
}

const ABILITY_DEFS: AbilityDef[] = [
  { key: 'STR', label: 'Strength', field: 'str' },
  { key: 'DEX', label: 'Dexterity', field: 'dex' },
  { key: 'CON', label: 'Constitution', field: 'con' },
  { key: 'INT', label: 'Intelligence', field: 'int' },
  { key: 'WIS', label: 'Wisdom', field: 'wis' },
  { key: 'CHA', label: 'Charisma', field: 'cha' },
]

/** D&D ability modifier: floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Signed modifier string with a real minus glyph (U+2212), e.g. "+2" / "−1" / "+0". */
export function formatModifier(mod: number): string {
  if (mod < 0) return `−${Math.abs(mod)}`
  return `+${mod}`
}

/** STR->CHA order from structured ability fields; skips missing abilities. */
export function getAbilityScores(npc: NPC): AbilityScore[] {
  const abilities = npc.abilities
  if (!abilities) return []

  const scores: AbilityScore[] = []
  for (const def of ABILITY_DEFS) {
    const raw = abilities[def.field]
    const score = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (!Number.isFinite(score)) continue
    scores.push({ key: def.key, label: def.label, score, modifier: abilityModifier(score) })
  }
  return scores
}

export function formatMovementSpeed(speed: MovementSpeed): string | null {
  if (!Number.isFinite(speed.feet)) return null

  const mode = speed.mode === 'walk' ? '' : `${speed.mode} `
  const noteParts = [speed.hover ? 'hover' : null, speed.note].filter(
    (part): part is string => part != null && part.trim() !== '',
  )
  const note = noteParts.length > 0 ? ` (${noteParts.join(', ')})` : ''
  return `${mode}${speed.feet} ft.${note}`
}

export function formatMovementSpeeds(speeds: MovementSpeed[] | null | undefined): string | null {
  const entries = speeds?.map(formatMovementSpeed).filter((entry): entry is string => entry != null) ?? []
  return entries.length > 0 ? entries.join(', ') : null
}

export function formatSense(sense: Sense): string | null {
  const type = sense.type.trim()
  const range = Number.isFinite(sense.range) ? `${sense.range} ft.` : ''
  const note = sense.note && sense.note.trim() !== '' ? ` (${sense.note})` : ''
  const entry = `${type} ${range}`.trim()
  return entry !== '' ? `${entry}${note}` : null
}

export function formatSenses(senses: Sense[] | null | undefined): string[] {
  return senses?.map(formatSense).filter((entry): entry is string => entry != null) ?? []
}

const APPEARANCE_PHRASES: Record<string, (value: string) => string> = {
  hair_colour: (v) => `${v} hair`,
  hair: (v) => `${v} hair`,
  eye_colour: (v) => `${v} eyes`,
  eyes: (v) => `${v} eyes`,
  skin_tone: (v) => `${v} skin`,
  skin: (v) => `${v} skin`,
  clothing: (v) => `wearing ${v}`,
  distinguishing_features: (v) => v,
}

const APPEARANCE_ORDER = ['hair_colour', 'hair', 'eye_colour', 'eyes', 'skin_tone', 'skin', 'distinguishing_features', 'clothing']

/** Compose an appearance dict into one readable sentence ("Brown hair, green eyes, a burn scar..."); null when empty. */
export function composeAppearance(appearance: Record<string, unknown> | null | undefined): string | null {
  if (!appearance || typeof appearance !== 'object') return null

  const entries = Object.entries(appearance).filter(([, value]) => value != null && String(value).trim() !== '')
  if (entries.length === 0) return null

  const used = new Set<string>()
  const phrases: string[] = []

  for (const key of APPEARANCE_ORDER) {
    if (!(key in appearance)) continue
    const value = appearance[key]
    if (value == null || String(value).trim() === '') continue
    phrases.push(APPEARANCE_PHRASES[key](String(value)))
    used.add(key)
  }

  for (const [key, value] of entries) {
    if (used.has(key)) continue
    phrases.push(`${key.replace(/_/g, ' ')}: ${String(value)}`)
  }

  if (phrases.length === 0) return null
  const sentence = phrases.join(', ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/** "race · gender · background", skipping missing parts; null when all missing. */
export function identityLine(npc: NPC): string | null {
  const parts = [npc.race, npc.gender, npc.background].filter(
    (part): part is string => part != null && part.trim() !== '',
  )
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Whether the compact AC/HP/Speed stat strip has anything to show. */
export function hasCombatStats(npc: NPC): boolean {
  return npc.ac != null || npc.hp != null || formatMovementSpeeds(npc.speed) != null
}

const EMPTY_FEATURES: MonsterFeatures = {
  traits: [],
  spellcasting: [],
  actions: [],
  bonus_actions: [],
  reactions: [],
  reaction_intro: null,
  legendary_actions: [],
  legendary_intro: null,
  legendary_actions_per_round: null,
  mythic_actions: [],
}

export function npcToMonsterView(npc: NPC): Monster {
  return {
    id: npc.id,
    name: npc.name,
    aliases: [],
    sizes: npc.sizes ?? [],
    family: null,
    alignment: npc.alignment ?? null,
    creature_type: npc.creature_type ?? null,
    ac: npc.ac ?? null,
    hp: npc.hp ?? null,
    speed: npc.speed ?? [],
    abilities: npc.abilities ?? null,
    saving_throws: npc.saving_throws ?? {},
    skills: npc.skills ?? {},
    passive_perception: npc.passive_perception ?? null,
    damage_resistances: npc.damage_resistances ?? [],
    damage_immunities: npc.damage_immunities ?? [],
    damage_vulnerabilities: npc.damage_vulnerabilities ?? [],
    condition_immunities: npc.condition_immunities ?? [],
    senses: npc.senses ?? [],
    languages: npc.languages ?? [],
    audio_path: null,
    features: npc.features ?? EMPTY_FEATURES,
    cr: npc.cr ?? null,
    cr_sort: null,
    cr_note: npc.cr_note ?? null,
    experience_points: npc.experience_points ?? null,
  }
}

export function hasStatblock(npc: NPC): boolean {
  if (npc.ac != null) return true
  if (npc.hp != null) return true
  if (npc.speed != null && npc.speed.length > 0) return true
  if (npc.abilities != null) return true
  if (npc.saving_throws != null && Object.keys(npc.saving_throws).length > 0) return true
  if (npc.skills != null && Object.keys(npc.skills).length > 0) return true
  if (npc.damage_resistances != null && npc.damage_resistances.length > 0) return true
  if (npc.damage_immunities != null && npc.damage_immunities.length > 0) return true
  if (npc.damage_vulnerabilities != null && npc.damage_vulnerabilities.length > 0) return true
  if (npc.condition_immunities != null && npc.condition_immunities.length > 0) return true
  if (npc.senses != null && npc.senses.length > 0) return true
  if (npc.languages != null && npc.languages.length > 0) return true
  if (npc.cr != null) return true
  if (npc.features != null) {
    const f = npc.features
    if (f.traits.length > 0) return true
    if (f.spellcasting.length > 0) return true
    if (f.actions.length > 0) return true
    if (f.bonus_actions.length > 0) return true
    if (f.reactions.length > 0) return true
    if (f.legendary_actions.length > 0) return true
    if (f.mythic_actions.length > 0) return true
  }
  return false
}