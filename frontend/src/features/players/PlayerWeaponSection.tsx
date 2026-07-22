import { useState } from 'react'
import type { Weapon } from '../../api/types'
import { DiceText } from '../../components/DiceText'
import { ReferenceText, weaponValueReferenceRegistry } from '../../components/referenceText'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/icons'
import { describeAttack } from '../weapons/WeaponBrowserPage'
import './PlayerWeaponSection.css'

interface PlayerWeaponSectionProps {
  weapons: Weapon[]
}

export function PlayerWeaponSection({ weapons }: PlayerWeaponSectionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())

  const sorted = [...weapons].sort((a, b) => a.name.localeCompare(b.name))

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

  if (weapons.length === 0) {
    return <p className="player-weapon-section-empty">No weapons assigned.</p>
  }

  return (
    <div className="player-weapon-section">
      {sorted.map((weapon) => {
        const expanded = expandedIds.has(weapon.id)
        const panelId = `weapon-panel-${weapon.id}`
        return (
          <div key={weapon.id} className="weapon-section-row">
            <div className="weapon-section-header">
              <button
                type="button"
                className="weapon-section-toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleExpanded(weapon.id)}
              >
                {expanded ? <ChevronUpIcon size={18} aria-hidden /> : <ChevronDownIcon size={18} aria-hidden />}
                <span className="weapon-section-name">{weapon.name}</span>
              </button>
            </div>
            {weapon.quick_rules && (
              <div className="weapon-section-quick-rules">
                <ReferenceText
                  text={weapon.quick_rules}
                  registry={weaponValueReferenceRegistry}
                  context={{
                    weapon_attack_bonus: weapon.weapon_attack_bonus,
                    weapon_damage_bonus: weapon.weapon_damage_bonus,
                  }}
                />
              </div>
            )}
            {expanded && (
              <div id={panelId} className="weapon-section-body">
                <dl className="weapon-section-meta">
                  {weapon.weapon_category && (
                    <>
                      <dt>Category</dt>
                      <dd>{weapon.weapon_category}</dd>
                    </>
                  )}
                  {weapon.weight != null && (
                    <>
                      <dt>Weight</dt>
                      <dd>{weapon.weight} lb.</dd>
                    </>
                  )}
                  {weapon.req_attune && (
                    <>
                      <dt>Attunement</dt>
                      <dd>{weapon.req_attune}</dd>
                    </>
                  )}
                  {weapon.property && weapon.property.length > 0 && (
                    <>
                      <dt>Properties</dt>
                      <dd>{weapon.property.join(', ')}</dd>
                    </>
                  )}
                  {weapon.focus && weapon.focus.length > 0 && (
                    <>
                      <dt>Spellcasting Focus</dt>
                      <dd>{weapon.focus.join(', ')}</dd>
                    </>
                  )}
                </dl>
                {weapon.attack && weapon.attack.length > 0 && (
                  <div>
                    {weapon.attack.map((attack, i) => (
                      <p key={i}>
                        <DiceText text={describeAttack(attack)} />
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
