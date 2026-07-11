import { describe, it, expect } from 'vitest'
import { trailReducer } from '../trailReducer'

describe('trailReducer', () => {
  it('appends a new room to an empty trail', () => {
    expect(trailReducer([], 1)).toEqual([1])
  })

  it('appends a new room to an existing trail', () => {
    expect(trailReducer([1, 2], 3)).toEqual([1, 2, 3])
  })

  it('collapses back to an earlier visit of the same room', () => {
    expect(trailReducer([1, 2, 3], 2)).toEqual([1, 2])
  })

  it('collapses to the start when revisiting the first room', () => {
    expect(trailReducer([1, 2, 3], 1)).toEqual([1])
  })

  it('is a no-op when re-navigating to the current (last) room', () => {
    expect(trailReducer([1, 2, 3], 3)).toEqual([1, 2, 3])
  })

  it('builds a trail across a walk of several rooms', () => {
    let trail: number[] = []
    trail = trailReducer(trail, 1)
    trail = trailReducer(trail, 2)
    trail = trailReducer(trail, 3)
    expect(trail).toEqual([1, 2, 3])
  })

  it('truncates on crumb click (revisit) after a longer walk', () => {
    let trail: number[] = []
    trail = trailReducer(trail, 1)
    trail = trailReducer(trail, 2)
    trail = trailReducer(trail, 3)
    trail = trailReducer(trail, 4)
    // Clicking the crumb for room 2 navigates back there.
    trail = trailReducer(trail, 2)
    expect(trail).toEqual([1, 2])
  })

  it('does not mutate the input array', () => {
    const original = [1, 2, 3]
    const result = trailReducer(original, 4)
    expect(original).toEqual([1, 2, 3])
    expect(result).not.toBe(original)
  })
})
