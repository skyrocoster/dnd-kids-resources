import type { Monster } from '../../api/types'

/** Derive creature stats (HP and AC) from a monster. Shared by the editor and the runner
 * so both cannot drift: hp.average -> hp_current/hp_max, ac.value -> ac, else null.
 */
export function deriveCreatureStats(
  monster: Monster,
): { hpAverage: number | null; ac: number | null } {
  const hpAverage = monster.hp && typeof monster.hp.average === 'number' ? monster.hp.average : null
  const ac = monster.ac && Number.isFinite(monster.ac.value) ? monster.ac.value : null
  return { hpAverage, ac }
}
