/** Loads a dungeon's Map Lab layout, drives the editor reducer, and auto-saves changes to the
 * server (debounced) — mirrors the shipped encounterRunner.ts / useEncounterRunner.ts pattern.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ApiError, getDungeon, getDungeonLayout, saveDungeonLayout, updateDungeon } from '../../../api/client'
import type { Dungeon } from '../../../api/types'
import { parseDungeonData, type DungeonData, type DungeonRoom } from '../dungeonModel'
import { initialEditorState, mapLabEditorReducer, type EditorAction, type EditorState } from './maplabEditor'
import { createEmptyMapLayout, normalizeLayout, nextRoomId, type CardinalSide, type MapCell, type MapLayout } from './maplabModel'

const SAVE_DEBOUNCE_MS = 600

export interface SyncStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
}

export interface LayoutLoadStatus {
  status: 'loading' | 'ready' | 'empty' | 'error'
  error?: string
}

export interface DungeonDataStatus {
  status: 'loading' | 'ready' | 'error'
  error?: string
}

function emptyDungeonRoom(roomId: number): DungeonRoom {
  return { room_id: roomId, title: '', entries: [], npcs: [] }
}

function replaceDungeonRoom(data: DungeonData, roomId: number, updater: (room: DungeonRoom) => DungeonRoom): DungeonData {
  const rooms = [...(data.rooms ?? [])]
  const index = rooms.findIndex((room) => room.room_id === roomId)
  if (index === -1) {
    const room = updater(emptyDungeonRoom(roomId))
    return { ...data, rooms: [...rooms, room] }
  }
  rooms[index] = updater(rooms[index])
  return { ...data, rooms }
}

function removeDungeonRoom(data: DungeonData, roomId: number): DungeonData {
  return { ...data, rooms: (data.rooms ?? []).filter((room) => room.room_id !== roomId) }
}

export function useMapLabEditor(dungeonId: number | null, initialDungeon: Dungeon | null = null) {
  const initialDungeonRef = useRef(initialDungeon)
  const initialDungeonData = useMemo(
    () => parseDungeonData(initialDungeonRef.current?.data ?? {}),
    [],
  )

  const [state, dispatch] = useReducer(mapLabEditorReducer, createEmptyMapLayout(), initialEditorState)
  const [loading, setLoading] = useState(true)
  const [loadStatus, setLoadStatus] = useState<LayoutLoadStatus>({ status: 'loading' })
  const [dungeonData, setDungeonData] = useState<DungeonData>(initialDungeonData)
  const [dungeonDataStatus, setDungeonDataStatus] = useState<DungeonDataStatus>(
    initialDungeonRef.current ? { status: 'ready' } : { status: 'loading' },
  )
  const [layoutSyncStatus, setLayoutSyncStatus] = useState<SyncStatus>({ status: 'idle' })
  const [dataSyncStatus, setDataSyncStatus] = useState<SyncStatus>({ status: 'idle' })

  const stateRef = useRef(state)
  stateRef.current = state

  const dungeonDataRef = useRef<DungeonData>(initialDungeonData)
  dungeonDataRef.current = dungeonData

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layoutDirtyRef = useRef(false)
  const dataDirtyRef = useRef(false)
  const loadedLayoutRef = useRef<MapLayout>(createEmptyMapLayout())
  const loadedDataRef = useRef<DungeonData>(initialDungeonData)
  const dungeonTitleRef = useRef(initialDungeonRef.current?.title ?? '')

  const markLayoutDirty = useCallback(() => {
    layoutDirtyRef.current = true
  }, [])

  const markDataDirty = useCallback(() => {
    dataDirtyRef.current = true
  }, [])

  const scheduleSave = useCallback(() => {
    if (dungeonId === null) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const shouldSaveLayout = layoutDirtyRef.current
      const shouldSaveData = dataDirtyRef.current
      layoutDirtyRef.current = false
      dataDirtyRef.current = false

      if (shouldSaveLayout) {
        setLayoutSyncStatus({ status: 'saving' })
        saveDungeonLayout(dungeonId, { data: stateRef.current.layout as unknown as Record<string, unknown> })
          .then(() => setLayoutSyncStatus({ status: 'saved' }))
          .catch(() => setLayoutSyncStatus({ status: 'error', error: 'Failed to save layout' }))
      }

      if (shouldSaveData) {
        setDataSyncStatus({ status: 'saving' })
        updateDungeon(dungeonId, {
          title: dungeonTitleRef.current,
          data: dungeonDataRef.current as unknown as Record<string, unknown>,
        })
          .then(() => setDataSyncStatus({ status: 'saved' }))
          .catch(() => setDataSyncStatus({ status: 'error', error: 'Failed to save dungeon data' }))
      }
    }, SAVE_DEBOUNCE_MS)
  }, [dungeonId])

  const scheduleLayoutSave = useCallback(() => {
    markLayoutDirty()
    scheduleSave()
  }, [markLayoutDirty, scheduleSave])

  const scheduleDataSave = useCallback(() => {
    markDataDirty()
    scheduleSave()
  }, [markDataDirty, scheduleSave])

  useEffect(() => {
    if (dungeonId === null) {
      dispatch({ type: 'loadLayout', layout: createEmptyMapLayout() })
      loadedLayoutRef.current = createEmptyMapLayout()
      setLoading(false)
      setLoadStatus({ status: 'error', error: 'Invalid dungeon id' })
      setDungeonData(parseDungeonData({}))
      setDungeonDataStatus({ status: 'error', error: 'Invalid dungeon id' })
      setLayoutSyncStatus({ status: 'idle' })
      setDataSyncStatus({ status: 'idle' })
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadStatus({ status: 'loading' })
    setLayoutSyncStatus({ status: 'idle' })

    // Layout and room data hydrate independently so a missing dungeon blob does not block the map.
    getDungeonLayout(dungeonId)
      .then((blob) => {
        if (cancelled) return
        const layout = normalizeLayout(blob.data as unknown as MapLayout)
        loadedLayoutRef.current = layout
        dispatch({ type: 'loadLayout', layout })
        setLoading(false)
        setLoadStatus({ status: 'ready' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          const emptyLayout = createEmptyMapLayout()
          loadedLayoutRef.current = emptyLayout
          dispatch({ type: 'loadLayout', layout: emptyLayout })
          setLoading(false)
          setLoadStatus({ status: 'empty' })
          return
        }
        dispatch({ type: 'loadLayout', layout: createEmptyMapLayout() })
        setLoading(false)
        setLoadStatus({ status: 'error', error: 'Failed to load layout' })
      })

    getDungeon(dungeonId)
      .then((dungeon) => {
        if (cancelled) return
        dungeonTitleRef.current = dungeon.title
        const parsed = parseDungeonData(dungeon.data)
        loadedDataRef.current = parsed
        setDungeonData(parsed)
        setDungeonDataStatus({ status: 'ready' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (initialDungeonRef.current) return
        setDungeonData(parseDungeonData({}))
        setDungeonDataStatus({
          status: 'error',
          error: err instanceof ApiError && err.status === 404 ? 'Dungeon not found' : 'Failed to load dungeon data',
        })
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

  const apply = useCallback(
    (action: EditorAction) => {
      dispatch(action)
      scheduleLayoutSave()
    },
    [scheduleLayoutSave],
  )

  const createRoomData = useCallback(
    (roomId: number) => {
      setDungeonData((current) => {
        if ((current.rooms ?? []).some((room) => room.room_id === roomId)) return current
        const next = { ...current, rooms: [...(current.rooms ?? []), emptyDungeonRoom(roomId)] }
        dungeonDataRef.current = next
        return next
      })
      scheduleDataSave()
    },
    [scheduleDataSave],
  )

  const addRoom = useCallback(() => {
    const roomId = nextRoomId(stateRef.current.layout)
    dispatch({ type: 'addRoom' })
    setDungeonData((current) => {
      if ((current.rooms ?? []).some((room) => room.room_id === roomId)) return current
      const next = { ...current, rooms: [...(current.rooms ?? []), emptyDungeonRoom(roomId)] }
      dungeonDataRef.current = next
      return next
    })
    scheduleLayoutSave()
    scheduleDataSave()
  }, [scheduleDataSave, scheduleLayoutSave])

  const addFloorAbove = useCallback(() => apply({ type: 'addFloorAbove' }), [apply])
  const addFloorBelow = useCallback(() => apply({ type: 'addFloorBelow' }), [apply])
  const selectRoom = useCallback((roomId: number | null) => dispatch({ type: 'selectRoom', roomId }), [])

  const deleteRoom = useCallback(
    (roomId: number) => {
      dispatch({ type: 'deleteRoom', roomId })
      setDungeonData((current) => {
        const next = removeDungeonRoom(current, roomId)
        dungeonDataRef.current = next
        return next
      })
      scheduleLayoutSave()
      scheduleDataSave()
    },
    [scheduleDataSave, scheduleLayoutSave],
  )

  const updateRoomTitle = useCallback(
    (roomId: number, title: string) => {
      dispatch({ type: 'setRoomMeta', roomId, meta: { title } })
      setDungeonData((current) => {
        const next = replaceDungeonRoom(current, roomId, (room) => ({ ...room, title }))
        dungeonDataRef.current = next
        return next
      })
      scheduleLayoutSave()
      scheduleDataSave()
    },
    [scheduleDataSave, scheduleLayoutSave],
  )

  const updateRoomDescription = useCallback(
    (roomId: number, description: string) => {
      dispatch({ type: 'setRoomMeta', roomId, meta: { description } })
      scheduleLayoutSave()
    },
    [scheduleLayoutSave],
  )

  const updateRoomKind = useCallback(
    (roomId: number, kind: string) => {
      dispatch({ type: 'setRoomMeta', roomId, meta: { kind } })
      scheduleLayoutSave()
    },
    [scheduleLayoutSave],
  )

  const updateRoomEntries = useCallback(
    (roomId: number, entries: DungeonRoom['entries']) => {
      setDungeonData((current) => {
        const next = replaceDungeonRoom(current, roomId, (room) => ({ ...room, entries }))
        dungeonDataRef.current = next
        return next
      })
      scheduleDataSave()
    },
    [scheduleDataSave],
  )

  const updateRoomNpcs = useCallback(
    (roomId: number, npcs: number[]) => {
      setDungeonData((current) => {
        const next = replaceDungeonRoom(current, roomId, (room) => ({ ...room, npcs }))
        dungeonDataRef.current = next
        return next
      })
      scheduleDataSave()
    },
    [scheduleDataSave],
  )

  const toggleCell = useCallback(
    (roomId: number, cell: MapCell) => apply({ type: 'toggleCell', roomId, cell }),
    [apply],
  )
  const setRoomFootprint = useCallback(
    (roomId: number, cells: MapCell[]) => apply({ type: 'setRoomFootprint', roomId, cells }),
    [apply],
  )
  const setActiveZ = useCallback((z: number) => dispatch({ type: 'setActiveZ', z }), [])

  const resetToLastLoadedLayout = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    layoutDirtyRef.current = false
    dataDirtyRef.current = false
    dispatch({ type: 'loadLayout', layout: loadedLayoutRef.current })
    setDungeonData(loadedDataRef.current)
    dungeonDataRef.current = loadedDataRef.current
    setLayoutSyncStatus({ status: 'idle' })
    setDataSyncStatus({ status: 'idle' })
  }, [])

  const addDoor = useCallback(
    (cell: MapCell, side: CardinalSide) => apply({ type: 'addDoor', cell, side }),
    [apply],
  )
  const selectDoor = useCallback((doorId: number | null) => dispatch({ type: 'selectDoor', doorId }), [])
  const updateFixtureFlags = useCallback(
    (fixtureId: number, fixtureType: 'door' | 'stair' | 'prop' | 'portal', flags: Record<string, unknown>) =>
      apply({ type: 'updateFixtureFlags', fixtureId, fixtureType, flags }),
    [apply],
  )
  const deleteDoor = useCallback((doorId: number) => apply({ type: 'deleteDoor', doorId }), [apply])

  const addProp = useCallback((cell: MapCell) => apply({ type: 'addProp', cell }), [apply])
  const selectProp = useCallback((propId: number | null) => dispatch({ type: 'selectProp', propId }), [])
  const deleteProp = useCallback((propId: number) => apply({ type: 'deleteProp', propId }), [apply])

  const addStair = useCallback(
    (from: { z: number; cell: MapCell }) => apply({ type: 'addStair', from }),
    [apply],
  )
  const selectStair = useCallback((stairId: number | null) => dispatch({ type: 'selectStair', stairId }), [])
  const deleteStair = useCallback((stairId: number) => apply({ type: 'deleteStair', stairId }), [apply])
  const setStairDirection = useCallback(
    (z: number, cell: MapCell, direction: 'up' | 'down', enabled: boolean) =>
      apply({ type: 'setStairDirection', z, cell, direction, enabled }),
    [apply],
  )

  const addPortal = useCallback((cell: MapCell) => apply({ type: 'addPortal', cell }), [apply])
  const selectPortal = useCallback((portalId: number | null) => dispatch({ type: 'selectPortal', portalId }), [])
  const deletePortal = useCallback((portalId: number) => apply({ type: 'deletePortal', portalId }), [apply])

  const saveStatus = useMemo<SyncStatus>(() => {
    if (layoutSyncStatus.status === 'error' || dataSyncStatus.status === 'error') {
      return { status: 'error', error: layoutSyncStatus.error ?? dataSyncStatus.error }
    }
    if (layoutSyncStatus.status === 'saving' || dataSyncStatus.status === 'saving') {
      return { status: 'saving' }
    }
    if (layoutSyncStatus.status === 'saved' && dataSyncStatus.status === 'saved') {
      return { status: 'saved' }
    }
    return { status: 'idle' }
  }, [dataSyncStatus, layoutSyncStatus])

  return {
    state: state as EditorState,
    dispatch,
    loading,
    loadStatus,
    dungeonData,
    dungeonDataStatus,
    layoutSyncStatus,
    dataSyncStatus,
    saveStatus,
    addRoom,
    createRoomData,
    addFloorAbove,
    addFloorBelow,
    selectRoom,
    deleteRoom,
    toggleCell,
    setRoomFootprint,
    setActiveZ,
    resetToLastLoadedLayout,
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
    updateRoomTitle,
    updateRoomDescription,
    updateRoomKind,
    updateRoomEntries,
    updateRoomNpcs,
  }
}
