// Mirrors backend/app/schemas.py

export interface Ability {
  id: number
  name: string
  description?: string | null
}

export interface Condition {
  id: number
  name: string
  description?: string | null
}

export interface DamageType {
  id: number
  name: string
  description?: string | null
}

export interface WeaponProperty {
  id: number
  name: string
  description?: string | null
}

export interface Skill {
  name: string
  ability: string
  description?: string | null
}

export interface SpellComponent {
  code: string
  name: string
  description?: string | null
}

export interface Spell {
  id: number
  spell_name: string
  icon?: string | null
  level?: string | null
  school?: string | null
  spell_text?: string | null
  spell_alt_text?: string | null
  damage?: Record<string, unknown> | null
  heal?: Record<string, unknown> | null
  heal_at_spell_slots?: Record<string, unknown> | null
  range?: string | null
  higher_levels?: string | null
  damage_at_higher_levels?: string | null
  casting_time?: string | null
  duration?: string | null
  concentration?: boolean | null
  ritual?: boolean | null
  components?: string[] | null
  materials?: string | null
  attack_type?: string | null
  area_of_effect?: Record<string, unknown> | null
  action?: string | null
  classes?: string[] | null
  subclasses?: string[] | null
}

export type SpellInput = Omit<Spell, 'id'>

export interface Monster {
  id: number
  name: string
  ac?: Record<string, unknown> | null
  hp?: Record<string, unknown> | null
  speed?: Record<string, unknown> | null
  stats?: Record<string, unknown> | null
  senses?: string | null
  languages?: string | null
  challenge?: string | null
  action?: Record<string, unknown>[] | null
}

export type MonsterInput = Omit<Monster, 'id'>

export interface Weapon {
  id: number
  name: string
  damage?: string | null
  damage_type?: string | null
  properties?: string[] | null
  rarity?: string | null
}

export type WeaponInput = Omit<Weapon, 'id'>

export interface Player {
  id: number
  name: string
  class_?: string | null
  level?: number | null
}

export type PlayerInput = Omit<Player, 'id'>

export interface NPC {
  id: number
  name: string
  role?: string | null
  description?: string | null
  notes?: string | null
}

export type NPCInput = Omit<NPC, 'id'>

export interface Quest {
  id: number
  title: string
  description?: string | null
  status?: string | null
  reward?: string | null
  notes?: string | null
}

export type QuestInput = Omit<Quest, 'id'>

export interface Encounter {
  id: number
  title: string
  description?: string | null
  difficulty?: string | null
  creatures?: string[] | null
  notes?: string | null
}

export type EncounterInput = Omit<Encounter, 'id'>

export interface Dungeon {
  id: number
  title: string
  data: Record<string, unknown>
}

export type DungeonInput = Omit<Dungeon, 'id'>
