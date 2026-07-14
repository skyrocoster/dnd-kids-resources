import type { CreatureSize, Monster, MonsterInput, MovementMode } from '../../api/types'

export interface MonsterFormState {
  name: string
  size: string
  creatureType: string
  creatureTags: string
  alignment: string
  family: string
  aliases: string

  acValue: string
  acNote: string
  hpAverage: string
  hpFormula: string

  speedText: string

  abilityStr: string
  abilityDex: string
  abilityCon: string
  abilityInt: string
  abilityWis: string
  abilityCha: string

  savingThrowsText: string
  skillsText: string
  passivePerception: string

  damageResistances: string
  damageImmunities: string
  damageVulnerabilities: string
  conditionImmunities: string

  sensesText: string

  traitsText: string
  actionsText: string
  bonusActionsText: string
  reactionsText: string
  legendaryActionsText: string
  legendaryIntro: string
  legendaryActionsPerRound: string
  mythicActionsText: string
  spellcastingText: string

  languages: string
  audioPath: string

  cr: string
  crNote: string
  experiencePoints: string
}

const SIZE_RE = /^(tiny|small|medium|large|huge|gargantuan)$/i

function parseSizes(raw: string): CreatureSize[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SIZE_RE.test(s)) as CreatureSize[]
}

function parseNumber(raw: string): number | null {
  const n = Number(raw)
  return raw && !Number.isNaN(n) ? n : null
}

function parseFeatureLines(text: string): { name: string; description: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(':')
      if (colon === -1) return { name: line, description: '' }
      return { name: line.slice(0, colon).trim(), description: line.slice(colon + 1).trim() }
    })
}

function dictToText(dict: Record<string, unknown> | null | undefined): string {
  if (!dict) return ''
  return Object.entries(dict)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

function textToKeyedNumbers(text: string): Record<string, number> {
  const result: Record<string, number> = {}
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const colon = line.indexOf(':')
      if (colon === -1) return
      const key = line.slice(0, colon).trim().toLowerCase()
      const rawValue = line.slice(colon + 1).trim()
      const num = Number(rawValue)
      if (key && rawValue && !Number.isNaN(num)) {
        result[key] = num
      }
    })
  return result
}

function damageModifiersToText(mods: { damage_type: string; note: string | null }[]): string {
  return mods
    .map((m) => (m.note ? `${m.damage_type}: ${m.note}` : m.damage_type))
    .join('\n')
}

function textToDamageModifiers(text: string): { damage_type: string; note: string | null }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(':')
      if (colon === -1) return { damage_type: line, note: null }
      return {
        damage_type: line.slice(0, colon).trim(),
        note: line.slice(colon + 1).trim() || null,
      }
    })
}

function sensesToText(
  senses: { type: string; range: number; note: string | null }[],
): string {
  return senses
    .map((s) => {
      const parts = [`${s.type} ${s.range} ft.`]
      if (s.note) parts.push(`(${s.note})`)
      return parts.join(' ')
    })
    .join('\n')
}

function textToSenses(text: string): { type: string; range: number; note: string | null }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parenMatch = line.match(/\(([^)]+)\)/)
      const note = parenMatch ? parenMatch[1].trim() : null
      const clean = parenMatch ? line.replace(/\s*\([^)]+\)/, '').trim() : line
      const tokens = clean.split(/\s+/)
      const rangeStr = tokens[tokens.length - 2]
      const type = tokens.slice(0, -2).join(' ')
      const range = Number(rangeStr)
      return {
        type: type || clean,
        range: !Number.isNaN(range) ? range : 0,
        note,
      }
    })
}

export function emptyMonsterForm(): MonsterFormState {
  return {
    name: '',
    size: '',
    creatureType: '',
    creatureTags: '',
    alignment: '',
    family: '',
    aliases: '',

    acValue: '',
    acNote: '',
    hpAverage: '',
    hpFormula: '',

    speedText: '',

    abilityStr: '',
    abilityDex: '',
    abilityCon: '',
    abilityInt: '',
    abilityWis: '',
    abilityCha: '',

    savingThrowsText: '',
    skillsText: '',
    passivePerception: '',

    damageResistances: '',
    damageImmunities: '',
    damageVulnerabilities: '',
    conditionImmunities: '',

    sensesText: '',

    traitsText: '',
    actionsText: '',
    bonusActionsText: '',
    reactionsText: '',
    legendaryActionsText: '',
    legendaryIntro: '',
    legendaryActionsPerRound: '',
    mythicActionsText: '',
    spellcastingText: '',

    languages: '',
    audioPath: '',

    cr: '',
    crNote: '',
    experiencePoints: '',
  }
}

export function monsterToFormState(monster: Monster): MonsterFormState {
  const abilityMap = (
    monster.abilities
      ? { str: monster.abilities.str, dex: monster.abilities.dex, con: monster.abilities.con, int: monster.abilities.int, wis: monster.abilities.wis, cha: monster.abilities.cha }
      : {}
  ) as Record<string, number | null>

  return {
    name: monster.name || '',
    size: monster.sizes.join(', '),
    creatureType: monster.creature_type?.category || '',
    creatureTags: (monster.creature_type?.tags || []).join(', '),
    alignment: monster.alignment || '',
    family: monster.family || '',
    aliases: monster.aliases.join(', '),

    acValue: monster.ac != null ? String(monster.ac.value) : '',
    acNote: monster.ac?.note || '',
    hpAverage: monster.hp != null ? String(monster.hp.average) : '',
    hpFormula: monster.hp?.formula || '',

    speedText: monster.speed
      .map((s) => {
        const base = s.mode === 'walk' ? `${s.feet}` : `${s.mode} ${s.feet}`
        const hover = s.hover ? ' (hover)' : ''
        const note = s.note ? ` (${s.note})` : ''
        return `${base}${hover}${note}`
      })
      .join(', '),

    abilityStr: abilityMap.str != null ? String(abilityMap.str) : '',
    abilityDex: abilityMap.dex != null ? String(abilityMap.dex) : '',
    abilityCon: abilityMap.con != null ? String(abilityMap.con) : '',
    abilityInt: abilityMap.int != null ? String(abilityMap.int) : '',
    abilityWis: abilityMap.wis != null ? String(abilityMap.wis) : '',
    abilityCha: abilityMap.cha != null ? String(abilityMap.cha) : '',

    savingThrowsText: dictToText(monster.saving_throws as Record<string, unknown>),
    skillsText: dictToText(monster.skills),
    passivePerception: monster.passive_perception != null ? String(monster.passive_perception) : '',

    damageResistances: damageModifiersToText(monster.damage_resistances),
    damageImmunities: damageModifiersToText(monster.damage_immunities),
    damageVulnerabilities: damageModifiersToText(monster.damage_vulnerabilities),
    conditionImmunities: monster.condition_immunities.join('\n'),

    sensesText: sensesToText(monster.senses),

    traitsText: monster.features.traits.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    actionsText: monster.features.actions.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    bonusActionsText: monster.features.bonus_actions.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    reactionsText: monster.features.reactions.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    legendaryActionsText: monster.features.legendary_actions.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    legendaryIntro: monster.features.legendary_intro || '',
    legendaryActionsPerRound: monster.features.legendary_actions_per_round != null ? String(monster.features.legendary_actions_per_round) : '',
    mythicActionsText: monster.features.mythic_actions.map((t) => `${t.name}: ${t.description || ''}`).join('\n'),
    spellcastingText: monster.features.spellcasting
      .map((s) => {
        const desc = s.description ? `\n${s.description}` : ''
        const groups = s.groups
          .map((g) => `${g.label}: ${g.spells.map((sp) => sp.name).join(', ')}`)
          .join('\n')
        return `${s.name}${desc}${groups ? `\n${groups}` : ''}`
      })
      .join('\n---\n'),

    languages: monster.languages.join(', '),
    audioPath: monster.audio_path || '',

    cr: monster.cr || '',
    crNote: monster.cr_note || '',
    experiencePoints: monster.experience_points != null ? String(monster.experience_points) : '',
  }
}

export function formStateToMonsterInput(form: MonsterFormState): MonsterInput {
  const sizes = parseSizes(form.size)
  const creatureTags = form.creatureTags
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const speedEntries = form.speedText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const hoverMatch = part.match(/\(hover\)/i)
      const noteMatch = part.match(/\(([^)]+)\)/g)
      const note = noteMatch
        ? noteMatch
            .filter((m) => !/hover/i.test(m))
            .map((m) => m.slice(1, -1))
            .join('; ') || null
        : null
      const clean = part.replace(/\s*\([^)]+\)/g, '').trim()
      const tokens = clean.split(/\s+/)
      const modeMatch = tokens[0].match(/^(burrow|climb|fly|swim)$/i)
      const mode: MovementMode = modeMatch ? modeMatch[1].toLowerCase() as MovementMode : 'walk'
      const feetStr = mode === 'walk' ? tokens[0] : tokens[1]
      const feet = parseInt(feetStr, 10)
      return { mode, feet: Number.isFinite(feet) ? feet : 30, note, hover: !!hoverMatch }
    })

  const abilities: Record<string, number | null> = {
    str: parseNumber(form.abilityStr),
    dex: parseNumber(form.abilityDex),
    con: parseNumber(form.abilityCon),
    int: parseNumber(form.abilityInt),
    wis: parseNumber(form.abilityWis),
    cha: parseNumber(form.abilityCha),
  }
  const hasAnyAbility = Object.values(abilities).some((v) => v != null)

  return {
    name: form.name.trim(),
    aliases: form.aliases
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    sizes,
    family: form.family.trim() || null,
    alignment: form.alignment.trim() || null,
    creature_type: form.creatureType.trim()
      ? { category: form.creatureType.trim(), tags: creatureTags, swarm_size: null }
      : null,
    ac: parseNumber(form.acValue) != null
      ? { value: parseNumber(form.acValue)!, note: form.acNote.trim() || null }
      : null,
    hp: parseNumber(form.hpAverage) != null
      ? { average: parseNumber(form.hpAverage)!, formula: form.hpFormula.trim() || null }
      : null,
    speed: speedEntries,
    abilities: hasAnyAbility ? abilities as { str: number | null; dex: number | null; con: number | null; int: number | null; wis: number | null; cha: number | null } : null,
    saving_throws: textToKeyedNumbers(form.savingThrowsText) as Record<string, number>,
    skills: textToKeyedNumbers(form.skillsText),
    passive_perception: parseNumber(form.passivePerception),
    damage_resistances: textToDamageModifiers(form.damageResistances),
    damage_immunities: textToDamageModifiers(form.damageImmunities),
    damage_vulnerabilities: textToDamageModifiers(form.damageVulnerabilities),
    condition_immunities: form.conditionImmunities
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    senses: textToSenses(form.sensesText),
    languages: form.languages
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    audio_path: form.audioPath.trim() || null,
    features: {
      traits: parseFeatureLines(form.traitsText),
      actions: parseFeatureLines(form.actionsText),
      bonus_actions: parseFeatureLines(form.bonusActionsText),
      reactions: parseFeatureLines(form.reactionsText),
      legendary_actions: parseFeatureLines(form.legendaryActionsText),
      legendary_intro: form.legendaryIntro.trim() || null,
      legendary_actions_per_round: parseNumber(form.legendaryActionsPerRound),
      mythic_actions: parseFeatureLines(form.mythicActionsText),
      spellcasting: form.spellcastingText.trim()
        ? [{ name: form.spellcastingText.trim(), ability: null, description: null, resource: null, groups: [], footer: null }]
        : [],
      reaction_intro: null,
    },
    cr: form.cr.trim() || null,
    cr_note: form.crNote.trim() || null,
    experience_points: parseNumber(form.experiencePoints),
  }
}

export function validateMonsterForm(form: MonsterFormState): string[] {
  const errors: string[] = []
  if (!form.name.trim()) {
    errors.push('Name is required.')
  }
  if (form.acValue && Number.isNaN(Number(form.acValue))) {
    errors.push('AC must be a number.')
  }
  if (form.hpAverage && Number.isNaN(Number(form.hpAverage))) {
    errors.push('HP must be a number.')
  }
  if (form.passivePerception && Number.isNaN(Number(form.passivePerception))) {
    errors.push('Passive Perception must be a number.')
  }
  const abilityFields = ['abilityStr', 'abilityDex', 'abilityCon', 'abilityInt', 'abilityWis', 'abilityCha'] as const
  for (const field of abilityFields) {
    const val = form[field]
    if (val && Number.isNaN(Number(val))) {
      errors.push(`${field.replace('ability', '')} must be a number.`)
    }
  }
  return errors
}
