import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import * as api from '../../api/client'
import type { Monster } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { PlusIcon } from '../../components/icons'
import { MonsterStatBlock } from './MonsterStatBlock'
import './MonsterBrowserPage.css'

export function MonsterBrowserPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setMonsters(sorted)
        const pendingId = (location.state as { selectedId?: number } | null)?.selectedId
        if (pendingId && sorted.find((m) => m.id === pendingId)) {
          setSelectedId(pendingId)
        } else if (sorted.length > 0) {
          setSelectedId(sorted[0].id)
        }
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load monsters.'))
  }, [location.state])

  const selected = monsters.find((m) => m.id === selectedId) || null

  return (
    <div className="monster-browser-page">
      <div className="monster-browser-header">
        <h2>Monsters</h2>
        <button type="button" className="monster-browser-add" onClick={() => navigate('/monsters/new')}>
          <PlusIcon /> Add Monster
        </button>
      </div>
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
              <div className="monster-browser-detail" data-variant="monster">
                <div className="monster-browser-detail-header">
                  <div className="monster-browser-detail-kicker">Bestiary Field Card</div>
                  <button
                    type="button"
                    className="monster-browser-edit"
                    onClick={() => navigate(`/monsters/${selected.id}/edit`)}
                  >
                    Edit
                  </button>
                </div>
                <MonsterStatBlock monster={selected} />
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
