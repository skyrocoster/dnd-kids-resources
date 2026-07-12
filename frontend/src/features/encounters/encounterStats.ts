import type { Monster } from '../../api/types'

/** Derive creature stats (HP and AC) from a monster.
 * TODO C1: refactor combatantFromMonster to consume this for shared logic.
 */
export function deriveCreatureStats(
  _monster: Monster,
): { hpAverage: number | null; ac: number | null } {
  // Stub: C1 will implement the actual derivation logic
  return { hpAverage: null, ac: null }
}
