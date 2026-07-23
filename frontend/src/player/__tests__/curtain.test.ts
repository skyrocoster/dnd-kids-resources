import { describe, expect, it } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { playerViewTransform } from '../curtain'

describe('curtain (player-view transform)', () => {
  it('passes through the full layout unchanged (no concealment yet)', () => {
    const layout = createEmptyMapLayout('Test')
    expect(playerViewTransform(layout)).toEqual(layout)
  })
})
