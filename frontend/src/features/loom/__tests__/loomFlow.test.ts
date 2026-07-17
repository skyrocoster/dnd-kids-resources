import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { buildFlowEdges, buildFlowNodes } from '../loomFlow'

function demoTapestry(): LoomTapestry {
  const nodes: LoomNode[] = [
    { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] },
    { id: 2, kind: 'session', title: 'Puppy goes missing', x: 100, y: 0, thread_ids: [1] },
    { id: 3, kind: 'session', title: 'Met the wizard', x: 200, y: 0, thread_ids: [1, 2] },
    { id: 4, kind: 'beat', title: 'Get the Amulet', x: 300, y: 0, thread_ids: [1] },
    { id: 5, kind: 'end', title: 'Resolve: The Lost Puppy', x: 400, y: 0, thread_ids: [1] },
    { id: 9, kind: 'beat', title: 'Mysterious stranger', x: 0, y: 300, thread_ids: [] },
  ]
  const threads: LoomTapestryThread[] = [
    {
      id: 1, name: 'The Lost Puppy', color: 'thread-3',
      items: [
        { node_id: 1, position: 0 },
        { node_id: 2, position: 10 },
        { node_id: 3, position: 20 },
        { node_id: 4, position: 30 },
        { node_id: 5, position: 40 },
      ],
    },
  ]
  return { threads, nodes }
}

describe('buildFlowNodes', () => {
  it('maps every node to a structural FlowNode keyed by kind', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    expect(flowNodes).toHaveLength(6)

    const startNode = flowNodes.find((n) => n.id === '1')!
    expect(startNode.type).toBe('start')
    expect(startNode.position).toEqual({ x: 0, y: 0 })
    expect(startNode.data.node.title).toBe('The Lost Puppy')

    const sessionNode = flowNodes.find((n) => n.id === '2')!
    expect(sessionNode.type).toBe('session')

    const beatNode = flowNodes.find((n) => n.id === '4')!
    expect(beatNode.type).toBe('beat')
    expect(beatNode.data.isBanked).toBe(false)
  })

  it('flags unplaced beats as banked', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    const banked = flowNodes.find((n) => n.id === '9')!
    expect(banked.data.isBanked).toBe(true)
  })

  it('carries the full LoomNode through in data.node', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    const node3 = flowNodes.find((n) => n.id === '3')!
    expect(node3.data.node.title).toBe('Met the wizard')
    expect(node3.data.node.thread_ids).toEqual([1, 2])
  })
})

// --- it.skip seams for PB1 ordered-view layout ---

describe('buildFlowNodes lane layout (PB1)', () => {
  it('lays out nodes in ordered lanes from Start (left) to End (right)', () => {
    const nodes = buildFlowNodes(demoTapestry())
    expect(nodes.find((node) => node.id === '1')?.position).toEqual({ x: 0, y: 0 })
    expect(nodes.find((node) => node.id === '5')?.position.x).toBeGreaterThan(0)
  })

  it('places shared session nodes at independent positions per thread', () => {
    expect(buildFlowNodes(demoTapestry()).find((node) => node.id === '3')?.position.y).toBe(0)
  })
})

describe('buildFlowEdges (PB1)', () => {
  it('derives edges from position ordering within each thread', () => {
    const edges = buildFlowEdges(buildFlowNodes(demoTapestry()), demoTapestry().threads[0])
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual([['1', '2'], ['2', '3'], ['3', '4'], ['4', '5']])
  })
})
