import type { LoomNode, LoomTapestry } from '../../api/types'
import { buildAdjacency, edgeThreads, headsByThread, nearestFutureAnchors } from './loomGraph'

/**
 * Minimal structural shapes React Flow's `Node`/`Edge` accept as-is.
 * Defined locally so this module has no `@xyflow/react` dependency (that
 * installs in LM4); the canvas layer can pass these straight through.
 */
export interface FlowNode {
  id: string
  type: 'anchor' | 'update'
  position: { x: number; y: number }
  data: FlowNodeData
}

export interface FlowNodeData {
  node: LoomNode
  isHead: boolean
  isNextAnchor: boolean
  // Index signature satisfies @xyflow/react's `Record<string, unknown>` node-data
  // constraint (LM4) without this module importing the library itself.
  [key: string]: unknown
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  data: FlowEdgeData
}

export interface FlowEdgeData {
  threadIds: number[]
  isLiveWarp: boolean
  [key: string]: unknown
}

function headNodeIds(tapestry: LoomTapestry): Set<number> {
  const heads = new Set<number>()
  for (const threadHeads of headsByThread(tapestry).values()) {
    for (const nodeId of threadHeads) heads.add(nodeId)
  }
  return heads
}

function nextAnchorNodeIds(tapestry: LoomTapestry, heads: Set<number>): Set<number> {
  const adjacency = buildAdjacency(tapestry.edges)
  const next = new Set<number>()
  for (const headId of heads) {
    for (const anchorId of nearestFutureAnchors(headId, tapestry, adjacency)) next.add(anchorId)
  }
  return next
}

export function buildLiveWarpEdgeIds(tapestry: LoomTapestry): Set<string> {
  const adjacency = buildAdjacency(tapestry.edges)
  const liveWarpEdgeIds = new Set<string>()

  for (const threadHeads of headsByThread(tapestry).values()) {
    for (const headId of threadHeads) {
      for (const anchorId of nearestFutureAnchors(headId, tapestry, adjacency)) {
        liveWarpEdgeIds.add(`${headId}->${anchorId}`)
      }
    }
  }

  return liveWarpEdgeIds
}

export function buildFlowNodes(tapestry: LoomTapestry): FlowNode[] {
  const heads = headNodeIds(tapestry)
  const nextAnchors = nextAnchorNodeIds(tapestry, heads)

  return tapestry.nodes.map((node) => ({
    id: String(node.id),
    type: node.kind,
    position: { x: node.x, y: node.y },
    data: {
      node,
      isHead: heads.has(node.id),
      isNextAnchor: nextAnchors.has(node.id),
    },
  }))
}

export function buildFlowEdges(tapestry: LoomTapestry): FlowEdge[] {
  const liveWarpEdgeIds = buildLiveWarpEdgeIds(tapestry)

  return tapestry.edges.map((edge) => ({
    id: String(edge.id),
    source: String(edge.source_id),
    target: String(edge.target_id),
    data: {
      threadIds: edgeThreads(edge, tapestry),
      isLiveWarp: liveWarpEdgeIds.has(`${edge.source_id}->${edge.target_id}`),
    },
  }))
}
