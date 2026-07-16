import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const frontendSourceRoot = join(process.cwd(), 'src')
const sourceRoots = ['api', 'features/players', 'features/spells']
const legacySpellFields = [
  'spell_name',
  'spell_text',
  'spell_alt_text',
  'casting_time',
  'heal',
  'attack_type',
  'damage_at_higher_levels',
  'heal_at_spell_slots',
  'action',
  'classes',
  'subclasses',
  'icon',
]

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) && !path.endsWith('SpellContract.audit.test.ts') ? [path] : []
  })
}

describe('spell contract audit', () => {
  it('does not access dropped spell fields in frontend spell consumers', () => {
    const accessPattern = new RegExp(
      `(?:\\.\\s*|\\[\\s*['"])(${legacySpellFields.join('|')})(?:\\b|['"]\\s*\\])|\\b(${legacySpellFields.join('|')})\\s*:`,
      'g',
    )
    const matches = sourceRoots.flatMap((root) =>
      sourceFiles(join(frontendSourceRoot, root)).flatMap((path) => {
        const source = readFileSync(path, 'utf8')
        return Array.from(source.matchAll(accessPattern), (match) => `${path}: ${match[0]}`)
      }),
    )

    expect(matches).toEqual([])
  })
})
