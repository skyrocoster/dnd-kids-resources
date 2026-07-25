/** Loads and persists a dungeon's door/stair/portal session-state overrides. Mirrors the
 * load/404-as-empty pattern from useMapLabLayout.ts, but a toggle is not a form: every change
 * after the initial load writes through immediately, no debounce. */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  ApiError,
  getDungeonSessionState,
  resetDungeonSessionState,
  saveDungeonSessionState,
} from '../../../api/client'
import type { PassageSessionState } from '../../../model/maplabModel'

type SessionMap = Record<number, PassageSessionState>

interface UseMapLabSessionStateResult {
  doorSessions: SessionMap
  setDoorSessions: Dispatch<SetStateAction<SessionMap>>
  stairSessions: SessionMap
  setStairSessions: Dispatch<SetStateAction<SessionMap>>
  portalSessions: SessionMap
  setPortalSessions: Dispatch<SetStateAction<SessionMap>>
  resetSessions: () => void
  loadStatus: 'loading' | 'ready' | 'empty' | 'error'
  actionError: string | null
  clearActionError: () => void
}

export function useMapLabSessionState(dungeonId: number | null): UseMapLabSessionStateResult {
  const [doorSessions, setDoorSessions] = useState<SessionMap>({})
  const [stairSessions, setStairSessions] = useState<SessionMap>({})
  const [portalSessions, setPortalSessions] = useState<SessionMap>({})
  const [loadStatus, setLoadStatus] = useState<UseMapLabSessionStateResult['loadStatus']>('loading')
  const [actionError, setActionError] = useState<string | null>(null)

  // The initial load's own state-setting counts as a change too, since it's a fresh object
  // reference — skipNextSaveRef swallows exactly that one save so it can't stomp a save that's
  // still in flight before the load resolved.
  const hasLoadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)

  useEffect(() => {
    hasLoadedRef.current = false

    if (dungeonId === null) {
      setDoorSessions({})
      setStairSessions({})
      setPortalSessions({})
      setLoadStatus('error')
      return
    }

    let cancelled = false
    setLoadStatus('loading')

    getDungeonSessionState(dungeonId)
      .then((blob) => {
        if (cancelled) return
        const data = blob.data as { doors?: SessionMap; stairs?: SessionMap; portals?: SessionMap }
        skipNextSaveRef.current = true
        setDoorSessions(data.doors ?? {})
        setStairSessions(data.stairs ?? {})
        setPortalSessions(data.portals ?? {})
        setLoadStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        skipNextSaveRef.current = true
        setDoorSessions({})
        setStairSessions({})
        setPortalSessions({})
        setLoadStatus(err instanceof ApiError && err.status === 404 ? 'empty' : 'error')
      })
      .finally(() => {
        if (!cancelled) hasLoadedRef.current = true
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  useEffect(() => {
    if (dungeonId === null || !hasLoadedRef.current) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    saveDungeonSessionState(dungeonId, {
      data: { doors: doorSessions, stairs: stairSessions, portals: portalSessions },
    }).catch(() => {
      setActionError("Couldn't save session changes. Try again.")
    })
  }, [dungeonId, doorSessions, stairSessions, portalSessions])

  function resetSessions() {
    // Skip the save effect this state change would otherwise trigger — resetting must clear the
    // backend row via DELETE, not immediately recreate it with a PUT of empty maps.
    skipNextSaveRef.current = true
    setDoorSessions({})
    setStairSessions({})
    setPortalSessions({})
    if (dungeonId !== null) {
      resetDungeonSessionState(dungeonId).catch(() => {
        setActionError("Couldn't reset dungeon. Try again.")
      })
    }
  }

  return {
    doorSessions,
    setDoorSessions,
    stairSessions,
    setStairSessions,
    portalSessions,
    setPortalSessions,
    resetSessions,
    loadStatus,
    actionError,
    clearActionError: () => setActionError(null),
  }
}
