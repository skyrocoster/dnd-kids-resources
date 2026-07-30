import { describe, expect, it } from 'vitest'

import type { MapDoor, MapStair } from '../../../../model/maplabModel'
import { disarmStairTrap, getStairTrapDisarmed, toggleDoorOpen } from '../mapLabSessionActions'

describe('mapLabSessionActions', () => {
  it('toggles door open against an existing override', () => {
    const door = { door_id: 3, cell: [2, 3], side: 'N', hidden: false, locked: false, trapped: false } as MapDoor
    const doorSessions = { 3: { open: true } }

    expect(toggleDoorOpen(doorSessions, door).open).toBe(false)
  })

  it('toggles door open against an absent override', () => {
    const door = { door_id: 5, cell: [1, 1], side: 'S', hidden: false, locked: false, trapped: false } as MapDoor

    expect(toggleDoorOpen({}, door).open).toBe(true)
  })

  it('disarms a stair trap against an existing override', () => {
    const stair = {
      stair_id: 7,
      from: { z: 0, cell: [0, 0] },
      to: { z: 1, cell: [0, 0] },
      hidden: false,
      locked: false,
      trapped: true,
    } as MapStair
    const stairSessions = { 7: {} }

    expect(disarmStairTrap(stairSessions, stair).obstacles?.trap?.armed).toBe(false)
  })

  it('disarms a stair trap against an absent override', () => {
    const stair = {
      stair_id: 9,
      from: { z: 1, cell: [0, 0] },
      to: { z: 0, cell: [0, 0] },
      hidden: false,
      locked: true,
      trapped: true,
    } as MapStair

    const result = disarmStairTrap({}, stair)

    expect(result.obstacles?.trap?.armed).toBe(false)
  })

  it('returns true for getStairTrapDisarmed when trap is disarmed', () => {
    const stair = { stair_id: 7, from: { z: 0, cell: [2, 3] }, to: { z: 1, cell: [2, 3] }, hidden: false, locked: false, trapped: true } as MapStair
    const session = { obstacles: { trap: { armed: false } } }

    expect(getStairTrapDisarmed(stair, session)).toBe(true)
  })

  it('returns false for getStairTrapDisarmed when trap is not disarmed', () => {
    const stair = { stair_id: 7, from: { z: 0, cell: [2, 3] }, to: { z: 1, cell: [2, 3] }, hidden: false, locked: false, trapped: true } as MapStair
    const session = { obstacles: { trap: { armed: true } } }

    expect(getStairTrapDisarmed(stair, session)).toBe(false)
  })
})
