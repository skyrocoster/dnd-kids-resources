import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { LoomLane } from '../LoomLane'
import { threadOrdered, currentPosition, nextBeat } from '../loomGraph'

const sessions: LoomSession[] = [
  { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
  { id: 2, ordinal: 2, name: 'Session 2', played_on: null, notes: null },
  { id: 3, ordinal: 3, name: 'Session 3', played_on: null, notes: null },
  { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
]

function demoTapestry(): LoomTapestry {
  const nodes: LoomNode[] = [
    { id: 1, kind: 'start', title: 'The Lost Puppy', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
    { id: 2, kind: 'session', title: 'Puppy goes missing', thread_id: 1, session_id: 2, position: 10, carried_count: 0 },
    { id: 3, kind: 'beat', title: 'Get the Amulet', thread_id: 1, session_id: 3, position: 20, carried_count: 0 },
    { id: 4, kind: 'end', title: 'Resolve: The Lost Puppy', thread_id: 1, session_id: 4, position: 30, carried_count: 0 },
    { id: 5, kind: 'start', title: 'Return the Hat', thread_id: 2, session_id: 1, position: 0, carried_count: 0 },
    { id: 6, kind: 'beat', title: 'Hat returned', thread_id: 2, session_id: 2, position: 10, carried_count: 0 },
    { id: 7, kind: 'end', title: 'Resolve: Return the Hat', thread_id: 2, session_id: 4, position: 20, carried_count: 0 },
  ]
  const threads: LoomTapestryThread[] = [
    { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
    { id: 2, name: 'Return the Hat', color: 'thread-1' },
  ]
  return { threads, nodes, sessions }
}

function buildLanes(tapestry: LoomTapestry) {
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

describe('grid rendering', () => {
  it('renders lanes in position order', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)

    expect(lanes).toHaveLength(2)
    expect(lanes[0].thread.id).toBe(1)
    expect(lanes[0].ordered.map((n) => n.id)).toEqual([1, 2, 3, 4])
    expect(lanes[1].thread.id).toBe(2)
    expect(lanes[1].ordered.map((n) => n.id)).toEqual([5, 6, 7])
  })

  it('marks played vs planned styling per lane', () => {
    const tapestry = demoTapestry()
    const lanes = buildLanes(tapestry)
    const lane1 = lanes[0]

    expect(lane1.currentNodeId).toBe(2)
    expect(lane1.nextBeatId).toBe(3)

    const played = lane1.ordered.filter(
      (n) => n.kind === 'session' || n.fulfilled_at,
    )
    const planned = lane1.ordered.filter(
      (n) => n.kind === 'beat' && !n.fulfilled_at,
    )

    expect(played.map((n) => n.id)).toContain(2)
    expect(planned.map((n) => n.id)).toContain(3)
  })

  it('renders session grid cells via LoomLane', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)

    const cells = document.querySelectorAll('.loom-grid-cell')
    expect(cells.length).toBe(sessions.length)
  })

  it('renders real cells for sessions with nodes', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)

    const realCells = document.querySelectorAll('.loom-grid-cell--real')
    const quietCells = document.querySelectorAll('.loom-grid-cell--quiet')
    const outsideCells = document.querySelectorAll('.loom-grid-cell--outside-life')

    expect(realCells.length).toBe(4)
    expect(quietCells.length).toBe(0)
    expect(outsideCells.length).toBe(0)
  })

  it('renders a thread label with the thread name', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)

    expect(document.querySelector('.loom-grid-thread-name')).toHaveTextContent('The Lost Puppy')
  })

  it('supports cross-lane drop via onCrossLaneDrop', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onCrossLaneDrop = vi.fn()
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} onCrossLaneDrop={onCrossLaneDrop} />)

    const gaps = document.querySelectorAll('.loom-lane-gap')
    expect(gaps.length).toBeGreaterThan(0)

    const dt = {
      getData: () => JSON.stringify({
        action: 'reorder',
        nodeId: 1,
        fromBodyIndex: 0,
        sourceThreadId: 999,
        nodeKind: 'beat',
      }),
    } as unknown as DataTransfer
    fireEvent.drop(gaps[0], { dataTransfer: dt })

    expect(onCrossLaneDrop).toHaveBeenCalledWith(1, 999, 1, expect.any(Number), 'beat')
  })
})
