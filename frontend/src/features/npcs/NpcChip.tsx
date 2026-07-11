import { UserIcon } from '../../components/icons'
import './NpcChip.css'

export interface NpcChipProps {
  npcId: number
  /** id -> name lookup, built once by the caller (e.g. from `listNPCs()`). */
  roster: Map<number, string>
  onClick: (npcId: number) => void
}

/** Resolves an NPC id to a real name via the roster; falls back to `NPC #{id}` only for a dangling/unknown id. */
export function NpcChip({ npcId, roster, onClick }: NpcChipProps) {
  const name = roster.get(npcId) ?? `NPC #${npcId}`

  return (
    <button type="button" className="npc-chip dungeon-chip" data-variant="npc" onClick={() => onClick(npcId)}>
      <UserIcon size={14} aria-hidden />
      {name}
    </button>
  )
}
