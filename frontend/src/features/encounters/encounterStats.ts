import type { Monster } from '../../api/types'

/** Derive creature stats (HP and AC) from a monster. Shared by the editor and the runner
 * so both cannot drift: hp.average -> hp_current/hp_max, first finite AC key -> ac, else null.
 */
export function deriveCreatureStats(
  monster: Monster,
): { hpAverage: number | null; ac: number | null } {
  const hpAverage = monster.hp && typeof monster.hp.average === 'number' ? monster.hp.average : null
  const acKeys = monster.ac ? Object.keys(monster.ac) : []
  const ac = acKeys.length > 0 && Number.isFinite(Number(acKeys[0])) ? Number(acKeys[0]) : null
  return { hpAverage, ac }
}
