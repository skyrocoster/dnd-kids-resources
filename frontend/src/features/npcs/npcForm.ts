import type {
  AbilityName,
  AbilityScores,
  ArmorClass,
  CreatureSize,
  HitPoints,
  MonsterFeatures,
  MovementSpeed,
  NPC,
  NPCInput,
  Sense,
} from '../../api/types'

export interface NPCFormState {
  name: string
  race: string
  gender: string
  background: string
  size: string
  armorClass: string
  hitPoints: string
  speed: string
  languages: string
  notes: string
  statsText: string
  savingThrowsText: string
  skillsText: string
  sensesText: string
  appearanceText: string
}

const ABILITY_NAMES: Record<string, AbilityName> = {
  str: 'str',
  strength: 'str',
  dex: 'dex',
  dexterity: 'dex',
  con: 'con',
  constitution: 'con',
  int: 'int',
  intelligence: 'int',
  wis: 'wis',
  wisdom: 'wis',
  cha: 'cha',
  charisma: 'cha',
}

const ABILITY_LABELS: Record<AbilityName, string> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

const CREATURE_SIZES: CreatureSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

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

function clone<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function parseTextValue(value: string): string | number {
  const numeric = Number(value)
  return value !== '' && !Number.isNaN(numeric) ? numeric : value
}

function dictToText(dict: Record<string, unknown> | null | undefined): string {
  if (!dict) return ''
  return Object.entries(dict)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

function textToDict(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(':')
      if (!key || rest.length === 0) return
      result[key.trim()] = parseTextValue(rest.join(':').trim())
    })
  return result
}

function abilityScoresToText(abilities: AbilityScores | null | undefined): string {
  if (!abilities) return ''
  return (Object.keys(ABILITY_LABELS) as AbilityName[])
    .filter((key) => abilities[key] != null)
    .map((key) => `${ABILITY_LABELS[key]}: ${abilities[key]}`)
    .join('\n')
}

function textToAbilityScores(text: string): AbilityScores | null {
  const values = textToDict(text)
  const abilities: AbilityScores = { str: null, dex: null, con: null, int: null, wis: null, cha: null }
  let hasValue = false
  Object.entries(values).forEach(([rawKey, rawValue]) => {
    const key = ABILITY_NAMES[rawKey.trim().toLowerCase()]
    if (!key) return
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    if (Number.isNaN(value)) return
    abilities[key] = value
    hasValue = true
  })
  return hasValue ? abilities : null
}

function abilityDictToText(values: Partial<Record<AbilityName, number>> | null | undefined): string {
  if (!values) return ''
  return (Object.keys(ABILITY_LABELS) as AbilityName[])
    .filter((key) => values[key] != null)
    .map((key) => `${ABILITY_LABELS[key]}: ${values[key]}`)
    .join('\n')
}

function textToAbilityDict(text: string): Partial<Record<AbilityName, number>> {
  const values = textToDict(text)
  const result: Partial<Record<AbilityName, number>> = {}
  Object.entries(values).forEach(([rawKey, rawValue]) => {
    const key = ABILITY_NAMES[rawKey.trim().toLowerCase()]
    if (!key) return
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    if (!Number.isNaN(value)) result[key] = value
  })
  return result
}

function skillsToText(skills: Record<string, number> | null | undefined, passivePerception?: number | null): string {
  const lines = skills ? Object.entries(skills).map(([key, value]) => `${key}: ${value}`) : []
  if (passivePerception != null) lines.push(`passive_perception: ${passivePerception}`)
  return lines.join('\n')
}

function textToSkills(text: string): { skills: Record<string, number>; passive_perception: number | null } {
  const values = textToDict(text)
  const skills: Record<string, number> = {}
  let passive_perception: number | null = null
  Object.entries(values).forEach(([key, rawValue]) => {
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    if (Number.isNaN(value)) return
    if (key.trim().toLowerCase() === 'passive_perception') {
      passive_perception = value
    } else {
      skills[key.trim()] = value
    }
  })
  return { skills, passive_perception }
}

function sensesToText(senses: Sense[] | null | undefined): string {
  if (!senses) return ''
  return senses
    .map((sense) => (sense.type ? `${sense.type}: ${sense.range}` : ''))
    .filter(Boolean)
    .join('\n')
}

function textToSenses(text: string, sourceSenses: Sense[] = []): Sense[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, rangeRaw = ''] = line.split(':').map((part) => part.trim())
      const range = Number(rangeRaw)
      const existing = sourceSenses.find((sense) => sense.type.toLowerCase() === type.toLowerCase())
      return {
        type,
        range: !Number.isNaN(range) ? range : existing?.range || 0,
        note: existing?.note ?? null,
      }
    })
}

function parseSize(value: string, sourceSizes: CreatureSize[] = []): CreatureSize[] {
  const size = value.trim().toLowerCase() as CreatureSize
  if (!CREATURE_SIZES.includes(size)) return []
  const rest = sourceSizes.filter((existing) => existing !== size)
  return [size, ...rest]
}

function firstWalkSpeed(speeds: MovementSpeed[] | null | undefined): MovementSpeed | undefined {
  return speeds?.find((entry) => entry.mode === 'walk')
}

function speedToText(speeds: MovementSpeed[] | null | undefined): string {
  const walk = firstWalkSpeed(speeds)
  return walk ? String(walk.feet) : ''
}

function textToSpeed(text: string, sourceSpeeds: MovementSpeed[] = []): MovementSpeed[] {
  const nonWalk = sourceSpeeds.filter((entry) => entry.mode !== 'walk')
  if (!text.trim()) return nonWalk
  const feet = Number(text.trim())
  if (Number.isNaN(feet)) return sourceSpeeds
  const existingWalk = firstWalkSpeed(sourceSpeeds)
  return [
    {
      mode: 'walk',
      feet,
      note: existingWalk?.note ?? null,
      hover: existingWalk?.hover ?? false,
    },
    ...nonWalk,
  ]
}

function splitLanguages(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function joinLanguages(languages: string[] | null | undefined): string {
  return languages?.join(', ') || ''
}

function armorClassToText(ac: ArmorClass | null | undefined): string {
  return ac != null ? String(ac.value) : ''
}

function textToArmorClass(text: string, source?: ArmorClass | null): ArmorClass | null {
  if (!text.trim()) return null
  const value = Number(text.trim())
  if (Number.isNaN(value)) return source ?? null
  return {
    value,
    note: source?.note ?? null,
    alternatives: clone(source?.alternatives ?? []),
  }
}

function hitPointsToText(hp: HitPoints | null | undefined): string {
  return hp != null ? String(hp.average) : ''
}

function textToHitPoints(text: string, source?: HitPoints | null): HitPoints | null {
  if (!text.trim()) return null
  const average = Number(text.trim())
  if (Number.isNaN(average)) return source ?? null
  return { average, formula: source?.formula ?? null }
}

export function emptyNPCForm(): NPCFormState {
  return {
    name: '',
    race: '',
    gender: '',
    background: '',
    size: '',
    armorClass: '',
    hitPoints: '',
    speed: '',
    languages: '',
    notes: '',
    statsText: '',
    savingThrowsText: '',
    skillsText: '',
    sensesText: '',
    appearanceText: '',
  }
}

export function npcToFormState(npc: NPC): NPCFormState {
  return {
    name: npc.name || '',
    race: npc.race || '',
    gender: npc.gender || '',
    background: npc.background || '',
    size: npc.sizes?.[0] || '',
    armorClass: armorClassToText(npc.ac),
    hitPoints: hitPointsToText(npc.hp),
    speed: speedToText(npc.speed),
    languages: joinLanguages(npc.languages),
    notes: npc.notes || '',
    statsText: abilityScoresToText(npc.abilities),
    savingThrowsText: abilityDictToText(npc.saving_throws),
    skillsText: skillsToText(npc.skills, npc.passive_perception),
    sensesText: sensesToText(npc.senses),
    appearanceText: dictToText(npc.appearance),
  }
}

export function formStateToNPCInput(form: NPCFormState, source?: NPC): NPCInput {
  const { skills, passive_perception } = textToSkills(form.skillsText)
  return {
    name: form.name,
    race: form.race || null,
    gender: form.gender || null,
    background: form.background || null,
    sizes: form.size.trim() ? parseSize(form.size, source?.sizes) : [],
    alignment: source?.alignment ?? null,
    creature_type: clone(source?.creature_type ?? null),
    ac: textToArmorClass(form.armorClass, source?.ac),
    hp: textToHitPoints(form.hitPoints, source?.hp),
    speed: textToSpeed(form.speed, source?.speed),
    abilities: form.statsText.trim() ? textToAbilityScores(form.statsText) : null,
    saving_throws: form.savingThrowsText.trim() ? textToAbilityDict(form.savingThrowsText) : {},
    skills,
    passive_perception,
    damage_resistances: clone(source?.damage_resistances ?? []),
    damage_immunities: clone(source?.damage_immunities ?? []),
    damage_vulnerabilities: clone(source?.damage_vulnerabilities ?? []),
    condition_immunities: clone(source?.condition_immunities ?? []),
    senses: textToSenses(form.sensesText, source?.senses),
    languages: splitLanguages(form.languages),
    features: clone(source?.features ?? EMPTY_FEATURES),
    cr: source?.cr ?? null,
    cr_note: source?.cr_note ?? null,
    experience_points: source?.experience_points ?? null,
    appearance: form.appearanceText ? textToDict(form.appearanceText) : null,
    notes: form.notes || null,
  }
}
