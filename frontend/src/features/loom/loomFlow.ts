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

export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  style?: Record<string, string | number>
}

export function buildFlowEdges(_nodes: FlowNode[], thread: LoomTapestryThread): FlowEdge[] {
  const items = thread.items.slice().sort((a, b) => a.position - b.position)
  return items.slice(0, -1).map((item, index) => ({
    id: `loom-thread-${thread.id}-${item.node_id}-${items[index + 1].node_id}`,
    source: String(item.node_id),
    target: String(items[index + 1].node_id),
    type: 'smoothstep',
    style: { stroke: `var(--md-${thread.color})` },
  }))
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
