import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Weapon } from '../../api/types'
import { Card } from '../../components/Card'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DiceText } from '../../components/DiceText'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { SwordsIcon } from '../../components/icons'
import { WeaponEditor } from './WeaponEditor'
import './WeaponBrowserPage.css'

function describeAttack(attack: Record<string, unknown>): string {
  const type = typeof attack.type === 'string' ? attack.type : ''
  const damage = typeof attack.damage === 'string' ? attack.damage : ''
  const damageType = typeof attack.damage_type === 'string' ? attack.damage_type : ''
  const hands = attack.hands
  const parts = [type, damage, damageType].filter(Boolean).join(' ')
  return hands ? `${parts} (${hands}-handed)` : parts
}

function entryToText(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object' && 'entries' in entry) {
    const nested = (entry as { entries?: unknown[] }).entries || []
    return nested.map(entryToText).join(' ')
  }
  return ''
}

export function WeaponBrowserPage() {
  const [weaponsRemote, setWeaponsRemote] = useState<RemoteState<Weapon[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWeapon, setEditingWeapon] = useState<Weapon | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Weapon | null>(null)

  const load = () => {
    setWeaponsRemote(remoteLoading())
    api
      .listWeapons()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setWeaponsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) setSelectedId(sorted[0].id)
      })
      .catch((error) => setWeaponsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load weapons.')))
  }

  useEffect(load, [])

  const weapons = weaponsRemote.status === 'success' ? weaponsRemote.data : []
  const selected = weapons.find((w) => w.id === selectedId) || null

  const openCreate = () => {
    setEditingWeapon(undefined)
    setEditorOpen(true)
  }
  const openEdit = (weapon: Weapon) => {
    setEditingWeapon(weapon)
    setEditorOpen(true)
  }
  const handleSaved = (weapon: Weapon) => {
    setEditorOpen(false)
    setSelectedId(weapon.id)
    load()
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteWeapon(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="weapon-browser-page">
      <BrowserLayout
        title="Weapons"
        chapterIcon={<SwordsIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Weapon</Button>}
        error={weaponsRemote.status === 'error' ? weaponsRemote.error : null}
        listLabel="weapon list"
        list={
            <SearchList
              items={weapons}
              getId={(w) => w.id}
              getLabel={(w) => w.name}
              getMeta={(w) => w.rarity || undefined}
              selectedId={selectedId}
              onSelect={(w) => setSelectedId(w.id)}
              variant="weapon"
              searchPlaceholder="Search weapons…"
              emptyMessage="No weapons found."
              status={weaponsRemote.status === 'loading' || weaponsRemote.status === 'idle' ? 'loading' : weaponsRemote.status === 'error' ? 'error' : 'ready'}
            />
        }
        detail={
            selected ? (
              <div className="weapon-browser-detail">
                <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to weapons</Button>
                <Card
                  title={selected.name}
                  subtitle={selected.base_weapon || selected.weapon_category || undefined}
                  tag={selected.rarity || undefined}
                    variant="weapon"
                    footer={
                      <div className="weapon-browser-actions">
                        <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                        <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                      </div>
                    }
                >
                  <dl className="weapon-browser-meta">
                    {selected.weapon_category && (
                      <>
                        <dt>Category</dt>
                        <dd>{selected.weapon_category}</dd>
                      </>
                    )}
                    {selected.weight != null && (
                      <>
                        <dt>Weight</dt>
                        <dd>{selected.weight} lb.</dd>
                      </>
                    )}
                    {selected.req_attune && (
                      <>
                        <dt>Attunement</dt>
                        <dd>{selected.req_attune}</dd>
                      </>
                    )}
                    {selected.property && selected.property.length > 0 && (
                      <>
                        <dt>Properties</dt>
                        <dd>{selected.property.join(', ')}</dd>
                      </>
                    )}
                    {selected.focus && selected.focus.length > 0 && (
                      <>
                        <dt>Spellcasting Focus</dt>
                        <dd>{selected.focus.join(', ')}</dd>
                      </>
                    )}
                  </dl>

                  {selected.attack && selected.attack.length > 0 && (
                    <div className="weapon-browser-attacks">
                      {selected.attack.map((attack, i) => (
                        <p key={i}>
                          <DiceText text={describeAttack(attack)} />
                        </p>
                      ))}
                    </div>
                  )}

                  {selected.entries &&
                    selected.entries.map((entry, i) => {
                      const text = entryToText(entry)
                      return text ? (
                        <p key={i}>
                          <DiceText text={text} />
                        </p>
                      ) : null
                    })}
                </Card>
              </div>
            ) : (
              <StatePanel status="noSelection" message="Choose a weapon from the list to view its details." />
            )
        }
        editor={editorOpen && (
        <WeaponEditor weapon={editingWeapon} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
      )}

        dialog={pendingDelete && (
        <ConfirmDialog
          message={`Delete ${pendingDelete.name}?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      />
    </div>
  )
}
