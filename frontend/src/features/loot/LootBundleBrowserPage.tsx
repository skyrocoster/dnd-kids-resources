import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { LootBundle } from '../../api/types'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { SplitPane } from '../../components/SplitPane'
import { CoinsIcon } from '../../components/icons'
import { LootBundleEditor } from './LootBundleEditor'
import { computeBundleTotal, formatGp } from './lootTotals'
import './LootBundleBrowserPage.css'

export function LootBundleBrowserPage() {
  const [bundles, setBundles] = useState<LootBundle[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<LootBundle | undefined>()
  const [pendingDelete, setPendingDelete] = useState<LootBundle | null>(null)

  const load = () => {
    api.listLootBundles().then((data) => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
      setBundles(sorted)
      setLoadError(null)
      if (sorted.length && selectedId == null) setSelectedId(sorted[0].id)
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Failed to load loot bundles.'))
  }

  useEffect(load, [])
  const selected = bundles.find((bundle) => bundle.id === selectedId) || null
  const handleSaved = (bundle: LootBundle) => { setEditorOpen(false); setSelectedId(bundle.id); load() }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteLootBundle(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="loot-browser-page">
      <div className="loot-browser-toolbar">
        <h2>Loot Bundles</h2>
        <button type="button" onClick={() => { setEditingBundle(undefined); setEditorOpen(true) }}>New Loot Bundle</button>
      </div>
      {loadError && <p className="loot-browser-error">{loadError}</p>}
      <div className="loot-browser-split">
        <SplitPane
          leftLabel="loot bundle list"
          left={<SearchList items={bundles} getId={(bundle) => bundle.id} getLabel={(bundle) => bundle.name} getMeta={(bundle) => formatGp(computeBundleTotal(bundle.gold, bundle.contents))} selectedId={selectedId} onSelect={(bundle) => setSelectedId(bundle.id)} variant="loot" searchPlaceholder="Search loot bundles…" emptyMessage="No loot bundles found." />}
          right={selected ? (
            <div className="loot-browser-detail">
              <Card title={selected.name} subtitle={formatGp(computeBundleTotal(selected.gold, selected.contents))} tag="Total value" variant="loot" footer={<div className="loot-browser-actions"><button type="button" onClick={() => { setEditingBundle(selected); setEditorOpen(true) }}>Edit</button><button type="button" className="loot-browser-delete" onClick={() => setPendingDelete(selected)}>Delete</button></div>}>
                <p className="loot-browser-gold">Gold: {formatGp(selected.gold)}</p>
                {selected.contents?.length ? <ul className="loot-browser-contents">{selected.contents.map((entry, index) => <li key={`${entry.kind}-${entry.ref_id}-${index}`}>{entry.quantity} × {entry.name}</li>)}</ul> : <p className="loot-browser-empty-contents">No items or weapons in this bundle.</p>}
              </Card>
            </div>
          ) : <div className="loot-browser-empty"><CoinsIcon size={32} aria-hidden="true" /><h3>{bundles.length === 0 ? 'Build the first reward' : 'Choose a loot bundle'}</h3><p>{bundles.length === 0 ? 'Combine catalog items, weapons, and gold into a ready-to-award treasure bundle.' : 'Select a bundle from the list to see its contents and value.'}</p>{bundles.length === 0 && <button type="button" onClick={() => { setEditingBundle(undefined); setEditorOpen(true) }}>Create a loot bundle</button>}</div>}
        />
      </div>
      {editorOpen && <LootBundleEditor bundle={editingBundle} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
      {pendingDelete && <ConfirmDialog message={`Delete ${pendingDelete.name}?`} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />}
    </div>
  )
}
