import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const playerDir = join(process.cwd(), 'src', 'player')
const bannedDirs = ['features', 'components', 'layout', 'pages']
const importRe = /(?:from\s+|import\s*\()['"]([^'"]+)['"]/g
const bannedSegmentRe = new RegExp(`(?:^|\\/)(${bannedDirs.join('|')})\\/`)

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return []
      return sourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe('player import rule', () => {
  it('does not import from features, components, layout, or pages', () => {
    const violations: string[] = []

    for (const file of sourceFiles(playerDir)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(importRe)) {
        const specifier = match[1]
        if (bannedSegmentRe.test(specifier)) {
          violations.push(`${file}: import from "${specifier}"`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
