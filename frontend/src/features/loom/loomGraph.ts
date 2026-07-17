import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../api/types'

// --- Lifecycle queries (kind-based, no edges) ---

export function isPast(node: LoomNode): boolean {
  return node.kind === 'session'
}

export function isFuture(node: LoomNode): boolean {
  return node.kind === 'beat' && node.thread_ids.length > 0
}

// --- Ordered-view derivation (PB1 replaces stubs with position-based layout) ---

/** Ordered node ids for a thread, sorted by position ASC. */
export function threadOrdered(thread: LoomTapestryThread, nodes: LoomNode[]): LoomNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return thread.items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => byId.get(item.node_id))
    .filter((n): n is LoomNode => n != null)
}

/**
 * Current position in a thread: the last session (or start) before the first
 * unfulfilled beat. PB1 replaces this stub with the full derivation.
 * For now, returns the node just before the first beat in the ordered list.
 */
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

// --- Bank (unplaced beats, replaces vault) ---

/** Beats with zero thread membership (banked / unplaced). */
export function bankedBeats(tapestry: LoomTapestry): LoomNode[] {
  return tapestry.nodes.filter((node) => node.kind === 'beat' && node.thread_ids.length === 0)
}
