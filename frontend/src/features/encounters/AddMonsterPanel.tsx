import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Monster } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import './AddMonsterPanel.css'

interface AddMonsterPanelProps {
  onAdd: (monster: Monster) => void
  onClose: () => void
}

export function AddMonsterPanel({ onAdd, onClose }: AddMonsterPanelProps) {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listMonsters()
      .then((data) => {
        setMonsters([...data].sort((a, b) => a.name.localeCompare(b.name)))
        setLoadError(null)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load monsters.'))
  }, [])

  return (
    <div className="add-monster-panel">
      <div className="add-monster-panel-header">
        <h3>Add monster</h3>
        <button type="button" className="add-monster-panel-close" onClick={onClose} aria-label="Close add monster panel">
          ×
        </button>
      </div>
      {loadError && <p className="add-monster-panel-error">{loadError}</p>}
      <SearchList
        items={monsters}
        getId={(m) => m.id}
        getLabel={(m) => m.name}
        getMeta={(m) => (m.cr ? `CR ${m.cr}` : undefined)}
        onSelect={onAdd}
        variant="monster"
        searchPlaceholder="Search monsters…"
        emptyMessage="No monsters found."
      />
    </div>
  )
}
