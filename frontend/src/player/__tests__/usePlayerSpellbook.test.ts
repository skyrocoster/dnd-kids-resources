import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { getPlayerSpellbook } from '../../api/client'
import {
  PLAYER_SPELLBOOK_POLL_INTERVAL_MS,
  usePlayerSpellbook,
} from '../usePlayerSpellbook'

vi.mock('../../api/client', () => ({
  getPlayerSpellbook: vi.fn(),
}))

const mockedGetPlayerSpellbook = vi.mocked(getPlayerSpellbook)

const frame = (name: string) => [
  { id: 1, name, spells: [{ id: 11, name: `${name} spell` }] },
] as unknown as Awaited<ReturnType<typeof getPlayerSpellbook>>

describe('usePlayerSpellbook', () => {
  beforeEach(() => mockedGetPlayerSpellbook.mockReset())

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('boots with a loading request and reports a ready frame', async () => {
    mockedGetPlayerSpellbook.mockResolvedValue(frame('Mira'))

    const { result } = renderHook(() => usePlayerSpellbook())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(mockedGetPlayerSpellbook).toHaveBeenCalledOnce()
    expect(result.current.characters[0].spells).toHaveLength(1)
  })

  it('refreshes on the interval and on visibility wake', async () => {
    vi.useFakeTimers()
    mockedGetPlayerSpellbook
      .mockResolvedValueOnce(frame('Before'))
      .mockResolvedValue(frame('After'))

    const { result } = renderHook(() => usePlayerSpellbook())
    await act(async () => {})
    expect(result.current.characters[0].name).toBe('Before')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_SPELLBOOK_POLL_INTERVAL_MS)
    })
    expect(result.current.characters[0].name).toBe('After')

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => {})
    expect(mockedGetPlayerSpellbook).toHaveBeenCalledTimes(3)
  })

  it('reports initial errors and treats an empty result as empty', async () => {
    mockedGetPlayerSpellbook.mockRejectedValueOnce(new Error('offline'))
    const failed = renderHook(() => usePlayerSpellbook())
    await waitFor(() => expect(failed.result.current.status).toBe('error'))
    expect(failed.result.current.error?.message).toBe('offline')
    failed.unmount()

    mockedGetPlayerSpellbook.mockResolvedValue([])
    const empty = renderHook(() => usePlayerSpellbook())
    await waitFor(() => expect(empty.result.current.status).toBe('empty'))
    expect(empty.result.current.characters).toEqual([])
  })

  it('retains the last good frame and recovers after a failed poll', async () => {
    vi.useFakeTimers()
    mockedGetPlayerSpellbook
      .mockResolvedValueOnce(frame('Before'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(frame('Recovered'))

    const { result } = renderHook(() => usePlayerSpellbook())
    await act(async () => {})
    const firstFrame = result.current.characters

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_SPELLBOOK_POLL_INTERVAL_MS)
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.characters).toBe(firstFrame)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYER_SPELLBOOK_POLL_INTERVAL_MS)
    })
    expect(result.current.characters[0].name).toBe('Recovered')
  })

  it('aborts the active request on cleanup', async () => {
    mockedGetPlayerSpellbook.mockResolvedValue([])
    const { result, unmount } = renderHook(() => usePlayerSpellbook())
    await waitFor(() => expect(result.current.status).toBe('empty'))
    const signal = mockedGetPlayerSpellbook.mock.calls[0]?.[0]
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
