import type { Monster, MonsterFeatures, NPC, NPCStatblockFields } from '../../api/types'
import { formatAc, formatCr, formatHp, formatSavingThrows, formatSkills } from '../monsters/monsterModel'
import { npcToMonsterView } from './npcModel'

export interface PullRow {
  id: string
  region: 'Stats' | 'Defenses' | 'Abilities' | 'Actions' | 'Lore'
  label: string
  kind: 'overwrite' | 'add'
  currentValueLabel: string | null
}

const ABILITY_LABELS: Record<string, string> = {
  str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha',
}

function formatAbilities(monster: Monster): string | null {
  if (!monster.abilities) return null
  const parts: string[] = []
  for (const [key, label] of Object.entries(ABILITY_LABELS)) {
    const val = monster.abilities[key as keyof typeof monster.abilities]
    if (val != null) parts.push(`${label} ${val}`)
  }
  return parts.length > 0 ? parts.join(', ') : null
}

type FeatureListField = 'traits' | 'spellcasting' | 'actions' | 'bonus_actions' | 'reactions' | 'legendary_actions' | 'mythic_actions'

const FEATURE_LIST_FIELDS: FeatureListField[] = [
  'traits', 'spellcasting', 'actions', 'bonus_actions', 'reactions', 'legendary_actions', 'mythic_actions',
]

const ITEM_REGIONS: Partial<Record<keyof MonsterFeatures, PullRow['region']>> = {
  traits: 'Lore',
  spellcasting: 'Actions',
  actions: 'Actions',
  bonus_actions: 'Actions',
  reactions: 'Actions',
  legendary_actions: 'Actions',
  mythic_actions: 'Actions',
}

export function getPullableRows(monster: Monster, npc: NPC): PullRow[] {
  const rows: PullRow[] = []
  const npcView = npcToMonsterView(npc)

  if (monster.ac != null) {
    rows.push({
      id: 'ac',
      region: 'Stats',
      label: 'Armor Class',
      kind: 'overwrite',
      currentValueLabel: npc.ac != null ? formatAc(npcView) : null,
    })
  }
  if (monster.hp != null) {
    rows.push({
      id: 'hp',
      region: 'Stats',
      label: 'Hit Points',
      kind: 'overwrite',
      currentValueLabel: npc.hp != null ? formatHp(npcView) : null,
    })
  }
  if (monster.speed.length > 0) {
    rows.push({
      id: 'speed',
      region: 'Stats',
      label: 'Speed',
      kind: 'add',
      currentValueLabel: null,
    })
  }
  if (monster.cr != null) {
    rows.push({
      id: 'cr',
      region: 'Stats',
      label: 'Challenge Rating',
      kind: 'overwrite',
      currentValueLabel: npc.cr != null ? formatCr(npcView) : null,
    })
  }

  const defFields: { key: keyof Monster; label: string; kind: 'add' }[] = [
    { key: 'damage_resistances', label: 'Damage Resistances', kind: 'add' },
    { key: 'damage_immunities', label: 'Damage Immunities', kind: 'add' },
    { key: 'damage_vulnerabilities', label: 'Damage Vulnerabilities', kind: 'add' },
    { key: 'condition_immunities', label: 'Condition Immunities', kind: 'add' },
    { key: 'senses', label: 'Senses', kind: 'add' },
  ]
  for (const { key, label, kind } of defFields) {
    const val = monster[key]
    if (Array.isArray(val) && val.length > 0) {
      rows.push({ id: key, region: 'Defenses', label, kind, currentValueLabel: null })
    }
  }

  if (monster.abilities != null) {
    rows.push({
      id: 'abilities',
      region: 'Abilities',
      label: 'Ability Scores',
      kind: 'overwrite',
      currentValueLabel: formatAbilities(npcView),
    })
  }
  if (Object.keys(monster.saving_throws).length > 0) {
    const npcSaves = formatSavingThrows(npcView)
    rows.push({
      id: 'saving_throws',
      region: 'Abilities',
      label: 'Saving Throws',
      kind: 'overwrite',
      currentValueLabel: npcSaves.length > 0 ? npcSaves.map(s => `${s.label} ${s.value}`).join(', ') : null,
    })
  }
  if (Object.keys(monster.skills).length > 0) {
    const npcSkills = formatSkills(npcView)
    rows.push({
      id: 'skills',
      region: 'Abilities',
      label: 'Skills',
      kind: 'overwrite',
      currentValueLabel: npcSkills.length > 0 ? npcSkills.map(s => `${s.label} ${s.value}`).join(', ') : null,
    })
  }

  if (monster.languages.length > 0) {
    rows.push({
      id: 'languages',
      region: 'Lore',
      label: 'Languages',
      kind: 'add',
      currentValueLabel: null,
    })
  }

  for (const field of FEATURE_LIST_FIELDS) {
    const items = monster.features[field]
    if (items.length === 0) continue
    const region = ITEM_REGIONS[field] ?? 'Actions'
    for (let i = 0; i < items.length; i++) {
      rows.push({
        id: `${field}:${i}`,
        region,
        label: items[i].name,
        kind: 'add',
        currentValueLabel: null,
      })
    }
  }

  return rows
}

export function applyPull(npc: NPC, monster: Monster, selectedRowIds: Set<string>): NPCStatblockFields {
  const npcFeatures: MonsterFeatures = npc.features
    ? {
        traits: [...npc.features.traits],
        spellcasting: [...npc.features.spellcasting],
        actions: [...npc.features.actions],
        bonus_actions: [...npc.features.bonus_actions],
        reactions: [...npc.features.reactions],
        reaction_intro: npc.features.reaction_intro,
        legendary_actions: [...npc.features.legendary_actions],
        legendary_intro: npc.features.legendary_intro,
        legendary_actions_per_round: npc.features.legendary_actions_per_round,
        mythic_actions: [...npc.features.mythic_actions],
      }
    : {
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

  const result: NPCStatblockFields = {
    sizes: npc.sizes,
    alignment: npc.alignment,
    creature_type: npc.creature_type,
    ac: npc.ac,
    hp: npc.hp,
    speed: npc.speed,
    abilities: npc.abilities,
    saving_throws: npc.saving_throws,
    skills: npc.skills,
    passive_perception: npc.passive_perception,
    damage_resistances: npc.damage_resistances,
    damage_immunities: npc.damage_immunities,
    damage_vulnerabilities: npc.damage_vulnerabilities,
    condition_immunities: npc.condition_immunities,
    senses: npc.senses,
    languages: npc.languages,
    features: npcFeatures,
    cr: npc.cr,
    cr_note: npc.cr_note,
    experience_points: npc.experience_points,
  }

  if (selectedRowIds.has('ac')) result.ac = monster.ac
  if (selectedRowIds.has('hp')) result.hp = monster.hp
  if (selectedRowIds.has('abilities')) result.abilities = monster.abilities
  if (selectedRowIds.has('saving_throws')) result.saving_throws = monster.saving_throws
  if (selectedRowIds.has('skills')) {
    result.skills = monster.skills
    result.passive_perception = monster.passive_perception
  }
  if (selectedRowIds.has('cr')) {
    result.cr = monster.cr
    result.cr_note = monster.cr_note
    result.experience_points = monster.experience_points
  }

  if (selectedRowIds.has('speed')) result.speed = [...(npc.speed ?? []), ...monster.speed]
  if (selectedRowIds.has('damage_resistances')) result.damage_resistances = [...(npc.damage_resistances ?? []), ...monster.damage_resistances]
  if (selectedRowIds.has('damage_immunities')) result.damage_immunities = [...(npc.damage_immunities ?? []), ...monster.damage_immunities]
  if (selectedRowIds.has('damage_vulnerabilities')) result.damage_vulnerabilities = [...(npc.damage_vulnerabilities ?? []), ...monster.damage_vulnerabilities]
  if (selectedRowIds.has('condition_immunities')) result.condition_immunities = [...(npc.condition_immunities ?? []), ...monster.condition_immunities]
  if (selectedRowIds.has('senses')) result.senses = [...(npc.senses ?? []), ...monster.senses]
  if (selectedRowIds.has('languages')) result.languages = [...(npc.languages ?? []), ...monster.languages]

  for (const field of FEATURE_LIST_FIELDS) {
    const items = monster.features[field]
    for (let i = 0; i < items.length; i++) {
      if (selectedRowIds.has(`${field}:${i}`)) {
        const target = npcFeatures[field] as unknown[]
        target.push(items[i])
      }
    }
  }

  const hasReaction = [...selectedRowIds].some(id => id.startsWith('reactions:'))
  if (hasReaction && monster.features.reaction_intro != null) {
    npcFeatures.reaction_intro = monster.features.reaction_intro
  }
  const hasLegendary = [...selectedRowIds].some(id => id.startsWith('legendary_actions:'))
  if (hasLegendary) {
    if (monster.features.legendary_intro != null) npcFeatures.legendary_intro = monster.features.legendary_intro
    if (monster.features.legendary_actions_per_round != null) npcFeatures.legendary_actions_per_round = monster.features.legendary_actions_per_round
  }

  return result
}
