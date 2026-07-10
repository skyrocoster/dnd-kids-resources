export interface ParsedDice {
  count: string
  dieType: string
  mod: string
}

export function parseDiceString(value: string | null | undefined): ParsedDice {
  if (!value) return { count: '', dieType: '', mod: '' }
  const match = String(value)
    .trim()
    .match(/^(\d+)?d(\d+)\s*([+-]\s*\d+)?$/i)
  if (!match) return { count: '', dieType: '', mod: '' }
  return {
    count: match[1] || '1',
    dieType: match[2] || '',
    mod: match[3] ? match[3].replace(/\s+/g, '') : '',
  }
}

export function formatDiceString({ count, dieType, mod }: ParsedDice): string {
  if (!dieType) return ''
  return `${count || '1'}d${dieType}${mod || ''}`
}
