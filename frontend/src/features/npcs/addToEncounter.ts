import type { Encounter, EncounterCreature, EncounterInput, NPC } from '../../api/types'
import { deriveCreatureStats } from '../encounters/encounterStats'

export function combatantFromNpc(npc: NPC): EncounterCreature {
  const { hpAverage, ac } = deriveCreatureStats(npc)

  return {
    creature_id: npc.id,
    source_kind: 'npc',
    original_name: npc.name,
    name: npc.name,
    hp_current: hpAverage,
    hp_max: hpAverage,
    ac,
    status: 'alive',
    conditions: [],
  }
}

export function appendCreatureToEncounter(
  encounter: Encounter,
  creature: EncounterCreature,
): EncounterInput {
  return {
    title: encounter.title,
    creatures: [...(encounter.creatures ?? []), creature],
    active_index: encounter.active_index ?? null,
  }
}
