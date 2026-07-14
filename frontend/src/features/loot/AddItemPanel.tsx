import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Item } from '../../api/types'
import { SearchList } from '../../components/SearchList'
import { formatGp } from './lootTotals'
import './AddCatalogPanel.css'

interface AddItemPanelProps {
  onAdd: (item: Item) => void
  onClose: () => void
}

export function AddItemPanel({ onAdd, onClose }: AddItemPanelProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listItems()
      .then((data) => {
        setItems([...data].sort((a, b) => a.name.localeCompare(b.name)))
        setLoadError(null)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load items.'))
  }, [])

  return (
    <div className="add-catalog-panel">
      <div className="add-catalog-panel-header">
        <h3>Add item</h3>
        <button type="button" onClick={onClose} aria-label="Close add item panel">×</button>
      </div>
      {loadError && <p className="add-catalog-panel-error">{loadError}</p>}
      <SearchList
        items={items}
        getId={(item) => item.id}
        getLabel={(item) => item.name}
        getMeta={(item) => formatGp(item.value_gp)}
        onSelect={onAdd}
        variant="neutral"
        searchPlaceholder="Search items…"
        emptyMessage="No items found."
      />
    </div>
  )
}
