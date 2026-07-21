import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  composeAppearance,
  formatModifier,
  formatMovementSpeeds,
  formatSenses,
  getAbilityScores,
  hasCombatStats,
  hasStatblock,
  identityLine,
  npcToMonsterView,
} from '../npcModel'
import type { Monster, NPC } from '../../../api/types'

function makeNpc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 1,
    name: 'Emery Hart',
    ...overrides,
  }
}

describe('abilityModifier', () => {
  it('computes D&D modifier math across the range', () => {
    expect(abilityModifier(1)).toBe(-5)
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(11)).toBe(0)
    expect(abilityModifier(20)).toBe(5)
  })
})

describe('formatModifier', () => {
  it('uses a real minus glyph and a leading plus for non-negative values', () => {
    expect(formatModifier(2)).toBe('+2')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('−1')
    expect(formatModifier(-5)).toBe('−5')
  })
})

describe('getAbilityScores', () => {
  it('returns all six abilities in STR->CHA order', () => {
    const npc = makeNpc({
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    const scores = getAbilityScores(npc)
    expect(scores.map((s) => s.key)).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
    expect(scores[0]).toEqual({ key: 'STR', label: 'Strength', score: 14, modifier: 2 })
  })

  it('skips a missing ability rather than emitting a placeholder', () => {
    const npc = makeNpc({ abilities: { str: 14, dex: 12, con: null, int: null, wis: null, cha: null } })
    const scores = getAbilityScores(npc)
    expect(scores).toHaveLength(2)
    expect(scores.map((s) => s.key)).toEqual(['STR', 'DEX'])
  })

  it('returns an empty array when abilities are absent', () => {
    expect(getAbilityScores(makeNpc())).toEqual([])
    expect(getAbilityScores(makeNpc({ abilities: null }))).toEqual([])
  })
})

describe('formatMovementSpeeds', () => {
  it('formats multi-mode structured movement', () => {
    expect(
      formatMovementSpeeds([
        { mode: 'walk', feet: 30, note: null, hover: false },
        { mode: 'fly', feet: 60, note: null, hover: true },
        { mode: 'swim', feet: 20, note: 'while unarmored', hover: false },
      ]),
    ).toBe('30 ft., fly 60 ft. (hover), swim 20 ft. (while unarmored)')
  })

  it('returns null when movement is absent or empty', () => {
    expect(formatMovementSpeeds(undefined)).toBeNull()
    expect(formatMovementSpeeds([])).toBeNull()
  })
})

describe('formatSenses', () => {
  it('formats structured senses with ranges and notes', () => {
    expect(formatSenses([{ type: 'darkvision', range: 60, note: 'magical' }])).toEqual(['darkvision 60 ft. (magical)'])
  })
})

describe('composeAppearance', () => {
  it('composes known fields into one readable sentence', () => {
    const sentence = composeAppearance({
      hair_colour: 'brown',
      eye_colour: 'green',
      distinguishing_features: 'a burn scar across one hand',
    })
    expect(sentence).toBe('Brown hair, green eyes, a burn scar across one hand')
  })

  it('falls back to a labeled phrase for unrecognized keys', () => {
    const sentence = composeAppearance({ tattoo_pattern: 'a raven on the wrist' })
    expect(sentence).toBe('Tattoo pattern: a raven on the wrist')
  })

  it('returns null for an empty or null dict', () => {
    expect(composeAppearance({})).toBeNull()
    expect(composeAppearance(null)).toBeNull()
    expect(composeAppearance(undefined)).toBeNull()
  })
})

describe('identityLine', () => {
  it('joins race, gender, and background with a middle dot', () => {
    expect(identityLine(makeNpc({ race: 'Human', gender: 'Male', background: 'Village Guard' }))).toBe(
      'Human · Male · Village Guard',
    )
  })

  it('skips missing parts', () => {
    expect(identityLine(makeNpc({ race: 'Human' }))).toBe('Human')
  })

  it('returns null when nothing is present', () => {
    expect(identityLine(makeNpc())).toBeNull()
  })
})

describe('hasCombatStats', () => {
  it('is true when any of AC/HP/speed is present', () => {
    expect(hasCombatStats(makeNpc({ ac: { value: 16, note: null, alternatives: [] } }))).toBe(true)
    expect(hasCombatStats(makeNpc({ hp: { average: 22, formula: null } }))).toBe(true)
    expect(hasCombatStats(makeNpc({ speed: [{ mode: 'walk', feet: 30, note: null, hover: false }] }))).toBe(true)
  })

  it('is false when AC/HP/speed are all absent', () => {
    expect(hasCombatStats(makeNpc())).toBe(false)
    expect(hasCombatStats(makeNpc({ ac: null, hp: null, speed: [] }))).toBe(false)
  })
})

describe('npcToMonsterView', () => {
  it('maps a fully statful NPC to a complete Monster with all keys present', () => {
    const npc = makeNpc({
      sizes: ['medium'],
      alignment: 'Lawful Good',
      creature_type: { category: 'humanoid', tags: [], swarm_size: null },
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
      ac: { value: 16, note: null, alternatives: [] },
      hp: { average: 22, formula: '4d8 + 4' },
      speed: [
        { mode: 'walk', feet: 30, note: null, hover: false },
        { mode: 'fly', feet: 60, note: null, hover: true },
      ],
      saving_throws: { str: 2 },
      skills: { athletics: 4 },
      passive_perception: 13,
      damage_resistances: [{ damage_type: 'fire', note: null, conditional: false }],
      damage_immunities: [{ damage_type: 'poison', note: null, conditional: false }],
      damage_vulnerabilities: [{ damage_type: 'thunder', note: null, conditional: false }],
      condition_immunities: ['charmed'],
      senses: [{ type: 'darkvision', range: 60, note: null }],
      languages: ['Common', 'Elvish'],
      features: {
        traits: [{ name: 'Keen Senses', description: 'Excellent perception', attack: null }],
        spellcasting: [],
        actions: [{ name: 'Longsword', description: 'Melee weapon attack', attack: null }],
        bonus_actions: [],
        reactions: [],
        reaction_intro: null,
        legendary_actions: [],
        legendary_intro: null,
        legendary_actions_per_round: null,
        mythic_actions: [],
      },
      cr: '1/4',
      cr_note: null,
      experience_points: 50,
    })

    const result = npcToMonsterView(npc)
    const requiredKeys: (keyof Monster)[] = [
      'id', 'name', 'aliases', 'sizes', 'family', 'alignment', 'creature_type',
      'ac', 'hp', 'speed', 'abilities', 'saving_throws', 'skills', 'passive_perception',
      'damage_resistances', 'damage_immunities', 'damage_vulnerabilities', 'condition_immunities',
      'senses', 'languages', 'audio_path', 'features', 'cr', 'cr_sort', 'cr_note', 'experience_points',
    ]
    for (const key of requiredKeys) {
      expect(result).toHaveProperty(key)
      expect(result[key]).not.toBeUndefined()
    }

    expect(result.aliases).toEqual([])
    expect(result.family).toBeNull()
    expect(result.audio_path).toBeNull()
    expect(result.cr_sort).toBeNull()
    expect(result.sizes).toEqual(['medium'])
    expect(result.alignment).toBe('Lawful Good')
    expect(result.speed).toHaveLength(2)
    expect(result.features.traits).toHaveLength(1)
    expect(result.features.actions).toHaveLength(1)
  })

  it('produces empty-safe defaults for a bare id/name NPC', () => {
    const result = npcToMonsterView(makeNpc())
    const requiredKeys: (keyof Monster)[] = [
      'id', 'name', 'aliases', 'sizes', 'family', 'alignment', 'creature_type',
      'ac', 'hp', 'speed', 'abilities', 'saving_throws', 'skills', 'passive_perception',
      'damage_resistances', 'damage_immunities', 'damage_vulnerabilities', 'condition_immunities',
      'senses', 'languages', 'audio_path', 'features', 'cr', 'cr_sort', 'cr_note', 'experience_points',
    ]
    for (const key of requiredKeys) {
      expect(result[key]).not.toBeUndefined()
    }
    expect(result.aliases).toEqual([])
    expect(result.speed).toEqual([])
    expect(result.features.traits).toEqual([])
    expect(result.features.actions).toEqual([])
    expect(result.features.spellcasting).toEqual([])
    expect(result.features.bonus_actions).toEqual([])
    expect(result.features.reactions).toEqual([])
    expect(result.features.legendary_actions).toEqual([])
    expect(result.features.mythic_actions).toEqual([])
    expect(result.saving_throws).toEqual({})
    expect(result.skills).toEqual({})
  })
})

describe('hasStatblock', () => {
  it('returns false for a bare NPC', () => {
    expect(hasStatblock(makeNpc())).toBe(false)
  })

  it('returns true when only features.traits is populated', () => {
    const npc = makeNpc({
      features: {
        traits: [{ name: 'Keen Senses', description: 'desc', attack: null }],
        spellcasting: [],
        actions: [],
        bonus_actions: [],
        reactions: [],
        reaction_intro: null,
        legendary_actions: [],
        legendary_intro: null,
        legendary_actions_per_round: null,
        mythic_actions: [],
      },
    })
    expect(hasStatblock(npc)).toBe(true)
  })

  it('returns true when only ac is populated', () => {
    expect(hasStatblock(makeNpc({ ac: { value: 16, note: null, alternatives: [] } }))).toBe(true)
  })
})
