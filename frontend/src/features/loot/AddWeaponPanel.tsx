import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Weapon } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import './AddCatalogPanel.css'

interface AddWeaponPanelProps {
  onAdd: (weapon: Weapon) => void
  onClose: () => void
}

export function AddWeaponPanel({ onAdd, onClose }: AddWeaponPanelProps) {
  const [weaponsRemote, setWeaponsRemote] = useState<RemoteState<Weapon[]>>(initialRemoteState)

  useEffect(() => {
    setWeaponsRemote(remoteLoading())
    api
      .listWeapons()
      .then((data) => {
        setWeaponsRemote(remoteSuccess([...data].sort((a, b) => a.name.localeCompare(b.name))))
      })
      .catch((error) => setWeaponsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load weapons.')))
  }, [])

  const weapons = weaponsRemote.status === 'success' ? weaponsRemote.data : []

  return (
    <div className="add-catalog-panel">
      <div className="add-catalog-panel-header">
        <h3>Add weapon</h3>
        <button type="button" onClick={onClose} aria-label="Close add weapon panel">×</button>
      </div>
      <SearchList
        items={weapons}
        getId={(weapon) => weapon.id}
        getLabel={(weapon) => weapon.name}
        getMeta={(weapon) => weapon.rarity || weapon.weapon_category || undefined}
        onSelect={onAdd}
        variant="weapon"
        searchPlaceholder="Search weapons…"
        emptyMessage="No weapons found."
        status={weaponsRemote.status === 'loading' || weaponsRemote.status === 'idle' ? 'loading' : weaponsRemote.status === 'error' ? 'error' : 'ready'}
      />
    </div>
  )
}
