/** Headless reducer for the live encounter runner: HP, duplicate/add/remove, and turn order.
 * Pure, UI-free — consumed by useEncounterRunner (Stage E4) for both the standalone page and
 * the dungeon dock.
 */
import type { Encounter, EncounterCreature, EncounterInput, Monster } from '../../api/types'
import { deriveCreatureStats } from './encounterStats'

let clientIdCounter = 0
function nextClientId(): string {
  clientIdCounter += 1
  return `combatant-${clientIdCounter}`
}

export interface RunnerCombatant extends EncounterCreature {
  clientId: string
}

export interface RunnerState {
  combatants: RunnerCombatant[]
  activeClientId: string | null
  round: number
}

export type RunnerAction =
  | { type: 'hydrate'; encounter: Encounter }
  | { type: 'adjustHp'; clientId: string; delta: number }
  | { type: 'setHp'; clientId: string; hp: number }
  | { type: 'setStatus'; clientId: string; status: string }
  | { type: 'setConditions'; clientId: string; conditions: string[] }
  | { type: 'duplicate'; clientId: string }
  | { type: 'addFromMonster'; monster: Monster }
  | { type: 'remove'; clientId: string }
  | { type: 'rename'; clientId: string; name: string }
  | { type: 'reorder'; fromIndex: number; toIndex: number }
  | { type: 'moveUp'; clientId: string }
  | { type: 'moveDown'; clientId: string }
  | { type: 'setActive'; clientId: string }
  | { type: 'nextTurn' }

export function createInitialState(): RunnerState {
  return { combatants: [], activeClientId: null, round: 1 }
}

function clampHp(value: number, hpMax: number | null | undefined): number {
  const max = typeof hpMax === 'number' ? hpMax : Infinity
  return Math.max(0, Math.min(value, max))
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= arr.length ||
    toIndex < 0 ||
    toIndex >= arr.length ||
    fromIndex === toIndex
  ) {
    return arr
  }
  const next = arr.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

/** Derive a fresh combatant from a monster: hp_current = hp_max = hp.average when derivable. */
export function combatantFromMonster(monster: Monster): RunnerCombatant {
  const { hpAverage, ac } = deriveCreatureStats(monster)

  return {
    clientId: nextClientId(),
    monster_id: monster.id,
    original_name: monster.name,
    name: monster.name,
    hp_current: hpAverage,
    hp_max: hpAverage,
    ac,
    status: 'alive',
    conditions: [],
  }
}

/** Strip clientId back to the wire shape, preserving order, and derive active_index. */
export function combatantsToCreatures(
  state: RunnerState
): { creatures: EncounterCreature[]; active_index: number | null } {
  const creatures: EncounterCreature[] = state.combatants.map(({ clientId: _clientId, ...creature }) => creature)
  const activeIndex = state.combatants.findIndex((c) => c.clientId === state.activeClientId)
  return { creatures, active_index: activeIndex === -1 ? null : activeIndex }
}

/** Serialize runner state into a full EncounterInput (used when the caller also needs the title). */
export function runnerStateToEncounterInput(state: RunnerState, title: string): EncounterInput {
  const { creatures, active_index } = combatantsToCreatures(state)
  return { title, creatures, active_index }
}

export function hydrate(encounter: Encounter): RunnerState {
  const combatants: RunnerCombatant[] = (encounter.creatures || []).map((creature) => ({
    ...creature,
    clientId: nextClientId(),
  }))
  const activeIndex = encounter.active_index
  const activeClientId =
    typeof activeIndex === 'number' && combatants[activeIndex]
      ? combatants[activeIndex].clientId
      : (combatants[0]?.clientId ?? null)

  return { combatants, activeClientId, round: 1 }
}

export function encounterRunnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case 'hydrate':
      return hydrate(action.encounter)

    case 'adjustHp':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.clientId === action.clientId
            ? { ...c, hp_current: clampHp((c.hp_current ?? 0) + action.delta, c.hp_max) }
            : c
        ),
      }

    case 'setHp':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.clientId === action.clientId ? { ...c, hp_current: clampHp(action.hp, c.hp_max) } : c
        ),
      }

    case 'setStatus':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.clientId === action.clientId ? { ...c, status: action.status } : c
        ),
      }

    case 'setConditions':
      // TODO (R1): implement conditions reducer
      return state

    case 'rename':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.clientId === action.clientId ? { ...c, name: action.name } : c
        ),
      }

    case 'duplicate': {
      const index = state.combatants.findIndex((c) => c.clientId === action.clientId)
      if (index === -1) return state
      const source = state.combatants[index]
      const copy: RunnerCombatant = {
        ...source,
        clientId: nextClientId(),
        hp_current: source.hp_max ?? source.hp_current ?? null,
      }
      const combatants = state.combatants.slice()
      combatants.splice(index + 1, 0, copy)
      return { ...state, combatants }
    }

    case 'addFromMonster':
      return { ...state, combatants: [...state.combatants, combatantFromMonster(action.monster)] }

    case 'remove': {
      const index = state.combatants.findIndex((c) => c.clientId === action.clientId)
      if (index === -1) return state
      const combatants = state.combatants.filter((c) => c.clientId !== action.clientId)
      let activeClientId = state.activeClientId
      if (state.activeClientId === action.clientId) {
        activeClientId = combatants.length === 0 ? null : combatants[Math.min(index, combatants.length - 1)].clientId
      }
      return { ...state, combatants, activeClientId }
    }

    case 'reorder': {
      const combatants = moveItem(state.combatants, action.fromIndex, action.toIndex)
      return { ...state, combatants }
    }

    case 'moveUp': {
      const index = state.combatants.findIndex((c) => c.clientId === action.clientId)
      if (index <= 0) return state
      return { ...state, combatants: moveItem(state.combatants, index, index - 1) }
    }

    case 'moveDown': {
      const index = state.combatants.findIndex((c) => c.clientId === action.clientId)
      if (index === -1 || index >= state.combatants.length - 1) return state
      return { ...state, combatants: moveItem(state.combatants, index, index + 1) }
    }

    case 'setActive':
      return { ...state, activeClientId: action.clientId }

    case 'nextTurn': {
      if (state.combatants.length === 0) return state
      const currentIndex = state.combatants.findIndex((c) => c.clientId === state.activeClientId)
      if (currentIndex === -1) {
        return { ...state, activeClientId: state.combatants[0].clientId }
      }
      const nextIndex = (currentIndex + 1) % state.combatants.length
      const wrapped = nextIndex <= currentIndex
      return {
        ...state,
        activeClientId: state.combatants[nextIndex].clientId,
        round: wrapped ? state.round + 1 : state.round,
      }
    }

    default:
      return state
  }
}
