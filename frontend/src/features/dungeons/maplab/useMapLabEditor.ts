/** Loads a dungeon's Map Lab layout, drives the editor reducer, and auto-saves changes to the
 * server (debounced) — mirrors the shipped encounterRunner.ts / useEncounterRunner.ts pattern.
 * When the backend has no saved layout yet (404), seeds from the static mapLabLayout fixture so
 * the editor always has something to show.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ApiError, getDungeonLayout, saveDungeonLayout } from '../../../api/client'
import { islyCastleLayout } from './islyCastleData'
import { initialEditorState, mapLabEditorReducer, type EditorAction, type EditorState } from './maplabEditor'
import { normalizeLayout, type CardinalSide, type MapCell, type MapLayout } from './maplabModel'

const SAVE_DEBOUNCE_MS = 600

export interface SyncStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
}

export function useMapLabEditor(dungeonId: number) {
  const [state, dispatch] = useReducer(mapLabEditorReducer, islyCastleLayout, initialEditorState)
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
        dispatch({ type: 'loadLayout', layout: normalizeLayout(blob.data as unknown as MapLayout) })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          dispatch({ type: 'loadLayout', layout: islyCastleLayout })
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
      saveDungeonLayout(dungeonId, { data: stateRef.current.layout as unknown as Record<string, unknown> })
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
  const selectRoom = useCallback((roomId: number | null) => dispatch({ type: 'selectRoom', roomId }), [])
  const deleteRoom = useCallback((roomId: number) => apply({ type: 'deleteRoom', roomId }), [apply])
  const toggleCell = useCallback(
    (roomId: number, cell: MapCell) => apply({ type: 'toggleCell', roomId, cell }),
    [apply]
  )
  const setRoomFootprint = useCallback(
    (roomId: number, cells: MapCell[]) => apply({ type: 'setRoomFootprint', roomId, cells }),
    [apply]
  )
  const setActiveZ = useCallback((z: number) => dispatch({ type: 'setActiveZ', z }), [])
  const resetToFixture = useCallback(() => apply({ type: 'resetToFixture', layout: islyCastleLayout }), [apply])

  const addDoor = useCallback(
    (cell: MapCell, side: CardinalSide) => apply({ type: 'addDoor', cell, side }),
    [apply]
  )
  // Selecting a door only changes local UI focus, not the saved layout, so it dispatches directly
  // rather than going through `apply` (which would schedule a needless autosave of unchanged data).
  const selectDoor = useCallback((doorId: number | null) => dispatch({ type: 'selectDoor', doorId }), [])
  const updateFixtureFlags = useCallback(
    (fixtureId: number, fixtureType: 'door' | 'stair' | 'prop' | 'portal', flags: Record<string, unknown>) =>
      apply({ type: 'updateFixtureFlags', fixtureId, fixtureType, flags }),
    [apply]
  )
  const deleteDoor = useCallback((doorId: number) => apply({ type: 'deleteDoor', doorId }), [apply])

  const addProp = useCallback((cell: MapCell) => apply({ type: 'addProp', cell }), [apply])
  const selectProp = useCallback((propId: number | null) => dispatch({ type: 'selectProp', propId }), [])
  const deleteProp = useCallback((propId: number) => apply({ type: 'deleteProp', propId }), [apply])

  const addStair = useCallback(
    (from: { z: number; cell: MapCell }) => apply({ type: 'addStair', from }),
    [apply]
  )
  const selectStair = useCallback((stairId: number | null) => dispatch({ type: 'selectStair', stairId }), [])
  const deleteStair = useCallback((stairId: number) => apply({ type: 'deleteStair', stairId }), [apply])
  const setStairDirection = useCallback(
    (z: number, cell: MapCell, direction: 'up' | 'down', enabled: boolean) =>
      apply({ type: 'setStairDirection', z, cell, direction, enabled }),
    [apply]
  )

  const addPortal = useCallback((cell: MapCell) => apply({ type: 'addPortal', cell }), [apply])
  const selectPortal = useCallback((portalId: number | null) => dispatch({ type: 'selectPortal', portalId }), [])
  const deletePortal = useCallback((portalId: number) => apply({ type: 'deletePortal', portalId }), [apply])

  return {
    state: state as EditorState,
    dispatch,
    loading,
    syncStatus,
    addRoom,
    selectRoom,
    deleteRoom,
    toggleCell,
    setRoomFootprint,
    setActiveZ,
    resetToFixture,
    addDoor,
    selectDoor,
    updateFixtureFlags,
    deleteDoor,
    addProp,
    selectProp,
    deleteProp,
    addStair,
    selectStair,
    deleteStair,
    setStairDirection,
    addPortal,
    selectPortal,
    deletePortal,
  }
}
