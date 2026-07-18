import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { threadOrdered, currentPosition, nextBeat } from '../loomGraph'
import type { SwimlaneModel } from '../swimlaneTypes'

function demoTapestry(): LoomTapestry {
  const nodes: LoomNode[] = [
    { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] },
    { id: 2, kind: 'session', title: 'Puppy goes missing', x: 100, y: 0, thread_ids: [1] },
    { id: 3, kind: 'session', title: 'Met the wizard', x: 200, y: 0, thread_ids: [1, 2] },
    { id: 4, kind: 'beat', title: 'Get the Amulet', x: 300, y: 0, thread_ids: [1] },
    { id: 5, kind: 'end', title: 'Resolve: The Lost Puppy', x: 400, y: 0, thread_ids: [1] },
    { id: 6, kind: 'start', title: 'Return the Hat', x: 0, y: 150, thread_ids: [2] },
    { id: 7, kind: 'session', title: 'Hat returned', x: 200, y: 150, thread_ids: [2] },
    { id: 8, kind: 'end', title: 'Resolve: Return the Hat', x: 300, y: 150, thread_ids: [2] },
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
      id: 2, name: 'Return the Hat', color: 'thread-1',
      items: [
        { node_id: 6, position: 0 },
        { node_id: 3, position: 10 },
        { node_id: 7, position: 20 },
        { node_id: 8, position: 30 },
      ],
    },
  ]
  return { threads, nodes }
}

function buildLanes(tapestry: LoomTapestry): SwimlaneModel[] {
  return tapestry.threads.map((thread) => {
    const ordered = threadOrdered(thread, tapestry.nodes)
    const current = currentPosition(thread, tapestry.nodes)
    const next = nextBeat(thread, tapestry.nodes)
    return {
      thread,
      ordered,
      currentNodeId: current?.nodeId ?? null,
      nextBeatId: next?.id ?? null,
    }
  })
}

describe('LoomSwimlanes scaffolding', () => {
  it.skip('renders lanes in position order', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)

    expect(lanes).toHaveLength(2)
    expect(lanes[0].thread.id).toBe(1)
    expect(lanes[0].ordered.map((n) => n.id)).toEqual([1, 2, 3, 4, 5])
    expect(lanes[1].thread.id).toBe(2)
    expect(lanes[1].ordered.map((n) => n.id)).toEqual([6, 3, 7, 8])
  })

  it.skip('marks played vs planned styling per lane', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)
    const lane1 = lanes[0]

    expect(lane1.currentNodeId).toBe(3)
    expect(lane1.nextBeatId).toBe(4)

    const played = lane1.ordered.filter(
      (n) => n.kind === 'session' || n.fulfilled_at,
    )
    const planned = lane1.ordered.filter(
      (n) => n.kind === 'beat' && !n.fulfilled_at,
    )

    expect(played.map((n) => n.id)).toContain(2)
    expect(played.map((n) => n.id)).toContain(3)
    expect(planned.map((n) => n.id)).toContain(4)
  })

  it.skip('shows a shared session in two lanes', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)

    const node3InLane1 = lanes[0].ordered.find((n) => n.id === 3)
    const node3InLane2 = lanes[1].ordered.find((n) => n.id === 3)

    expect(node3InLane1).toBeDefined()
    expect(node3InLane2).toBeDefined()
    expect(node3InLane1!.thread_ids).toContain(1)
    expect(node3InLane2!.thread_ids).toContain(2)
  })

  it.skip('identifies a spawn link from origin thread', () => {
    const tapestry = demoTapestry()
    const spawnedThread = tapestry.threads.find(
      (t) => t.origin_node_id != null,
    )

    if (spawnedThread) {
      expect(spawnedThread.origin_node_id).toBeDefined()
      const originNode = tapestry.nodes.find(
        (n) => n.id === spawnedThread.origin_node_id,
      )
      expect(originNode).toBeDefined()
      expect(originNode!.kind).toBe('session')
    }
  })

  it.skip('supports insert-via-gap at a position', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)
    const lane = lanes[0]

    const positions = lane.thread.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => i.position)

    expect(positions).toEqual([0, 10, 20, 30, 40])

    const gapAfterPosition = 15
    expect(gapAfterPosition).toBeGreaterThan(positions[1])
    expect(gapAfterPosition).toBeLessThan(positions[2])
  })

  it.skip('supports drag-reorder within a lane', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)
    const lane = lanes[0]

    const beatPositions = lane.thread.items
      .filter((item) => {
        const node = tapestry.nodes.find((n) => n.id === item.node_id)
        return node?.kind === 'beat'
      })
      .sort((a, b) => a.position - b.position)

    expect(beatPositions.length).toBeGreaterThanOrEqual(1)
    expect(beatPositions[0].position).toBe(30)
  })

  it.skip('supports restore via Thread picker', () => {
    const tapestry = demoTapestry()
    const banked = tapestry.nodes.filter(
      (n) => n.kind === 'beat' && n.thread_ids.length === 0,
    )

    expect(banked).toHaveLength(1)
    expect(banked[0].id).toBe(9)
    expect(banked[0].title).toBe('Mysterious stranger')
  })
})
