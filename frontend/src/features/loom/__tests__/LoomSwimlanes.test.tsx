import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import { LoomLane } from '../LoomLane'
import { LoomSwimlanes } from '../LoomSwimlanes'
import { LoomNodeCard } from '../LoomNodeCard'
import { threadOrdered, currentPosition, nextBeat } from '../loomGraph'
import { isFellDividerFullyVisible } from '../currentPositionScroll'

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

  it('supports same-thread reorder via drop on a CardGroup', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onReorder = vi.fn()
    const nodes = [
      ...tapestry.nodes,
      { id: 8, kind: 'beat' as const, title: 'Plan B', thread_id: 1, session_id: null, position: 25, carried_count: 0 },
    ]
    render(<LoomLane thread={thread} nodes={nodes} sessions={sessions} onReorder={onReorder} />)

    const cardGroups = document.querySelectorAll('.loom-lane-card-group')
    expect(cardGroups.length).toBe(2)
    const firstCardGroup = cardGroups[0]

    const dt = {
      getData: () => JSON.stringify({
        action: 'reorder',
        nodeId: 3,
        fromBodyIndex: 0,
        sourceThreadId: 1,
        nodeKind: 'beat',
      }),
    } as unknown as DataTransfer
    fireEvent.drop(firstCardGroup, { dataTransfer: dt })

    expect(onReorder).toHaveBeenCalledWith(1, 3, 0, 0)
  })

  it('supports same-thread reorder via drop on the final sentinel gap', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onReorder = vi.fn()
    const nodes = [
      ...tapestry.nodes,
      { id: 8, kind: 'beat' as const, title: 'Plan B', thread_id: 1, session_id: null, position: 25, carried_count: 0 },
    ]
    render(<LoomLane thread={thread} nodes={nodes} sessions={sessions} onReorder={onReorder} />)

    const gaps = document.querySelectorAll('.loom-lane-gap')
    const sentinelGap = gaps[gaps.length - 1]

    const dt = {
      getData: () => JSON.stringify({
        action: 'reorder',
        nodeId: 3,
        fromBodyIndex: 0,
        sourceThreadId: 1,
        nodeKind: 'beat',
      }),
    } as unknown as DataTransfer
    fireEvent.drop(sentinelGap, { dataTransfer: dt })

    expect(onReorder).toHaveBeenCalledWith(1, 3, 0, 1)
  })

  it('supports cross-lane drop on the final sentinel gap', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onCrossLaneDrop = vi.fn()
    const nodes = [
      ...tapestry.nodes,
      { id: 8, kind: 'beat' as const, title: 'Plan B', thread_id: 1, session_id: null, position: 25, carried_count: 0 },
    ]
    render(<LoomLane thread={thread} nodes={nodes} sessions={sessions} onCrossLaneDrop={onCrossLaneDrop} />)

    const cardGroups = document.querySelectorAll('.loom-lane-card-group')
    const sentinelCardGroup = cardGroups[cardGroups.length - 1]

    const dt = {
      getData: () => JSON.stringify({
        action: 'reorder',
        nodeId: 3,
        fromBodyIndex: 0,
        sourceThreadId: 999,
        nodeKind: 'beat',
      }),
    } as unknown as DataTransfer
    fireEvent.drop(sentinelCardGroup, { dataTransfer: dt })

    expect(onCrossLaneDrop).toHaveBeenCalledWith(3, 999, 1, Number.MAX_SAFE_INTEGER, 'beat')
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

  it('exposes Planned beats in header and Current position in divider', () => {
    const tapestry = demoTapestry()
    const { container: swimContainer } = render(<LoomSwimlanes threads={tapestry.threads} nodes={tapestry.nodes} sessions={sessions} />)
    const plannedBeatsHeader = swimContainer.querySelector('[aria-label="Planned beats"]')
    expect(plannedBeatsHeader).toBeInTheDocument()
    expect(plannedBeatsHeader).toHaveTextContent('Planned beats')
    const thread = tapestry.threads[0]
    const { container: laneContainer } = render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} />)
    const currentPositionDivider = laneContainer.querySelector('[aria-label="Current position"]')
    expect(currentPositionDivider).toBeInTheDocument()
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
    expect(document.querySelector('.loom-node-marker-kind')).toHaveTextContent('Beat')
  })

  it('renders the spelled-out Session kind marker on session cards', () => {
    const session: LoomNode = { id: 16, kind: 'session', title: 'Puppy found', thread_id: 1, session_id: 2, position: 10, carried_count: 0 }
    render(<LoomNodeCard node={session} isNow={false} isNext={false} threadColor={null} />)
    expect(document.querySelector('.loom-node-marker-kind')).toHaveTextContent('Session')
  })

  it('renders the literal Current/Next words on badges', () => {
    const beat: LoomNode = { id: 17, kind: 'beat', title: 'Head of the thread', thread_id: 1, session_id: null, position: 10, carried_count: 0 }
    render(<LoomNodeCard node={beat} isNow isNext threadColor={null} />)
    expect(document.querySelector('.loom-node-badge--now')).toHaveTextContent('Current')
    expect(document.querySelector('.loom-node-badge--next')).toHaveTextContent('Next')
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

  it('renders end cap in a cloth cell (bound cloth)', () => {
    const tapestry = demoTapestry()
    render(<LoomLane thread={tapestry.threads[0]} nodes={tapestry.nodes} sessions={sessions} />)
    const endCard = document.querySelector('.loom-node--end')
    expect(endCard).toBeTruthy()
    const parentCell = endCard?.closest('.loom-grid-cell')
    expect(parentCell?.classList.contains('loom-grid-cell--cloth')).toBe(true)
  })

  it('renders the ninth session column in a nine-session grid', () => {
    const nineSessions: LoomSession[] = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      ordinal: i + 1,
      name: `Session ${i + 1}`,
      played_on: null,
      notes: null,
    }))
    const nodes: LoomNode[] = [
      { id: 1, kind: 'start', title: 'Lost Puppy', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
      { id: 2, kind: 'session', title: 'Found traces', thread_id: 1, session_id: 2, position: 10, carried_count: 0 },
      { id: 3, kind: 'session', title: 'Followed trail', thread_id: 1, session_id: 3, position: 20, carried_count: 0 },
      { id: 4, kind: 'session', title: 'Found puppy', thread_id: 1, session_id: 4, position: 30, carried_count: 0 },
      { id: 5, kind: 'end', title: 'Puppy home', thread_id: 1, session_id: 5, position: 40, carried_count: 0 },
      { id: 6, kind: 'start', title: 'Goblin Trouble', thread_id: 2, session_id: 3, position: 0, carried_count: 0 },
      { id: 7, kind: 'session', title: 'Goblins spotted', thread_id: 2, session_id: 4, position: 10, carried_count: 0 },
      { id: 8, kind: 'beat', title: 'Clear the warren', thread_id: 2, position: 20, carried_count: 3 },
      { id: 9, kind: 'end', title: 'Resolve goblins', thread_id: 2, session_id: null, position: 30, carried_count: 0 },
    ]
    const threads: LoomTapestryThread[] = [
      { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
      { id: 2, name: 'Goblin Trouble', color: 'thread-2' },
    ]

    render(<LoomSwimlanes threads={threads} nodes={nodes} sessions={nineSessions} />)

    const headers = document.querySelectorAll('.loom-grid-col-header')
    expect(headers).toHaveLength(11)
    expect(headers[0]).toHaveTextContent('1.Session 1')
    expect(headers[8]).toHaveTextContent('9.Session 9')

    const rows = document.querySelectorAll('.loom-grid-row')
    expect(rows).toHaveLength(2)

    const lostPuppyRow = rows[0]
    const puppyCells = lostPuppyRow.querySelectorAll('.loom-grid-cell')
    expect(puppyCells).toHaveLength(9)
    const puppyOutside = lostPuppyRow.querySelectorAll('.loom-grid-cell--outside-life')
    expect(puppyOutside).toHaveLength(4)
    expect(puppyCells[0]).toHaveClass('loom-grid-cell--real')
    expect(puppyCells[8]).toHaveClass('loom-grid-cell--outside-life')

    const goblinRow = rows[1]
    const goblinCells = goblinRow.querySelectorAll('.loom-grid-cell')
    expect(goblinCells).toHaveLength(9)
    const goblinQuiet = goblinRow.querySelectorAll('.loom-grid-cell--quiet')
    expect(goblinQuiet.length).toBeGreaterThan(0)
    expect(goblinCells[0]).toHaveClass('loom-grid-cell--outside-life')
  })

  it('does not invoke callbacks for empty drag data', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onCrossLaneDrop = vi.fn()
    const onReorder = vi.fn()
    const onGapRestore = vi.fn()
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} onCrossLaneDrop={onCrossLaneDrop} onReorder={onReorder} onGapRestore={onGapRestore} />)

    const gaps = document.querySelectorAll('.loom-lane-gap')
    const dt = { getData: () => '', setData: vi.fn() } as unknown as DataTransfer
    fireEvent.drop(gaps[0], { dataTransfer: dt })

    expect(onCrossLaneDrop).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
    expect(onGapRestore).not.toHaveBeenCalled()
  })

  it('does not invoke callbacks for malformed JSON drag data', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onCrossLaneDrop = vi.fn()
    const onReorder = vi.fn()
    const onGapRestore = vi.fn()
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} onCrossLaneDrop={onCrossLaneDrop} onReorder={onReorder} onGapRestore={onGapRestore} />)

    const gaps = document.querySelectorAll('.loom-lane-gap')
    const dt = { getData: () => 'not valid json', setData: vi.fn() } as unknown as DataTransfer
    fireEvent.drop(gaps[0], { dataTransfer: dt })

    expect(onCrossLaneDrop).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
    expect(onGapRestore).not.toHaveBeenCalled()
  })

  it('does not invoke callbacks for unknown action type', () => {
    const tapestry = demoTapestry()
    const thread = tapestry.threads[0]
    const onCrossLaneDrop = vi.fn()
    const onReorder = vi.fn()
    const onGapRestore = vi.fn()
    render(<LoomLane thread={thread} nodes={tapestry.nodes} sessions={sessions} onCrossLaneDrop={onCrossLaneDrop} onReorder={onReorder} onGapRestore={onGapRestore} />)

    const gaps = document.querySelectorAll('.loom-lane-gap')
    const dt = { getData: () => JSON.stringify({ action: 'unknown' }), setData: vi.fn() } as unknown as DataTransfer
    fireEvent.drop(gaps[0], { dataTransfer: dt })

    expect(onCrossLaneDrop).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
    expect(onGapRestore).not.toHaveBeenCalled()
  })
})

describe('divider visibility', () => {
  it('determines divider fully visible when within viewport bounds', () => {
    const gridElement = {
      getBoundingClientRect: () => ({ left: 100, right: 500, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const dividerElement = {
      getBoundingClientRect: () => ({ left: 200, right: 210, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const isVisible = isFellDividerFullyVisible(gridElement, dividerElement)
    expect(isVisible).toBe(true)
  })

  it('determines divider not fully visible when clipped on left', () => {
    const gridElement = {
      getBoundingClientRect: () => ({ left: 100, right: 500, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const dividerElement = {
      getBoundingClientRect: () => ({ left: 50, right: 210, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const isVisible = isFellDividerFullyVisible(gridElement, dividerElement)
    expect(isVisible).toBe(false)
  })

  it('determines divider not fully visible when clipped on right', () => {
    const gridElement = {
      getBoundingClientRect: () => ({ left: 100, right: 500, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const dividerElement = {
      getBoundingClientRect: () => ({ left: 450, right: 550, top: 0, bottom: 400 }),
    } as unknown as HTMLElement

    const isVisible = isFellDividerFullyVisible(gridElement, dividerElement)
    expect(isVisible).toBe(false)
  })

  it('invokes onDividerVisibilityChange callback with initial state', async () => {
    const tapestry = demoTapestry()
    const onDividerVisibilityChange = vi.fn()

    render(
      <LoomSwimlanes
        threads={tapestry.threads}
        nodes={tapestry.nodes}
        sessions={sessions}
        onDividerVisibilityChange={onDividerVisibilityChange}
      />,
    )

    await waitFor(() => {
      expect(onDividerVisibilityChange).toHaveBeenCalled()
    })
  })
})
