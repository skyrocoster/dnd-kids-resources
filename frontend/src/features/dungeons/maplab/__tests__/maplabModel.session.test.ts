import { describe, it, expect } from 'vitest'
import {
  effectivePassageState,
  defaultPassageSession,
} from '../../../../model/maplabModel'

describe('maplabModel (Stage 4 session state)', () => {
  it('effectivePassageState merges authored flags with session overrides', () => {
    const flags = { hidden: false, locked: true, trapped: false }
    const effective = effectivePassageState(flags, { isOpen: false, isLocked: false, trapDisarmed: false })

    expect(effective.locked).toBe(false)
  })

  it('effectivePassageState reflects disarmed traps in the presentation', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    const effective = effectivePassageState(flags, { isOpen: false, isLocked: true, trapDisarmed: true })

    expect(effective.trapped).toBe(false)
    expect(effective.trapDisarmed).toBe(true)
    // Trap disarmed, but still locked — presentation steps to the next active flag, not straight
    // to unlocked, since the flags are independent.
  })

  it('effectivePassageState falls back to the authored defaults with no session (door closed by default)', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    const effective = effectivePassageState(flags)

    expect(effective.locked).toBe(true)
    expect(effective.trapped).toBe(true)
    expect(effective.sessionOpen).toBe(false)
  })

  it('defaultPassageSession seeds the reset baseline from authored flags (closed by default)', () => {
    const flags = { hidden: false, locked: true, trapped: true }
    expect(defaultPassageSession(flags)).toEqual({ isOpen: false, isLocked: true, trapDisarmed: false })
  })
})
