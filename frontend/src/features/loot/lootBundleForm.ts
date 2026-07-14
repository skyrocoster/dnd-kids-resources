import type { Item, LootBundle, LootBundleInput, LootEntry, Weapon } from '../../api/types'

export interface LootBundleFormState {
  name: string
  gold: string
  contents: LootEntry[]
}

export type LootBundleFormAction =
  | { type: 'setName'; name: string }
  | { type: 'setGold'; gold: string }
  | { type: 'addEntry'; entry: LootEntry }
  | { type: 'removeEntry'; index: number }
  | { type: 'setQuantity'; index: number; quantity: number }

export function emptyLootBundleForm(): LootBundleFormState {
  return { name: '', gold: '0', contents: [] }
}

export function lootBundleToFormState(bundle: LootBundle): LootBundleFormState {
  return { name: bundle.name, gold: String(bundle.gold), contents: bundle.contents || [] }
}

export function lootBundleFormReducer(state: LootBundleFormState, action: LootBundleFormAction): LootBundleFormState {
  switch (action.type) {
    case 'setName':
      return { ...state, name: action.name }
    case 'setGold':
      return { ...state, gold: action.gold }
    case 'addEntry': {
      const existingIndex = state.contents.findIndex(
        (entry) => entry.kind === action.entry.kind && entry.ref_id === action.entry.ref_id,
      )
      if (existingIndex === -1) return { ...state, contents: [...state.contents, action.entry] }
      return {
        ...state,
        contents: state.contents.map((entry, index) =>
          index === existingIndex ? { ...entry, quantity: entry.quantity + 1 } : entry,
        ),
      }
    }
    case 'removeEntry':
      return { ...state, contents: state.contents.filter((_, index) => index !== action.index) }
    case 'setQuantity':
      return {
        ...state,
        contents: state.contents.map((entry, index) =>
          index === action.index ? { ...entry, quantity: Math.max(1, Math.floor(action.quantity) || 1) } : entry,
        ),
      }
  }
}

export function itemToLootEntry(item: Item): LootEntry {
  return {
    kind: 'item',
    ref_id: item.id,
    name: item.name,
    value_gp: item.value_gp,
    category: item.category || null,
    quantity: 1,
  }
}

export function weaponToLootEntry(weapon: Weapon): LootEntry {
  return { kind: 'weapon', ref_id: weapon.id, name: weapon.name, value_gp: null, quantity: 1 }
}

export function formStateToLootBundleInput(form: LootBundleFormState): LootBundleInput {
  const gold = Number(form.gold)
  return {
    name: form.name.trim(),
    gold: Number.isFinite(gold) && gold >= 0 ? gold : 0,
    contents: form.contents,
  }
}
