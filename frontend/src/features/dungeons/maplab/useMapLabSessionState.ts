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
import type { SessionFixtureState } from '../../../model/maplabModel'

type SessionMap = Record<number, SessionFixtureState>

export type SessionFixtureKind = 'door' | 'stair' | 'portal' | 'prop'

/** Last server-confirmed session maps — the rollback baseline for a failed write. A write that
 *  fails restores the affected fixture's entry to these values so the UI never shows an
 *  optimistic state a reload or the player map would contradict (handoff §3.3). */
type ConfirmedSessionMaps = {
  doors: SessionMap
  stairs: SessionMap
  portals: SessionMap
  props: SessionMap
}

const EMPTY_CONFIRMED: ConfirmedSessionMaps = { doors: {}, stairs: {}, portals: {}, props: {} }

interface UseMapLabSessionStateResult {
  doorSessions: SessionMap
  setDoorSessions: Dispatch<SetStateAction<SessionMap>>
  stairSessions: SessionMap
  setStairSessions: Dispatch<SetStateAction<SessionMap>>
  portalSessions: SessionMap
  setPortalSessions: Dispatch<SetStateAction<SessionMap>>
  propSessions: SessionMap
  setPropSessions: Dispatch<SetStateAction<SessionMap>>
  partyRoomId: number | null
  setPartyRoomId: Dispatch<SetStateAction<number | null>>
  resetSessions: () => void
  loadStatus: 'loading' | 'ready' | 'empty' | 'error'
  actionError: string | null
  clearActionError: () => void
  /** Immediate sparse leaf write for one fixture — `undefined` removes the entry entirely. */
  writeFixture: (kind: SessionFixtureKind, id: number, leaf: SessionFixtureState | undefined) => void
  /** Fixture-local reset to authored — removes only the selected fixture's session entry. */
  resetFixture: (kind: SessionFixtureKind, id: number) => void
  /** Inline inspector write error, rendered with role=status by the shared inspector. */
  writeError: string | null
  clearWriteError: () => void
}

export function useMapLabSessionState(dungeonId: number | null): UseMapLabSessionStateResult {
  const [doorSessions, setDoorSessions] = useState<SessionMap>({})
  const [stairSessions, setStairSessions] = useState<SessionMap>({})
  const [portalSessions, setPortalSessions] = useState<SessionMap>({})
  const [propSessions, setPropSessions] = useState<SessionMap>({})
  const [partyRoomId, setPartyRoomId] = useState<number | null>(null)
  const [loadStatus, setLoadStatus] = useState<UseMapLabSessionStateResult['loadStatus']>('loading')
  const [actionError, setActionError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)

  // The initial load's own state-setting counts as a change too, since it's a fresh object
  // reference — skipNextSaveRef swallows exactly that one save so it can't stomp a save that's
  // still in flight before the load resolved.
  const hasLoadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  // Last server-confirmed maps — the rollback baseline for a failed write (handoff §3.3).
  const confirmedMapsRef = useRef<ConfirmedSessionMaps>(EMPTY_CONFIRMED)

  const setterByKind: Record<SessionFixtureKind, Dispatch<SetStateAction<SessionMap>>> = {
    door: setDoorSessions,
    stair: setStairSessions,
    portal: setPortalSessions,
    prop: setPropSessions,
  }

  useEffect(() => {
    hasLoadedRef.current = false

    if (dungeonId === null) {
      setDoorSessions({})
      setStairSessions({})
      setPortalSessions({})
      setPropSessions({})
      setPartyRoomId(null)
      setLoadStatus('error')
      return
    }

    let cancelled = false
    setLoadStatus('loading')

    getDungeonSessionState(dungeonId)
      .then((blob) => {
        if (cancelled) return
        const data = blob.data as { doors?: SessionMap; stairs?: SessionMap; portals?: SessionMap; props?: SessionMap; partyRoomId?: number | null }
        hasLoadedRef.current = true
        skipNextSaveRef.current = true
        confirmedMapsRef.current = {
          doors: data.doors ?? {},
          stairs: data.stairs ?? {},
          portals: data.portals ?? {},
          props: data.props ?? {},
        }
        setDoorSessions(data.doors ?? {})
        setStairSessions(data.stairs ?? {})
        setPortalSessions(data.portals ?? {})
        setPropSessions(data.props ?? {})
        setPartyRoomId(data.partyRoomId ?? null)
        setLoadStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        hasLoadedRef.current = true
        skipNextSaveRef.current = true
        confirmedMapsRef.current = EMPTY_CONFIRMED
        setDoorSessions({})
        setStairSessions({})
        setPortalSessions({})
        setPropSessions({})
        setPartyRoomId(null)
        setLoadStatus(err instanceof ApiError && err.status === 404 ? 'empty' : 'error')
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
      data: { doors: doorSessions, stairs: stairSessions, portals: portalSessions, props: propSessions, partyRoomId },
    })
      .then(() => {
        confirmedMapsRef.current = {
          doors: doorSessions,
          stairs: stairSessions,
          portals: portalSessions,
          props: propSessions,
        }
      })
      .catch(() => {
        setActionError("Couldn't save session changes. Try again.")
        // Roll back to the last server-confirmed maps so a reload or the player map agrees with
        // the DM view. Restoring the confirmed reference is idempotent: a second failure finds
        // the same reference and React bails, so this cannot loop or re-save confirmed values.
        setDoorSessions(confirmedMapsRef.current.doors)
        setStairSessions(confirmedMapsRef.current.stairs)
        setPortalSessions(confirmedMapsRef.current.portals)
        setPropSessions(confirmedMapsRef.current.props)
        // Inline inspector error (rendered with role=status by the shared inspector). Distinct
        // copy from the canvas chip so a page can show both without duplicate-text queries.
        setWriteError("Couldn't save session changes. The last change was reverted.")
      })
  }, [dungeonId, doorSessions, stairSessions, portalSessions, propSessions, partyRoomId, loadStatus])

  function writeFixture(kind: SessionFixtureKind, id: number, leaf: SessionFixtureState | undefined) {
    setWriteError(null)
    setterByKind[kind]((current) => {
      const next = { ...current }
      if (leaf === undefined) delete next[id]
      else next[id] = leaf
      return next
    })
  }

  function resetFixture(kind: SessionFixtureKind, id: number) {
    setWriteError(null)
    setterByKind[kind]((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function resetSessions() {
    // Skip the save effect this state change would otherwise trigger — resetting must clear the
    // backend row via DELETE, not immediately recreate it with a PUT of empty maps.
    skipNextSaveRef.current = true
    setDoorSessions({})
    setStairSessions({})
    setPortalSessions({})
    setPropSessions({})
    setPartyRoomId(null)
    if (dungeonId !== null) {
      resetDungeonSessionState(dungeonId)
        .then(() => {
          // The DELETE confirmed an empty row — roll back to that baseline, not stale maps.
          confirmedMapsRef.current = EMPTY_CONFIRMED
        })
        .catch(() => {
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
    propSessions,
    setPropSessions,
    partyRoomId,
    setPartyRoomId,
    resetSessions,
    loadStatus,
    actionError,
    clearActionError: () => setActionError(null),
    writeFixture,
    resetFixture,
    writeError,
    clearWriteError: () => setWriteError(null),
  }
}
