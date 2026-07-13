/** Loads an encounter, drives the runner reducer, and auto-saves changes to the server
 * (debounced) so both the standalone runner page and the dungeon dock can share one engine.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getConditions, getEncounter, updateEncounter } from '../../api/client'
import type { Condition, Monster } from '../../api/types'
import {
  combatantsToCreatures,
  createInitialState,
  encounterRunnerReducer,
  type RunnerAction,
  type RunnerState,
} from './encounterRunner'

const SAVE_DEBOUNCE_MS = 600

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseEncounterRunnerResult {
  state: RunnerState
  title: string
  loading: boolean
  syncStatus: SyncStatus
  conditions: Condition[]
  adjustHp: (clientId: string, delta: number) => void
  setHp: (clientId: string, hp: number) => void
  setStatus: (clientId: string, status: string) => void
  setConditions: (clientId: string, conditions: string[]) => void
  rename: (clientId: string, name: string) => void
  duplicate: (clientId: string) => void
  addFromMonster: (monster: Monster) => void
  remove: (clientId: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
  moveUp: (clientId: string) => void
  moveDown: (clientId: string) => void
  setActive: (clientId: string) => void
  nextTurn: () => void
}

export function useEncounterRunner(encounterId: number): UseEncounterRunnerResult {
  const [state, setState] = useState<RunnerState>(createInitialState)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [conditions, setConditionsList] = useState<Condition[]>([])

  const stateRef = useRef(state)
  stateRef.current = state
  const titleRef = useRef(title)
  titleRef.current = title
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSyncStatus('idle')
    getEncounter(encounterId).then((encounter) => {
      if (cancelled) return
      setTitle(encounter.title)
      setState(encounterRunnerReducer(createInitialState(), { type: 'hydrate', encounter }))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [encounterId])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    getConditions()
      .then((data) => setConditionsList(data))
      .catch(() => setConditionsList([]))
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const { creatures, active_index } = combatantsToCreatures(stateRef.current)
      setSyncStatus('saving')
      updateEncounter(encounterId, { title: titleRef.current, creatures, active_index })
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'))
    }, SAVE_DEBOUNCE_MS)
  }, [encounterId])

  const apply = useCallback(
    (action: RunnerAction) => {
      setState((prev) => encounterRunnerReducer(prev, action))
      scheduleSave()
    },
    [scheduleSave]
  )

  const adjustHp = useCallback((clientId: string, delta: number) => apply({ type: 'adjustHp', clientId, delta }), [apply])
  const setHp = useCallback((clientId: string, hp: number) => apply({ type: 'setHp', clientId, hp }), [apply])
  const setStatus = useCallback((clientId: string, status: string) => apply({ type: 'setStatus', clientId, status }), [apply])
  const setConditions = useCallback((clientId: string, conditions: string[]) => apply({ type: 'setConditions', clientId, conditions }), [apply])
  const rename = useCallback((clientId: string, name: string) => apply({ type: 'rename', clientId, name }), [apply])
  const duplicate = useCallback((clientId: string) => apply({ type: 'duplicate', clientId }), [apply])
  const addFromMonster = useCallback((monster: Monster) => apply({ type: 'addFromMonster', monster }), [apply])
  const remove = useCallback((clientId: string) => apply({ type: 'remove', clientId }), [apply])
  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => apply({ type: 'reorder', fromIndex, toIndex }),
    [apply]
  )
  const moveUp = useCallback((clientId: string) => apply({ type: 'moveUp', clientId }), [apply])
  const moveDown = useCallback((clientId: string) => apply({ type: 'moveDown', clientId }), [apply])
  const setActive = useCallback((clientId: string) => apply({ type: 'setActive', clientId }), [apply])
  const nextTurn = useCallback(() => apply({ type: 'nextTurn' }), [apply])

  return {
    state,
    title,
    loading,
    syncStatus,
    conditions,
    adjustHp,
    setHp,
    setStatus,
    setConditions,
    rename,
    duplicate,
    addFromMonster,
    remove,
    reorder,
    moveUp,
    moveDown,
    setActive,
    nextTurn,
  }
}
