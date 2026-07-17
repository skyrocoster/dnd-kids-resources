import { createContext, useContext } from 'react'
import type { LoomThread } from '../../../api/types'

/** React Flow only forwards `data` to registered node types, so the thread
 * list (needed to resolve chip color/name from a node's `thread_ids`) rides
 * along via context instead of being threaded through `FlowNodeData`. */
export const LoomThreadsContext = createContext<LoomThread[]>([])

export function useLoomThreads(): LoomThread[] {
  return useContext(LoomThreadsContext)
}
