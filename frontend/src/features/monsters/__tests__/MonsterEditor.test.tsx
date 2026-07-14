import { describe, it } from 'vitest'

describe('MonsterEditor (X3)', () => {
  it.skip('shows fieldsets matching the stat-block regions', () => {
    // X3: Identity / Defenses / Abilities / Actions / Lore fieldsets present
  })

  it.skip('validates required fields before submit', () => {
    // X3: name required, numeric AC/HP/scores validated
  })

  it.skip('calls createMonster on save for new monsters', () => {
    // X3: form submit sends POST via api.createMonster
  })
})
