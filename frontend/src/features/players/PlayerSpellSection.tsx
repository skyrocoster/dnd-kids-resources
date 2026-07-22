import { useState } from 'react'
import type { Player, Spell } from '../../api/types'
import { DiceText } from '../../components/DiceText'
import { ReferenceText, spellValueReferenceRegistry } from '../../components/referenceText'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import { levelLabel } from '../spells/constants'
import './PlayerSpellSection.css'

interface PlayerSpellSectionProps {
  player: Player
  spells: Spell[]
}

function sortSpells(spells: Spell[]): Spell[] {
  return [...spells].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name)
  })
}

export function PlayerSpellSection({ player, spells }: PlayerSpellSectionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())

  const sorted = sortSpells(spells)

  const grouped: Map<number, Spell[]> = new Map()
  for (const spell of sorted) {
    const group = grouped.get(spell.level)
    if (group) {
      group.push(spell)
    } else {
      grouped.set(spell.level, [spell])
    }
  }

  const levels = Array.from(grouped.keys()).sort((a, b) => a - b)

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const spellContext = {
    spell_attack_bonus: player.spell_attack_bonus,
    spell_save_dc: player.spell_save_dc,
  }

  if (spells.length === 0) {
    return <p className="player-spell-section-empty">No spells assigned.</p>
  }

  return (
    <div className="player-spell-section">
      {levels.map((level) => {
        const group = grouped.get(level)!
        return (
          <div key={level} className="spell-section-group">
            <h4 className="spell-section-group-heading">{levelLabel(level)}</h4>
            {group.map((spell) => {
              const expanded = expandedIds.has(spell.id)
              const panelId = `spell-panel-${spell.id}`
              return (
                <div key={spell.id} className="spell-section-row">
                  <div className="spell-section-header">
                    <button
                      type="button"
                      className="spell-section-toggle"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggleExpanded(spell.id)}
                    >
                      {expanded ? <ChevronUpIcon size={18} aria-hidden /> : <ChevronDownIcon size={18} aria-hidden />}
                      <span className="spell-section-name">{spell.name}</span>
                    </button>
                  </div>
                  {spell.quick_rules && (
                    <div className="spell-section-quick-rules">
                      <ReferenceText text={spell.quick_rules} registry={spellValueReferenceRegistry} context={spellContext} />
                    </div>
                  )}
                  {expanded && (
                    <div id={panelId} className="spell-section-body">
                      {spell.description && <p><DiceText text={spell.description} /></p>}
                      {spell.alternate_description && <p><DiceText text={spell.alternate_description} /></p>}
                      {spell.higher_levels.text && (
                        <p>
                          <strong>At Higher Levels: </strong>
                          <DiceText text={spell.higher_levels.text} />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
