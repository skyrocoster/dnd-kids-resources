/** Loads a dungeon's Map Lab layout for the read-only viewer. Mirrors the exact load/fallback
 * used by useMapLabEditor.ts (single source of the 404 rule): backend layout when saved, else the
 * static mapLabLayout fixture. Starts from the fixture so the viewer always has something to show,
 * then swaps in the real layout once the fetch resolves.
 */
import { useEffect, useState } from 'react'
import { ApiError, getDungeonLayout } from '../../../api/client'
import { mapLabLayout } from './maplabData'
import { normalizeLayout, type MapLayout } from './maplabModel'

interface UseMapLabLayoutResult {
  layout: MapLayout
  loading: boolean
  error: Error | null
}

export function useMapLabLayout(dungeonId: number): UseMapLabLayoutResult {
  const [layout, setLayout] = useState<MapLayout>(mapLabLayout)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDungeonLayout(dungeonId)
      .then((blob) => {
        if (cancelled) return
        setLayout(normalizeLayout(blob.data as unknown as MapLayout))
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setLayout(mapLabLayout)
          setLoading(false)
          return
        }
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dungeonId])

  return { layout, loading, error }
}
