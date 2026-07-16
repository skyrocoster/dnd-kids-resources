import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Item } from '../../api/types'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { GemIcon, PackageIcon } from '../../components/icons'
import { categoryIcon } from '../loot/itemCategories'
import { ItemEditor } from './ItemEditor'
import './ItemBrowserPage.css'

function formatGp(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`
}

export function ItemBrowserPage() {
  const [itemsRemote, setItemsRemote] = useState<RemoteState<Item[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setItemsRemote(remoteLoading())
    api
      .listItems()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setItemsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setItemsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load items.')))
  }

  useEffect(load, [])

  const items = itemsRemote.status === 'success' ? itemsRemote.data : []
  const selected = items.find((item) => item.id === selectedId) || null
  const SelectedIcon = categoryIcon(selected?.category)

  const openCreate = () => {
    setEditingItem(undefined)
    setEditorOpen(true)
  }
  const openEdit = (item: Item) => {
    setEditingItem(item)
    setEditorOpen(true)
  }
  const handleSaved = (item: Item) => {
    setEditorOpen(false)
    setSelectedId(item.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteItem(pendingDelete.id)
      setPendingDelete(null)
      setSelectedId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="item-browser-page">
      <BrowserLayout
        title="Items"
        chapterIcon={<GemIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Item</Button>}
        error={itemsRemote.status === 'error' ? itemsRemote.error : null}
        listLabel="item list"
        list={
          <SearchList
            items={items}
            getId={(item) => item.id}
            getLabel={(item) => item.name}
            getMeta={(item) => formatGp(item.value_gp)}
            selectedId={selectedId}
            onSelect={(item) => setSelectedId(item.id)}
            variant="loot"
            searchPlaceholder="Search items…"
            emptyMessage="No items found."
            status={itemsRemote.status === 'loading' || itemsRemote.status === 'idle' ? 'loading' : itemsRemote.status === 'error' ? 'error' : 'ready'}
          />
        }
        detail={
          selected ? (
            <div className="item-browser-detail">
              <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to items</Button>
              <Card
                title={selected.name}
                subtitle={formatGp(selected.value_gp)}
                tag={selected.category || 'other'}
                variant="loot"
                footer={
                  <div className="item-browser-actions">
                    <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                    <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                  </div>
                }
              >
                <div className="item-browser-category"><SelectedIcon size={20} aria-hidden="true" /><span>{selected.category || 'other'}</span></div>
                {selected.description && <p>{selected.description}</p>}
              </Card>
            </div>
          ) : items.length === 0 ? (
            <div className="item-browser-empty">
              <PackageIcon size={32} aria-hidden="true" />
              <h3>Start your item catalog</h3>
              <p>Add treasure, supplies, and curiosities to reuse in loot bundles.</p>
              <Button onClick={openCreate}>Add your first item</Button>
            </div>
          ) : (
            <StatePanel status="noSelection" message="Choose an item from the list to see its details." />
          )
        }
        editor={editorOpen && <ItemEditor item={editingItem} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
        dialog={pendingDelete && (
          <ConfirmDialog
            message={`Delete ${pendingDelete.name}?`}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
            pending={deleting}
          />
        )}
      />
    </div>
  )
}
