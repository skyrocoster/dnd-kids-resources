import { useEffect, useRef, useState } from 'react'
import { ApiError, getAtTheTable, getDungeonLayout } from '../api/client'
import { normalizeLayout, type MapLayout } from '../model/maplabModel'
import { playerViewTransform, type KidMapLayout } from './curtain'

export const PLAYER_MAP_POLL_INTERVAL_MS = 5_000

export type PlayerMapDataStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface PlayerMapData {
  dungeonId: number | null
  layout: KidMapLayout | null
  status: PlayerMapDataStatus
  error: Error | null
}

const INITIAL_STATE: PlayerMapData = {
  dungeonId: null,
  layout: null,
  status: 'loading',
  error: null,
}

export function usePlayerMapData(): PlayerMapData {
  const [state, setState] = useState<PlayerMapData>(INITIAL_STATE)
  const lastGoodFrame = useRef<PlayerMapData | null>(null)

  useEffect(() => {
    let cancelled = false
    let activeRequest: AbortController | null = null
    let pollTimer: number | null = null

    const scheduleNext = () => {
      if (cancelled) return
      pollTimer = window.setTimeout(() => void poll(), PLAYER_MAP_POLL_INTERVAL_MS)
    }

    const poll = async () => {
      activeRequest?.abort()
      const request = new AbortController()
      activeRequest = request

      try {
        const pointer = await getAtTheTable(request.signal)
        if (cancelled || request.signal.aborted) return

        if (pointer.dungeon_id === null) {
          lastGoodFrame.current = null
          setState({ dungeonId: null, layout: null, status: 'empty', error: null })
          scheduleNext()
          return
        }

        const blob = await getDungeonLayout(pointer.dungeon_id, request.signal)
        if (cancelled || request.signal.aborted) return

        const layout = playerViewTransform(normalizeLayout(blob.data as unknown as MapLayout))
        const frame: PlayerMapData = {
          dungeonId: pointer.dungeon_id,
          layout,
          status: 'ready',
          error: null,
        }
        lastGoodFrame.current = frame
        setState(frame)
      } catch (error: unknown) {
        if (cancelled || request.signal.aborted) return

        if (error instanceof ApiError && error.status === 404) {
          lastGoodFrame.current = null
          setState({ dungeonId: null, layout: null, status: 'empty', error: null })
          scheduleNext()
          return
        }

        if (lastGoodFrame.current) {
          setState(lastGoodFrame.current)
          scheduleNext()
          return
        }

        setState({
          dungeonId: null,
          layout: null,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      }

      scheduleNext()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (pollTimer !== null) {
          window.clearTimeout(pollTimer)
          pollTimer = null
        }
        void poll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    void poll()

    return () => {
      cancelled = true
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      activeRequest?.abort()
    }
  }, [])

  return state
}
