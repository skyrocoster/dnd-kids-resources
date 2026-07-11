import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  composeAppearance,
  formatModifier,
  getAbilityScores,
  hasCombatStats,
  identityLine,
} from '../npcModel'
import type { NPC } from '../../../api/types'

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
  it('returns all six abilities in STR->CHA order using full-word keys', () => {
    const npc = makeNpc({
      stats: { strength: 14, dexterity: 12, constitution: 13, intelligence: 10, wisdom: 11, charisma: 9 },
    })
    const scores = getAbilityScores(npc)
    expect(scores.map((s) => s.key)).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
    expect(scores[0]).toEqual({ key: 'STR', label: 'Strength', score: 14, modifier: 2 })
  })

  it('tolerates short-code and uppercase key spellings', () => {
    const npc = makeNpc({ stats: { str: 16, DEX: 14, Con: 12 } })
    const scores = getAbilityScores(npc)
    expect(scores).toEqual([
      { key: 'STR', label: 'Strength', score: 16, modifier: 3 },
      { key: 'DEX', label: 'Dexterity', score: 14, modifier: 2 },
      { key: 'CON', label: 'Constitution', score: 12, modifier: 1 },
    ])
  })

  it('skips a missing ability rather than emitting a placeholder', () => {
    const npc = makeNpc({ stats: { strength: 14, dexterity: 12 } })
    const scores = getAbilityScores(npc)
    expect(scores).toHaveLength(2)
    expect(scores.map((s) => s.key)).toEqual(['STR', 'DEX'])
  })

  it('returns an empty array when stats is absent', () => {
    expect(getAbilityScores(makeNpc())).toEqual([])
    expect(getAbilityScores(makeNpc({ stats: null }))).toEqual([])
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
    expect(hasCombatStats(makeNpc({ armor_class: 16 }))).toBe(true)
    expect(hasCombatStats(makeNpc({ hit_points: 22 }))).toBe(true)
    expect(hasCombatStats(makeNpc({ speed: '30' }))).toBe(true)
  })

  it('is false when AC/HP/speed are all absent', () => {
    expect(hasCombatStats(makeNpc())).toBe(false)
    expect(hasCombatStats(makeNpc({ armor_class: null, hit_points: null, speed: null }))).toBe(false)
  })
})
