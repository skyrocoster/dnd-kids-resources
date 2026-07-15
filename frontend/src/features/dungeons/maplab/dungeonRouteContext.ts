import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError, getDungeon } from '../../../api/client'
import type { Dungeon } from '../../../api/types'

export type DungeonRouteStatus = 'loading' | 'ready' | 'invalid' | 'missing' | 'error'

export interface DungeonRouteContext {
  dungeonId: number | null
  dungeon: Dungeon | null
  status: DungeonRouteStatus
  error: Error | null
}

const DungeonRouteContextValue = createContext<DungeonRouteContext | null>(null)

export function parseDungeonId(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export function useDungeonRouteContext(dungeonIdParam: string | undefined): DungeonRouteContext {
  const dungeonId = parseDungeonId(dungeonIdParam)
  const [dungeon, setDungeon] = useState<Dungeon | null>(null)
  const [status, setStatus] = useState<DungeonRouteStatus>(dungeonId === null ? 'invalid' : 'loading')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (dungeonId === null) {
      setDungeon(null)
      setStatus('invalid')
      setError(null)
      return
    }

    let cancelled = false
    setDungeon(null)
    setStatus('loading')
    setError(null)

    getDungeon(dungeonId)
      .then((nextDungeon) => {
        if (cancelled) return
        setDungeon(nextDungeon)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setDungeon(null)
          setStatus('missing')
          return
        }
        setDungeon(null)
        setStatus('error')
        setError(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  return { dungeonId, dungeon, status, error }
}

export function DungeonRouteContextProvider({
  value,
  children,
}: {
  value: DungeonRouteContext
  children: ReactNode
}) {
  return createElement(DungeonRouteContextValue.Provider, { value }, children)
}

export function useDungeonShellContext(): DungeonRouteContext {
  const context = useContext(DungeonRouteContextValue)
  if (context === null) {
    throw new Error('useDungeonShellContext must be used within a DungeonRouteContextProvider.')
  }
  return context
}
