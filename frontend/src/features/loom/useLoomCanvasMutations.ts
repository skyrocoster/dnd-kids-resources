/** Canvas-level mutation plumbing for the Loom: edge connect (with cycle rejection),
 * node-drag position persistence, and edge removal. Kept separate from `useLoomTapestry`
 * (read-path) and page-level selection state so the mutation logic is testable without
 * driving actual React Flow drag/connect gestures in jsdom. */
import { useCallback, useState } from 'react'
import { createLoomEdge, deleteLoomEdge, patchLoomNodePosition } from '../../api/client'
import type { LoomTapestry } from '../../api/types'
import { wouldCycle } from './loomGraph'
import type { RemoteState } from '../../components/remoteState'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export interface UseLoomCanvasMutationsResult {
  error: string | null
  dismissError: () => void
  reportError: (message: string) => void
  isValidConnection: (sourceId: string | null | undefined, targetId: string | null | undefined) => boolean
  connect: (sourceId: string, targetId: string) => void
  moveNode: (nodeId: string, x: number, y: number) => void
  removeEdge: (edgeId: string) => Promise<void>
}

export function useLoomCanvasMutations(
  tapestry: RemoteState<LoomTapestry>,
  reload: () => void,
): UseLoomCanvasMutationsResult {
  const [error, setError] = useState<string | null>(null)

  const dismissError = useCallback(() => setError(null), [])

  const isValidConnection = useCallback(
    (sourceId: string | null | undefined, targetId: string | null | undefined) => {
      if (tapestry.status !== 'success' || !sourceId || !targetId) return false
      return !wouldCycle(tapestry.data.edges, Number(sourceId), Number(targetId))
    },
    [tapestry],
  )

  const connect = useCallback(
    (sourceId: string, targetId: string) => {
      createLoomEdge({ source_id: Number(sourceId), target_id: Number(targetId) })
        .then(() => reload())
        .catch((err) => setError(errorMessage(err, 'Failed to connect these nodes.')))
    },
    [reload],
  )

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    patchLoomNodePosition(Number(nodeId), { x, y }).catch((err) =>
      setError(errorMessage(err, 'Failed to save the new position.')),
    )
  }, [])

  const removeEdge = useCallback(
    (edgeId: string) =>
      deleteLoomEdge(Number(edgeId))
        .then(() => reload())
        .catch((err) => {
          setError(errorMessage(err, 'Failed to delete the edge.'))
          throw err
        }),
    [reload],
  )

  return { error, dismissError, reportError: setError, isValidConnection, connect, moveNode, removeEdge }
}
