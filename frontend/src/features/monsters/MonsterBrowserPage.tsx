import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Monster } from '../../api/types'
import { Card } from '../../components/Card'
import { DiceText } from '../../components/DiceText'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import './MonsterBrowserPage.css'

function formatAc(ac: Monster['ac']): string {
  if (!ac || typeof ac !== 'object') return ''
  const [value] = Object.keys(ac)
  return value || ''
}

function formatHp(hp: Monster['hp']): string {
  if (!hp || typeof hp !== 'object') return ''
  const data = hp as { average?: number; formula?: string }
  if (data.average == null) return ''
  return data.formula ? `${data.average} (${data.formula})` : String(data.average)
}

function formatSpeed(speed: Monster['speed']): string {
  if (!speed || typeof speed !== 'object') return ''
  return Object.entries(speed as Record<string, number>)
    .map(([type, value]) => (type === 'walk' ? `${value} ft.` : `${type} ${value} ft.`))
    .join(', ')
}

function formatSenses(senses: Monster['senses']): string {
  if (!senses) return ''
  return senses
    .map((s) => {
      const entry = s as { type?: string; range?: number }
      return entry.type ? `${entry.type} ${entry.range ?? ''} ft.`.trim() : JSON.stringify(s)
    })
    .join(', ')
}

function describeAction(action: Record<string, unknown>): string {
  const name = typeof action.name === 'string' ? action.name : 'Action'
  const attack = action.attack as { type?: string; mod?: number; damage?: string; damage_type?: string } | undefined
  if (!attack) return name
  const parts = [name + ':']
  if (attack.mod != null) parts.push(`+${attack.mod} to hit,`)
  if (attack.damage) parts.push(`${attack.damage}${attack.damage_type ? ` ${attack.damage_type}` : ''} damage.`)
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

                  {selected.stats && (
                    <div className="monster-browser-stats">
                      {Object.entries(selected.stats as Record<string, number>).map(([stat, value]) => (
                        <div key={stat} className="monster-browser-stat">
                          <span className="monster-browser-stat-label">{stat.toUpperCase()}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selected.action && selected.action.length > 0 && (
                    <div className="monster-browser-actions">
                      <h4>Actions</h4>
                      {selected.action.map((action, i) => (
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
