/** Loads a dungeon's Map Lab layout for the read-only viewer. Mirrors the exact load/fallback
 * used by useMapLabEditor.ts (single source of the 404 rule): backend layout when saved, else the
 * static mapLabLayout fixture. Starts from the fixture so the viewer always has something to show,
 * then swaps in the real layout once the fetch resolves.
 */
import { useEffect, useState } from 'react'
import { ApiError, getDungeonLayout } from '../../../api/client'
import { createEmptyMapLayout, normalizeLayout, type MapLayout } from './maplabModel'

interface UseMapLabLayoutResult {
  layout: MapLayout
  loading: boolean
  status: 'loading' | 'ready' | 'empty' | 'error'
  error: Error | null
}

export function useMapLabLayout(dungeonId: number | null): UseMapLabLayoutResult {
  const [layout, setLayout] = useState<MapLayout>(createEmptyMapLayout())
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<UseMapLabLayoutResult['status']>('loading')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (dungeonId === null) {
      setLayout(createEmptyMapLayout())
      setLoading(false)
      setStatus('error')
      setError(new Error('Invalid dungeon id'))
      return
    }

    let cancelled = false
    setLayout(createEmptyMapLayout())
    setLoading(true)
    setStatus('loading')
    setError(null)

    getDungeonLayout(dungeonId)
      .then((blob) => {
        if (cancelled) return
        setLayout(normalizeLayout(blob.data as unknown as MapLayout))
        setLoading(false)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setLayout(createEmptyMapLayout())
          setLoading(false)
          setStatus('empty')
          return
        }
        setLayout(createEmptyMapLayout())
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  return { layout, loading, status, error }
}
