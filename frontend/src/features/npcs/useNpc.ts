/** Tiny read-only fetch hook for a single NPC — no persistence, no reducer. */
import { useEffect, useState } from 'react'
import { getNPC } from '../../api/client'
import type { NPC } from '../../api/types'

export interface UseNpcResult {
  npc: NPC | null
  loading: boolean
  error: string | null
}

export function useNpc(id: number): UseNpcResult {
  const [npc, setNpc] = useState<NPC | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getNPC(id)
      .then((result) => setNpc(result))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load NPC.'))
      .finally(() => setLoading(false))
  }, [id])

  return { npc, loading, error }
}
