import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Item } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { formatGp } from './lootTotals'
import './AddCatalogPanel.css'

interface AddItemPanelProps {
  onAdd: (item: Item) => void
  onClose: () => void
}

export function AddItemPanel({ onAdd, onClose }: AddItemPanelProps) {
  const [itemsRemote, setItemsRemote] = useState<RemoteState<Item[]>>(initialRemoteState)

  useEffect(() => {
    setItemsRemote(remoteLoading())
    api
      .listItems()
      .then((data) => {
        setItemsRemote(remoteSuccess([...data].sort((a, b) => a.name.localeCompare(b.name))))
      })
      .catch((error) => setItemsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load items.')))
  }, [])

  const items = itemsRemote.status === 'success' ? itemsRemote.data : []

  return (
    <div className="add-catalog-panel">
      <div className="add-catalog-panel-header">
        <h3>Add item</h3>
        <button type="button" onClick={onClose} aria-label="Close add item panel">×</button>
      </div>
      <SearchList
        items={items}
        getId={(item) => item.id}
        getLabel={(item) => item.name}
        getMeta={(item) => formatGp(item.value_gp)}
        onSelect={onAdd}
        variant="neutral"
        searchPlaceholder="Search items…"
        emptyMessage="No items found."
        status={itemsRemote.status === 'loading' || itemsRemote.status === 'idle' ? 'loading' : itemsRemote.status === 'error' ? 'error' : 'ready'}
      />
    </div>
  )
}
