import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import {
  isPast,
  isFuture,
  bankedBeats,
  threadOrdered,
  currentPosition,
  threadHead,
  nextBeat,
  liveThreads,
} from '../loomGraph'

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

describe('isPast / isFuture', () => {
  it('treats session nodes as past', () => {
    const session: LoomNode = { id: 1, kind: 'session', title: 'u', x: 0, y: 0, thread_ids: [] }
    expect(isPast(session)).toBe(true)
  })

  it('treats start/end/beat nodes as not past', () => {
    const start: LoomNode = { id: 2, kind: 'start', title: 's', x: 0, y: 0, thread_ids: [] }
    const end: LoomNode = { id: 3, kind: 'end', title: 'e', x: 0, y: 0, thread_ids: [] }
    const beat: LoomNode = { id: 4, kind: 'beat', title: 'b', x: 0, y: 0, thread_ids: [1] }
    expect(isPast(start)).toBe(false)
    expect(isPast(end)).toBe(false)
    expect(isPast(beat)).toBe(false)
  })

  it('treats placed beats as future', () => {
    const beat: LoomNode = { id: 1, kind: 'beat', title: 'b', x: 0, y: 0, thread_ids: [1] }
    expect(isFuture(beat)).toBe(true)
  })

  it('treats unplaced beats as neither past nor future', () => {
    const beat: LoomNode = { id: 1, kind: 'beat', title: 'b', x: 0, y: 0, thread_ids: [] }
    expect(isFuture(beat)).toBe(false)
    expect(isPast(beat)).toBe(false)
  })
})

describe('bankedBeats', () => {
  it('returns beats with zero membership', () => {
    const banked = bankedBeats(demoTapestry())
    expect(banked.map((n) => n.id)).toEqual([9])
  })

  it('returns empty when all beats are placed', () => {
    const tapestry: LoomTapestry = {
      threads: [{ id: 1, name: 'T', color: 'thread-1', items: [{ node_id: 1, position: 0 }] }],
      nodes: [{ id: 1, kind: 'beat', title: 'b', x: 0, y: 0, thread_ids: [1] }],
    }
    expect(bankedBeats(tapestry)).toEqual([])
  })
})

describe('threadOrdered', () => {
  it('returns nodes sorted by position within a thread', () => {
    const thread = demoTapestry().threads[0]
    const ordered = threadOrdered(thread, demoTapestry().nodes)
    expect(ordered.map((n) => n.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('handles shared nodes across threads independently', () => {
    const thread2 = demoTapestry().threads[1]
    const ordered = threadOrdered(thread2, demoTapestry().nodes)
    expect(ordered.map((n) => n.id)).toEqual([6, 3, 7, 8])
  })

  it('returns empty for a thread with no items', () => {
    const thread: LoomTapestryThread = { id: 99, name: 'Empty', color: 'thread-2', items: [] }
    expect(threadOrdered(thread, demoTapestry().nodes)).toEqual([])
  })
})

describe('currentPosition', () => {
  it('returns the node just before the first unfulfilled beat', () => {
    const thread = demoTapestry().threads[0]
    const current = currentPosition(thread, demoTapestry().nodes)
    // beat is at index 3 (node 4), so current = index 2 (node 3)
    expect(current?.nodeId).toBe(3)
    expect(current?.position).toBe(2)
  })

  it('returns the first node when there are no beats', () => {
    const thread: LoomTapestryThread = {
      id: 99, name: 'No beats', color: 'thread-2',
      items: [
        { node_id: 1, position: 0 },
        { node_id: 2, position: 10 },
      ],
    }
    const nodes: LoomNode[] = [
      { id: 1, kind: 'start', title: 's', x: 0, y: 0, thread_ids: [99] },
      { id: 2, kind: 'session', title: 'r', x: 0, y: 0, thread_ids: [99] },
    ]
    const current = currentPosition(thread, nodes)
    expect(current?.nodeId).toBe(1)
  })

  it('returns null for an empty thread', () => {
    const thread: LoomTapestryThread = { id: 99, name: 'Empty', color: 'thread-2', items: [] }
    expect(currentPosition(thread, [])).toBeNull()
  })
})

// --- it.skip seams for PB1 ordered-view derivation ---

describe('threadHead (PB1)', () => {
  it('returns the last session before the first unfulfilled beat', () => {
    expect(threadHead(demoTapestry().threads[0], demoTapestry().nodes)?.id).toBe(3)
  })
})

describe('nextBeat (PB1)', () => {
  it('returns the first unfulfilled beat in the thread', () => {
    expect(nextBeat(demoTapestry().threads[0], demoTapestry().nodes)?.id).toBe(4)
  })
})

describe('liveThreads (PB1)', () => {
  it('returns threads with at least one unfulfilled beat', () => {
    expect(liveThreads(demoTapestry()).map((thread) => thread.id)).toEqual([1])
  })
})
