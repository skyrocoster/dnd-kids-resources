import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { buildFlowEdges, buildFlowNodes, buildSpawnEdges, type FlowNode } from '../loomFlow'

function flowNodeAt(id: string, x: number, y: number): FlowNode {
  return { id, type: 'session', position: { x, y }, data: {} as FlowNode['data'] }
}

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
    {
      id: 2, name: "Return the Wizard's Hat", color: 'thread-1', origin_node_id: 3,
      items: [
        { node_id: 6, position: 0 },
        { node_id: 7, position: 10 },
      ],
    },
  ]
  return { threads, nodes }
}

describe('buildFlowNodes', () => {
  it('maps every placed node to a structural FlowNode keyed by kind', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    expect(flowNodes).toHaveLength(5)

    const startNode = flowNodes.find((n) => n.id === '1')!
    expect(startNode.type).toBe('start')
    expect(startNode.position).toEqual({ x: 0, y: 0 })
    expect(startNode.data.node.title).toBe('The Lost Puppy')

    const sessionNode = flowNodes.find((n) => n.id === '2')!
    expect(sessionNode.type).toBe('session')

    const beatNode = flowNodes.find((n) => n.id === '4')!
    expect(beatNode.type).toBe('beat')
  })

  it('excludes unplaced (banked) beats from the canvas', () => {
    const flowNodes = buildFlowNodes(demoTapestry())
    expect(flowNodes.find((n) => n.id === '9')).toBeUndefined()
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

  it('strokes edges with the thread color token that actually exists (--md-loom-*)', () => {
    const edges = buildFlowEdges(buildFlowNodes(demoTapestry()), demoTapestry().threads[0])
    expect(edges[0].style?.stroke).toBe('var(--md-loom-thread-3)')
  })

  it('anchors left-to-right by default, matching the same-lane left-to-right layout', () => {
    const edges = buildFlowEdges(buildFlowNodes(demoTapestry()), demoTapestry().threads[0])
    expect(edges[0].sourceHandle).toBe('right')
    expect(edges[0].targetHandle).toBe('left')
  })

  it('re-anchors an in-thread edge to top/bottom when a node is dragged into another lane', () => {
    const nodes = [flowNodeAt('1', 0, 0), flowNodeAt('2', 0, 220)]
    const edges = buildFlowEdges(nodes, demoTapestry().threads[0])
    expect(edges[0].sourceHandle).toBe('bottom')
    expect(edges[0].targetHandle).toBe('top')
  })
})

describe('buildSpawnEdges', () => {
  it('connects an origin session to the spawned thread\'s Start node', () => {
    const nodes = [flowNodeAt('3', 0, 0), flowNodeAt('6', 0, 220)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('3')
    expect(edges[0].target).toBe('6')
  })

  it('renders the connector dotted in a neutral outline color, not a thread color', () => {
    const nodes = [flowNodeAt('3', 0, 0), flowNodeAt('6', 0, 220)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges[0].style?.strokeDasharray).toBe('4 4')
    expect(edges[0].style?.stroke).toBe('var(--md-outline)')
  })

  it('omits threads with no origin_node_id', () => {
    const nodes = [flowNodeAt('3', 0, 0), flowNodeAt('6', 0, 220)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges.some((edge) => edge.id.includes('loom-spawn') && edge.target !== '6')).toBe(false)
  })

  it('anchors bottom-to-top when the spawned Start sits below the origin session', () => {
    const nodes = [flowNodeAt('3', 100, 0), flowNodeAt('6', 100, 220)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges[0].sourceHandle).toBe('bottom')
    expect(edges[0].targetHandle).toBe('top')
  })

  it('anchors top-to-bottom when the spawned Start sits above the origin session', () => {
    const nodes = [flowNodeAt('3', 100, 220), flowNodeAt('6', 100, 0)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges[0].sourceHandle).toBe('top')
    expect(edges[0].targetHandle).toBe('bottom')
  })

  it('anchors right-to-left when the spawned Start sits beside the origin session', () => {
    const nodes = [flowNodeAt('3', 0, 100), flowNodeAt('6', 300, 100)]
    const edges = buildSpawnEdges(nodes, demoTapestry())
    expect(edges[0].sourceHandle).toBe('right')
    expect(edges[0].targetHandle).toBe('left')
  })

  it('falls back to bottom-to-top when a node position is unknown', () => {
    const edges = buildSpawnEdges([], demoTapestry())
    expect(edges[0].sourceHandle).toBe('bottom')
    expect(edges[0].targetHandle).toBe('top')
  })
})
