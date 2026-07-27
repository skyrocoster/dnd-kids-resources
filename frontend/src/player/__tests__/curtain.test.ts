import { describe, expect, it } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import { playerViewTransform } from '../curtain'

describe('curtain (player-view transform)', () => {
  it('always fields survive the transform', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 42,
      cell: [5, 10],
      side: 'N',
      z: 0,
      title: 'Iron Door',
      hidden: false,
      locked: true,
      trapped: false,
    })
    const result = playerViewTransform(layout)
    expect(result.doors[0].door_id).toBe(42)
    expect(result.doors[0].cell).toEqual([5, 10])
    expect(result.doors[0].side).toBe('N')
    expect(result.doors[0].title).toBe('Iron Door')
  })

  it('never fields are stripped from passage types', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: 'N',
      breakDc: 20,
      pickDc: 15,
      hiddenDc: 18,
      note: 'Secret door',
      hidden: false,
      locked: false,
      trapped: false,
    })
    const result = playerViewTransform(layout)
    expect(result.doors[0]).not.toHaveProperty('breakDc')
    expect(result.doors[0]).not.toHaveProperty('pickDc')
    expect(result.doors[0]).not.toHaveProperty('hiddenDc')
    expect(result.doors[0]).not.toHaveProperty('note')
  })

  it('whenKnown fields are stripped when no knowledge record exists', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1,
      cell: [0, 0],
      side: 'N',
      locked: true,
      trapped: true,
      hidden: true,
    })
    const result = playerViewTransform(layout)
    expect(result.doors[0]).not.toHaveProperty('locked')
    expect(result.doors[0]).not.toHaveProperty('trapped')
    expect(result.doors[0]).not.toHaveProperty('hidden')
  })

  it('encounter markers are excluded from the returned props', () => {
    const layout = createEmptyMapLayout('Test')
    layout.props.push(
      {
        prop_id: 1,
        kind: 'encounter',
        cell: [0, 0],
        hidden: false,
        locked: false,
        trapped: false,
      },
      {
        prop_id: 2,
        kind: 'npc',
        cell: [1, 0],
        hidden: false,
        locked: false,
        trapped: false,
      },
    )
    const result = playerViewTransform(layout)
    expect(result.props).toHaveLength(1)
    expect(result.props[0].prop_id).toBe(2)
  })

  it('features are absent from the kid layout', () => {
    const layout = createEmptyMapLayout('Test')
    layout.features.push({
      feature_id: 1,
      z: 0,
      kind: 'river',
      cells: [[0, 0]],
    })
    const result = playerViewTransform(layout)
    expect(result).not.toHaveProperty('features')
  })

  it('does not mutate the input layout', () => {
    const layout = createEmptyMapLayout('Test')
    layout.props.push({
      prop_id: 99,
      kind: 'encounter',
      cell: [0, 0],
      hidden: false,
      locked: false,
      trapped: false,
    })
    const before = layout.props.length
    playerViewTransform(layout)
    expect(layout.props).toHaveLength(before)
    expect(layout.props[0]).toHaveProperty('kind', 'encounter')
  })
})
