import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { LoomLane } from '../LoomLane'
import { LoomSwimlanes } from '../LoomSwimlanes'
import { LoomNodeCard } from '../LoomNodeCard'
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

  it('renders the fell edge column once in the grid headers', () => {
    const tapestry = demoTapestry()
    render(<LoomSwimlanes threads={tapestry.threads} nodes={tapestry.nodes} sessions={sessions} />)
    const fellHeaders = document.querySelectorAll('.loom-grid-col-header--fell')
    expect(fellHeaders).toHaveLength(1)
  })

  it('renders the fell edge once per lane', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)
    const fellEdges = document.querySelectorAll('.loom-grid-fell-edge')
    expect(fellEdges).toHaveLength(1)
  })

  it('renders the warp region once per lane', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)
    const warps = document.querySelectorAll('.loom-grid-warp')
    expect(warps).toHaveLength(1)
  })

  it('marks played session cells with the cloth class', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)
    const clothCells = document.querySelectorAll('.loom-grid-cell--cloth')
    expect(clothCells.length).toBeGreaterThan(0)
  })

  it('renders a kind marker on every card', () => {
    const beat: LoomNode = { id: 10, kind: 'beat', title: 'Find the Key', thread_id: 1, session_id: null, position: 10, carried_count: 0 }
    render(<LoomNodeCard node={beat} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-marker-kind')).toHaveTextContent('BEAT')
  })

  it('renders carry count marker when carried_count > 0', () => {
    const carried: LoomNode = { id: 11, kind: 'beat', title: 'Carried Beat', thread_id: 1, session_id: null, position: 10, carried_count: 2 }
    render(<LoomNodeCard node={carried} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-marker-carry')).toHaveTextContent('2×')
  })

  it('omits carry count marker when carried_count is 0', () => {
    const plain: LoomNode = { id: 12, kind: 'beat', title: 'Plain Beat', thread_id: 1, session_id: null, position: 10, carried_count: 0 }
    render(<LoomNodeCard node={plain} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-marker-carry')).toBeNull()
  })

  it('renders notes marker when node has a body', () => {
    const withNotes: LoomNode = { id: 13, kind: 'beat', title: 'Noted', thread_id: 1, session_id: null, position: 10, carried_count: 0, body: 'Some notes' }
    render(<LoomNodeCard node={withNotes} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-marker-note')).toBeTruthy()
  })

  it('renders provenance marker when fulfilled title differs', () => {
    const provenance: LoomNode = { id: 14, kind: 'beat', title: 'Played Title', thread_id: 1, session_id: null, position: 10, carried_count: 0, fulfilled_at: '2025-01-01', fulfilled_planned_title: 'Planned Title' }
    render(<LoomNodeCard node={provenance} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-provenance')).toHaveTextContent('Planned Title')
  })

  it('omits provenance marker when fulfilled title matches current title', () => {
    const same: LoomNode = { id: 15, kind: 'beat', title: 'Same Title', thread_id: 1, session_id: null, position: 10, carried_count: 0, fulfilled_at: '2025-01-01', fulfilled_planned_title: 'Same Title' }
    render(<LoomNodeCard node={same} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-provenance')).toBeNull()
  })

  it('renders spawn origin marker on start cap of spawned threads', () => {
    const spawnedThread: LoomTapestryThread = { id: 3, name: 'Spawned Thread', color: 'thread-2', origin_node_id: 99 }
    const spawnedNodes: LoomNode[] = [
      ...demoTapestry().nodes,
      { id: 99, kind: 'beat', title: 'Find the Lost Puppy', thread_id: 1, session_id: null, position: 15, carried_count: 0 },
      { id: 100, kind: 'start', title: 'Spawned Start', thread_id: 3, session_id: 1, position: 0, carried_count: 0 },
    ]
    render(<LoomLane thread={spawnedThread} nodes={spawnedNodes} sessions={sessions} />)
    expect(document.querySelector('.loom-node-marker-spawn')).toHaveTextContent('Find the Lost Puppy')
  })

  it('does not render spawn marker on threads without origin_node_id', () => {
    const tapestry = demoTapestry()
    render(<LoomLane thread={tapestry.threads[0]} nodes={tapestry.nodes} sessions={sessions} />)
    expect(document.querySelector('.loom-node-marker-spawn')).toBeNull()
  })

  it('renders end cap in a cloth cell (bound cloth)', () => {
    const tapestry = demoTapestry()
    render(<LoomLane thread={tapestry.threads[0]} nodes={tapestry.nodes} sessions={sessions} />)
    const endCard = document.querySelector('.loom-node--end')
    expect(endCard).toBeTruthy()
    const parentCell = endCard?.closest('.loom-grid-cell')
    expect(parentCell?.classList.contains('loom-grid-cell--cloth')).toBe(true)
  })
})
