import { describe, expect, it } from 'vitest'
import seededConditions from '../../../../data/seeds/seed_conditions.json'
import {
  createGlossaryRegistry,
  matchGlossaryTerms,
  ruleGlossaryRegistry,
  type GlossaryDefinition,
} from '../glossaryTerms'

describe('glossaryTerms', () => {
  const registry = createGlossaryRegistry([
    { term: 'advantage', definition: 'Roll two dice and use the higher one.' },
    { term: 'disadvantage', definition: 'Roll two dice and use the lower one.' },
    {
      term: 'concentration',
      aliases: ['concentrating'],
      definition: 'Keep thinking about this spell.',
    },
    {
      term: 'saving throw',
      aliases: ['saving throws', 'save', 'saves'],
      definition: 'A roll to dodge, resist, or shrug off.',
    },
    {
      term: 'hit points',
      aliases: ['hit point', 'hp'],
      definition: 'How much damage you can take.',
    },
    { term: 'prone', definition: 'Knocked down on the ground.' },
  ])

  it('alias save resolves to saving throw definition', () => {
    const nodes = matchGlossaryTerms('Make a save', registry)
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toEqual({
      type: 'text',
      text: 'Make a ',
      start: 0,
      end: 7,
    })
    expect(nodes[1].type).toBe('term')
    if (nodes[1].type === 'term') {
      expect(nodes[1].text).toBe('save')
      expect(nodes[1].definition.definition).toBe(
        'A roll to dodge, resist, or shrug off.',
      )
    }
  })

  it('longest key wins at a position', () => {
    const nodes = matchGlossaryTerms('hit points', registry)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('term')
    if (nodes[0].type === 'term') {
      expect(nodes[0].text).toBe('hit points')
    }
  })

  it('preserves original casing in node.text', () => {
    const nodes = matchGlossaryTerms('ADVANTAGE and Disadvantage', registry)
    expect(nodes).toHaveLength(3)
    expect(nodes[0].type).toBe('term')
    if (nodes[0].type === 'term') {
      expect(nodes[0].text).toBe('ADVANTAGE')
    }
    expect(nodes[1]).toEqual({
      type: 'text',
      text: ' and ',
      start: 9,
      end: 14,
    })
    expect(nodes[2].type).toBe('term')
    if (nodes[2].type === 'term') {
      expect(nodes[2].text).toBe('Disadvantage')
    }
  })

  it('disadvantage matches only disadvantage, never advantage', () => {
    const nodes = matchGlossaryTerms('disadvantage', registry)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('term')
    if (nodes[0].type === 'term') {
      expect(nodes[0].text).toBe('disadvantage')
      expect(nodes[0].definition).toBe(registry.get('disadvantage'))
      expect(nodes[0].definition).not.toBe(registry.get('advantage'))
    }
  })

  it('unmatched text returns one text node', () => {
    const nodes = matchGlossaryTerms('foo bar baz', registry)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toEqual({
      type: 'text',
      text: 'foo bar baz',
      start: 0,
      end: 11,
    })
  })

  it('nodes tile the source exactly', () => {
    const text = 'Make a concentration save with advantage'
    const nodes = matchGlossaryTerms(text, registry)
    const reconstructed = nodes.map((n) => n.text).join('')
    expect(reconstructed).toBe(text)
    expect(nodes[0].start).toBe(0)
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].end - nodes[i].start).toBe(nodes[i].text.length)
      if (i > 0) {
        expect(nodes[i].start).toBe(nodes[i - 1].end)
      }
    }
    expect(nodes[nodes.length - 1].end).toBe(text.length)
  })

  it('createGlossaryRegistry throws on duplicate key', () => {
    const defs: GlossaryDefinition[] = [
      { term: 'test', definition: 'first' },
      { term: 'test', definition: 'second' },
    ]
    expect(() => createGlossaryRegistry(defs)).toThrow(
      'Duplicate glossary term: test',
    )
  })

  it('empty input returns empty array', () => {
    const nodes = matchGlossaryTerms('', registry)
    expect(nodes).toEqual([])
  })

  it('matches all eight combat action terms in running text', () => {
    const text =
      'You roll for initiative, your armor class helps, make an attack roll, and if they disengage you get an opportunity attack. Use your bonus action to dash or dodge.'
    const nodes = matchGlossaryTerms(text, ruleGlossaryRegistry)
    const termTexts = nodes
      .filter((n) => n.type === 'term')
      .map((n) => n.text.toLowerCase())
    expect(termTexts).toContain('initiative')
    expect(termTexts).toContain('armor class')
    expect(termTexts).toContain('attack roll')
    expect(termTexts).toContain('disengage')
    expect(termTexts).toContain('opportunity attack')
    expect(termTexts).toContain('bonus action')
    expect(termTexts).toContain('dash')
    expect(termTexts).toContain('dodge')
  })

  it('every seeded condition has a glossary entry', () => {
    for (const condition of seededConditions) {
      expect(ruleGlossaryRegistry.has(condition.title)).toBe(true)
    }
  })
})
