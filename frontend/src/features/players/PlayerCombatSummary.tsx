import { useState } from 'react'
import type { Player } from '../../api/types'
import { formatMovementSpeeds } from '../npcs/npcModel'
import { hasCombatStats, hasStatblock, playerToMonsterView } from './playerModel'
import { MonsterStatBlock } from '../monsters/MonsterStatBlock'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import './PlayerCombatSummary.css'

interface PlayerCombatSummaryProps {
  player: Player
}

export function PlayerCombatSummary({ player }: PlayerCombatSummaryProps) {
  const [profileExpanded, setProfileExpanded] = useState(false)

  const speed = formatMovementSpeeds(player.speed)
  const showStatStrip = hasCombatStats(player)
  const showMonsterBlock = hasStatblock(player)

  if (!showStatStrip && !showMonsterBlock) return null

  return (
    <div>
      {showStatStrip && (
        <div className="player-combat-summary-strip">
          {player.ac != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">AC</span>
              <span className="player-combat-summary-strip-value">{player.ac.value}</span>
            </div>
          )}
          {player.hp != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">HP</span>
              <span className="player-combat-summary-strip-value">{player.hp.average}</span>
            </div>
          )}
          {speed && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">Speed</span>
              <span className="player-combat-summary-strip-value">{speed}</span>
            </div>
          )}
          {player.initiative != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">Initiative</span>
              <span className="player-combat-summary-strip-value">{player.initiative}</span>
            </div>
          )}
        </div>
      )}

      {showMonsterBlock && (
        <>
          <button
            type="button"
            className="player-combat-summary-profile-toggle"
            aria-expanded={profileExpanded}
            onClick={() => setProfileExpanded((prev) => !prev)}
          >
            {profileExpanded ? <ChevronUpIcon size={18} aria-hidden /> : <ChevronDownIcon size={18} aria-hidden />}
            Full Profile
          </button>
          {profileExpanded && (
            <MonsterStatBlock
              monster={playerToMonsterView(player)}
              showIdentity={false}
              showStrip={false}
            />
          )}
        </>
      )}
    </div>
  )
}
