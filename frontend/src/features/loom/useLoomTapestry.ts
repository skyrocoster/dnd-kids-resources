/** Read-path fetch hook for the whole tapestry — no mutation plumbing yet (LM5). */
import { useEffect, useState, useCallback } from 'react'
import { getLoomTapestry } from '../../api/client'
import type { LoomTapestry } from '../../api/types'
import {
  initialRemoteState,
  remoteError,
  remoteLoading,
  remoteSuccess,
  type RemoteState,
} from '../../components/remoteState'

export interface UseLoomTapestryResult {
  tapestry: RemoteState<LoomTapestry>
  reload: () => void
}

export function useLoomTapestry(): UseLoomTapestryResult {
  const [tapestry, setTapestry] = useState<RemoteState<LoomTapestry>>(initialRemoteState)

  const load = useCallback(() => {
    setTapestry(remoteLoading())
    getLoomTapestry()
      .then((data) => setTapestry(remoteSuccess(data)))
      .catch((err) => setTapestry(remoteError(err instanceof Error ? err.message : 'Failed to load the tapestry.')))
  }, [])

  useEffect(load, [load])

  return { tapestry, reload: load }
}
