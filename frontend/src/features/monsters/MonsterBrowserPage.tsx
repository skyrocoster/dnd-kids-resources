import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Feature, Monster } from '../../api/types'
import { Card } from '../../components/Card'
import { DiceText } from '../../components/DiceText'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import './MonsterBrowserPage.css'

function formatAc(ac: Monster['ac']): string {
  if (!ac) return ''
  return ac.note ? `${ac.value} (${ac.note})` : String(ac.value)
}

function formatHp(hp: Monster['hp']): string {
  if (!hp || typeof hp !== 'object') return ''
  const data = hp as { average?: number; formula?: string }
  if (data.average == null) return ''
  return data.formula ? `${data.average} (${data.formula})` : String(data.average)
}

function formatSpeed(speed: Monster['speed']): string {
  if (!speed.length) return ''
  return speed
    .map((entry) => {
      const label = entry.mode === 'walk' ? `${entry.feet} ft.` : `${entry.mode} ${entry.feet} ft.`
      const hover = entry.hover ? ' hover' : ''
      return entry.note ? `${label}${hover} (${entry.note})` : `${label}${hover}`
    })
    .join(', ')
}

function formatSenses(senses: Monster['senses']): string {
  if (!senses.length) return ''
  return senses
    .map((s) => {
      const note = s.note ? ` (${s.note})` : ''
      return `${s.type} ${s.range} ft.${note}`
    })
    .join(', ')
}

function describeAction(action: Feature): string {
  const attack = action.attack
  if (!attack) return action.description ? `${action.name}: ${action.description}` : action.name
  const parts = [action.name + ':']
  if (attack.attack_bonus != null) parts.push(`+${attack.attack_bonus} to hit,`)
  if (attack.automatic_hit) parts.push('automatic hit,')
  const damage = attack.damage
    .map((entry) => `${entry.formula}${entry.bonus ? ` + ${entry.bonus}` : ''}${entry.damage_types.length ? ` ${entry.damage_types.join(', ')}` : ''}`)
    .join('; ')
  if (damage) parts.push(`${damage} damage.`)
  if (action.description) parts.push(action.description)
  return parts.join(' ')
}

export function MonsterBrowserPage() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setMonsters(sorted)
        if (sorted.length > 0) setSelectedId(sorted[0].id)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load monsters.'))
  }, [])

  const selected = monsters.find((m) => m.id === selectedId) || null

  return (
    <div className="monster-browser-page">
      <h2>Monsters</h2>
      {loadError && <p className="monster-browser-error">{loadError}</p>}
      <div className="monster-browser-split">
        <SplitPane
          leftLabel="monster list"
          left={
            <SearchList
              items={monsters}
              getId={(m) => m.id}
              getLabel={(m) => m.name}
              getMeta={(m) => (m.cr ? `CR ${m.cr}` : undefined)}
              selectedId={selectedId}
              onSelect={(m) => setSelectedId(m.id)}
              variant="monster"
              searchPlaceholder="Search monsters…"
              emptyMessage="No monsters found."
            />
          }
          right={
            selected ? (
              <div className="monster-browser-detail">
                <Card
                  title={selected.name}
                  subtitle={formatHp(selected.hp) ? `HP ${formatHp(selected.hp)}` : undefined}
                  tag={selected.cr ? `CR ${selected.cr}` : undefined}
                  variant="monster"
                >
                  <dl className="monster-browser-meta">
                    {formatAc(selected.ac) && (
                      <>
                        <dt>Armor Class</dt>
                        <dd>{formatAc(selected.ac)}</dd>
                      </>
                    )}
                    {formatSpeed(selected.speed) && (
                      <>
                        <dt>Speed</dt>
                        <dd>{formatSpeed(selected.speed)}</dd>
                      </>
                    )}
                    {formatSenses(selected.senses) && (
                      <>
                        <dt>Senses</dt>
                        <dd>{formatSenses(selected.senses)}</dd>
                      </>
                    )}
                    {selected.languages && selected.languages.length > 0 && (
                      <>
                        <dt>Languages</dt>
                        <dd>{selected.languages.join(', ')}</dd>
                      </>
                    )}
                  </dl>

                    {selected.abilities && (
                      <div className="monster-browser-stats">
                      {Object.entries(selected.abilities).map(([stat, value]) => (
                        <div key={stat} className="monster-browser-stat">
                          <span className="monster-browser-stat-label">{stat.toUpperCase()}</span>
                          <span>{value ?? 'n/a'}</span>
                        </div>
                      ))}
                      </div>
                    )}

                  {selected.features.actions.length > 0 && (
                    <div className="monster-browser-actions">
                      <h4>Actions</h4>
                      {selected.features.actions.map((action, i) => (
                        <p key={i}>
                          <DiceText text={describeAction(action)} />
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <p className="monster-browser-empty">Select a monster to see its stat block.</p>
            )
          }
        />
      </div>
    </div>
  )
}
