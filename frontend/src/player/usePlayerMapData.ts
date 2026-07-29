import { useEffect, useRef, useState } from 'react'
import { ApiError, getAtTheTable, getDungeonKnowledge, getDungeonLayout, getDungeonSessionState } from '../api/client'
import type { MapKnowledge } from '../api/types'
import { normalizeLayout, type MapLayout, type PassageSessionState } from '../model/maplabModel'
import { playerOpenDoorIds, playerViewTransform, type KidMapLayout } from './curtain'

export const PLAYER_MAP_POLL_INTERVAL_MS = 5_000

export type PlayerMapDataStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface PlayerMapData {
  dungeonId: number | null
  layout: KidMapLayout | null
  /** Doors the DM has opened in this dungeon's session. Open/closed only — the session blob's
   * locked and trapped flags are dropped by the curtain and never reach the tablet. */
  openDoorIds: ReadonlySet<number>
  /** The party room id from the session blob, null if unset or session unavailable. */
  partyRoomId: number | null
  status: PlayerMapDataStatus
  error: Error | null
}

const NO_OPEN_DOORS: ReadonlySet<number> = new Set<number>()

const INITIAL_STATE: PlayerMapData = {
  dungeonId: null,
  layout: null,
  openDoorIds: NO_OPEN_DOORS,
  partyRoomId: null,
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
          setState({ dungeonId: null, layout: null, openDoorIds: NO_OPEN_DOORS, partyRoomId: null, status: 'empty', error: null })
          scheduleNext()
          return
        }

        const blob = await getDungeonLayout(pointer.dungeon_id, request.signal)
        if (cancelled || request.signal.aborted) return

        // Knowledge is an optional overlay. On the first frame, an unavailable knowledge document
        // must not hide an otherwise available map; later failures still retain the last good frame.
        const knowledge = await getDungeonKnowledge(pointer.dungeon_id, request.signal)
          .then(k => k.data as MapKnowledge | undefined)
          .catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 404) return undefined
            if (!lastGoodFrame.current) return undefined
            throw err
          })
        if (cancelled || request.signal.aborted) return

        // A dungeon with no session row yet (404) simply has no open doors — that must not fail the
        // whole frame, so this one call swallows its own error rather than joining the catch below.
        // Any failure degrades to default (closed, unlocked, armed) state rather than freezing the
        // frame: a persistently unavailable session endpoint must not stop layout updates reaching
        // the tablet.
        const session = await getDungeonSessionState(pointer.dungeon_id, request.signal)
          .then((s) => {
            const data = s.data as {
              doors?: Record<string, PassageSessionState>
              stairs?: Record<string, PassageSessionState>
              portals?: Record<string, PassageSessionState>
              partyRoomId?: number | null
            }
            return { doors: data.doors, stairs: data.stairs, portals: data.portals, partyRoomId: data.partyRoomId ?? null }
          })
          .catch(() => ({ doors: undefined, stairs: undefined, portals: undefined, partyRoomId: null }))
        if (cancelled || request.signal.aborted) return

        const layout = playerViewTransform(
          normalizeLayout(blob.data as unknown as MapLayout),
          knowledge,
          { doors: session.doors, stairs: session.stairs, portals: session.portals },
        )
        const frame: PlayerMapData = {
          dungeonId: pointer.dungeon_id,
          layout,
          openDoorIds: playerOpenDoorIds(session.doors),
          partyRoomId: session.partyRoomId,
          status: 'ready',
          error: null,
        }
        lastGoodFrame.current = frame
        setState(frame)
      } catch (error: unknown) {
        if (cancelled || request.signal.aborted) return

        if (error instanceof ApiError && error.status === 404) {
          lastGoodFrame.current = null
          setState({ dungeonId: null, layout: null, openDoorIds: NO_OPEN_DOORS, partyRoomId: null, status: 'empty', error: null })
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
          openDoorIds: NO_OPEN_DOORS,
          partyRoomId: null,
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
