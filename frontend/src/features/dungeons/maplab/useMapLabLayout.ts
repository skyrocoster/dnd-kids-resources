import { useState, useEffect } from 'react'
import { getDungeonLayout } from '../../../api/client'
import { mapLabLayout } from './maplabData'
import type { MapLayout } from './maplabModel'

interface UseMapLabLayoutResult {
  layout: MapLayout | null
  loading: boolean
  error: Error | null
}

export function useMapLabLayout(dungeonId: number): UseMapLabLayoutResult {
  const [layout, setLayout] = useState<MapLayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadLayout = async () => {
      setLoading(true)
      setError(null)
      try {
        throw new Error('not implemented')
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setLayout(null)
      } finally {
        setLoading(false)
      }
    }

    loadLayout()
  }, [dungeonId])

  return { layout, loading, error }
}
