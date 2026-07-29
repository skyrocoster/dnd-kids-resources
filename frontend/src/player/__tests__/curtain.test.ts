import { describe, expect, it } from 'vitest'
import { createEmptyMapLayout } from '../../model/maplabModel'
import type { MapKnowledge } from '../../api/types'
import { playerViewTransform, type PassageSessionMap } from '../curtain'

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

  it('hidden doors are excluded when no exists knowledge', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1, cell: [0, 0], side: 'N', hidden: true, locked: false, trapped: false,
    })
    const result = playerViewTransform(layout)
    expect(result.doors).toHaveLength(0)
  })

  it('hidden doors are included when exists is known', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1, cell: [0, 0], side: 'N', hidden: true, locked: false, trapped: false,
    })
    const knowledge: MapKnowledge = { doors: { '1': { exists: true } } }
    const result = playerViewTransform(layout, knowledge)
    expect(result.doors).toHaveLength(1)
    expect(result.doors[0].hidden).toBe(true)
  })

  it('non-hidden doors appear without hidden field', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false,
    })
    const result = playerViewTransform(layout)
    expect(result.doors).toHaveLength(1)
    expect(result.doors[0]).not.toHaveProperty('hidden')
  })

  it('locked/trapped disclosed independently per knowledge fact', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: true, trapped: true,
    })
    const knowledge: MapKnowledge = { doors: { '1': { lock: true } } }
    const result = playerViewTransform(layout, knowledge)
    expect(result.doors[0].locked).toBe(true)
    expect(result.doors[0]).not.toHaveProperty('trapped')
  })

  it('current lock/trap reflects session override', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 42, cell: [5, 10], side: 'N', hidden: false, locked: true, trapped: false,
    })
    const knowledge: MapKnowledge = { doors: { '42': { lock: true, trap: true } } }
    const sessions: PassageSessionMap = {
      doors: { '42': { isOpen: false, isLocked: false, trapDisarmed: false } },
    }
    const result = playerViewTransform(layout, knowledge, sessions)
    expect(result.doors[0].locked).toBe(false) // session overrides to unlocked
    expect(result.doors[0].trapped).toBe(false) // trap fact known, authored false stays false
  })

  it('kind-qualified existence filtering works across stair and portal', () => {
    const layout = createEmptyMapLayout('Test')
    layout.stairs.push({
      stair_id: 10, from: { z: 0, cell: [0, 0] }, to: { z: 1, cell: [0, 0] },
      hidden: true, locked: false, trapped: false,
    })
    layout.portals.push({
      portal_id: 20, cell: [1, 0], z: 0, hidden: true, locked: false, trapped: false,
    })
    // Only stairs have existence knowledge
    const knowledge: MapKnowledge = { stairs: { '10': { exists: true } } }
    const result = playerViewTransform(layout, knowledge)
    expect(result.stairs).toHaveLength(1)
    expect(result.stairs[0].hidden).toBe(true)
    expect(result.portals).toHaveLength(0)
  })

  it('hidden props are excluded when no exists knowledge', () => {
    const layout = createEmptyMapLayout('Test')
    layout.props.push({
      prop_id: 1, kind: 'chest', cell: [0, 0], hidden: true, locked: false, trapped: false,
    })
    const result = playerViewTransform(layout)
    expect(result.props).toHaveLength(0)
  })

  it('hidden props included when exists is known', () => {
    const layout = createEmptyMapLayout('Test')
    layout.props.push({
      prop_id: 1, kind: 'chest', cell: [0, 0], hidden: true, locked: false, trapped: false,
    })
    const knowledge: MapKnowledge = { props: { '1': { exists: true } } }
    const result = playerViewTransform(layout, knowledge)
    expect(result.props).toHaveLength(1)
    expect(result.props[0].hidden).toBe(true)
  })

  it('known fields carry current value including false', () => {
    const layout = createEmptyMapLayout('Test')
    layout.doors.push({
      door_id: 7, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: true,
    })
    const knowledge: MapKnowledge = { doors: { '7': { lock: true, trap: true } } }
    const result = playerViewTransform(layout, knowledge)
    expect(result.doors[0].locked).toBe(false)
    expect(result.doors[0].trapped).toBe(true)
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
