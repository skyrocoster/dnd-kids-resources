import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { LoomTapestry } from '../../../api/types'
import { remoteSuccess } from '../../../components/remoteState'
import { useLoomCanvasMutations } from '../useLoomCanvasMutations'

function demoTapestry(): LoomTapestry {
  return {
    threads: [],
    nodes: [
      { id: 1, kind: 'session', title: 'A', x: 0, y: 0, thread_ids: [] },
      { id: 2, kind: 'beat', title: 'B', x: 0, y: 0, thread_ids: [1] },
    ],
  }
}

describe('useLoomCanvasMutations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('persists a node position on drag stop', async () => {
    const patchLoomNodePosition = vi
      .spyOn(api, 'patchLoomNodePosition')
      .mockResolvedValue({ id: 1, kind: 'session', title: 'A', x: 40, y: 60, thread_ids: [] })
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.moveNode('1', 40, 60)
      await Promise.resolve()
    })

    expect(patchLoomNodePosition).toHaveBeenCalledWith(1, { x: 40, y: 60 })
  })

  it('surfaces a position-save error in the banner', async () => {
    vi.spyOn(api, 'patchLoomNodePosition').mockRejectedValue(new Error('save failed'))
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.moveNode('1', 40, 60)
      await Promise.resolve()
    })

    expect(result.current.error).toBe('save failed')
  })

  it('dismisses the error banner', async () => {
    vi.spyOn(api, 'patchLoomNodePosition').mockRejectedValue(new Error('boom'))
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.moveNode('1', 40, 60)
      await Promise.resolve()
    })
    expect(result.current.error).toBe('boom')

    act(() => result.current.dismissError())
    expect(result.current.error).toBeNull()
  })
})
