import { describe, expect, it } from 'vitest'
import type { Item } from '../../../api/types'
import { emptyLootBundleForm, itemToLootEntry, lootBundleFormReducer } from '../lootBundleForm'

const ruby: Item = { id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: null }

describe('lootBundleForm', () => {
  it('adds a snapshotted entry once, increments it on repeated selection, and removes it', () => {
    const entry = itemToLootEntry(ruby)
    let state = lootBundleFormReducer(emptyLootBundleForm(), { type: 'addEntry', entry })
    state = lootBundleFormReducer(state, { type: 'addEntry', entry: itemToLootEntry(ruby) })
    state = lootBundleFormReducer(state, { type: 'setGold', gold: '12.5' })
    state = lootBundleFormReducer(state, { type: 'setQuantity', index: 0, quantity: 3 })

    expect(state.gold).toBe('12.5')
    expect(state.contents).toHaveLength(1)
    expect(state.contents[0]).toMatchObject({ name: 'Ruby', value_gp: 50, quantity: 3 })
    expect(entry).toMatchObject({ name: 'Ruby', value_gp: 50, quantity: 1 })
    expect(lootBundleFormReducer(state, { type: 'removeEntry', index: 0 }).contents).toEqual([])
  })

  it('keeps the entry snapshot when the source catalog object changes', () => {
    const entry = itemToLootEntry(ruby)
    ruby.name = 'Changed Ruby'
    ruby.value_gp = 500

    expect(entry).toMatchObject({ name: 'Ruby', value_gp: 50, category: 'gem', quantity: 1 })
  })
})
