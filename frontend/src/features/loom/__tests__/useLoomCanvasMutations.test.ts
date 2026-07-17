import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { ApiError } from '../../../api/client'
import type { LoomTapestry } from '../../../api/types'
import { remoteSuccess } from '../../../components/remoteState'
import { useLoomCanvasMutations } from '../useLoomCanvasMutations'

function demoTapestry(): LoomTapestry {
  return {
    threads: [],
    nodes: [
      { id: 1, kind: 'update', title: 'A', x: 0, y: 0, thread_ids: [] },
      { id: 3, kind: 'update', title: 'B', x: 0, y: 0, thread_ids: [] },
      { id: 4, kind: 'anchor', title: 'C', status: 'planned', x: 0, y: 0, thread_ids: [] },
    ],
    edges: [{ id: 1, source_id: 1, target_id: 3 }],
  }
}

describe('useLoomCanvasMutations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects a connection that would create a cycle', () => {
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    expect(result.current.isValidConnection('3', '1')).toBe(false)
    expect(result.current.isValidConnection('3', '4')).toBe(true)
  })

  it('creates an edge and reloads on a successful connect', async () => {
    const createLoomEdge = vi.spyOn(api, 'createLoomEdge').mockResolvedValue({ id: 2, source_id: 3, target_id: 4 })
    const reload = vi.fn()
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, reload))

    await act(async () => {
      result.current.connect('3', '4')
      await Promise.resolve()
    })

    expect(createLoomEdge).toHaveBeenCalledWith({ source_id: 3, target_id: 4 })
    expect(reload).toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('surfaces a 409 already-connected error in the banner', async () => {
    vi.spyOn(api, 'createLoomEdge').mockRejectedValue(new ApiError(409, 'These nodes are already connected'))
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.connect('1', '3')
      await Promise.resolve()
    })

    expect(result.current.error).toBe('These nodes are already connected')
  })

  it('surfaces a 422 cycle error in the banner', async () => {
    vi.spyOn(api, 'createLoomEdge').mockRejectedValue(new ApiError(422, 'This edge would create a cycle'))
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.connect('3', '1')
      await Promise.resolve()
    })

    expect(result.current.error).toBe('This edge would create a cycle')
  })

  it('dismisses the error banner', async () => {
    vi.spyOn(api, 'createLoomEdge').mockRejectedValue(new Error('boom'))
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.connect('1', '3')
      await Promise.resolve()
    })
    expect(result.current.error).toBe('boom')

    act(() => result.current.dismissError())
    expect(result.current.error).toBeNull()
  })

  it('persists a node position on drag stop', async () => {
    const patchLoomNodePosition = vi
      .spyOn(api, 'patchLoomNodePosition')
      .mockResolvedValue({ id: 1, kind: 'update', title: 'A', x: 40, y: 60, thread_ids: [] })
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, vi.fn()))

    await act(async () => {
      result.current.moveNode('1', 40, 60)
      await Promise.resolve()
    })

    expect(patchLoomNodePosition).toHaveBeenCalledWith(1, { x: 40, y: 60 })
  })

  it('removes an edge and reloads', async () => {
    const deleteLoomEdge = vi.spyOn(api, 'deleteLoomEdge').mockResolvedValue(undefined)
    const reload = vi.fn()
    const tapestry = remoteSuccess(demoTapestry())
    const { result } = renderHook(() => useLoomCanvasMutations(tapestry, reload))

    await act(async () => {
      await result.current.removeEdge('1')
    })

    expect(deleteLoomEdge).toHaveBeenCalledWith(1)
    expect(reload).toHaveBeenCalled()
  })
})
