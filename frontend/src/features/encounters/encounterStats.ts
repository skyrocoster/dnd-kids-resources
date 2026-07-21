/** Derive creature stats (HP and AC) from a monster. Shared by the editor and the runner
 * so both cannot drift: hp.average -> hp_current/hp_max, ac.value -> ac, else null.
 * Accepts any creature shape with optional `hp?.average` / `ac?.value`.
 */
export function deriveCreatureStats(
  creature: { hp?: { average: number } | null; ac?: { value: number } | null },
): { hpAverage: number | null; ac: number | null } {
  const hpAverage = creature.hp && typeof creature.hp.average === 'number' ? creature.hp.average : null
  const ac = creature.ac && Number.isFinite(creature.ac.value) ? creature.ac.value : null
  return { hpAverage, ac }
}
