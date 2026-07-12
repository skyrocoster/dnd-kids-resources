/** Loads a dungeon's Map Lab layout, drives the editor reducer, and auto-saves changes to the
 * server (debounced) — mirrors the shipped encounterRunner.ts / useEncounterRunner.ts pattern.
 * When the backend has no saved layout yet (404), seeds from the static mapLabLayout fixture so
 * the editor always has something to show.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ApiError, getDungeonLayout, saveDungeonLayout } from '../../../api/client'
import { mapLabLayout } from './maplabData'
import { initialEditorState, mapLabEditorReducer, type EditorAction, type EditorState } from './maplabEditor'
import type { CardinalSide, MapCell, MapLayout } from './maplabModel'

const SAVE_DEBOUNCE_MS = 600

export interface SyncStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
}

export function useMapLabEditor(dungeonId: number) {
  const [state, dispatch] = useReducer(mapLabEditorReducer, mapLabLayout, initialEditorState)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })

  const stateRef = useRef(state)
  stateRef.current = state
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSyncStatus({ status: 'idle' })

    // Initial hydration dispatches directly (bypassing `apply`) so loading a layout — from the
    // backend or the fixture fallback — never itself schedules an autosave.
    getDungeonLayout(dungeonId)
      .then((blob) => {
        if (cancelled) return
        dispatch({ type: 'loadLayout', layout: blob.data as unknown as MapLayout })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          dispatch({ type: 'loadLayout', layout: mapLabLayout })
          setLoading(false)
          return
        }
        setSyncStatus({ status: 'error', error: 'Failed to load layout' })
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      setSyncStatus({ status: 'saving' })
      saveDungeonLayout(dungeonId, { data: stateRef.current.layout })
        .then(() => setSyncStatus({ status: 'saved' }))
        .catch(() => setSyncStatus({ status: 'error', error: 'Failed to save layout' }))
    }, SAVE_DEBOUNCE_MS)
  }, [dungeonId])

  const apply = useCallback(
    (action: EditorAction) => {
      dispatch(action)
      scheduleSave()
    },
    [scheduleSave]
  )

  const addRoom = useCallback(() => apply({ type: 'addRoom' }), [apply])
  const selectRoom = useCallback((roomId: number | null) => apply({ type: 'selectRoom', roomId }), [apply])
  const deleteRoom = useCallback((roomId: number) => apply({ type: 'deleteRoom', roomId }), [apply])
  const toggleCell = useCallback(
    (roomId: number, cell: MapCell) => apply({ type: 'toggleCell', roomId, cell }),
    [apply]
  )
  const setActiveZ = useCallback((z: number) => dispatch({ type: 'setActiveZ', z }), [])
  const resetToFixture = useCallback(() => apply({ type: 'resetToFixture', layout: mapLabLayout }), [apply])

  const addDoor = useCallback(
    (cell: MapCell, side: CardinalSide) => apply({ type: 'addDoor', cell, side }),
    [apply]
  )
  // Selecting a door only changes local UI focus, not the saved layout, so it dispatches directly
  // rather than going through `apply` (which would schedule a needless autosave of unchanged data).
  const selectDoor = useCallback((doorId: number | null) => dispatch({ type: 'selectDoor', doorId }), [])
  const updateFixtureFlags = useCallback(
    (fixtureId: number, fixtureType: 'door' | 'stair', flags: Record<string, unknown>) =>
      apply({ type: 'updateFixtureFlags', fixtureId, fixtureType, flags }),
    [apply]
  )
  const deleteDoor = useCallback((doorId: number) => apply({ type: 'deleteDoor', doorId }), [apply])

  return {
    state: state as EditorState,
    dispatch,
    loading,
    syncStatus,
    addRoom,
    selectRoom,
    deleteRoom,
    toggleCell,
    setActiveZ,
    resetToFixture,
    addDoor,
    selectDoor,
    updateFixtureFlags,
    deleteDoor,
  }
}
