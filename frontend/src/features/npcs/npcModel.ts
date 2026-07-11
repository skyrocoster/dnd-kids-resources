/* Headless formatting helpers for NPC dossier rendering.
 * Pure functions only — no UI, no fetching. NPC stats/appearance/senses are
 * messy human-authored dicts (see api/types.ts); every helper here degrades
 * gracefully on missing/absent fields rather than assuming a fixed shape.
 */
import type { NPC } from '../../api/types'

export interface AbilityScore {
  key: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'
  label: string
  score: number
  modifier: number
}

interface AbilityDef {
  key: AbilityScore['key']
  label: string
  aliases: string[]
}

const ABILITY_DEFS: AbilityDef[] = [
  { key: 'STR', label: 'Strength', aliases: ['str', 'strength'] },
  { key: 'DEX', label: 'Dexterity', aliases: ['dex', 'dexterity'] },
  { key: 'CON', label: 'Constitution', aliases: ['con', 'constitution'] },
  { key: 'INT', label: 'Intelligence', aliases: ['int', 'intelligence'] },
  { key: 'WIS', label: 'Wisdom', aliases: ['wis', 'wisdom'] },
  { key: 'CHA', label: 'Charisma', aliases: ['cha', 'charisma'] },
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

/** STR→CHA order, tolerating str/strength/STR (and any case) key spellings; skips missing abilities. */
export function getAbilityScores(npc: NPC): AbilityScore[] {
  const stats = npc.stats
  if (!stats || typeof stats !== 'object') return []

  const byLowerKey = new Map<string, unknown>()
  for (const [key, value] of Object.entries(stats)) {
    byLowerKey.set(key.toLowerCase(), value)
  }

  const scores: AbilityScore[] = []
  for (const def of ABILITY_DEFS) {
    let raw: unknown
    for (const alias of def.aliases) {
      if (byLowerKey.has(alias)) {
        raw = byLowerKey.get(alias)
        break
      }
    }
    const score = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (!Number.isFinite(score)) continue
    scores.push({ key: def.key, label: def.label, score, modifier: abilityModifier(score) })
  }
  return scores
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

/** Compose an appearance dict into one readable sentence ("Brown hair, green eyes, a burn scar…"); null when empty. */
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
  return npc.armor_class != null || npc.hit_points != null || (npc.speed != null && npc.speed.trim() !== '')
}
