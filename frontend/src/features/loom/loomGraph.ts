import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread } from '../../api/types'

// --- Lifecycle queries (kind-based, no edges) ---

export function isPast(node: LoomNode): boolean {
  return node.kind === 'session'
}

export function isFuture(node: LoomNode): boolean {
  return node.kind === 'beat' && node.thread_id != null
}

// --- Ordered-view derivation (session-column grid) ---

/** Ordered nodes for a thread, sorted by session_id then position ASC. */
export function threadOrdered(thread: LoomTapestryThread, nodes: LoomNode[]): LoomNode[] {
  return nodes
    .filter((n) => n.thread_id === thread.id)
    .sort((a, b) => {
      const sa = a.session_id ?? 0
      const sb = b.session_id ?? 0
      if (sa !== sb) return sa - sb
      return a.position - b.position
    })
}

/** Current position in a thread: the last session (or start) before the first unfulfilled beat. */
export function currentPosition(
  thread: LoomTapestryThread,
  nodes: LoomNode[],
): { nodeId: number; position: number } | null {
  const ordered = threadOrdered(thread, nodes)
  const firstBeatIdx = ordered.findIndex((n) => n.kind === 'beat' && !n.fulfilled_at)
  if (firstBeatIdx <= 0) {
    const first = ordered[0]
    return first ? { nodeId: first.id, position: 0 } : null
  }
  const current = ordered[firstBeatIdx - 1]
  return { nodeId: current.id, position: firstBeatIdx - 1 }
}

export function threadHead(thread: LoomTapestryThread, nodes: LoomNode[]): LoomNode | null {
  const ordered = threadOrdered(thread, nodes)
  const firstBeat = ordered.findIndex((node) => node.kind === 'beat' && !node.fulfilled_at)
  const index = firstBeat < 0 ? ordered.length - 1 : Math.max(0, firstBeat - 1)
  return ordered[index] ?? null
}

export function nextBeat(thread: LoomTapestryThread, nodes: LoomNode[]): LoomNode | null {
  return threadOrdered(thread, nodes).find((node) => node.kind === 'beat' && !node.fulfilled_at) ?? null
}

export function liveThreads(tapestry: LoomTapestry): LoomTapestryThread[] {
  return tapestry.threads.filter((thread) => nextBeat(thread, tapestry.nodes) != null)
}

/** True if the thread is alive (has started and not ended) at the given session ordinal. */
export function isThreadAlive(
  thread: LoomTapestryThread,
  sessionOrdinal: number,
  nodes: LoomNode[],
  sessions: LoomSession[],
): boolean {
  const threadNodes = nodes.filter((n) => n.thread_id === thread.id)
  const startNode = threadNodes.find((n) => n.kind === 'start')
  const endNode = threadNodes.find((n) => n.kind === 'end')

  let startOrdinal = 1
  if (startNode?.session_id != null) {
    const s = sessions.find((s) => s.id === startNode.session_id)
    if (s) startOrdinal = s.ordinal
  }

  let endOrdinal = Infinity
  if (endNode?.session_id != null) {
    const s = sessions.find((s) => s.id === endNode.session_id)
    if (s) endOrdinal = s.ordinal
  }

  return sessionOrdinal >= startOrdinal && sessionOrdinal <= endOrdinal
}

// --- Bank (unplaced beats) ---

/** Beats with no thread membership (banked / unplaced). */
export function bankedBeats(tapestry: LoomTapestry): LoomNode[] {
  return tapestry.nodes.filter((node) => node.kind === 'beat' && node.thread_id === null)
}
