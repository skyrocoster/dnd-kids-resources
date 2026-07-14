import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Weapon } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import './AddCatalogPanel.css'

interface AddWeaponPanelProps {
  onAdd: (weapon: Weapon) => void
  onClose: () => void
}

export function AddWeaponPanel({ onAdd, onClose }: AddWeaponPanelProps) {
  const [weapons, setWeapons] = useState<Weapon[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listWeapons()
      .then((data) => {
        setWeapons([...data].sort((a, b) => a.name.localeCompare(b.name)))
        setLoadError(null)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load weapons.'))
  }, [])

  return (
    <div className="add-catalog-panel">
      <div className="add-catalog-panel-header">
        <h3>Add weapon</h3>
        <button type="button" onClick={onClose} aria-label="Close add weapon panel">×</button>
      </div>
      {loadError && <p className="add-catalog-panel-error">{loadError}</p>}
      <SearchList
        items={weapons}
        getId={(weapon) => weapon.id}
        getLabel={(weapon) => weapon.name}
        getMeta={(weapon) => weapon.rarity || weapon.weapon_category || undefined}
        onSelect={onAdd}
        variant="weapon"
        searchPlaceholder="Search weapons…"
        emptyMessage="No weapons found."
      />
    </div>
  )
}
