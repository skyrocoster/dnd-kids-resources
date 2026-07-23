import type { Monster, MonsterFeatures, Player } from '../../api/types'
import { abilityModifier, formatMovementSpeeds } from '../npcs/npcModel'

export { formatMovementSpeeds, formatSenses } from '../npcs/npcModel'

export interface AbilityScore {
  key: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'
  label: string
  score: number
  modifier: number
}

interface AbilityDef {
  key: AbilityScore['key']
  label: string
  field: keyof NonNullable<Player['abilities']>
}

const ABILITY_DEFS: AbilityDef[] = [
  { key: 'STR', label: 'Strength', field: 'str' },
  { key: 'DEX', label: 'Dexterity', field: 'dex' },
  { key: 'CON', label: 'Constitution', field: 'con' },
  { key: 'INT', label: 'Intelligence', field: 'int' },
  { key: 'WIS', label: 'Wisdom', field: 'wis' },
  { key: 'CHA', label: 'Charisma', field: 'cha' },
]

export function getAbilityScores(player: Player): AbilityScore[] {
  const abilities = player.abilities
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

export function identityLine(player: Player): string | null {
  const parts: string[] = []
  if (player.ancestry) parts.push(player.ancestry)
  if (player.class_) {
    parts.push(player.level ? `${player.class_} ${player.level}` : player.class_)
  }
  if (player.background) parts.push(player.background)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function hasCombatStats(player: Player): boolean {
  return player.ac != null || player.hp != null || formatMovementSpeeds(player.speed) != null
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

export function playerToMonsterView(player: Player): Monster {
  return {
    id: player.id,
    name: player.name,
    aliases: [],
    sizes: player.sizes ?? [],
    family: null,
    alignment: player.alignment ?? null,
    creature_type: player.creature_type ?? null,
    ac: player.ac ?? null,
    hp: player.hp ?? null,
    speed: player.speed ?? [],
    abilities: player.abilities ?? null,
    saving_throws: player.saving_throws ?? {},
    skills: player.skills ?? {},
    passive_perception: player.passive_perception ?? null,
    damage_resistances: player.damage_resistances ?? [],
    damage_immunities: player.damage_immunities ?? [],
    damage_vulnerabilities: player.damage_vulnerabilities ?? [],
    condition_immunities: player.condition_immunities ?? [],
    senses: player.senses ?? [],
    languages: player.languages ?? [],
    audio_path: null,
    features: player.features ?? EMPTY_FEATURES,
    cr: null,
    cr_sort: null,
    cr_note: null,
    experience_points: null,
  }
}

export function hasStatblock(player: Player): boolean {
  if (player.ac != null) return true
  if (player.hp != null) return true
  if (player.speed != null && player.speed.length > 0) return true
  if (player.abilities != null) return true
  if (player.saving_throws != null && Object.keys(player.saving_throws).length > 0) return true
  if (player.skills != null && Object.keys(player.skills).length > 0) return true
  if (player.damage_resistances != null && player.damage_resistances.length > 0) return true
  if (player.damage_immunities != null && player.damage_immunities.length > 0) return true
  if (player.damage_vulnerabilities != null && player.damage_vulnerabilities.length > 0) return true
  if (player.condition_immunities != null && player.condition_immunities.length > 0) return true
  if (player.senses != null && player.senses.length > 0) return true
  if (player.languages != null && player.languages.length > 0) return true
  if (player.features != null) {
    const f = player.features
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
