import type { NPC } from '../../api/types'
import { DiceText } from '../../components/DiceText'
import { MonsterStatBlock } from '../monsters/MonsterStatBlock'
import {
  composeAppearance,
  formatMovementSpeeds,
  hasCombatStats,
  hasStatblock,
  identityLine,
  npcToMonsterView,
} from './npcModel'
import './NPCStatCard.css'

interface NPCStatCardProps {
  npc: NPC
  compact?: boolean
  onPull?: () => void
}

/**
 * The character dossier: identity (monogram, name, race/gender/background,
 * composed appearance) is the hero, roleplay notes sit directly under it,
 * then progressively-disclosed stat detail - each section only when present.
 */
export function NPCStatCard({ npc, compact = false, onPull }: NPCStatCardProps) {
  const identity = identityLine(npc)
  const appearance = composeAppearance(npc.appearance)
  const speed = formatMovementSpeeds(npc.speed)
  const showStatStrip = hasCombatStats(npc)
  const showMonsterBlock = hasStatblock(npc)

  return (
    <article
      className={`npc-stat-card${compact ? ' npc-stat-card-compact' : ''}`}
      data-variant="npc"
      data-testid="npc-stat-card"
    >
      <header className="npc-stat-card-identity">
        <div className="npc-stat-card-monogram" aria-hidden>
          {npc.name.charAt(0).toUpperCase()}
        </div>
        <div className="npc-stat-card-identity-text">
          <h3 className="npc-stat-card-name">{npc.name}</h3>
          {identity && <p className="npc-stat-card-identity-line">{identity}</p>}
          {appearance && <p className="npc-stat-card-appearance">{appearance}</p>}
        </div>
      </header>

      {npc.notes && (
        <p className="npc-stat-card-notes">
          <DiceText text={npc.notes} />
        </p>
      )}

      {showStatStrip && (
        <div className="npc-stat-card-strip">
          {npc.ac != null && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">AC</span>
              <span className="npc-stat-card-strip-value">{npc.ac.value}</span>
            </div>
          )}
          {npc.hp != null && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">HP</span>
              <span className="npc-stat-card-strip-value">{npc.hp.average}</span>
            </div>
          )}
          {speed && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">Speed</span>
              <span className="npc-stat-card-strip-value">{speed}</span>
            </div>
          )}
        </div>
      )}

      {showMonsterBlock ? (
        <MonsterStatBlock monster={npcToMonsterView(npc)} showIdentity={false} showStrip={false} />
      ) : !compact ? (
        <div className="npc-stat-card-empty">
          <p className="npc-stat-card-empty-text">No combat stats yet.</p>
          <button
            className="npc-stat-card-empty-button"
            disabled={!onPull}
            onClick={onPull}
          >
            Pull from a monster…
          </button>
        </div>
      ) : null}
    </article>
  )
}