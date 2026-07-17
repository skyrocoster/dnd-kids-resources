import { describe, it, expect } from 'vitest'
import type { LoomEdge, LoomNode, LoomTapestry } from '../../../api/types'
import { buildFlowEdges, buildFlowNodes } from '../loomFlow'

// Mirrors data/seeds/seed_loom_{threads,nodes,node_threads,edges}.json.
function demoTapestry(): LoomTapestry {
  const nodes: LoomNode[] = [
    { id: 1, kind: 'update', title: 'Puppy goes missing in the village', status: null, x: 0, y: 0, thread_ids: [1] },
    { id: 2, kind: 'update', title: 'Goblins spotted stealing chickens', status: null, x: 0, y: 150, thread_ids: [2] },
    { id: 3, kind: 'update', title: 'Tracks lead to the goblin cave', status: null, x: 200, y: 75, thread_ids: [1, 2] },
    { id: 4, kind: 'anchor', title: 'Confront the goblin chief', status: 'planned', x: 400, y: 75, thread_ids: [1, 2] },
    { id: 5, kind: 'anchor', title: 'Puppy reunion festival', status: 'planned', x: 600, y: 0, thread_ids: [1] },
    { id: 6, kind: 'anchor', title: 'Secret tunnel discovered', status: 'planned', x: 600, y: 150, thread_ids: [2] },
    { id: 7, kind: 'update', title: 'Mysterious hooded stranger', status: null, x: 400, y: 300, thread_ids: [] },
  ]
  const edges: LoomEdge[] = [
    { id: 1, source_id: 1, target_id: 3 },
    { id: 2, source_id: 2, target_id: 3 },
    { id: 3, source_id: 3, target_id: 4 },
    { id: 4, source_id: 3, target_id: 6 },
    { id: 5, source_id: 4, target_id: 5 },
  ]
  const threads = [
    { id: 1, name: 'The Lost Puppy', color: 'thread-3' as const },
    { id: 2, name: 'Goblin Trouble', color: 'thread-1' as const },
  ]
  return { threads, nodes, edges }
}

describe('buildFlowNodes', () => {
  it('maps every node to a structural FlowNode keyed by kind, with the merge node flagged as head', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    expect(flowNodes).toHaveLength(7)

    const node3 = flowNodes.find((n) => n.id === '3')!
    expect(node3.type).toBe('update')
    expect(node3.position).toEqual({ x: 200, y: 75 })
    expect(node3.data.isHead).toBe(true)
    expect(node3.data.isNextAnchor).toBe(false)

    const node4 = flowNodes.find((n) => n.id === '4')!
    expect(node4.type).toBe('anchor')
    expect(node4.data.isHead).toBe(false)
    expect(node4.data.isNextAnchor).toBe(true)

    const node6 = flowNodes.find((n) => n.id === '6')!
    expect(node6.data.isNextAnchor).toBe(true)

    const node5 = flowNodes.find((n) => n.id === '5')!
    expect(node5.data.isNextAnchor).toBe(false)
  })

  it('carries the full LoomNode through in data.node', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    const node7 = flowNodes.find((n) => n.id === '7')!
    expect(node7.data.node.title).toBe('Mysterious hooded stranger')
  })
})

describe('buildFlowEdges', () => {
  it('maps every edge to a structural FlowEdge with resolved thread intersection', () => {
    const flowEdges = buildFlowEdges(demoTapestry())
    expect(flowEdges).toHaveLength(5)

    const merge = flowEdges.find((e) => e.id === '1')!
    expect(merge.source).toBe('1')
    expect(merge.target).toBe('3')
    expect(merge.data.threadIds).toEqual([1])

    const split = flowEdges.find((e) => e.id === '3')!
    expect(split.data.threadIds.sort()).toEqual([1, 2])
  })
})
