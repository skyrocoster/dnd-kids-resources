// Mirrors backend/app/schemas.py

export interface Ability {
  id: number
  code: string
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
  code: string
  name: string
  description?: string | null
}

export interface WeaponProperty {
  id: number
  code: string
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
  damage?: Record<string, unknown>[] | null
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
  attack_type?: Record<string, unknown>[] | null
  area_of_effect?: Record<string, unknown> | null
  action?: string | null
  classes?: string[] | null
  subclasses?: string[] | null
}

export type SpellInput = Omit<Spell, 'id'>

export type AbilityName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
export type MovementMode = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim'
export type AttackKind =
  | 'melee_weapon'
  | 'ranged_weapon'
  | 'melee_spell'
  | 'ranged_spell'
  | 'melee_or_ranged_spell'

export interface CreatureType {
  category: string
  tags: string[]
  swarm_size: CreatureSize | null
}

export interface ArmorClassEntry {
  value: number
  note: string | null
}

export interface ArmorClass extends ArmorClassEntry {
  alternatives: ArmorClassEntry[]
}

export interface HitPoints {
  average: number
  formula: string | null
}

export interface MovementSpeed {
  mode: MovementMode
  feet: number
  note: string | null
  hover: boolean
}

export interface AbilityScores {
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

export interface DamageModifier {
  damage_type: string
  note: string | null
  conditional: boolean
}

export interface Sense {
  type: string
  range: number
  note: string | null
}

export interface AttackDamage {
  formula: string
  bonus: number
  damage_types: string[]
}

export interface Attack {
  kind: AttackKind
  attack_bonus: number | null
  automatic_hit: boolean
  range_ft: number | null
  long_range_ft: number | null
  targets: number | null
  damage: AttackDamage[]
}

export interface Feature {
  name: string
  description: string | null
  attack: Attack | null
}

export interface SpellReference {
  name: string
  hidden: boolean
}

export interface SpellGroup {
  label: string
  spells: SpellReference[]
  hidden: boolean
}

export interface SpellcastingBlock {
  name: string
  ability: AbilityName | null
  description: string | null
  resource: string | null
  groups: SpellGroup[]
  footer: string | null
}

export interface MonsterFeatures {
  traits: Feature[]
  spellcasting: SpellcastingBlock[]
  actions: Feature[]
  bonus_actions: Feature[]
  reactions: Feature[]
  reaction_intro: string | null
  legendary_actions: Feature[]
  legendary_intro: string | null
  legendary_actions_per_round: number | null
  mythic_actions: Feature[]
}

export interface Monster {
  id: number
  name: string
  aliases: string[]
  sizes: CreatureSize[]
  family: string | null
  alignment: string | null
  creature_type: CreatureType | null
  ac: ArmorClass | null
  hp: HitPoints | null
  speed: MovementSpeed[]
  abilities: AbilityScores | null
  saving_throws: Partial<Record<AbilityName, number>>
  skills: Record<string, number>
  passive_perception: number | null
  damage_resistances: DamageModifier[]
  damage_immunities: DamageModifier[]
  damage_vulnerabilities: DamageModifier[]
  condition_immunities: string[]
  senses: Sense[]
  languages: string[]
  audio_path: string | null
  features: MonsterFeatures
  cr: string | null
  cr_sort: number | null
  cr_note: string | null
  experience_points: number | null
}

export interface CreatureTypeInput {
  category: string
  tags?: string[]
  swarm_size?: CreatureSize | null
}

export interface ArmorClassEntryInput {
  value: number
  note?: string | null
}

export interface ArmorClassInput extends ArmorClassEntryInput {
  alternatives?: ArmorClassEntryInput[]
}

export interface HitPointsInput {
  average: number
  formula?: string | null
}

export interface MovementSpeedInput {
  mode: MovementMode
  feet: number
  note?: string | null
  hover?: boolean
}

export type AbilityScoresInput = Partial<AbilityScores>

export interface DamageModifierInput {
  damage_type: string
  note?: string | null
  conditional?: boolean
}

export interface SenseInput {
  type: string
  range: number
  note?: string | null
}

export interface AttackDamageInput {
  formula: string
  bonus?: number
  damage_types?: string[]
}

export interface AttackInput {
  kind: AttackKind
  attack_bonus?: number | null
  automatic_hit?: boolean
  range_ft?: number | null
  long_range_ft?: number | null
  targets?: number | null
  damage?: AttackDamageInput[]
}

export interface FeatureInput {
  name: string
  description?: string | null
  attack?: AttackInput | null
}

export interface SpellReferenceInput {
  name: string
  hidden?: boolean
}

export interface SpellGroupInput {
  label: string
  spells?: SpellReferenceInput[]
  hidden?: boolean
}

export interface SpellcastingBlockInput {
  name: string
  ability?: AbilityName | null
  description?: string | null
  resource?: string | null
  groups?: SpellGroupInput[]
  footer?: string | null
}

export interface MonsterFeaturesInput {
  traits?: FeatureInput[]
  spellcasting?: SpellcastingBlockInput[]
  actions?: FeatureInput[]
  bonus_actions?: FeatureInput[]
  reactions?: FeatureInput[]
  reaction_intro?: string | null
  legendary_actions?: FeatureInput[]
  legendary_intro?: string | null
  legendary_actions_per_round?: number | null
  mythic_actions?: FeatureInput[]
}

export interface MonsterInput {
  name: string
  aliases?: string[]
  sizes?: CreatureSize[]
  family?: string | null
  alignment?: string | null
  creature_type?: CreatureTypeInput | null
  ac?: ArmorClassInput | null
  hp?: HitPointsInput | null
  speed?: MovementSpeedInput[]
  abilities?: AbilityScoresInput | null
  saving_throws?: Partial<Record<AbilityName, number>>
  skills?: Record<string, number>
  passive_perception?: number | null
  damage_resistances?: DamageModifierInput[]
  damage_immunities?: DamageModifierInput[]
  damage_vulnerabilities?: DamageModifierInput[]
  condition_immunities?: string[]
  senses?: SenseInput[]
  languages?: string[]
  audio_path?: string | null
  features?: MonsterFeaturesInput
  cr?: string | null
  cr_note?: string | null
  experience_points?: number | null
}

export interface Weapon {
  id: number
  name: string
  base_weapon?: string | null
  rarity?: string | null
  weapon_category?: string | null
  weight?: number | null
  req_attune?: string | null
  property?: string[] | null
  focus?: string[] | null
  attack?: Record<string, unknown>[] | null
  entries?: unknown[] | null
}

export type WeaponInput = Omit<Weapon, 'id'>

export interface Item {
  id: number
  name: string
  value_gp: number
  category?: string | null
  description?: string | null
}

export type ItemInput = Omit<Item, 'id'>

export interface LootEntry {
  kind: 'item' | 'weapon'
  ref_id: number | null
  name: string
  value_gp: number | null
  category?: string | null
  quantity: number
}

export interface LootBundle {
  id: number
  name: string
  gold: number
  contents?: LootEntry[] | null
}

export type LootBundleInput = Omit<LootBundle, 'id'>

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
  race?: string | null
  gender?: string | null
  background?: string | null
  size?: string | null
  stats?: Record<string, unknown> | null
  armor_class?: number | null
  hit_points?: number | null
  speed?: string | null
  saving_throws?: Record<string, unknown> | null
  skills?: Record<string, unknown> | null
  senses?: Record<string, unknown>[] | null
  languages?: string | null
  appearance?: Record<string, unknown> | null
  notes?: string | null
}

export type NPCInput = Omit<NPC, 'id'>

export interface Quest {
  id: number
  title: string
  summary?: string | null
  reward?: string[] | null
  objectives?: string[] | null
  details?: string[] | null
  quest_giver?: number | null
  dungeon_id?: number | null
  location?: string | null
}

export type QuestInput = Omit<Quest, 'id'>

export interface EncounterCreature {
  monster_id?: number | null
  original_name?: string | null
  name?: string | null
  hp_current?: number | null
  hp_max?: number | null
  ac?: number | null
  status?: string | null
  conditions?: string[] | null
  kind?: 'monster' | 'player' | null
}

export interface Encounter {
  id: number
  title: string
  creatures?: EncounterCreature[] | null
  active_index?: number | null
}

export type EncounterInput = Omit<Encounter, 'id'>

export interface Dungeon {
  id: number
  title: string
  data: Record<string, unknown>
}

export type DungeonInput = Omit<Dungeon, 'id'>

export interface MapLayoutBlob {
  data: Record<string, unknown>
}
