import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getAtTheTable, getDungeonKnowledge, getDungeonLayout, getDungeonSessionState } from '../../api/client'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { playerViewTransform } from '../curtain'
import { PLAYER_MAP_POLL_INTERVAL_MS, usePlayerMapData } from '../usePlayerMapData'

function layoutResponse(title: string) {
  return { data: createEmptyMapLayout(title) as unknown as Record<string, unknown> }
}

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client')
  return {
    ...actual,
    getAtTheTable: vi.fn(),
    getDungeonKnowledge: vi.fn(),
    getDungeonLayout: vi.fn(),
    getDungeonSessionState: vi.fn(),
  }
})

vi.mock('../curtain', async () => {
  const actual = await vi.importActual<typeof import('../curtain')>('../curtain')
  return {
    ...actual,
    playerViewTransform: vi.fn(actual.playerViewTransform),
  }
})

const mockedGetAtTheTable = vi.mocked(getAtTheTable)
const mockedGetDungeonKnowledge = vi.mocked(getDungeonKnowledge)
const mockedGetDungeonLayout = vi.mocked(getDungeonLayout)
const mockedGetDungeonSessionState = vi.mocked(getDungeonSessionState)
const mockedPlayerViewTransform = vi.mocked(playerViewTransform)

describe('usePlayerMapData', () => {
  beforeEach(() => {
    mockedGetAtTheTable.mockReset()
    mockedGetDungeonKnowledge.mockReset()
    mockedGetDungeonLayout.mockReset()
    mockedGetDungeonSessionState.mockReset()
    mockedGetDungeonSessionState.mockRejectedValue(new Error('not used'))
    mockedGetDungeonKnowledge.mockResolvedValue({ data: { doors: { '1': { exists: true } } } })
    mockedPlayerViewTransform.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('reports empty when no dungeon is at the table', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: null })

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.layout).toBeNull()
    expect(mockedGetDungeonLayout).not.toHaveBeenCalled()
  })

  it('normalizes and passes a successful layout through the curtain', async () => {
    const rawLayout = { ...createEmptyMapLayout('School'), portals: undefined, features: undefined }
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue({ data: rawLayout })

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.dungeonId).toBe(7)
    expect(result.current.layout?.portals).toEqual([])
    expect(result.current.layout).not.toHaveProperty('features')
    expect(mockedPlayerViewTransform).toHaveBeenCalledOnce()
  })

  it('follows a changed at-the-table pointer', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockResolvedValueOnce({ dungeon_id: 7 })
      .mockResolvedValueOnce({ dungeon_id: 8 })
    mockedGetDungeonLayout
      .mockResolvedValueOnce(layoutResponse('School'))
      .mockResolvedValueOnce(layoutResponse('Annex'))
    mockedGetDungeonSessionState.mockResolvedValue({ data: {} as unknown as Record<string, unknown> })

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.dungeonId).toBe(7)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(result.current.dungeonId).toBe(8)
    expect(result.current.layout?.floors[0].title).toBe('Annex')
  })

  it('refreshes the current dungeon on the polling interval', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout
      .mockResolvedValueOnce(layoutResponse('Before'))
      .mockResolvedValueOnce(layoutResponse('After'))
    mockedGetDungeonSessionState.mockResolvedValue({ data: {} as unknown as Record<string, unknown> })

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.layout?.floors[0].title).toBe('Before')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(mockedGetDungeonLayout).toHaveBeenCalledTimes(2)
    expect(result.current.layout?.floors[0].title).toBe('After')
  })

  it('keeps the last good frame through a failed poll', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockResolvedValueOnce({ dungeon_id: 7 })
      .mockRejectedValueOnce(new Error('offline'))
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    const firstFrame = result.current.layout
    expect(result.current.status).toBe('ready')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.layout).toBe(firstFrame)
    expect(result.current.error).toBeNull()
  })

  it('polls immediately on visibility change simulating device wake', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.status).toBe('ready')
    expect(mockedGetAtTheTable).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => {})

    expect(mockedGetAtTheTable).toHaveBeenCalledTimes(2)
    expect(result.current.dungeonId).toBe(7)
  })

  it('reports empty when getAtTheTable returns 404', async () => {
    mockedGetAtTheTable.mockRejectedValueOnce(new ApiError(404, ''))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.layout).toBeNull()
    expect(mockedGetDungeonLayout).not.toHaveBeenCalled()
  })

  it('reports empty when getDungeonLayout returns 404', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockRejectedValueOnce(new ApiError(404, ''))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.layout).toBeNull()
  })

  it('reports error when the initial poll fails with no good frame', async () => {
    mockedGetAtTheTable.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.layout).toBeNull()
    expect(result.current.error).not.toBeNull()
  })

  it('recovers from error on the next polling cycle', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))

    const { result } = renderHook(() => usePlayerMapData())
    expect(result.current.status).toBe('loading')

    await act(async () => {})
    expect(result.current.status).toBe('error')
    expect(result.current.layout).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.dungeonId).toBe(7)
  })

  it('exposes the partyRoomId from the session blob', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))
    mockedGetDungeonSessionState.mockResolvedValue(
      { data: { partyRoomId: 12 } as unknown as Record<string, unknown> },
    )

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.partyRoomId).toBe(12)
  })

  it('uses null partyRoomId when the session request fails', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.partyRoomId).toBeNull()
  })

  it('continues polling after a retained-last-frame recovery', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockResolvedValueOnce({ dungeon_id: 7 })
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ dungeon_id: 8 })
    mockedGetDungeonLayout
      .mockResolvedValueOnce(layoutResponse('School'))
      .mockResolvedValueOnce(layoutResponse('Annex'))
    mockedGetDungeonSessionState.mockResolvedValue({ data: {} as unknown as Record<string, unknown> })

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.status).toBe('ready')
    expect(result.current.dungeonId).toBe(7)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.dungeonId).toBe(7)
    expect(mockedGetAtTheTable).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.dungeonId).toBe(8)
    expect(result.current.layout?.floors[0].title).toBe('Annex')
  })

  it('passes knowledge to the curtain', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))
    mockedGetDungeonKnowledge.mockResolvedValue({
      data: { doors: { '1': { exists: true } } },
    })

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    const knowledgeArg = mockedPlayerViewTransform.mock.calls[0][1]
    expect(knowledgeArg).toEqual({ doors: { '1': { exists: true } } })
  })

  it('treats 404 knowledge response as empty knowledge', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))
    mockedGetDungeonKnowledge.mockRejectedValueOnce(new ApiError(404, ''))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    const knowledgeArg = mockedPlayerViewTransform.mock.calls[0][1]
    expect(knowledgeArg).toBeUndefined()
  })

  it('still shows the map when the first knowledge request fails', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))
    mockedGetDungeonKnowledge.mockRejectedValueOnce(new Error('knowledge table unavailable'))

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.layout).not.toBeNull()
    expect(mockedPlayerViewTransform).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      expect.anything(),
    )
  })

  it('forwards grouped session maps including props to the curtain', async () => {
    mockedGetAtTheTable.mockResolvedValue({ dungeon_id: 7 })
    mockedGetDungeonLayout.mockResolvedValue(layoutResponse('School'))
    mockedGetDungeonSessionState.mockResolvedValue({
      data: {
        doors: { '5': { open: true }, '6': { open: false } },
        stairs: { '3': { open: true } },
        props: { '9': { open: true } },
        portals: { '1': { open: true } },
        partyRoomId: 42,
      } as unknown as Record<string, unknown>,
    })

    const { result } = renderHook(() => usePlayerMapData())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.openDoorIds).toEqual(new Set([5]))
    expect(result.current.partyRoomId).toBe(42)
    const sessionsArg = mockedPlayerViewTransform.mock.calls[0][2]
    expect(sessionsArg).toEqual({
      doors: { '5': { open: true }, '6': { open: false } },
      stairs: { '3': { open: true } },
      props: { '9': { open: true } },
      portals: { '1': { open: true } },
    })
  })

  it('retains last good frame through a later knowledge failure', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockResolvedValueOnce({ dungeon_id: 7 })
      .mockResolvedValueOnce({ dungeon_id: 7 })
    mockedGetDungeonLayout
      .mockResolvedValueOnce(layoutResponse('School'))
      .mockResolvedValueOnce(layoutResponse('School'))
    mockedGetDungeonKnowledge
      .mockResolvedValueOnce({ data: { doors: { '1': { exists: true } } } })
      .mockRejectedValueOnce(new Error('knowledge offline'))

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.status).toBe('ready')
    const firstFrame = result.current.layout

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.layout).toBe(firstFrame)
    expect(result.current.error).toBeNull()
  })

  it('survives a later session failure after a settled grouped-session frame', async () => {
    vi.useFakeTimers()
    mockedGetAtTheTable
      .mockResolvedValueOnce({ dungeon_id: 7 })
      .mockResolvedValueOnce({ dungeon_id: 7 })
    mockedGetDungeonLayout
      .mockResolvedValueOnce(layoutResponse('School'))
      .mockResolvedValueOnce(layoutResponse('School'))
    mockedGetDungeonSessionState
      .mockResolvedValueOnce({
        data: {
          doors: { '5': { open: true }, '6': { open: false } },
          stairs: { '3': { open: true } },
          props: { '9': { open: true } },
          portals: { '1': { open: true } },
          partyRoomId: 42,
        } as unknown as Record<string, unknown>,
      })
      .mockRejectedValueOnce(new Error('session offline'))

    const { result } = renderHook(() => usePlayerMapData())
    await act(async () => {})
    expect(result.current.status).toBe('ready')
    expect(result.current.openDoorIds).toEqual(new Set([5]))
    expect(result.current.partyRoomId).toBe(42)
    const sessionsArg = mockedPlayerViewTransform.mock.calls[0][2]
    expect(sessionsArg).toEqual({
      doors: { '5': { open: true }, '6': { open: false } },
      stairs: { '3': { open: true } },
      props: { '9': { open: true } },
      portals: { '1': { open: true } },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_MAP_POLL_INTERVAL_MS)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.openDoorIds).toEqual(new Set([5]))
    expect(result.current.partyRoomId).toBe(42)
  })
})
