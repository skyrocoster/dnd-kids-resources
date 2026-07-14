import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Item } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { categoryIcon } from '../loot/itemCategories'
import { ItemEditor } from './ItemEditor'
import './ItemBrowserPage.css'

function formatGp(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`
}

export function ItemBrowserPage() {
  const [items, setItems] = useState<Item[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)

  const load = () => {
    api.listItems().then((data) => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
      setItems(sorted)
      setLoadError(null)
      if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load items.'))
  }

  useEffect(load, [])
  const selected = items.find((item) => item.id === selectedId) || null
  const SelectedIcon = categoryIcon(selected?.category)

  const handleSaved = (item: Item) => {
    setEditorOpen(false)
    setSelectedId(item.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteItem(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="item-browser-page">
      <div className="item-browser-toolbar">
        <h2>Items</h2>
        <button type="button" className="item-browser-new" onClick={() => { setEditingItem(undefined); setEditorOpen(true) }}>New Item</button>
      </div>
      {loadError && <p className="item-browser-error">{loadError}</p>}
      <div className="item-browser-split">
        <SplitPane
          leftLabel="item list"
          left={<SearchList items={items} getId={(item) => item.id} getLabel={(item) => item.name} getMeta={(item) => formatGp(item.value_gp)} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id)} variant="neutral" searchPlaceholder="Search items…" emptyMessage="No items found." />}
          right={selected ? (
            <div className="item-browser-detail">
              <Card title={selected.name} subtitle={formatGp(selected.value_gp)} variant="neutral" footer={<div className="item-browser-actions"><button type="button" onClick={() => { setEditingItem(selected); setEditorOpen(true) }}>Edit</button><button type="button" className="item-browser-delete" onClick={() => setPendingDelete(selected)}>Delete</button></div>}>
                <div className="item-browser-category"><SelectedIcon size={20} aria-hidden="true" /><span>{selected.category || 'other'}</span></div>
                {selected.description && <p>{selected.description}</p>}
              </Card>
            </div>
          ) : <p className="item-browser-empty">Select an item to see its details.</p>}
        />
      </div>
      {editorOpen && <ItemEditor item={editingItem} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
      {pendingDelete && <ConfirmDialog message={`Delete ${pendingDelete.name}?`} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />}
    </div>
  )
}
