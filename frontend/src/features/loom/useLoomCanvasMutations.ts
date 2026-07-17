/** Canvas-level mutation plumbing for the Loom: node-drag position persistence.
 * Edge connect/remove removed in PB0 (edges retired).
 * Kept separate from `useLoomTapestry` (read-path) and page-level selection
 * state so the mutation logic is testable without driving actual React Flow
 * drag gestures in jsdom. */
import { useCallback, useState } from 'react'
import { patchLoomNodePosition } from '../../api/client'
import type { LoomTapestry } from '../../api/types'
import type { RemoteState } from '../../components/remoteState'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export interface UseLoomCanvasMutationsResult {
  error: string | null
  dismissError: () => void
  reportError: (message: string) => void
  moveNode: (nodeId: string, x: number, y: number) => void
}

export function useLoomCanvasMutations(
  _tapestry: RemoteState<LoomTapestry>,
  _reload: () => void,
): UseLoomCanvasMutationsResult {
  const [error, setError] = useState<string | null>(null)

  const dismissError = useCallback(() => setError(null), [])

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    patchLoomNodePosition(Number(nodeId), { x, y }).catch((err) =>
      setError(errorMessage(err, 'Failed to save the new position.')),
    )
  }, [])

  return { error, dismissError, reportError: setError, moveNode }
}
