import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Encounter } from '../../../api/types'
import { useEncounterRunner } from '../useEncounterRunner'

const baseEncounter: Encounter = {
  id: 1,
  title: 'Kennels',
  active_index: 0,
  creatures: [
    { monster_id: 1, original_name: 'Goblin', name: 'Goblin', hp_current: 7, hp_max: 7, ac: 15, status: 'alive', conditions: [] },
    { monster_id: 2, original_name: 'Wolf', name: 'Wolf', hp_current: 11, hp_max: 11, ac: 13, status: 'alive', conditions: [] },
  ],
}

describe('useEncounterRunner', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the encounter and hydrates the runner state', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.state.combatants).toHaveLength(2)
    expect(result.current.state.combatants[0].name).toBe('Goblin')
    expect(result.current.state.activeClientId).toBe(result.current.state.combatants[0].clientId)
  })

  it('fetches the canonical condition list', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue([
      { id: 1, name: 'Prone' },
      { id: 2, name: 'Poisoned' },
    ])

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.conditions).toEqual([
      { id: 1, name: 'Prone' },
      { id: 2, name: 'Poisoned' },
    ])
  })

  it('falls back to an empty condition list on fetch failure', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.conditions).toEqual([])
  })

  it('applies mutations optimistically before the debounced save fires', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    const updateSpy = vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    const clientId = result.current.state.combatants[0].clientId
    act(() => {
      result.current.adjustHp(clientId, -3)
    })

    expect(result.current.state.combatants[0].hp_current).toBe(4)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('coalesces rapid mutations into a single save after the debounce window', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    const updateSpy = vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    const clientId = result.current.state.combatants[0].clientId
    act(() => {
      result.current.adjustHp(clientId, -1)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.adjustHp(clientId, -1)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    // still within the debounce window of the second tap — no save yet
    expect(updateSpy).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
    const [id, payload] = updateSpy.mock.calls[0]
    expect(id).toBe(1)
    expect(payload.creatures![0].hp_current).toBe(5)
    expect(payload.active_index).toBe(0)
  })

  it('reorder and nextTurn also schedule a save carrying the new active_index', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    const updateSpy = vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.nextTurn()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(updateSpy.mock.calls[0][1].active_index).toBe(1)
  })

  it('transitions syncStatus through saving to saved on success', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.syncStatus).toBe('idle')
    const clientId = result.current.state.combatants[0].clientId
    act(() => {
      result.current.adjustHp(clientId, -1)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(result.current.syncStatus).toBe('saved')
  })

  it('addPlayer dispatches the addPlayer action', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.addPlayer('Aragorn', ['prone'])
    })

    const players = result.current.state.combatants.filter((c) => c.kind === 'player')
    expect(players).toHaveLength(1)
    expect(players[0].name).toBe('Aragorn')
    expect(players[0].hp_current).toBeNull()
    expect(players[0].conditions).toEqual(['prone'])
  })

  // ── VT0 scaffold seams ────────────────────────────────────────────────────

  it('exposes a load-error state when getEncounter fails (VT1 load-error recovery)', async () => {
    // VT1: useEncounterRunner must surface an error state for failed initial loads.
    // Currently the hook has no error handling for the getEncounter call — it would throw unhandled.
    // Expected: result.current.loading becomes false, result.current.loadError is truthy,
    // result.current.state remains the empty initial state.
    vi.spyOn(api, 'getEncounter').mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useEncounterRunner(1))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    // VT1 target: hook must expose loadError on the result type
    expect((result.current as unknown as Record<string, unknown>).loadError).toBeTruthy()
    expect(result.current.state.combatants).toHaveLength(0)
  })

  it('sets syncStatus to error on save failure but preserves local state', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useEncounterRunner(1))
    await act(async () => {
      await Promise.resolve()
    })

    const clientId = result.current.state.combatants[0].clientId
    act(() => {
      result.current.adjustHp(clientId, -3)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(result.current.syncStatus).toBe('error')
    expect(result.current.state.combatants[0].hp_current).toBe(4)
  })
})
