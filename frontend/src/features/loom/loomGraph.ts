import type { LoomAnchorStatus, LoomEdge, LoomNode, LoomNodeInput, LoomTapestry } from '../../api/types'

export function isPast(node: LoomNode): boolean {
  return node.kind === 'update' || (node.kind === 'anchor' && node.status === 'reached')
}

export function isFuture(node: LoomNode): boolean {
  return node.kind === 'anchor' && node.status === 'planned'
}

function isAbandoned(node: LoomNode): boolean {
  return node.kind === 'anchor' && node.status === 'abandoned'
}

/** Outgoing adjacency: source node id -> target node ids. */
export function buildAdjacency(edges: LoomEdge[]): Map<number, number[]> {
  const adjacency = new Map<number, number[]>()
  for (const edge of edges) {
    const targets = adjacency.get(edge.source_id)
    if (targets) {
      targets.push(edge.target_id)
    } else {
      adjacency.set(edge.source_id, [edge.target_id])
    }
  }
  return adjacency
}

function nodesById(tapestry: LoomTapestry): Map<number, LoomNode> {
  return new Map(tapestry.nodes.map((node) => [node.id, node]))
}

/**
 * heads(T) = { n in T : past(n) AND no edge (n->m) exists with past(m) AND m in T }.
 * The `m in T` restriction means a merge collapses both threads' heads onto the
 * shared node, while a hand-off edge into another thread's node doesn't steal
 * this thread's head.
 */
export function headsByThread(tapestry: LoomTapestry): Map<number, Set<number>> {
  const byId = nodesById(tapestry)
  const adjacency = buildAdjacency(tapestry.edges)
  const result = new Map<number, Set<number>>()

  for (const thread of tapestry.threads) {
    const heads = new Set<number>()
    for (const node of tapestry.nodes) {
      if (!node.thread_ids.includes(thread.id)) continue
      if (!isPast(node)) continue

      const targets = adjacency.get(node.id) ?? []
      const hasPastSuccessorInThread = targets.some((targetId) => {
        const target = byId.get(targetId)
        return target !== undefined && isPast(target) && target.thread_ids.includes(thread.id)
      })
      if (!hasPastSuccessorInThread) heads.add(node.id)
    }
    result.set(thread.id, heads)
  }

  return result
}

/**
 * BFS forward from `headId`: report the first planned anchor on each forward
 * branch and stop expanding that branch there; stop silently (report nothing)
 * at an abandoned anchor; otherwise keep walking.
 */
export function nearestFutureAnchors(
  headId: number,
  tapestry: LoomTapestry,
  adjacency: Map<number, number[]> = buildAdjacency(tapestry.edges),
): number[] {
  const byId = nodesById(tapestry)
  const result: number[] = []
  const seen = new Set<number>()
  const queue: number[] = [...(adjacency.get(headId) ?? [])]

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (seen.has(nodeId)) continue
    seen.add(nodeId)

    const node = byId.get(nodeId)
    if (!node) continue

    if (isFuture(node)) {
      result.push(nodeId)
      continue
    }
    if (isAbandoned(node)) {
      continue
    }

    queue.push(...(adjacency.get(nodeId) ?? []))
  }

  return result
}

/** vault(G) = nodes with degree 0 (no edges in either direction). */
export function vaultNodes(tapestry: LoomTapestry): LoomNode[] {
  const connected = new Set<number>()
  for (const edge of tapestry.edges) {
    connected.add(edge.source_id)
    connected.add(edge.target_id)
  }
  return tapestry.nodes.filter((node) => !connected.has(node.id))
}

/** threads(source) intersected with threads(target); [] if no shared thread. */
export function edgeThreads(edge: LoomEdge, tapestry: LoomTapestry): number[] {
  const byId = nodesById(tapestry)
  const source = byId.get(edge.source_id)
  const target = byId.get(edge.target_id)
  if (!source || !target) return []
  const targetThreads = new Set(target.thread_ids)
  return source.thread_ids.filter((threadId) => targetThreads.has(threadId))
}

/**
 * `PUT /loom/nodes/{id}` is a full replace, so an anchor status transition
 * (mark reached/abandoned) must resubmit every field unchanged except `status`.
 */
export function buildNodeStatusUpdate(node: LoomNode, status: LoomAnchorStatus): LoomNodeInput {
  return {
    kind: node.kind,
    title: node.title,
    body: node.body ?? null,
    status,
    session_tag: node.session_tag ?? null,
    x: node.x,
    y: node.y,
    thread_ids: node.thread_ids,
  }
}

/**
 * Mirrors the backend's reachability CTE: inserting source->target is illegal
 * iff target can already reach source.
 */
export function wouldCycle(edges: LoomEdge[], sourceId: number, targetId: number): boolean {
  const adjacency = buildAdjacency(edges)
  const seen = new Set<number>([targetId])
  const stack: number[] = [targetId]

  while (stack.length > 0) {
    const nodeId = stack.pop()!
    if (nodeId === sourceId) return true
    for (const nextId of adjacency.get(nodeId) ?? []) {
      if (!seen.has(nextId)) {
        seen.add(nextId)
        stack.push(nextId)
      }
    }
  }

  return false
}
