import { describe, expect, it } from 'vitest'
import { computeBundleTotal } from '../lootTotals'

describe('computeBundleTotal', () => {
  it('adds decimal gold and multiplied item values while ignoring unvalued weapons', () => {
    expect(computeBundleTotal(12.5, [
      { kind: 'item', ref_id: 1, name: 'Ruby', value_gp: 50, category: 'gem', quantity: 2 },
      { kind: 'weapon', ref_id: 2, name: 'Longsword', value_gp: null, quantity: 3 },
    ])).toBe(112.5)
  })
})
