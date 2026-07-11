import type { NPC } from '../../api/types'
import { DiceText } from '../../components/DiceText'
import { composeAppearance, formatModifier, getAbilityScores, hasCombatStats, identityLine } from './npcModel'
import './NPCStatCard.css'

interface NPCStatCardProps {
  npc: NPC
  compact?: boolean
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function formatDictEntries(dict: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!dict || typeof dict !== 'object') return []
  return Object.entries(dict)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: typeof value === 'number' ? formatModifier(value) : String(value),
    }))
}

function formatSenses(senses: Record<string, unknown>[] | null | undefined): string[] {
  if (!senses) return []
  return senses
    .map((sense) => {
      const type = sense.type != null ? String(sense.type) : ''
      const range = sense.range != null ? String(sense.range) : ''
      return `${type} ${range}`.trim()
    })
    .filter((entry) => entry !== '')
}

/**
 * The character dossier: identity (monogram, name, race/gender/background,
 * composed appearance) is the hero, roleplay notes sit directly under it,
 * then progressively-disclosed stat detail — each section only when present.
 */
export function NPCStatCard({ npc, compact = false }: NPCStatCardProps) {
  const identity = identityLine(npc)
  const appearance = composeAppearance(npc.appearance)
  const abilities = getAbilityScores(npc)
  const savingThrows = formatDictEntries(npc.saving_throws)
  const skills = formatDictEntries(npc.skills)
  const senses = formatSenses(npc.senses)
  const showStatStrip = hasCombatStats(npc)

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
          {npc.armor_class != null && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">AC</span>
              <span className="npc-stat-card-strip-value">{npc.armor_class}</span>
            </div>
          )}
          {npc.hit_points != null && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">HP</span>
              <span className="npc-stat-card-strip-value">{npc.hit_points}</span>
            </div>
          )}
          {npc.speed && (
            <div className="npc-stat-card-strip-item">
              <span className="npc-stat-card-strip-label">Speed</span>
              <span className="npc-stat-card-strip-value">{npc.speed}</span>
            </div>
          )}
        </div>
      )}

      {abilities.length > 0 && (
        <div className="npc-stat-card-abilities" role="group" aria-label="Ability scores">
          {abilities.map((ability) => (
            <div className="npc-stat-card-ability" key={ability.key}>
              <span className="npc-stat-card-ability-key">{ability.key}</span>
              <span className="npc-stat-card-ability-score">{ability.score}</span>
              <span className="npc-stat-card-ability-modifier">{formatModifier(ability.modifier)}</span>
            </div>
          ))}
        </div>
      )}

      {savingThrows.length > 0 && (
        <section className="npc-stat-card-section">
          <h4 className="npc-stat-card-section-title">Saving Throws</h4>
          <p className="npc-stat-card-section-body">
            {savingThrows.map((entry) => `${entry.label} ${entry.value}`).join(', ')}
          </p>
        </section>
      )}

      {skills.length > 0 && (
        <section className="npc-stat-card-section">
          <h4 className="npc-stat-card-section-title">Skills</h4>
          <p className="npc-stat-card-section-body">
            {skills.map((entry) => `${entry.label} ${entry.value}`).join(', ')}
          </p>
        </section>
      )}

      {senses.length > 0 && (
        <section className="npc-stat-card-section">
          <h4 className="npc-stat-card-section-title">Senses</h4>
          <p className="npc-stat-card-section-body">{senses.join(', ')}</p>
        </section>
      )}

      {npc.languages && (
        <section className="npc-stat-card-section">
          <h4 className="npc-stat-card-section-title">Languages</h4>
          <p className="npc-stat-card-section-body">{npc.languages}</p>
        </section>
      )}
    </article>
  )
}
