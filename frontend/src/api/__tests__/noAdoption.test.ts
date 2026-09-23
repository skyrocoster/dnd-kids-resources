import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = join(process.cwd(), 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === '__tests__' || entry.name === 'stories') return []
      return sourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe('generated client adoption guard', () => {
  it('keeps network transport inside the central generated-client module', () => {
    const centralClientPath = join(sourceRoot, 'api', 'client.ts')
    const centralClient = readFileSync(centralClientPath, 'utf8')
    expect(centralClient).toMatch(/from ['"]\.\/generated\/sdk\.gen['"]|import \* as sdk/)
    expect(centralClient).not.toMatch(/\bfetch\s*\(/)

    const nonCentralSources = sourceFiles(sourceRoot).filter((path) => path !== centralClientPath)
    const directTransportOrSdkImports = nonCentralSources.filter((path) => {
      const source = readFileSync(path, 'utf8')
      return /\bfetch\s*\(|from ['"][^'"]*api\/generated\/(?:sdk\.gen|index)['"]/.test(source)
    })

    expect(directTransportOrSdkImports.map((path) => relative(sourceRoot, path))).toEqual([])
  })
})
