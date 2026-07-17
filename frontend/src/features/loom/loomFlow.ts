import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../api/types'
import { currentPosition } from './loomGraph'

/**
 * Minimal structural shapes React Flow's `Node` accepts as-is.
 * Defined locally so this module has no `@xyflow/react` dependency;
 * the canvas layer can pass these straight through.
 */
export interface FlowNode {
  id: string
  type: 'start' | 'end' | 'beat' | 'session'
  position: { x: number; y: number }
  data: FlowNodeData
}

export interface FlowNodeData {
  node: LoomNode
  isHead: boolean
  isCurrent: boolean
  isBanked: boolean
  // Index signature satisfies @xyflow/react's `Record<string, unknown>` node-data
  [key: string]: unknown
}

export interface FlowEdgeMarker {
  // Matches @xyflow/react's MarkerType values without importing the enum.
  type: 'arrow' | 'arrowclosed'
  color?: string
  width?: number
  height?: number
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  style?: Record<string, string | number>
  markerEnd?: FlowEdgeMarker
}

// The four compass handle ids every node exposes on its border (see nodes/*.tsx).
type CompassSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * Picks which side of the source node to exit from and which side of the target node to
 * enter, based on their relative position — not a fixed handle. Whichever axis (x or y) has
 * the larger gap wins; ties and same-position fall back to the horizontal chain direction.
 * Recomputed from current node positions on every render, so dragging a node and dropping it
 * elsewhere naturally re-anchors the connector to the new relative position.
 */
function compassHandles(
  from: { x: number; y: number } | undefined,
  to: { x: number; y: number } | undefined,
): { sourceHandle: CompassSide; targetHandle: CompassSide } {
  if (!from || !to) return { sourceHandle: 'bottom', targetHandle: 'top' }
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? { sourceHandle: 'bottom', targetHandle: 'top' } : { sourceHandle: 'top', targetHandle: 'bottom' }
  }
  return dx >= 0 ? { sourceHandle: 'right', targetHandle: 'left' } : { sourceHandle: 'left', targetHandle: 'right' }
}

export function buildFlowEdges(
  nodes: Array<Pick<FlowNode, 'id' | 'position'>>,
  thread: LoomTapestryThread,
): FlowEdge[] {
  const positionById = new Map(nodes.map((node) => [node.id, node.position]))
  const items = thread.items.slice().sort((a, b) => a.position - b.position)
  // Thread colors are tokenized as --md-loom-thread-N (see theme.css / LoomCanvas.css).
  // Without the `loom-` prefix the custom property is undefined and `stroke` falls back
  // to its initial value `none`, rendering the edge invisible.
  const stroke = `var(--md-loom-${thread.color})`
  return items.slice(0, -1).map((item, index) => {
    const nextItem = items[index + 1]
    const sourceId = String(item.node_id)
    const targetId = String(nextItem.node_id)
    const { sourceHandle, targetHandle } = compassHandles(positionById.get(sourceId), positionById.get(targetId))
    return {
      id: `loom-thread-${thread.id}-${item.node_id}-${nextItem.node_id}`,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      style: { stroke, strokeWidth: 2 },
      // Arrowhead shows narrative direction (earlier → later within the thread).
      markerEnd: { type: 'arrowclosed', color: stroke, width: 18, height: 18 },
    }
  })
}

/**
 * Cross-thread spawn connectors: a dotted, unmarked-color edge from the origin Session Node
 * to the new thread's Start node, showing how a spawned thread grew out of that session.
 * Distinct from `buildFlowEdges` (in-thread, solid, thread-colored) because a spawn link
 * crosses threads and is provenance, not narrative sequence within either thread.
 *
 * The exit/entry side is picked from the nodes' current canvas positions (`compassHandles`),
 * not hardcoded — so re-laying-out or dragging a node changes which side the connector anchors
 * to on the next render, instead of always leaving from a fixed corner.
 */
export function buildSpawnEdges(
  nodes: Array<Pick<FlowNode, 'id' | 'position'>>,
  tapestry: LoomTapestry,
): FlowEdge[] {
  const positionById = new Map(nodes.map((node) => [node.id, node.position]))
  return tapestry.threads
    .filter((thread): thread is LoomTapestryThread & { origin_node_id: number } => thread.origin_node_id != null)
    .flatMap((thread) => {
      const start = thread.items.slice().sort((a, b) => a.position - b.position)[0]
      if (!start) return []
      const sourceId = String(thread.origin_node_id)
      const targetId = String(start.node_id)
      const { sourceHandle, targetHandle } = compassHandles(positionById.get(sourceId), positionById.get(targetId))
      return [{
        id: `loom-spawn-${thread.origin_node_id}-${start.node_id}`,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        style: { stroke: 'var(--md-outline)', strokeWidth: 1.5, strokeDasharray: '4 4' },
        markerEnd: { type: 'arrowclosed', color: 'var(--md-outline)', width: 14, height: 14 },
      }]
    })
}

/**
 * Map tapestry nodes to FlowNode structs for React Flow.
 * PB1 replaces x/y positioning with position-derived lane layout;
 * for now, uses persisted x/y (still retained on the node).
 */
export function buildFlowNodes(tapestry: LoomTapestry): FlowNode[] {
  const positions = new Map<number, { x: number; y: number }>()
  tapestry.threads.forEach((thread, lane) => thread.items.forEach((item) => {
    if (!positions.has(item.node_id)) positions.set(item.node_id, { x: item.position * 12, y: lane * 220 })
  }))
  const current = new Map(tapestry.threads.map((thread) => [thread.id, currentPosition(thread, tapestry.nodes)]))
  return tapestry.nodes.map((node) => ({
    id: String(node.id),
    type: node.kind,
    position: positions.get(node.id) ?? { x: node.x, y: node.y },
    data: {
      node,
      isHead: node.thread_ids.some((threadId) => {
        const thread = tapestry.threads.find((candidate) => candidate.id === threadId)
        return thread?.items.at(-1)?.node_id === node.id
      }),
      isCurrent: node.thread_ids.some((threadId) => current.get(threadId)?.nodeId === node.id),
      isBanked: node.kind === 'beat' && (node.thread_ids.length === 0 || node.banked_from_thread_id != null),
    },
  }))
}
