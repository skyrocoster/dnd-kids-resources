import { describe, it, expect } from 'vitest'
import type { LoomEdge, LoomNode, LoomTapestry } from '../../../api/types'
import {
  buildAdjacency,
  buildNodeStatusUpdate,
  edgeThreads,
  headsByThread,
  isFuture,
  isPast,
  nearestFutureAnchors,
  vaultNodes,
  wouldCycle,
} from '../loomGraph'

// Mirrors data/seeds/seed_loom_{threads,nodes,node_threads,edges}.json (docs/plans/active/loom-tapestry-tracker.md's "Demo tapestry").
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

describe('isPast / isFuture', () => {
  it('treats updates as past and planned anchors as future', () => {
    const update: LoomNode = { id: 1, kind: 'update', title: 'u', status: null, x: 0, y: 0, thread_ids: [] }
    const planned: LoomNode = { id: 2, kind: 'anchor', title: 'a', status: 'planned', x: 0, y: 0, thread_ids: [] }
    const reached: LoomNode = { id: 3, kind: 'anchor', title: 'a', status: 'reached', x: 0, y: 0, thread_ids: [] }
    const abandoned: LoomNode = { id: 4, kind: 'anchor', title: 'a', status: 'abandoned', x: 0, y: 0, thread_ids: [] }

    expect(isPast(update)).toBe(true)
    expect(isPast(reached)).toBe(true)
    expect(isPast(planned)).toBe(false)
    expect(isPast(abandoned)).toBe(false)

    expect(isFuture(planned)).toBe(true)
    expect(isFuture(reached)).toBe(false)
    expect(isFuture(abandoned)).toBe(false)
    expect(isFuture(update)).toBe(false)
  })
})

describe('headsByThread', () => {
  it('reports the merge node as the sole head of both threads in the demo tapestry', () => {
    const heads = headsByThread(demoTapestry())
    expect(heads.get(1)).toEqual(new Set([3]))
    expect(heads.get(2)).toEqual(new Set([3]))
  })

  it('reports two heads when a thread splits into parallel past branches', () => {
    const tapestry: LoomTapestry = {
      threads: [{ id: 1, name: 'Split', color: 'thread-1' }],
      nodes: [
        { id: 1, kind: 'update', title: 'root', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 2, kind: 'update', title: 'branch a', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 3, kind: 'update', title: 'branch b', status: null, x: 0, y: 0, thread_ids: [1] },
      ],
      edges: [
        { id: 1, source_id: 1, target_id: 2 },
        { id: 2, source_id: 1, target_id: 3 },
      ],
    }
    expect(headsByThread(tapestry).get(1)).toEqual(new Set([2, 3]))
  })

  it('marking anchor 4 reached makes it the new head (past chain extends)', () => {
    const tapestry = demoTapestry()
    tapestry.nodes = tapestry.nodes.map((node) => (node.id === 4 ? { ...node, status: 'reached' } : node))
    const heads = headsByThread(tapestry)
    expect(heads.get(1)).toEqual(new Set([4]))
    expect(heads.get(2)).toEqual(new Set([4]))
  })

  it('bridging node 3 to anchor 4 (splicing a new update in between) makes the new node the head', () => {
    const tapestry = demoTapestry()
    // Mirrors POST /api/loom/bridge splicing an update node 8 between head 3 and anchor 4,
    // deleting the direct 3->4 edge (LM2's confirmed bridge contract).
    tapestry.nodes.push({
      id: 8,
      kind: 'update',
      title: 'Session recap',
      status: null,
      x: 300,
      y: 75,
      thread_ids: [1, 2],
    })
    tapestry.edges = tapestry.edges
      .filter((edge) => !(edge.source_id === 3 && edge.target_id === 4))
      .concat([
        { id: 6, source_id: 3, target_id: 8 },
        { id: 7, source_id: 8, target_id: 4 },
      ])

    const heads = headsByThread(tapestry)
    expect(heads.get(1)).toEqual(new Set([8]))
    expect(heads.get(2)).toEqual(new Set([8]))
    expect(nearestFutureAnchors(8, tapestry)).toEqual([4])
  })

  it('a hand-off edge into another thread does not steal this thread\'s head', () => {
    const tapestry: LoomTapestry = {
      threads: [
        { id: 1, name: 'A', color: 'thread-1' },
        { id: 2, name: 'B', color: 'thread-2' },
      ],
      nodes: [
        { id: 1, kind: 'update', title: 'a head', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 2, kind: 'update', title: 'b node', status: null, x: 0, y: 0, thread_ids: [2] },
      ],
      edges: [{ id: 1, source_id: 1, target_id: 2 }],
    }
    const heads = headsByThread(tapestry)
    expect(heads.get(1)).toEqual(new Set([1]))
    expect(heads.get(2)).toEqual(new Set([2]))
  })
})

describe('nearestFutureAnchors', () => {
  it('finds both split anchors from the merge head in the demo tapestry', () => {
    const result = nearestFutureAnchors(3, demoTapestry())
    expect(new Set(result)).toEqual(new Set([4, 6]))
  })

  it('stops silently at an abandoned anchor without reporting it', () => {
    const tapestry: LoomTapestry = {
      threads: [{ id: 1, name: 'T', color: 'thread-1' }],
      nodes: [
        { id: 1, kind: 'update', title: 'head', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 2, kind: 'anchor', title: 'dead end', status: 'abandoned', x: 0, y: 0, thread_ids: [1] },
      ],
      edges: [{ id: 1, source_id: 1, target_id: 2 }],
    }
    expect(nearestFutureAnchors(1, tapestry)).toEqual([])
  })

  it('walks past an abandoned branch to find a planned anchor further out', () => {
    const tapestry: LoomTapestry = {
      threads: [{ id: 1, name: 'T', color: 'thread-1' }],
      nodes: [
        { id: 1, kind: 'update', title: 'head', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 2, kind: 'update', title: 'still walking', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 3, kind: 'anchor', title: 'goal', status: 'planned', x: 0, y: 0, thread_ids: [1] },
      ],
      edges: [
        { id: 1, source_id: 1, target_id: 2 },
        { id: 2, source_id: 2, target_id: 3 },
      ],
    }
    expect(nearestFutureAnchors(1, tapestry)).toEqual([3])
  })
})

describe('vaultNodes', () => {
  it('reports node 7 as the sole vault node in the demo tapestry', () => {
    expect(vaultNodes(demoTapestry()).map((node) => node.id)).toEqual([7])
  })
})

describe('edgeThreads', () => {
  const tapestry = demoTapestry()

  it('single shared thread', () => {
    // edge 3->4 shared by both threads 1 and 2
    const edge = tapestry.edges.find((e) => e.id === 3)!
    expect(edgeThreads(edge, tapestry).sort()).toEqual([1, 2])
  })

  it('no shared thread', () => {
    const noShare: LoomTapestry = {
      threads: tapestry.threads,
      nodes: [
        { id: 1, kind: 'update', title: 'a', status: null, x: 0, y: 0, thread_ids: [1] },
        { id: 2, kind: 'update', title: 'b', status: null, x: 0, y: 0, thread_ids: [2] },
      ],
      edges: [{ id: 1, source_id: 1, target_id: 2 }],
    }
    expect(edgeThreads(noShare.edges[0], noShare)).toEqual([])
  })

  it('multi-thread intersection narrows to the shared subset', () => {
    const multi: LoomTapestry = {
      threads: tapestry.threads,
      nodes: [
        { id: 1, kind: 'update', title: 'a', status: null, x: 0, y: 0, thread_ids: [1, 2] },
        { id: 2, kind: 'update', title: 'b', status: null, x: 0, y: 0, thread_ids: [2] },
      ],
      edges: [{ id: 1, source_id: 1, target_id: 2 }],
    }
    expect(edgeThreads(multi.edges[0], multi)).toEqual([2])
  })
})

describe('wouldCycle', () => {
  const edges: LoomEdge[] = [
    { id: 1, source_id: 1, target_id: 2 },
    { id: 2, source_id: 2, target_id: 3 },
  ]

  it('rejects a direct cycle (target -> source already exists)', () => {
    expect(wouldCycle(edges, 2, 1)).toBe(true)
  })

  it('rejects a transitive cycle', () => {
    expect(wouldCycle(edges, 3, 1)).toBe(true)
  })

  it('allows a non-cyclic edge', () => {
    expect(wouldCycle(edges, 1, 3)).toBe(false)
  })
})

describe('buildNodeStatusUpdate', () => {
  it('resubmits every field unchanged except the new status (PUT is a full replace)', () => {
    const anchor: LoomNode = {
      id: 4,
      kind: 'anchor',
      title: 'Confront the goblin chief',
      body: 'The chief awaits in the cave.',
      status: 'planned',
      session_tag: 'Session 9',
      x: 400,
      y: 75,
      thread_ids: [1, 2],
    }
    expect(buildNodeStatusUpdate(anchor, 'reached')).toEqual({
      kind: 'anchor',
      title: 'Confront the goblin chief',
      body: 'The chief awaits in the cave.',
      status: 'reached',
      session_tag: 'Session 9',
      x: 400,
      y: 75,
      thread_ids: [1, 2],
    })
  })

  it('normalizes missing optional fields to null', () => {
    const anchor: LoomNode = {
      id: 5,
      kind: 'anchor',
      title: 'Puppy reunion festival',
      status: 'planned',
      x: 600,
      y: 0,
      thread_ids: [],
    }
    const update = buildNodeStatusUpdate(anchor, 'abandoned')
    expect(update.body).toBeNull()
    expect(update.session_tag).toBeNull()
    expect(update.status).toBe('abandoned')
  })
})

describe('buildAdjacency', () => {
  it('groups outgoing edges by source', () => {
    const adjacency = buildAdjacency(demoTapestry().edges)
    expect(adjacency.get(3)?.sort()).toEqual([4, 6])
    expect(adjacency.get(7)).toBeUndefined()
  })
})
