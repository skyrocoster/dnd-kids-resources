export interface GlossaryDefinition {
  term: string
  aliases?: readonly string[]
  definition: string
}

export type GlossaryRegistry = ReadonlyMap<string, GlossaryDefinition>

export interface LiteralGlossaryNode {
  type: 'text'
  text: string
  start: number
  end: number
}

export interface MatchedGlossaryNode {
  type: 'term'
  text: string
  definition: GlossaryDefinition
  start: number
  end: number
}

export type GlossaryTextNode = LiteralGlossaryNode | MatchedGlossaryNode

export function createGlossaryRegistry(
  definitions: readonly GlossaryDefinition[],
): GlossaryRegistry {
  const registry = new Map<string, GlossaryDefinition>()
  for (const def of definitions) {
    const keys = [def.term.toLowerCase()]
    if (def.aliases) {
      for (const alias of def.aliases) {
        keys.push(alias.toLowerCase())
      }
    }
    for (const key of keys) {
      if (registry.has(key)) {
        throw new Error(`Duplicate glossary term: ${key}`)
      }
      registry.set(key, def)
    }
  }
  return registry
}

function buildSortedKeys(registry: GlossaryRegistry): string[] {
  return Array.from(registry.keys()).sort((a, b) => b.length - a.length)
}

export function matchGlossaryTerms(
  text: string,
  registry: GlossaryRegistry,
): GlossaryTextNode[] {
  if (text.length === 0) return []

  const sortedKeys = buildSortedKeys(registry)
  const nodes: GlossaryTextNode[] = []
  let cursor = 0
  let literalStart = 0

  while (cursor < text.length) {
    let matchedKey: string | null = null

    for (const key of sortedKeys) {
      if (cursor + key.length > text.length) continue

      const slice = text.slice(cursor, cursor + key.length).toLowerCase()
      if (slice !== key) continue

      const beforeOk = cursor === 0 || !/\w/.test(text[cursor - 1])
      const afterOk =
        cursor + key.length >= text.length ||
        !/\w/.test(text[cursor + key.length])

      if (beforeOk && afterOk) {
        matchedKey = key
        break
      }
    }

    if (matchedKey) {
      if (cursor > literalStart) {
        nodes.push({
          type: 'text',
          text: text.slice(literalStart, cursor),
          start: literalStart,
          end: cursor,
        })
      }

      const definition = registry.get(matchedKey)!
      nodes.push({
        type: 'term',
        text: text.slice(cursor, cursor + matchedKey.length),
        definition,
        start: cursor,
        end: cursor + matchedKey.length,
      })

      cursor += matchedKey.length
      literalStart = cursor
    } else {
      cursor++
    }
  }

  if (literalStart < text.length) {
    nodes.push({
      type: 'text',
      text: text.slice(literalStart),
      start: literalStart,
      end: text.length,
    })
  }

  return nodes
}

export const ruleGlossaryRegistry: GlossaryRegistry = createGlossaryRegistry([
  {
    term: 'advantage',
    definition:
      'Roll two dice and use the higher one - something is helping you.',
  },
  {
    term: 'disadvantage',
    definition:
      'Roll two dice and use the lower one - something is making it harder.',
  },
  {
    term: 'concentration',
    aliases: ['concentrating'],
    definition:
      'You have to keep thinking about this spell to keep it going. Taking damage can break it, and you can only concentrate on one spell at a time.',
  },
  {
    term: 'saving throw',
    aliases: ['saving throws', 'save', 'saves'],
    definition:
      'A roll to dodge, resist, or shrug off something bad happening to you.',
  },
  {
    term: 'hit points',
    aliases: ['hit point', 'hp'],
    definition: 'How much damage you can take before you drop.',
  },
  {
    term: 'prone',
    definition:
      'Knocked down on the ground. It costs part of your move to stand back up.',
  },
])
