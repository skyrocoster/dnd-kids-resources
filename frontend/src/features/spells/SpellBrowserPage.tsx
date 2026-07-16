import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import type { Spell } from '../../api/types'
import { Card } from '../../components/Card'
import { BrowserLayout } from '../../components/BrowserLayout'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DiceText } from '../../components/DiceText'
import { SearchList } from '../../components/SearchList'
import { StatePanel } from '../../components/StatePanel'
import { initialRemoteState, remoteError, remoteLoading, remoteSuccess } from '../../components/remoteState'
import type { RemoteState } from '../../components/remoteState'
import { WandIcon } from '../../components/icons'
import { levelLabel } from './constants'
import { SpellEditor } from './SpellEditor'
import './SpellBrowserPage.css'

function sortSpells(spells: Spell[]): Spell[] {
  return [...spells].sort((a, b) => {
    const levelA = a.level
    const levelB = b.level
    if (levelA !== levelB) return levelA - levelB
    return a.name.localeCompare(b.name)
  })
}

export function SpellBrowserPage() {
  const [spellsRemote, setSpellsRemote] = useState<RemoteState<Spell[]>>(initialRemoteState)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSpell, setEditingSpell] = useState<Spell | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Spell | null>(null)

  const load = () => {
    setSpellsRemote(remoteLoading())
    api
      .listSpells()
      .then((data) => {
        const sorted = sortSpells(data)
        setSpellsRemote(remoteSuccess(sorted))
        if (sorted.length > 0 && selectedId == null) {
          setSelectedId(sorted[0].id)
        }
      })
      .catch((error) => setSpellsRemote(remoteError(error instanceof Error ? error.message : 'Failed to load spells.')))
  }

  useEffect(load, [])

  const spells = spellsRemote.status === 'success' ? spellsRemote.data : []
  const selected = spells.find((s) => s.id === selectedId) || null

  const openCreate = () => {
    setEditingSpell(undefined)
    setEditorOpen(true)
  }

  const openEdit = (spell: Spell) => {
    setEditingSpell(spell)
    setEditorOpen(true)
  }

  const handleSaved = (spell: Spell) => {
    setEditorOpen(false)
    setSelectedId(spell.id)
    load()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.deleteSpell(pendingDelete.id)
    setPendingDelete(null)
    setSelectedId(null)
    load()
  }

  return (
    <div className="spell-browser-page">
      <BrowserLayout
        title="Spells"
        chapterIcon={<WandIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={<Button type="button" onClick={openCreate}>New Spell</Button>}
        error={spellsRemote.status === 'error' ? spellsRemote.error : null}
        listLabel="spell list"
        list={
            <SearchList
              items={spells}
              getId={(s) => s.id}
              getLabel={(s) => s.name}
              getMeta={(s) => levelLabel(s.level)}
              selectedId={selectedId}
              onSelect={(s) => setSelectedId(s.id)}
              variant="spell"
              searchPlaceholder="Search spells…"
              emptyMessage="No spells found."
              status={spellsRemote.status === 'loading' || spellsRemote.status === 'idle' ? 'loading' : spellsRemote.status === 'error' ? 'error' : 'ready'}
            />
        }
        detail={
            selected ? (
              <div className="spell-browser-detail">
                <Button className="browser-layout-back" variant="ghost" onClick={() => setSelectedId(null)}>Back to spells</Button>
                <Card
                  title={selected.name}
                  subtitle={`${levelLabel(selected.level)}${selected.school ? ` · ${selected.school}` : ''}`}
                  tag={selected.concentration ? 'Concentration' : selected.ritual ? 'Ritual' : undefined}
                    variant="spell"
                    footer={
                      <div className="spell-browser-actions">
                        <Button variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
                        <Button variant="danger" onClick={() => setPendingDelete(selected)}>Delete</Button>
                      </div>
                    }
                >
                  <dl className="spell-browser-meta">
                    {selected.casting_times.length > 0 && (
                      <>
                        <dt>Casting Time</dt>
                        <dd>{selected.casting_times.join(' or ')}</dd>
                      </>
                    )}
                    {selected.range && (
                      <>
                        <dt>Range</dt>
                        <dd>{selected.range}</dd>
                      </>
                    )}
                    {selected.duration && (
                      <>
                        <dt>Duration</dt>
                        <dd>{selected.duration}</dd>
                      </>
                    )}
                    {selected.components && selected.components.length > 0 && (
                      <>
                        <dt>Components</dt>
                        <dd>{selected.components.join(', ')}</dd>
                      </>
                    )}
                    {selected.materials && (
                      <>
                        <dt>Materials</dt>
                        <dd>{selected.materials}</dd>
                      </>
                    )}
                    {selected.concentration && <><dt>Concentration</dt><dd>Yes</dd></>}
                    {selected.ritual && <><dt>Ritual</dt><dd>Yes</dd></>}
                  </dl>
                  {selected.description && (
                    <p>
                      <DiceText text={selected.description} />
                    </p>
                  )}
                  {selected.alternate_description && <p><DiceText text={selected.alternate_description} /></p>}
                  {selected.higher_levels.text && (
                    <p>
                      <strong>At Higher Levels: </strong>
                      <DiceText text={selected.higher_levels.text} />
                    </p>
                  )}
                </Card>
              </div>
            ) : (
              <StatePanel status="noSelection" message="Choose a spell from the list to view its details." />
            )
        }
        editor={editorOpen && (
        <SpellEditor spell={editingSpell} onClose={() => setEditorOpen(false)} onSaved={handleSaved} />
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
