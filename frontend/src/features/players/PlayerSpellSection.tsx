import { useState } from 'react'
import type { Player, Spell } from '../../api/types'
import { Accordion } from '../../components/Accordion'
import { DiceText } from '../../components/DiceText'
import { ReferenceText, spellValueReferenceRegistry } from '../../components/referenceText'
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

  const setExpanded = (id: number, open: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (open) {
        next.add(id)
      } else {
        next.delete(id)
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
              return (
                <div key={spell.id} className="spell-section-row">
                  <Accordion
                    className="spell-section-accordion"
                    itemClassName="spell-section-accordion-item"
                    contentClassName="spell-section-body"
                    multiple
                    value={expandedIds.has(spell.id) ? [String(spell.id)] : []}
                    onValueChange={(value) => setExpanded(spell.id, value.includes(String(spell.id)))}
                    items={[{
                      value: String(spell.id),
                      summary: <span className="spell-section-name">{spell.name}</span>,
                      content: (
                        <>
                          {spell.description && <p><DiceText text={spell.description} /></p>}
                          {spell.alternate_description && <p><DiceText text={spell.alternate_description} /></p>}
                          {spell.higher_levels.text && (
                            <p>
                              <strong>At Higher Levels: </strong>
                              <DiceText text={spell.higher_levels.text} />
                            </p>
                          )}
                        </>
                      ),
                    }]}
                  />
                  {spell.quick_rules && (
                    <div className="spell-section-quick-rules">
                      <ReferenceText text={spell.quick_rules} registry={spellValueReferenceRegistry} context={spellContext} />
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
