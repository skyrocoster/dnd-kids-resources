import { describe, expect, it } from 'vitest'
import { beatReorderTarget } from '../beatReorder'

const beats = [
  { nodeId: 1, position: 30 },
  { nodeId: 2, position: 40 },
  { nodeId: 3, position: 50 },
]

describe('beatReorderTarget', () => {
  it('returns null for a no-op or out-of-range move', () => {
    expect(beatReorderTarget(beats, 1, 1)).toBeNull()
    expect(beatReorderTarget(beats, -1, 0)).toBeNull()
    expect(beatReorderTarget(beats, 3, 0)).toBeNull()
    expect(beatReorderTarget(beats, 0, 4)).toBeNull()
  })

  // `toIndex` is an insertion index into the post-removal list, so it legitimately
  // ranges 0..beats.length. LoomLane's final sentinel gap passes beats.length.
  it('treats toIndex === beats.length as insert-at-end', () => {
    expect(beatReorderTarget(beats, 0, 3)).toEqual({ nodeId: 1, position: Number.MAX_SAFE_INTEGER })
  })

  it('uses the correct follower when moving down', () => {
    expect(beatReorderTarget(beats, 0, 1)).toEqual({ nodeId: 1, position: 50 })
  })

  it('uses the sentinel when moving to last', () => {
    expect(beatReorderTarget(beats, 0, 2)).toEqual({ nodeId: 1, position: Number.MAX_SAFE_INTEGER })
  })

  it('uses the new follower when moving up', () => {
    expect(beatReorderTarget(beats, 2, 0)).toEqual({ nodeId: 3, position: 30 })
  })
})
