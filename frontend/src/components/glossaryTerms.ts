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
  {
    term: 'blinded',
    definition: 'You can\'t see anything.',
  },
  {
    term: 'charmed',
    definition: 'You like someone so much you won\'t hurt them.',
  },
  {
    term: 'deafened',
    definition: 'You can\'t hear anything.',
  },
  {
    term: 'exhaustion',
    definition: 'You\'re really tired. Things get harder to do.',
  },
  {
    term: 'frightened',
    definition: 'You\'re scared. You can\'t move toward what scares you.',
  },
  {
    term: 'grappled',
    definition: 'Someone is holding you. You can\'t move away.',
  },
  {
    term: 'incapacitated',
    definition: 'You can\'t move or do anything.',
  },
  {
    term: 'invisible',
    definition: 'You can\'t be seen. People know where you are if you make noise.',
  },
  {
    term: 'paralyzed',
    definition: 'Your body is frozen. You can\'t move or speak.',
  },
  {
    term: 'petrified',
    definition: 'You\'re turned to stone. You can\'t move or speak.',
  },
  {
    term: 'poisoned',
    definition: 'Poison is in your body. Things get harder to do.',
  },
  {
    term: 'restrained',
    definition: 'You\'re stuck or tied up. You can\'t move far.',
  },
  {
    term: 'stunned',
    definition: 'You\'re shocked. You can\'t move or speak.',
  },
  {
    term: 'unconscious',
    definition: 'You\'re asleep or knocked out. You can\'t do anything.',
  },
  {
    term: 'attack roll',
    definition: 'A roll to see if you hit something with your weapon.',
  },
  {
    term: 'armor class',
    definition: 'How hard you are to hit. Better armor means a higher number.',
  },
  {
    term: 'initiative',
    definition: 'A roll at the start of a fight to see who goes first.',
  },
  {
    term: 'opportunity attack',
    definition: 'A free attack when someone runs away from you.',
  },
  {
    term: 'bonus action',
    definition: 'An extra thing you can do on your turn besides your main action.',
  },
  {
    term: 'dash',
    definition: 'You run extra far. You can\'t attack that turn.',
  },
  {
    term: 'disengage',
    definition: 'You move without enemies getting free attacks at you.',
  },
  {
    term: 'dodge',
    definition: 'You focus on not getting hit. Enemies have a harder time.',
  },
])
