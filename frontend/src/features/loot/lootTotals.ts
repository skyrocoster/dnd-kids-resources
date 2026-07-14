import type { LootEntry } from '../../api/types'

export function computeBundleTotal(gold: number, contents: LootEntry[] | null | undefined): number {
  return gold + (contents || []).reduce((total, entry) => total + (entry.value_gp ?? 0) * entry.quantity, 0)
}

export function formatGp(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`
}
