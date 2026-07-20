import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread } from '../../../api/types'
import {
  isPast,
  isFuture,
  bankedBeats,
  threadOrdered,
  currentPosition,
  threadHead,
  nextBeat,
  liveThreads,
  isThreadAlive,
} from '../loomGraph'

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
    { id: 3, kind: 'beat', title: 'Ask the villagers', thread_id: 1, session_id: 3, position: 20, carried_count: 0 },
    { id: 4, kind: 'beat', title: 'Track through the woods', thread_id: 1, session_id: 3, position: 30, carried_count: 0 },
    { id: 5, kind: 'end', title: 'Found the puppy', thread_id: 1, session_id: 4, position: 40, carried_count: 0 },
    { id: 6, kind: 'start', title: 'The Hat Thief', thread_id: 2, session_id: 2, position: 0, carried_count: 0 },
    { id: 7, kind: 'beat', title: 'Question the merchant', thread_id: 2, session_id: 3, position: 10, carried_count: 0 },
    { id: 8, kind: 'beat', title: 'Confront the thief', thread_id: 2, session_id: 4, position: 20, carried_count: 0 },
    { id: 9, kind: 'beat', title: 'Mysterious stranger', thread_id: null, position: 0, carried_count: 0 },
  ]
  const threads: LoomTapestryThread[] = [
    { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
    { id: 2, name: 'The Hat Thief', color: 'thread-1' },
  ]
  return { threads, nodes, sessions }
}

describe('isPast / isFuture', () => {
  it('treats session nodes as past', () => {
    const session: LoomNode = { id: 1, kind: 'session', title: 'u', thread_id: 1, session_id: 1, position: 0, carried_count: 0 }
    expect(isPast(session)).toBe(true)
  })

  it('treats start/end/beat nodes as not past', () => {
    const start: LoomNode = { id: 2, kind: 'start', title: 's', thread_id: 1, session_id: 1, position: 0, carried_count: 0 }
    const end: LoomNode = { id: 3, kind: 'end', title: 'e', thread_id: 1, session_id: 2, position: 10, carried_count: 0 }
    const beat: LoomNode = { id: 4, kind: 'beat', title: 'b', thread_id: 1, session_id: 3, position: 20, carried_count: 0 }
    expect(isPast(start)).toBe(false)
    expect(isPast(end)).toBe(false)
    expect(isPast(beat)).toBe(false)
  })

  it('treats placed beats as future', () => {
    const beat: LoomNode = { id: 1, kind: 'beat', title: 'b', thread_id: 1, session_id: 3, position: 20, carried_count: 0 }
    expect(isFuture(beat)).toBe(true)
  })

  it('treats unplaced beats as neither past nor future', () => {
    const beat: LoomNode = { id: 1, kind: 'beat', title: 'b', thread_id: null, position: 0, carried_count: 0 }
    expect(isFuture(beat)).toBe(false)
    expect(isPast(beat)).toBe(false)
  })
})

describe('bankedBeats', () => {
  it('returns beats with null thread_id', () => {
    const banked = bankedBeats(demoTapestry())
    expect(banked.map((n) => n.id)).toEqual([9])
  })

  it('returns empty when all beats are placed', () => {
    const tapestry: LoomTapestry = {
      threads: [{ id: 1, name: 'T', color: 'thread-1' }],
      nodes: [{ id: 1, kind: 'beat', title: 'b', thread_id: 1, session_id: 1, position: 0, carried_count: 0 }],
      sessions: [],
    }
    expect(bankedBeats(tapestry)).toEqual([])
  })
})

describe('threadOrdered', () => {
  it('returns nodes sorted by session_id then position within a thread', () => {
    const thread = demoTapestry().threads[0]
    const ordered = threadOrdered(thread, demoTapestry().nodes)
    expect(ordered.map((n) => n.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('handles nodes across sessions independently', () => {
    const thread2 = demoTapestry().threads[1]
    const ordered = threadOrdered(thread2, demoTapestry().nodes)
    expect(ordered.map((n) => n.id)).toEqual([6, 7, 8])
  })

  it('returns empty for a thread with no matching nodes', () => {
    const thread: LoomTapestryThread = { id: 99, name: 'Empty', color: 'thread-2' }
    expect(threadOrdered(thread, demoTapestry().nodes)).toEqual([])
  })
})

describe('currentPosition', () => {
  it('returns the node just before the first unfulfilled beat', () => {
    const thread = demoTapestry().threads[0]
    const current = currentPosition(thread, demoTapestry().nodes)
    expect(current?.nodeId).toBe(2)
    expect(current?.position).toBe(1)
  })

  it('returns the first node when there are no beats', () => {
    const thread: LoomTapestryThread = { id: 99, name: 'No beats', color: 'thread-2' }
    const nodes: LoomNode[] = [
      { id: 1, kind: 'start', title: 's', thread_id: 99, session_id: 1, position: 0, carried_count: 0 },
      { id: 2, kind: 'session', title: 'r', thread_id: 99, session_id: 2, position: 10, carried_count: 0 },
    ]
    const current = currentPosition(thread, nodes)
    expect(current?.nodeId).toBe(1)
  })

  it('returns null for an empty thread', () => {
    const thread: LoomTapestryThread = { id: 99, name: 'Empty', color: 'thread-2' }
    expect(currentPosition(thread, [])).toBeNull()
  })
})

describe('threadHead (PB1)', () => {
  it('returns the last session before the first unfulfilled beat', () => {
    expect(threadHead(demoTapestry().threads[0], demoTapestry().nodes)?.id).toBe(2)
  })
})

describe('nextBeat (PB1)', () => {
  it('returns the first unfulfilled beat in the thread', () => {
    expect(nextBeat(demoTapestry().threads[0], demoTapestry().nodes)?.id).toBe(3)
  })
})

describe('liveThreads (PB1)', () => {
  it('returns threads with at least one unfulfilled beat', () => {
    expect(liveThreads(demoTapestry()).map((thread) => thread.id)).toEqual([1, 2])
  })
})

describe('isThreadAlive', () => {
  it('returns true for a session ordinal between start and end', () => {
    const thread = demoTapestry().threads[0]
    expect(isThreadAlive(thread, 1, demoTapestry().nodes, sessions)).toBe(true)
    expect(isThreadAlive(thread, 2, demoTapestry().nodes, sessions)).toBe(true)
    expect(isThreadAlive(thread, 3, demoTapestry().nodes, sessions)).toBe(true)
    expect(isThreadAlive(thread, 4, demoTapestry().nodes, sessions)).toBe(true)
  })

  it('returns false for sessions before thread start', () => {
    const thread = demoTapestry().threads[1]
    expect(isThreadAlive(thread, 1, demoTapestry().nodes, sessions)).toBe(false)
  })

  it('returns true for threads with no end node', () => {
    const thread = demoTapestry().threads[1]
    expect(isThreadAlive(thread, 2, demoTapestry().nodes, sessions)).toBe(true)
    expect(isThreadAlive(thread, 4, demoTapestry().nodes, sessions)).toBe(true)
  })
})
