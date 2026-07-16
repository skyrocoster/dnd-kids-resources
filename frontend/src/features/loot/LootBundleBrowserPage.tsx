import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { LootBundle } from '../../api/types'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { CoinsIcon } from '../../components/icons'
import { LootBundleEditor } from './LootBundleEditor'
import { computeBundleTotal, formatGp } from './lootTotals'
import './LootBundleBrowserPage.css'

export function LootBundleBrowserPage() {
  const [bundlesRemote, setBundlesRemote] = useState<RemoteState<LootBundle[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<LootBundle | undefined>()
  const [pendingDelete, setPendingDelete] = useState<LootBundle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setBundlesRemote(remoteLoading())
    api
      .listLootBundles()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setBundlesRemote(remoteSuccess(sorted))
        if (sorted.length && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setBundlesRemote(remoteError(error instanceof Error ? error.message : 'Failed to load loot bundles.')))
  }

  useEffect(load, [])
  const bundles = bundlesRemote.status === 'success' ? bundlesRemote.data : []
  const selected = bundles.find((bundle) => bundle.id === selectedId) || null

  const openCreate = () => {
    setEditingBundle(undefined)
    setEditorOpen(true)
  }
  const openEdit = (bundle: LootBundle) => {
    setEditingBundle(bundle)
    setEditorOpen(true)
  }
  const handleSaved = (bundle: LootBundle) => { setEditorOpen(false); setSelectedId(bundle.id); load() }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteLootBundle(pendingDelete.id)
      setPendingDelete(null)
      setSelectedId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="loot-browser-page">
      <BrowserLayout
        title="Loot Bundles"
        chapterIcon={<CoinsIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Loot Bundle</Button>}
        error={bundlesRemote.status === 'error' ? bundlesRemote.error : null}
        listLabel="loot bundle list"
        list={
          <SearchList
            items={bundles}
            getId={(bundle) => bundle.id}
            getLabel={(bundle) => bundle.name}
            getMeta={(bundle) => formatGp(computeBundleTotal(bundle.gold, bundle.contents))}
            selectedId={selectedId}
            onSelect={(bundle) => setSelectedId(bundle.id)}
            variant="loot"
            searchPlaceholder="Search loot bundles…"
            emptyMessage="No loot bundles found."
            status={bundlesRemote.status === 'loading' || bundlesRemote.status === 'idle' ? 'loading' : bundlesRemote.status === 'error' ? 'error' : 'ready'}
          />
        }
        detail={
          selected ? (
            <div className="loot-browser-detail">
              <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to loot bundles</Button>
              <Card
                title={selected.name}
                subtitle={formatGp(computeBundleTotal(selected.gold, selected.contents))}
                tag="Total value"
                variant="loot"
                footer={
                  <div className="loot-browser-actions">
                    <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                    <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                  </div>
                }
              >
                <p className="loot-browser-gold">Gold: {formatGp(selected.gold)}</p>
                {selected.contents?.length ? (
                  <ul className="loot-browser-contents">
                    {selected.contents.map((entry, index) => (
                      <li key={`${entry.kind}-${entry.ref_id}-${index}`}>{entry.quantity} × {entry.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="loot-browser-empty-contents">No items or weapons in this bundle.</p>
                )}
              </Card>
            </div>
          ) : bundlesRemote.status === 'success' && bundles.length === 0 ? (
            <div className="loot-browser-empty">
              <CoinsIcon size={32} aria-hidden="true" />
              <h3>Build the first reward</h3>
              <p>Combine catalog items, weapons, and gold into a ready-to-award treasure bundle.</p>
              <Button onClick={openCreate}>Create a loot bundle</Button>
            </div>
          ) : (
            <StatePanel status="noSelection" message="Choose a bundle from the list to see its contents and value." />
          )
        }
        editor={editorOpen && <LootBundleEditor bundle={editingBundle} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />}
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
